import { createI18n } from 'vue-i18n';
import zh from './zh-CN.json';
import en from './en-US.json';

type LocaleCode = 'zh' | 'en';

export const messages = {
  zh,
  en,
};

export function createI18nInstance(initialLocale: LocaleCode = 'zh') {
  return createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'zh',
    messages,
  });
}
