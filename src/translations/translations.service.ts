import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';
import { TranslationStatisticsDto } from './dto/translation-statistics.dto';
import { MissingTranslationDto } from './dto/missing-translation.dto';
import { PaginationQueryDto, PaginatedResponseDto } from './dto/pagination.dto';
import {
  SearchTranslationDto,
  TranslationItemDto,
} from './dto/search-translation.dto';
import csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class TranslationsService {
  constructor(private prisma: PrismaService) {}

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

    // Get all active locales
    const activeLocales = await this.prisma.language.findMany({
      where: { isActive: true },
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

  async getStatistics(featureId?: string): Promise<TranslationStatisticsDto> {
    // Get all active locales
    const activeLocales = await this.prisma.language.findMany({
      where: { isActive: true },
      select: { locale: true },
    });
    const locales = activeLocales.map((l) => l.locale);

    // Build where clause for keys
    const whereClause = featureId ? { featureId } : {};

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
