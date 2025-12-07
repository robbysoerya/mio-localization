import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

import { FeatureResponseDto } from './dto/feature-response.dto';

@Injectable()
export class FeaturesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFeatureDto): Promise<FeatureResponseDto> {
    const feature = await this.prisma.feature.create({ data });
    return { ...feature, totalKeys: 0 };
  }

  async findAll(projectId?: string): Promise<FeatureResponseDto[]> {
    const where = projectId ? { projectId } : {};
    const features = await this.prisma.feature.findMany({
      where,
      include: {
        _count: {
          select: { keys: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return features.map((feature) => {
      const { _count, ...rest } = feature;
      return {
        ...rest,
        totalKeys: _count.keys,
      };
    });
  }

  async findOne(id: string): Promise<FeatureResponseDto | null> {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      include: {
        _count: {
          select: { keys: true },
        },
      },
    });

    if (!feature) return null;

    const { _count, ...rest } = feature;
    return {
      ...rest,
      totalKeys: _count.keys,
    };
  }

  async update(
    id: string,
    data: UpdateFeatureDto,
  ): Promise<FeatureResponseDto> {
    const feature = await this.prisma.feature.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { keys: true },
        },
      },
    });

    const { _count, ...rest } = feature;
    return {
      ...rest,
      totalKeys: _count.keys,
    };
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all translations for keys belonging to this feature
      await tx.translation.deleteMany({
        where: {
          key: {
            featureId: id,
          },
        },
      });

      // 2. Delete all keys for this feature
      await tx.key.deleteMany({
        where: {
          featureId: id,
        },
      });

      // 3. Delete the feature
      return tx.feature.delete({
        where: { id },
      });
    });
  }
}
