import { PaginationQueryDto } from './pagination.dto';

export class SearchTranslationDto extends PaginationQueryDto {
  q?: string; // search query
  locale?: string; // filter by locale
  featureId?: string; // filter by feature
  projectId?: string; // filter by project
}

export class TranslationItemDto {
  id: string;
  keyId: string;
  keyName: string;
  featureId: string;
  featureName: string;
  locale: string;
  value: string | null;
  isReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
