import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';
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

  findAll() {
    return this.prisma.translation.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
}
