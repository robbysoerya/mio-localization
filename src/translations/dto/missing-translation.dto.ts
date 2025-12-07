export class MissingTranslationDto {
  keyId: string;
  keyName: string;
  featureId: string;
  featureName: string;
  projectId: string;
  projectName: string;
  missingLocales: string[];
  filledLocales: string[];
}
