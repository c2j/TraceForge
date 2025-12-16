import { useForgeStore } from '../stores/useForgeStore';
import { resources, TranslationKey } from '../locales';

export const useTranslation = () => {
  const { language, setLanguage } = useForgeStore();

  const t = (key: TranslationKey): string => {
    const keys = key.split('.');
    let value: any = resources[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as any)[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t, language, setLanguage };
};