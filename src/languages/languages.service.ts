import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateLanguageDto) {
    try {
      return await this.prisma.language.create({ data });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Language with this locale already exists in the project',
        );
      }
      throw error;
    }
  }

  findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.language.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.language.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateLanguageDto) {
    return this.prisma.language.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.language.delete({ where: { id } });
  }
}
