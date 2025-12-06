import { MissingTranslationDto } from './missing-translation.dto';

export class LocaleCompletionDto {
  locale: string;
  total: number;
  filled: number;
  percentage: number;
}

export class FeatureCompletionDto {
  featureId: string;
  featureName: string;
  total: number;
  filled: number;
  percentage: number;
}

export class RecentlyUpdatedDto {
  keyId: string;
  keyName: string;
  locale: string;
  value: string;
  updatedAt: Date;
}

export class MostActiveFeatureDto {
  featureId: string;
  featureName: string;
  translationCount: number;
}

export class DuplicateKeyDto {
  keyName: string;
  features: Array<{
    featureId: string;
    featureName: string;
  }>;
}

export class TranslationStatisticsDto {
  // Missing translations (existing)
  missingTranslations: MissingTranslationDto[];

  // Completion metrics
  overallCompletionPercentage: number;
  completionByLocale: LocaleCompletionDto[];
  completionByFeature: FeatureCompletionDto[];

  // Quality metrics
  emptyValueCount: number;
  recentlyUpdated: RecentlyUpdatedDto[];

  // Activity metrics
  totalTranslations: number;
  mostActiveFeatures: MostActiveFeatureDto[];

  // Health indicators
  orphanedKeysCount: number;
  duplicateKeys: DuplicateKeyDto[];
  activeFeaturesWithMissingTranslations: number;
}
