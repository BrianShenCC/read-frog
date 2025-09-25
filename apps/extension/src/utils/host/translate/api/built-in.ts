interface ChromeTranslatorCreateOptions {
  sourceLanguage?: string
  targetLanguage: string
}

interface ChromeTranslator {
  translate: (
    input: string,
  ) => Promise<string>
  destroy?: () => void | Promise<void>
}
interface LanguageDetector {
  detect: (input: string) => Promise<{ detectedLanguage: string }[]>
}
/**
 * Minimal interfaces to keep TypeScript happy without pulling in the full experimental API types.
 */
interface ChromeAI {
  Translator: {
    create: (options: ChromeTranslatorCreateOptions) => Promise<ChromeTranslator>
    availability: (options: { sourceLanguage: string, targetLanguage: string }) => Promise<'available' | 'unavailable'>
  }
  LanguageDetector: {
    create: () => Promise<LanguageDetector>
  }
  LanguageModel: {
    availability: () => Promise<'unavailable' | 'available' | 'downloadable' | 'downloading'>
  }
}

export async function checkChromeModelAvailability(): Promise<'unavailable' | 'available' | 'downloadable' | 'downloading'> {
  return (globalThis as unknown as ChromeAI).LanguageModel.availability()
}

export function isChromeTranslatorAvailable(): boolean {
  return 'Translator' in globalThis && 'LanguageDetector' in globalThis
}

export async function chromeTranslatorTranslate(
  sourceText: string,
  fromLang: string,
  targetLanguage: string,
): Promise<string> {
  if (!isChromeTranslatorAvailable()) {
    throw new Error('Built-in Translator API is not available in this environment')
  }

  let translator: ChromeTranslator | undefined
  try {
    const detector = await (globalThis as unknown as ChromeAI).LanguageDetector.create()
    const sourceLanguage = fromLang === 'auto' ? (await detector.detect(sourceText.trim()))[0]?.detectedLanguage || 'en' : fromLang

    const availability = await (globalThis as unknown as ChromeAI).Translator.availability({ sourceLanguage, targetLanguage })
    const isUnavailable = availability === 'unavailable'
    if (isUnavailable) {
      throw new Error(`Built-in Translator API is not available for ${sourceLanguage} - ${targetLanguage} pair is not supported.`)
    }
    translator = await (globalThis as unknown as ChromeAI).Translator.create({
      sourceLanguage,
      targetLanguage,
    } as ChromeTranslatorCreateOptions)
    return translator.translate(sourceText)
  }
  catch (error) {
    throw new Error(
      `Failed to translate text using built-in Translator API: ${(error as Error).message}`,
    )
  }
  finally {
    await translator?.destroy?.()
  }
}
