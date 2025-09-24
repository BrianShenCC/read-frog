export function isChromeTranslatorAvailable(): boolean {
  return 'Translator' in globalThis && 'LanguageDetector' in globalThis
}
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
}

export async function chromeTranslatorTranslate(
  sourceText: string,
  fromLang: string,
  targetLanguage: string,
): Promise<string> {
  if (!isChromeTranslatorAvailable()) {
    throw new Error('Chrome Translator API is not available in this environment')
  }
  const detector = await (globalThis as unknown as ChromeAI).LanguageDetector.create()
  const sourceLanguage = fromLang === 'auto' ? (await detector.detect(sourceText.trim()))[0].detectedLanguage : fromLang

  const availability = await (globalThis as unknown as ChromeAI).Translator.availability({ sourceLanguage, targetLanguage })
  const isUnavailable = availability === 'unavailable'
  if (isUnavailable) {
    throw new Error(`Chrome Translator API is not available for ${sourceLanguage} - ${targetLanguage} pair is not supported.`)
  }
  try {
    const translator = await (globalThis as unknown as ChromeAI).Translator.create({
      sourceLanguage,
      targetLanguage,
    } as ChromeTranslatorCreateOptions)
    const result = await translator.translate(sourceText)
    return result
  }
  catch (error) {
    console.error('Chrome Translator API error:', error)
    throw error
  }
}
