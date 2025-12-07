import { IsString, IsArray, IsOptional } from 'class-validator';
import { Translation } from '@prisma/client';

export class AiTranslateDto {
  @IsString()
  keyId: string;

  @IsArray()
  @IsString({ each: true })
  targetLocales: string[];
}

export class AiTranslateBatchDto {
  @IsOptional()
  @IsString()
  featureId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocales?: string[];
}

export class AiTranslateResultDto {
  success: boolean;
  translatedCount: number;
  skippedCount: number;
  errors: Array<{ locale: string; error: string }>;
  translations: Translation[];
}

export class AiTranslateBatchResultDto {
  success: boolean;
  translatedCount: number;
  skippedCount: number;
  errors: Array<{ keyId: string; locale: string; error: string }>;
  statistics: {
    totalKeys: number;
    processedKeys: number;
    estimatedTimeSeconds: number;
  };
}
