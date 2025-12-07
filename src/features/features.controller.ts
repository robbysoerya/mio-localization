import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.featuresService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.featuresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.featuresService.remove(id);
  }
}
