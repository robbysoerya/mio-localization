import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @IsNotEmpty()
  locale: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
