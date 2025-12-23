import OpenAI from 'openai';
import axios from 'axios';
import Logger from '../utils/logger';

// Extended language support (15+ languages)
export type SupportedLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' // European
  | 'zh' | 'ja' | 'ko' | 'hi' | 'ar' | 'ru' | 'tr' // Asian/Middle Eastern
  | 'pl' | 'sv' | 'da' | 'no' | 'fi'; // Nordic/Eastern European

export interface TranslationResult {
  [key: string]: string;
}

export const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ar: 'Arabic',
  ru: 'Russian',
  tr: 'Turkish',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish'
};

export async function translateDescription(
  originalText: string,
  sourceLanguage: SupportedLanguage = 'en'
): Promise<TranslationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    Logger.warn('No OpenAI API key found, trying Google Translate...');
    try {
      return await translateWithGoogle(originalText, sourceLanguage);
    } catch (error) {
      Logger.warn('Google Translate also failed, using mock translations');
      return {
        en: originalText,
        fr: `[FR] ${originalText}`,
        es: `[ES] ${originalText}`
      };
    }
  }

  Logger.info(`🌍 Starting translation from ${languageNames[sourceLanguage]}:`);
  Logger.debug(`📝 Original text: ${originalText.substring(0, 100)}...`);

  const client = new OpenAI({ apiKey });

  const targetLanguages = ['en', 'fr', 'es'].filter(lang => lang !== sourceLanguage) as SupportedLanguage[];
  const result: Partial<TranslationResult> = {
    [sourceLanguage]: originalText
  };

  // Translate to each target language
  for (const targetLang of targetLanguages) {
    try {
      Logger.info(`🔄 Translating to ${languageNames[targetLang]}...`);

      const prompt = `You are a professional translator. Translate this museum artwork description from ${languageNames[sourceLanguage]} to ${languageNames[targetLang]}.

IMPORTANT: 
- Only return the translated text, nothing else
- Keep the same meaning and professional tone
- Make it suitable for museum visitors
- Do not add explanations or notes

Text to translate:
${originalText}`;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are a professional museum translator. Translate text to ${languageNames[targetLang]} only. Return only the translation, no other text.` },
          { role: 'user', content: originalText }
        ],
        max_tokens: 500,
        temperature: 0.1, // Lower temperature for more consistent translations
      });

      const translation = response.choices[0]?.message?.content?.trim();

      if (translation && translation !== originalText) {
        result[targetLang] = translation;
        Logger.info(`✅ ${languageNames[targetLang]} translation: ${translation.substring(0, 50)}...`);
      } else {
        Logger.warn(`Translation failed for ${targetLang}, using original text`);
        result[targetLang] = originalText;
      }
    } catch (error) {
      Logger.error(`❌ Translation error for ${targetLang}: ${error}`);
      result[targetLang] = originalText; // Fallback to original
    }
  }

  return result as TranslationResult;
}

export function getDescriptionByLanguage(
  artwork: { description?: string; descriptions?: { en?: string; fr?: string; es?: string } },
  language: SupportedLanguage
): string {
  // Try to get language-specific description first
  if (artwork.descriptions && artwork.descriptions[language]) {
    return artwork.descriptions[language]!;
  }

  // Fallback to any available translation
  if (artwork.descriptions) {
    return artwork.descriptions.en || artwork.descriptions.fr || artwork.descriptions.es || '';
  }

  // Final fallback to main description
  return artwork.description || '';
}

// Google Translate fallback (free, no API key needed)
async function translateWithGoogle(text: string, sourceLanguage: SupportedLanguage): Promise<TranslationResult> {
  const result: TranslationResult = {
    en: sourceLanguage === 'en' ? text : '',
    fr: sourceLanguage === 'fr' ? text : '',
    es: sourceLanguage === 'es' ? text : ''
  };

  const targetLanguages = ['en', 'fr', 'es'].filter(lang => lang !== sourceLanguage);

  for (const targetLang of targetLanguages) {
    try {
      Logger.debug(`Google Translate: ${sourceLanguage} → ${targetLang}`);

      // Using Google Translate free service
      const url = `https://translate.googleapis.com/translate_a/single`;

      const response = await axios.get(url, {
        params: {
          client: 'gtx',
          sl: sourceLanguage,
          tl: targetLang,
          dt: 't',
          q: text
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      Logger.debug(`Google Translate response for ${targetLang}: ${JSON.stringify(response.data)}`);

      let translation = null;
      if (response.data && Array.isArray(response.data) && response.data[0]) {
        if (Array.isArray(response.data[0]) && response.data[0][0]) {
          translation = response.data[0][0][0];
        }
      }

      if (translation && translation !== text) {
        result[targetLang as keyof TranslationResult] = translation;
        Logger.info(`Google translated to ${targetLang}: ${translation.substring(0, 50)}...`);
      } else {
        result[targetLang as keyof TranslationResult] = `[${targetLang.toUpperCase()}] ${text}`;
      }
    } catch (error) {
      Logger.error(`Google Translate failed for ${targetLang}: ${error}`);

      // Try alternative translation service
      try {
        Logger.info(`Trying alternative translation for ${targetLang}...`);
        const altTranslation = await translateWithLibreTranslate(text, sourceLanguage, targetLang);
        if (altTranslation && altTranslation !== text) {
          result[targetLang as keyof TranslationResult] = altTranslation;
          Logger.info(`Alternative translation to ${targetLang}: ${altTranslation.substring(0, 50)}...`);
        } else {
          result[targetLang as keyof TranslationResult] = `[${targetLang.toUpperCase()}] ${text}`;
        }
      } catch (altError) {
        Logger.error(`Alternative translation also failed for ${targetLang}: ${altError}`);
        result[targetLang as keyof TranslationResult] = `[${targetLang.toUpperCase()}] ${text}`;
      }
    }
  }

  return result;
}

// LibreTranslate backup service (free, open source)
async function translateWithLibreTranslate(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  try {
    const response = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data?.translatedText || null;
  } catch (error) {
    Logger.error(`LibreTranslate error: ${error}`);
    return null;
  }
}

/**
 * Translate text to a single target language (on-demand)
 * Used when visitor switches language
 */
export async function translateToLanguage(
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage: SupportedLanguage = 'en'
): Promise<string> {
  // If same language, return original
  if (targetLanguage === sourceLanguage) {
    return text;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const targetName = languageNames[targetLanguage] || targetLanguage;
  const sourceName = languageNames[sourceLanguage] || sourceLanguage;

  Logger.info(`🌍 On-demand translation: ${sourceName} → ${targetName}`);

  if (!apiKey) {
    Logger.warn('No OpenAI API key, trying Google Translate...');
    try {
      return await translateSingleWithGoogle(text, sourceLanguage, targetLanguage);
    } catch (error) {
      Logger.error(`Google Translate failed: ${error}`);
      return text; // Return original if all fails
    }
  }

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional museum translator. Translate the following text to ${targetName}. Return ONLY the translation, nothing else. Keep the same meaning and professional tone suitable for museum visitors.`
        },
        { role: 'user', content: text }
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const translation = response.choices[0]?.message?.content?.trim();

    if (translation && translation !== text) {
      Logger.info(`✅ Translated to ${targetName}: ${translation.substring(0, 50)}...`);
      return translation;
    }

    return text;
  } catch (error) {
    Logger.error(`❌ OpenAI translation error: ${error}`);
    // Try Google as fallback
    try {
      return await translateSingleWithGoogle(text, sourceLanguage, targetLanguage);
    } catch {
      return text;
    }
  }
}

/**
 * Google Translate for single language (fallback)
 */
async function translateSingleWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single`;

    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text
      },
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    });

    if (response.data?.[0]?.[0]?.[0]) {
      const translation = response.data[0].map((part: any) => part[0]).join('');
      Logger.info(`✅ Google translated to ${targetLang}: ${translation.substring(0, 50)}...`);
      return translation;
    }

    return text;
  } catch (error) {
    Logger.error(`Google Translate error: ${error}`);
    throw error;
  }
}
