import { IsString } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  keyId: string;

  @IsString()
  locale: string;

  value?: string;
}
