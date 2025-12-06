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

  async findAll(): Promise<FeatureResponseDto[]> {
    const features = await this.prisma.feature.findMany({
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

  remove(id: string) {
    return this.prisma.feature.delete({ where: { id } });
  }
}
