import { Module } from '@nestjs/common';
import { FeaturesModule } from './features/features.module';
import { KeysModule } from './keys/keys.module';
import { TranslationsModule } from './translations/translations.module';
import { LanguagesModule } from './languages/languages.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    FeaturesModule,
    KeysModule,
    TranslationsModule,
    LanguagesModule,
  ],
})
export class AppModule {}
