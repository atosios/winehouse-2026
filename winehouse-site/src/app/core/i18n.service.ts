import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';

export type Language = 'en' | 'el';

export type I18nText = string | { en?: string; el?: string } | null | undefined;

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly currentLang = signal<Language>(this.getInitialLang());

  private getInitialLang(): Language {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('wh_lang') as Language | null;
      if (saved === 'en' || saved === 'el') return saved;
    }
    return 'en';
  }

  setLang(lang: Language): void {
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wh_lang', lang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  toggleLang(): void {
    this.setLang(this.currentLang() === 'en' ? 'el' : 'en');
  }

  /**
   * Resolve localized string according to current language.
   * Falls back cleanly to English if Greek is not provided or empty.
   */
  t(value: I18nText): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const lang = this.currentLang();
      if (lang === 'el' && value.el && value.el.trim()) {
        return value.el;
      }
      return value.en ?? '';
    }
    return String(value);
  }
}

/**
 * Pipe for quick template usage: {{ text | whTranslate }}
 */
@Pipe({
  name: 'whTranslate',
  standalone: true,
  pure: false,
})
export class WhTranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(value: I18nText): string {
    return this.i18n.t(value);
  }
}

/**
 * Utility helper for normalizing text values into `{ en: string; el?: string }`
 */
export function normalizeI18n(val: I18nText): { en: string; el: string } {
  if (!val) return { en: '', el: '' };
  if (typeof val === 'string') return { en: val, el: '' };
  return {
    en: val.en || '',
    el: val.el || '',
  };
}

/**
 * Utility helper to check if a URL is external (http, https, mailto, tel)
 */
export function isExternalUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^(https?:\/\/|\/\/|mailto:|tel:)/i.test(url.trim());
}
