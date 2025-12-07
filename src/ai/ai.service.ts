import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

interface TranslationRequest {
  text: string;
  targetLocale: string;
  sourceLocale?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    } else {
      this.ai = new GoogleGenAI({ apiKey });
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
    if (!this.ai) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY');
    }

    const sourceInfo = sourceLocale
      ? `from ${this.getLanguageName(sourceLocale)}`
      : '';
    const prompt = `Translate the following text ${sourceInfo} to ${this.getLanguageName(targetLocale)}. 
Only return the translated text, nothing else. Do not include explanations or notes.

Text to translate: "${text}"`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
      });

      const translatedText = response.text?.trim() || '';

      this.logger.log(
        `Translated "${text}" to ${targetLocale}: "${translatedText}"`,
      );

      return translatedText;
    } catch (error) {
      this.logger.error(
        `Translation failed for locale ${targetLocale}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Translate multiple texts with rate limiting
   */
  /**
   * Translate a single text with retry logic for rate limits
   */
  private async translateTextWithRetry(
    text: string,
    targetLocale: string,
    sourceLocale?: string,
    retries = 3,
    initialDelay = 10000,
  ): Promise<string> {
    try {
      return await this.translateText(text, targetLocale, sourceLocale);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        retries > 0 &&
        (errorMessage.includes('429') ||
          errorMessage.includes('Too Many Requests') ||
          errorMessage.includes('quota'))
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

    // Process sequentially to respect strict rate limits
    // Increased to 10 seconds (6 RPM) to be absolutely safe
    const delayMs = 10000;

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
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
