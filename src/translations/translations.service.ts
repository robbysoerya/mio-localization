import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';
import { BulkUpsertTranslationDto } from './dto/bulk-upsert-translation.dto';
import {
  AiTranslateDto,
  AiTranslateBatchDto,
  AiTranslateResultDto,
  AiTranslateBatchResultDto,
} from './dto/ai-translate.dto';
import { TranslationStatisticsDto } from './dto/translation-statistics.dto';
import { MissingTranslationDto } from './dto/missing-translation.dto';
import { PaginationQueryDto, PaginatedResponseDto } from './dto/pagination.dto';
import {
  SearchTranslationDto,
  TranslationItemDto,
} from './dto/search-translation.dto';
import { AiService } from 'src/ai/ai.service';
import csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  create(data: CreateTranslationDto) {
    return this.prisma.translation.upsert({
      where: {
        keyId_locale: {
          keyId: data.keyId,
          locale: data.locale,
        },
      },
      create: data,
      update: { value: data.value },
    });
  }

  async bulkUpsert(data: BulkUpsertTranslationDto) {
    // Validate that the key exists
    const key = await this.prisma.key.findUnique({
      where: { id: data.keyId },
    });

    if (!key) {
      throw new NotFoundException(`Key with id ${data.keyId} not found`);
    }

    // Use transaction to upsert all translations atomically
    const results = await this.prisma.$transaction(
      data.translations.map((translation) =>
        this.prisma.translation.upsert({
          where: {
            keyId_locale: {
              keyId: data.keyId,
              locale: translation.locale,
            },
          },
          create: {
            keyId: data.keyId,
            locale: translation.locale,
            value: translation.value,
          },
          update: {
            value: translation.value,
          },
        }),
      ),
    );

    return results;
  }

  async aiTranslate(dto: AiTranslateDto): Promise<AiTranslateResultDto> {
    // Get key with existing translations
    const key = await this.prisma.key.findUnique({
      where: { id: dto.keyId },
      include: {
        translations: true,
      },
    });

    if (!key) {
      throw new NotFoundException(`Key with id ${dto.keyId} not found`);
    }

    // Auto-detect source locale from existing translations
    const sourceTranslation = key.translations.find(
      (t) => t.value && t.value.trim() !== '',
    );

    if (!sourceTranslation) {
      throw new NotFoundException(
        `No existing translation found for key ${dto.keyId}. Cannot auto-detect source locale.`,
      );
    }

    const sourceLocale = sourceTranslation.locale;
    const sourceText = sourceTranslation.value!;

    this.logger.log(
      `Auto-detected source locale: ${sourceLocale} for key ${dto.keyId}`,
    );

    // Filter out target locales that already have translations
    const existingLocales = new Set(
      key.translations
        .filter((t) => t.value && t.value.trim() !== '')
        .map((t) => t.locale),
    );

    const targetLocales = dto.targetLocales.filter(
      (locale) => !existingLocales.has(locale),
    );

    if (targetLocales.length === 0) {
      return {
        success: true,
        translatedCount: 0,
        skippedCount: dto.targetLocales.length,
        errors: [],
        translations: [],
      };
    }

    this.logger.log(
      `Translating "${sourceText}" from ${sourceLocale} to ${targetLocales.join(', ')}`,
    );

    // Call AI service for translations
    const translationRequests = targetLocales.map((locale) => ({
      text: sourceText,
      targetLocale: locale,
      sourceLocale,
    }));

    const aiResults = await this.aiService.translateBatch(translationRequests);

    // Prepare bulk upsert data
    const successfulTranslations = aiResults.filter((r) => !r.error);
    const errors = aiResults
      .filter((r) => r.error)
      .map((r) => ({ locale: r.locale, error: r.error! }));

    // Bulk upsert successful translations
    const translations =
      successfulTranslations.length > 0
        ? await this.prisma.$transaction(
            successfulTranslations.map((result) =>
              this.prisma.translation.upsert({
                where: {
                  keyId_locale: {
                    keyId: dto.keyId,
                    locale: result.locale,
                  },
                },
                create: {
                  keyId: dto.keyId,
                  locale: result.locale,
                  value: result.value,
                  isReviewed: false, // Mark as unreviewed for human verification
                },
                update: {
                  value: result.value,
                  isReviewed: false,
                },
              }),
            ),
          )
        : [];

    return {
      success: errors.length === 0,
      translatedCount: successfulTranslations.length,
      skippedCount: dto.targetLocales.length - targetLocales.length,
      errors,
      translations,
    };
  }

  async aiTranslateBatch(
    dto: AiTranslateBatchDto,
  ): Promise<AiTranslateBatchResultDto> {
    const startTime = Date.now();

    // Get missing translations using existing statistics method
    const stats = await this.getStatistics(dto.featureId, dto.projectId);
    const missingTranslations = stats.missingTranslations;

    if (missingTranslations.length === 0) {
      return {
        success: true,
        translatedCount: 0,
        skippedCount: 0,
        errors: [],
        statistics: {
          totalKeys: 0,
          processedKeys: 0,
          estimatedTimeSeconds: 0,
        },
      };
    }

    // Get active locales for the project
    let projectId = dto.projectId;
    if (!projectId && dto.featureId) {
      const feature = await this.prisma.feature.findUnique({
        where: { id: dto.featureId },
        select: { projectId: true },
      });
      projectId = feature?.projectId;
    }

    const activeLocales = await this.prisma.language.findMany({
      where: { isActive: true, ...(projectId && { projectId }) },
      select: { locale: true },
    });
    const validLocales = new Set(activeLocales.map((l) => l.locale));

    // Filter target locales if specified
    const targetLocales = dto.targetLocales
      ? dto.targetLocales.filter((l) => validLocales.has(l))
      : Array.from(validLocales);

    let translatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ keyId: string; locale: string; error: string }> = [];
    let processedKeys = 0;

    this.logger.log(
      `Starting batch translation for ${missingTranslations.length} keys`,
    );

    // Process each key
    for (const missing of missingTranslations) {
      try {
        // Get the key with translations
        const key = await this.prisma.key.findUnique({
          where: { id: missing.keyId },
          include: { translations: true },
        });

        if (!key) {
          errors.push({
            keyId: missing.keyId,
            locale: 'all',
            error: 'Key not found',
          });
          continue;
        }

        // Find source translation
        const sourceTranslation = key.translations.find(
          (t) => t.value && t.value.trim() !== '',
        );

        if (!sourceTranslation) {
          skippedCount += missing.missingLocales.length;
          continue;
        }

        // Filter missing locales to only include target locales
        const localesToTranslate = missing.missingLocales.filter((locale) =>
          targetLocales.includes(locale),
        );

        if (localesToTranslate.length === 0) {
          continue;
        }

        // Translate using AI
        const translationRequests = localesToTranslate.map((locale) => ({
          text: sourceTranslation.value!,
          targetLocale: locale,
          sourceLocale: sourceTranslation.locale,
        }));

        const aiResults =
          await this.aiService.translateBatch(translationRequests);

        // Upsert successful translations
        const successfulTranslations = aiResults.filter((r) => !r.error);
        if (successfulTranslations.length > 0) {
          await this.prisma.$transaction(
            successfulTranslations.map((result) =>
              this.prisma.translation.upsert({
                where: {
                  keyId_locale: {
                    keyId: missing.keyId,
                    locale: result.locale,
                  },
                },
                create: {
                  keyId: missing.keyId,
                  locale: result.locale,
                  value: result.value,
                  isReviewed: false,
                },
                update: {
                  value: result.value,
                  isReviewed: false,
                },
              }),
            ),
          );
          translatedCount += successfulTranslations.length;
        }

        // Track errors
        const failedTranslations = aiResults.filter((r) => r.error);
        failedTranslations.forEach((r) => {
          errors.push({
            keyId: missing.keyId,
            locale: r.locale,
            error: r.error!,
          });
        });

        processedKeys++;
      } catch (error) {
        this.logger.error(
          `Error processing key ${missing.keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        errors.push({
          keyId: missing.keyId,
          locale: 'all',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const estimatedTimeSeconds = Math.round((Date.now() - startTime) / 1000);

    this.logger.log(
      `Batch translation completed: ${translatedCount} translations created, ${errors.length} errors`,
    );

    return {
      success: errors.length === 0,
      translatedCount,
      skippedCount,
      errors,
      statistics: {
        totalKeys: missingTranslations.length,
        processedKeys,
        estimatedTimeSeconds,
      },
    };
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TranslationItemDto>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Get total count
    const total = await this.prisma.translation.count();

    // Get paginated data
    const translations = await this.prisma.translation.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        key: {
          include: {
            feature: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Map to DTO
    const data: TranslationItemDto[] = translations.map((t) => ({
      id: t.id,
      keyId: t.keyId,
      keyName: t.key.key,
      featureId: t.key.feature.id,
      featureName: t.key.feature.name,
      locale: t.locale,
      value: t.value,
      isReviewed: t.isReviewed,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findByKey(keyId: string) {
    return this.prisma.translation.findMany({
      where: { keyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  update(id: string, data: UpdateTranslationDto) {
    return this.prisma.translation.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.translation.delete({ where: { id } });
  }

  async bulkUploadFromCsv(
    fileBuffer: Buffer,
    featureId: string,
  ): Promise<BulkUploadResultDto> {
    const result: BulkUploadResultDto = {
      success: true,
      totalRows: 0,
      created: 0,
      updated: 0,
      errors: [],
    };

    // Get feature to determine projectId
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { projectId: true },
    });

    if (!feature) {
      result.errors.push({
        row: 0,
        error: 'Feature not found',
      });
      result.success = false;
      return result;
    }

    // Get all active locales for this project
    const activeLocales = await this.prisma.language.findMany({
      where: { isActive: true, projectId: feature.projectId },
      select: { locale: true },
    });
    const validLocales = new Set(activeLocales.map((l) => l.locale));

    // Parse CSV
    const rows: Array<Record<string, string>> = [];
    const stream = Readable.from(fileBuffer.toString());

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          rows.push(row);
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });

    if (rows.length === 0) {
      result.errors.push({
        row: 0,
        error: 'CSV file is empty',
      });
      result.success = false;
      return result;
    }

    // Get column headers (first row keys, excluding 'key')
    const firstRow = rows[0];
    const localeColumns = Object.keys(firstRow).filter((col) => col !== 'key');

    // Validate that locale columns exist in Language table
    const invalidLocales = localeColumns.filter(
      (locale) => !validLocales.has(locale),
    );
    if (invalidLocales.length > 0) {
      result.errors.push({
        row: 1,
        error: `Invalid locale columns: ${invalidLocales.join(', ')}. These locales are not found in Language table.`,
      });
      result.success = false;
      return result;
    }

    result.totalRows = rows.length;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header and 1-based indexing

      try {
        const keyName = row.key?.trim();

        // Validate key
        if (!keyName) {
          result.errors.push({
            row: rowNumber,
            error: 'Missing key',
          });
          continue;
        }

        // Find or create key
        let key = await this.prisma.key.findFirst({
          where: {
            key: keyName,
            featureId: featureId,
          },
        });

        if (!key) {
          key = await this.prisma.key.create({
            data: {
              key: keyName,
              featureId: featureId,
            },
          });
        }

        // Process each locale column
        for (const locale of localeColumns) {
          const value = row[locale] || '';

          // Upsert translation
          const existing = await this.prisma.translation.findUnique({
            where: {
              keyId_locale: {
                keyId: key.id,
                locale: locale,
              },
            },
          });

          await this.prisma.translation.upsert({
            where: {
              keyId_locale: {
                keyId: key.id,
                locale: locale,
              },
            },
            create: {
              keyId: key.id,
              locale: locale,
              value: value,
            },
            update: {
              value: value,
            },
          });

          if (existing) {
            result.updated++;
          } else {
            result.created++;
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          row: rowNumber,
          error: errorMessage,
        });
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  async getStatistics(
    featureId?: string,
    projectId?: string,
  ): Promise<TranslationStatisticsDto> {
    // Determine projectId if not provided
    let effectiveProjectId = projectId;
    if (!effectiveProjectId && featureId) {
      const feature = await this.prisma.feature.findUnique({
        where: { id: featureId },
        select: { projectId: true },
      });
      effectiveProjectId = feature?.projectId;
    }

    // Get all active locales for the project
    const whereLanguage = effectiveProjectId
      ? { isActive: true, projectId: effectiveProjectId }
      : { isActive: true };
    const activeLocales = await this.prisma.language.findMany({
      where: whereLanguage,
      select: { locale: true },
    });
    const locales = activeLocales.map((l) => l.locale);

    // Build where clause for keys
    const whereClause: Prisma.KeyWhereInput = {};

    if (featureId) {
      whereClause.featureId = featureId;
    }

    if (projectId) {
      whereClause.feature = {
        projectId: projectId,
      };
    }

    // Get all keys with their translations and feature info
    const keys = await this.prisma.key.findMany({
      where: whereClause,
      include: {
        translations: {
          select: {
            id: true,
            locale: true,
            value: true,
            updatedAt: true,
          },
        },
        feature: {
          select: {
            id: true,
            name: true,
            isActive: true,
            projectId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Initialize metrics
    const missingTranslations: MissingTranslationDto[] = [];
    const localeStats = new Map<string, { total: number; filled: number }>();
    const featureStats = new Map<
      string,
      { name: string; total: number; filled: number; isActive: boolean }
    >();
    const featureTranslationCount = new Map<string, number>();
    let totalTranslations = 0;
    let emptyValueCount = 0;
    const allUpdates: Array<{
      keyId: string;
      keyName: string;
      locale: string;
      value: string;
      updatedAt: Date;
    }> = [];
    let orphanedKeysCount = 0;
    const keyNameMap = new Map<string, Set<string>>(); // keyName -> Set of featureIds

    // Initialize locale stats
    for (const locale of locales) {
      localeStats.set(locale, { total: 0, filled: 0 });
    }

    // Process each key
    for (const key of keys) {
      const translationMap = new Map<
        string,
        { value: string | null; updatedAt: Date }
      >();

      // Track key names for duplicate detection
      if (!keyNameMap.has(key.key)) {
        keyNameMap.set(key.key, new Set());
      }
      keyNameMap.get(key.key)!.add(key.feature.id);

      // Map existing translations
      for (const translation of key.translations) {
        translationMap.set(translation.locale, {
          value: translation.value,
          updatedAt: translation.updatedAt,
        });
        totalTranslations++;

        // Track updates for recently updated
        if (translation.value && translation.value.trim() !== '') {
          allUpdates.push({
            keyId: key.id,
            keyName: key.key,
            locale: translation.locale,
            value: translation.value,
            updatedAt: translation.updatedAt,
          });
        }
      }

      // Initialize feature stats if not exists
      if (!featureStats.has(key.feature.id)) {
        featureStats.set(key.feature.id, {
          name: key.feature.name,
          total: 0,
          filled: 0,
          isActive: key.feature.isActive,
        });
        featureTranslationCount.set(key.feature.id, 0);
      }

      const missingLocales: string[] = [];
      const filledLocales: string[] = [];
      let hasAnyTranslation = false;

      // Check each active locale
      for (const locale of locales) {
        const translation = translationMap.get(locale);
        const featureStat = featureStats.get(key.feature.id)!;
        const localeStat = localeStats.get(locale)!;

        // Increment totals
        featureStat.total++;
        localeStat.total++;

        if (!translation?.value || translation.value.trim() === '') {
          missingLocales.push(locale);
          if (translation?.value === '') {
            emptyValueCount++;
          }
        } else {
          filledLocales.push(locale);
          featureStat.filled++;
          localeStat.filled++;
          hasAnyTranslation = true;

          // Count for most active features
          featureTranslationCount.set(
            key.feature.id,
            (featureTranslationCount.get(key.feature.id) || 0) + 1,
          );
        }
      }

      // Check for orphaned keys (no translations at all)
      if (!hasAnyTranslation) {
        orphanedKeysCount++;
      }

      // Only include keys that have at least one missing locale
      if (missingLocales.length > 0) {
        missingTranslations.push({
          keyId: key.id,
          keyName: key.key,
          featureId: key.feature.id,
          featureName: key.feature.name,
          projectId: key.feature.projectId,
          projectName: key.feature.project.name,
          missingLocales,
          filledLocales,
        });
      }
    }

    // Calculate overall completion
    const totalPossible = keys.length * locales.length;
    const totalFilled = Array.from(localeStats.values()).reduce(
      (sum, stat) => sum + stat.filled,
      0,
    );
    const overallCompletionPercentage =
      totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0;

    // Build completion by locale
    const completionByLocale = Array.from(localeStats.entries()).map(
      ([locale, stats]) => ({
        locale,
        total: stats.total,
        filled: stats.filled,
        percentage:
          stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0,
      }),
    );

    // Build completion by feature
    const completionByFeature = Array.from(featureStats.entries()).map(
      ([featureId, stats]) => ({
        featureId,
        featureName: stats.name,
        total: stats.total,
        filled: stats.filled,
        percentage:
          stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0,
      }),
    );

    // Get recently updated (last 10)
    const recentlyUpdated = allUpdates
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);

    // Get most active features (top 5)
    const mostActiveFeatures = Array.from(featureTranslationCount.entries())
      .map(([featureId, count]) => ({
        featureId,
        featureName: featureStats.get(featureId)!.name,
        translationCount: count,
      }))
      .sort((a, b) => b.translationCount - a.translationCount)
      .slice(0, 5);

    // Find duplicate keys
    const duplicateKeys = Array.from(keyNameMap.entries())
      .filter(([, featureIds]) => featureIds.size > 1)
      .map(([keyName, featureIds]) => {
        const features = Array.from(featureIds).map((fId) => ({
          featureId: fId,
          featureName: featureStats.get(fId)!.name,
        }));
        return { keyName, features };
      });

    // Count active features with missing translations
    const activeFeaturesWithMissingTranslations = Array.from(
      featureStats.values(),
    ).filter((stat) => stat.isActive && stat.filled < stat.total).length;

    return {
      missingTranslations,
      overallCompletionPercentage,
      completionByLocale,
      completionByFeature,
      emptyValueCount,
      recentlyUpdated,
      totalTranslations,
      mostActiveFeatures,
      orphanedKeysCount,
      duplicateKeys,
      activeFeaturesWithMissingTranslations,
    };
  }

  async searchTranslations(
    query: SearchTranslationDto,
  ): Promise<PaginatedResponseDto<TranslationItemDto>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const searchTerm = query.q?.trim() || '';

    // Build where clause
    const whereClause: Prisma.TranslationWhereInput = {};

    // Add search condition
    if (searchTerm) {
      whereClause.OR = [
        {
          value: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          key: {
            key: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          key: {
            feature: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    // Add locale filter
    if (query.locale) {
      whereClause.locale = query.locale;
    }

    // Add feature filter
    if (query.featureId) {
      whereClause.key = {
        ...(whereClause.key as Prisma.KeyWhereInput),
        featureId: query.featureId,
      };
    }

    // Add project filter
    if (query.projectId) {
      whereClause.key = {
        ...(whereClause.key as Prisma.KeyWhereInput),
        feature: {
          projectId: query.projectId,
        },
      };
    }

    // Get total count
    const total = await this.prisma.translation.count({
      where: whereClause,
    });

    // Get paginated data
    const translations = await this.prisma.translation.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        key: {
          include: {
            feature: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Map to DTO
    const data: TranslationItemDto[] = translations.map((t) => ({
      id: t.id,
      keyId: t.keyId,
      keyName: t.key.key,
      featureId: t.key.feature.id,
      featureName: t.key.feature.name,
      locale: t.locale,
      value: t.value,
      isReviewed: t.isReviewed,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
