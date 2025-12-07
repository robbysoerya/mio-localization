import { Module } from '@nestjs/common';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TranslationsController],
  providers: [TranslationsService],
})
export class TranslationsModule {}
