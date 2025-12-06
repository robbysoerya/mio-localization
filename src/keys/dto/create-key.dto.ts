import { IsOptional, IsString } from 'class-validator';

export class CreateKeyDto {
  @IsString()
  featureId: string;

  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  description?: string;
}
