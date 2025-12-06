import { IsOptional, IsString } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
