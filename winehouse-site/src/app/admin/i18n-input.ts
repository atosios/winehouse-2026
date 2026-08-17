import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService, I18nText, Language, normalizeI18n } from '../core/i18n.service';

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

      <!-- Input Element without internal switcher -->
      <div>
        @if (isTextarea) {
          <textarea
            [rows]="rows"
            class="admin-field-input {{ inputClass }}"
            [ngModel]="currentText()"
            (ngModelChange)="onTextChange($event)"
            [placeholder]="computedPlaceholder()"
            [attr.maxlength]="maxlength || null"
          ></textarea>
        } @else {
          <input
            type="text"
            class="admin-field-input {{ inputClass }}"
            [ngModel]="currentText()"
            (ngModelChange)="onTextChange($event)"
            [placeholder]="computedPlaceholder()"
            [attr.maxlength]="maxlength || null"
          />
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
  private i18n = inject(I18nService);

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

  data: { en: string; el: string } = { en: '', el: '' };

  get effectiveLang(): Language {
    return this.globalLang || this.i18n.currentLang();
  }

  ngOnInit(): void {
    this.syncDataFromValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.syncDataFromValue();
    }
  }

  private syncDataFromValue(): void {
    this.data = normalizeI18n(this.value);
  }

  currentText(): string {
    return this.effectiveLang === 'en' ? this.data.en : this.data.el;
  }

  onTextChange(text: string): void {
    if (this.effectiveLang === 'en') {
      this.data.en = text;
    } else {
      this.data.el = text;
    }
    this.valueChange.emit({ ...this.data });
  }

  computedPlaceholder(): string {
    if (this.effectiveLang === 'el') {
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
