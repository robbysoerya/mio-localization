import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TranslationsService } from './translations.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { PaginationQueryDto } from './dto/pagination.dto';
import { SearchTranslationDto } from './dto/search-translation.dto';

@Controller('translations')
export class TranslationsController {
  constructor(private svc: TranslationsService) {}

  @Post()
  create(@Body() dto: CreateTranslationDto) {
    return this.svc.create(dto);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: any,
    @Query('featureId') featureId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!featureId) {
      throw new BadRequestException('featureId query parameter is required');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException('Only CSV files are allowed');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.svc.bulkUploadFromCsv(file.buffer, featureId);
  }

  @Get('key/:keyId')
  findByKey(@Param('keyId') keyId: string) {
    return this.svc.findByKey(keyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTranslationDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.svc.remove(id);
  }

  @Get('statistics')
  getStatistics(@Query('featureId') featureId?: string) {
    return this.svc.getStatistics(featureId);
  }

  @Get('search')
  search(@Query() query: SearchTranslationDto) {
    return this.svc.searchTranslations(query);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.svc.findAll(query);
  }
}
