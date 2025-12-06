import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateKeyDto } from './dto/create-key.dto';
import { UpdateKeyDto } from './dto/update-key.dto';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateKeyDto) {
    return this.prisma.key.create({ data });
  }

  findByFeature(featureId: string) {
    return this.prisma.key.findMany({
      where: { featureId },
      include: { translations: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.key.findUnique({
      where: { id },
      include: { translations: true },
    });
  }

  update(id: string, data: UpdateKeyDto) {
    return this.prisma.key.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.key.delete({ where: { id } });
  }
}
