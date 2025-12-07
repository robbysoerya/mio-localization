import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class TranslationInput {
  @IsString()
  locale: string;

  @IsOptional()
  @IsString()
  value?: string;
}

export class BulkUpsertTranslationDto {
  @IsString()
  keyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Type(() => TranslationInput)
  translations: TranslationInput[];
}
