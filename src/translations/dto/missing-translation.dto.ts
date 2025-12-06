export class MissingTranslationDto {
  keyId: string;
  keyName: string;
  featureId: string;
  featureName: string;
  missingLocales: string[];
  filledLocales: string[];
}
