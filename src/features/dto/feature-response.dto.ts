import { Feature } from '@prisma/client';

export class FeatureResponseDto implements Feature {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalKeys: number;
}
