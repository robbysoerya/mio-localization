import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    return await this.prisma.project.create({
      data: createProjectDto,
    });
  }

  async findAll(): Promise<Project[]> {
    return await this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Project | null> {
    return await this.prisma.project.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: string): Promise<Project> {
    return await this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
