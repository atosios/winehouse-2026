import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nText, Language, normalizeI18n } from '../core/i18n.service';

@Component({
  selector: 'wh-i18n-input',
  imports: [FormsModule],
  template: `
    <div class="wh-i18n-input-wrap relative">
      <!-- Standard Label -->
      @if (label) {
        <label class="admin-field-label">
          {{ label }}
        </label>
      }

      <!-- Input Element with Flag Icon at its end -->
      <div class="relative flex items-center">
        @if (isTextarea) {
          <textarea
            [rows]="rows"
            class="admin-field-input !pr-10 {{ inputClass }}"
            [ngModel]="currentText()"
            (ngModelChange)="onTextChange($event)"
            [placeholder]="computedPlaceholder()"
            [attr.maxlength]="maxlength || null"
          ></textarea>
          <!-- Flag Icon Button on Textarea Top-Right -->
          <button
            type="button"
            class="absolute right-2.5 top-2.5 z-10 text-base leading-none cursor-pointer select-none transition-transform duration-150 hover:scale-125 focus:outline-none p-0.5"
            (click)="toggleLang()"
            [title]="activeLang() === 'en' ? 'English (Click to switch to Greek)' : 'Greek (Click to switch to English)'"
          >
            {{ activeLang() === 'en' ? '🇬🇧' : '🇬🇷' }}
          </button>
        } @else {
          <input
            type="text"
            class="admin-field-input !pr-10 {{ inputClass }}"
            [ngModel]="currentText()"
            (ngModelChange)="onTextChange($event)"
            [placeholder]="computedPlaceholder()"
            [attr.maxlength]="maxlength || null"
          />
          <!-- Flag Icon Button on Single-line Input Right End -->
          <button
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-base leading-none cursor-pointer select-none transition-transform duration-150 hover:scale-125 focus:outline-none p-0.5"
            (click)="toggleLang()"
            [title]="activeLang() === 'en' ? 'English (Click to switch to Greek)' : 'Greek (Click to switch to English)'"
          >
            {{ activeLang() === 'en' ? '🇬🇧' : '🇬🇷' }}
          </button>
        }
      </div>

      <!-- Optional Help text -->
      @if (helpText) {
        <span class="text-2xs text-slate-400 block mt-1">{{ helpText }}</span>
      }
    </div>
  `,
})
export class WhI18nInput implements OnInit, OnChanges {
  @Input() value: I18nText = '';
  @Output() valueChange = new EventEmitter<{ en: string; el: string }>();

  @Input() label?: string;
  @Input() placeholder: string = '';
  @Input() inputClass: string = '';
  @Input() isTextarea: boolean = false;
  @Input() rows: number = 3;
  @Input() helpText?: string;
  @Input() maxlength?: number;
  @Input() globalLang?: Language;

  activeLang = signal<Language>('en');

  data: { en: string; el: string } = { en: '', el: '' };

  ngOnInit(): void {
    this.syncDataFromValue();
    if (this.globalLang) {
      this.activeLang.set(this.globalLang);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.syncDataFromValue();
    }
    if (changes['globalLang'] && this.globalLang) {
      this.activeLang.set(this.globalLang);
    }
  }

  private syncDataFromValue(): void {
    this.data = normalizeI18n(this.value);
  }

  currentText(): string {
    return this.activeLang() === 'en' ? this.data.en : this.data.el;
  }

  toggleLang(): void {
    const next = this.activeLang() === 'en' ? 'el' : 'en';
    this.activeLang.set(next);
  }

  onTextChange(text: string): void {
    if (this.activeLang() === 'en') {
      this.data.en = text;
    } else {
      this.data.el = text;
    }
    this.valueChange.emit({ ...this.data });
  }

  computedPlaceholder(): string {
    if (this.activeLang() === 'el') {
      if (this.data.en) {
        return `[ΕΛ] Fallback: "${this.previewEn()}"`;
      }
      return this.placeholder ? `[ΕΛ] ${this.placeholder}` : '[Ελληνικά]';
    }
    return this.placeholder || '';
  }

  private previewEn(): string {
    if (!this.data.en) return '';
    return this.data.en.length > 30 ? this.data.en.substring(0, 30) + '…' : this.data.en;
  }
}
