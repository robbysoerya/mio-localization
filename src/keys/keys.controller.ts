import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CreateKeyDto } from './dto/create-key.dto';
import { UpdateKeyDto } from './dto/update-key.dto';
import { KeysService } from './keys.service';

@Controller('keys')
export class KeysController {
  constructor(private svc: KeysService) {}

  @Post()
  create(@Body() dto: CreateKeyDto) {
    return this.svc.create(dto);
  }

  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.svc.findByFeature(featureId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKeyDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
