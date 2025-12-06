import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateLanguageDto) {
    return this.prisma.language.create({ data });
  }

  findAll() {
    return this.prisma.language.findMany({
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
