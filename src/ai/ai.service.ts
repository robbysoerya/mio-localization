import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

interface TranslationRequest {
  text: string;
  targetLocale: string;
  sourceLocale?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private modelName = 'gpt-4o-mini'; // Cost-effective model for translations

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Translate a single text to target locale
   */
  async translateText(
    text: string,
    targetLocale: string,
    sourceLocale?: string,
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API not configured. Please set OPENAI_API_KEY');
    }

    const sourceInfo = sourceLocale
      ? `from ${this.getLanguageName(sourceLocale)}`
      : '';
    const prompt = `Translate the following text ${sourceInfo} to ${this.getLanguageName(targetLocale)}.
Only return the translated text, nothing else. Do not include explanations, notes, or quotes.

Text to translate: ${text}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator. Provide only the translation without any additional explanations, notes, or surrounding quotes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
        max_tokens: 1000,
      });

      let translatedText = response.choices[0]?.message?.content?.trim() || '';

      // Strip surrounding quotes if present (sometimes AI adds them)
      translatedText = this.stripSurroundingQuotes(translatedText);

      this.logger.log(
        `Translated "${text}" to ${targetLocale}: "${translatedText}"`,
      );

      return translatedText;
    } catch (error) {
      this.logger.error(
        `Translation failed for locale ${targetLocale}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Translate a single text with retry logic for rate limits
   */
  private async translateTextWithRetry(
    text: string,
    targetLocale: string,
    sourceLocale?: string,
    retries = 3,
    initialDelay = 1000,
  ): Promise<string> {
    try {
      return await this.translateText(text, targetLocale, sourceLocale);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        retries > 0 &&
        (errorMessage.includes('429') ||
          errorMessage.includes('Too Many Requests') ||
          errorMessage.includes('rate_limit'))
      ) {
        this.logger.warn(
          `Rate limited for ${targetLocale}. Waiting ${initialDelay}ms before retry (${retries} retries left)...`,
        );
        await this.delay(initialDelay);
        return this.translateTextWithRetry(
          text,
          targetLocale,
          sourceLocale,
          retries - 1,
          initialDelay * 2, // Exponential backoff
        );
      }
      throw error;
    }
  }

  /**
   * Translate multiple texts with rate limiting and retries
   */
  async translateBatch(
    requests: TranslationRequest[],
  ): Promise<Array<{ locale: string; value: string; error?: string }>> {
    const results: Array<{ locale: string; value: string; error?: string }> =
      [];

    // Process sequentially with minimal delay for OpenAI (much better rate limits than Gemini)
    const delayMs = 100; // 100ms delay between requests

    this.logger.log(
      `Processing ${requests.length} translations sequentially with ${delayMs}ms delay and auto-retries...`,
    );

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];

      try {
        const value = await this.translateTextWithRetry(
          req.text,
          req.targetLocale,
          req.sourceLocale,
        );
        results.push({ locale: req.targetLocale, value });
      } catch (error) {
        results.push({
          locale: req.targetLocale,
          value: '',
          error: error instanceof Error ? error.message : 'Translation failed',
        });
      }

      // Add delay between requests (except for the last one)
      if (i < requests.length - 1) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Get human-readable language name from locale code
   */
  private getLanguageName(locale: string): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      id: 'Indonesian',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
      hi: 'Hindi',
      th: 'Thai',
      vi: 'Vietnamese',
      it: 'Italian',
      nl: 'Dutch',
      pl: 'Polish',
      tr: 'Turkish',
      sv: 'Swedish',
      da: 'Danish',
      fi: 'Finnish',
      no: 'Norwegian',
    };

    return languageNames[locale] || locale;
  }

  /**
   * Strip surrounding quotes from text if present
   */
  private stripSurroundingQuotes(text: string): string {
    // Remove matching surrounding quotes (either " or ')
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      return text.slice(1, -1);
    }
    return text;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
