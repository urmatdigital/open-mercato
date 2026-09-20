import { registerAppDictionaryLoader } from '@open-mercato/shared/lib/i18n/server'
// UPGRADE_NOTES points at `.../i18n/server`, which re-exports this. We import
// from the defining module instead because this file's own tests jest.mock
// `.../i18n/server` wholesale, and a mock without `registerLocales` turns the
// module-scope call below into a TypeError at import time.
import { registerLocales } from '@open-mercato/shared/lib/i18n/locale-registry'
import type { Locale } from '@open-mercato/shared/lib/i18n/config'
import { registerModules } from '@open-mercato/shared/lib/modules/registry'
import type { Module } from '@open-mercato/shared/modules/registry'
import { loadI18nModules } from '@/.mercato/generated/modules.i18n.loaders.generated'

// Русский — локаль этого форка, а не платформы: ru-словари лежат в самих
// пакетах (~17.4k ключей), но апстрим их не отгружает. Оба уровня из
// .ai/specs/2026-09-03-extensible-locale-set.md: declare module расширяет
// Locale для тайпчека приложения, registerLocales — служимый набор в рантайме.
// Так `packages/shared` остаётся байт-в-байт апстримным и не конфликтует на
// каждом релизе.
declare module '@open-mercato/shared/lib/i18n/config' {
  interface LocaleRegistry {
    ru: true
  }
}

// Модуль импортируется из `src/bootstrap-common.ts` (и из корневого layout),
// то есть регистрация проходит на том же бутстрапе, что и модули приложения.
registerLocales(['ru'])

function registerLoadedLocaleModules(
  localeModules: Module[],
  registrar: typeof registerModules = registerModules,
): void {
  if (localeModules.length > 0) registrar(localeModules)
}

async function loadAppDictionary(locale: Locale): Promise<Record<string, unknown>> {
  switch (locale) {
    case 'en':
      return import('../../i18n/en.json').then((module) => module.default)
    case 'pl':
      return import('../../i18n/pl.json').then((module) => module.default)
    case 'es':
      return import('../../i18n/es.json').then((module) => module.default)
    case 'de':
      return import('../../i18n/de.json').then((m) => m.default)
    case 'ru':
      return import('../../i18n/ru.json').then((m) => m.default)
    default:
      return import('../../i18n/en.json').then((module) => module.default)
  }
}

type DictionaryLoaderDependencies = {
  loadLocaleModules?: typeof loadI18nModules
  loadBaseDictionary?: typeof loadAppDictionary
  registerLocaleModules?: typeof registerModules
}

export function createAppDictionaryLoader({
  loadLocaleModules = loadI18nModules,
  loadBaseDictionary = loadAppDictionary,
  registerLocaleModules = registerModules,
}: DictionaryLoaderDependencies = {}) {
  return async (locale: Locale): Promise<Record<string, unknown>> => {
    const [localeModules, appDictionary] = await Promise.all([
      loadLocaleModules(locale),
      loadBaseDictionary(locale),
    ])
    registerLoadedLocaleModules(localeModules, registerLocaleModules)
    return appDictionary
  }
}

registerAppDictionaryLoader(createAppDictionaryLoader())
