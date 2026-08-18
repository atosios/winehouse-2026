import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, StoreConfig, StoreCategory } from './api';
import { SiteSettingsService, DEFAULT_STORE_CONFIG } from '../core/site-settings.service';
import { WhI18nInput } from './i18n-input';

@Component({
  selector: 'wh-admin-store-config',
  imports: [FormsModule, WhI18nInput],
  template: `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Store Configuration</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage currency, tax, shipping rules, bank settlement details, and product categories.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-primary self-start sm:self-auto"
          [disabled]="saving()"
          (click)="saveConfig()"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>{{ saving() ? 'Saving…' : 'Save Settings' }}</span>
        </button>
      </div>
    </div>

    <!-- Feedback Message -->
    @if (savedMessage()) {
      <div class="p-3.5 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
        <span class="flex items-center gap-1.5">
          <span>✓</span> {{ savedMessage() }}
        </span>
        <button type="button" class="text-2xs text-emerald-900 underline font-normal cursor-pointer" (click)="savedMessage.set('')">Dismiss</button>
      </div>
    }

    @if (error()) {
      <div class="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
        <span class="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> {{ error() }}
        </span>
        <button type="button" class="text-2xs text-red-900 underline font-normal cursor-pointer" (click)="error.set('')">Dismiss</button>
      </div>
    }

    <!-- Segmented Navigation Tabs -->
    <div class="admin-tabs mb-6">
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">Currency &amp; General</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'categories'" (click)="activeTab.set('categories')">Categories ({{ config.categories.length }})</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'shipping'" (click)="activeTab.set('shipping')">Tax &amp; Shipping</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'banking'" (click)="activeTab.set('banking')">Bank Settlement</button>
    </div>

    <!-- TAB 1: Currency & General -->
    @if (activeTab() === 'general') {
      <div class="space-y-6">
        <!-- Currency Display Section -->
        <div>
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Currency &amp; Pricing</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Configure currency symbol, ISO code, and prefix/suffix placement throughout the cellar store.
            </p>
          </div>

          <div class="admin-card space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label">Currency Preset</label>
                <select
                  [ngModel]="selectedCurrencyKey"
                  (ngModelChange)="onCurrencyPresetChange($event)"
                  class="admin-field-input font-medium"
                >
                  <option value="EUR">Euros (€ - EUR)</option>
                  <option value="USD">US Dollars ($ - USD)</option>
                  <option value="GBP">British Pounds (£ - GBP)</option>
                  <option value="CHF">Swiss Francs (CHF)</option>
                  <option value="AUD">Australian Dollars (A$)</option>
                  <option value="CAD">Canadian Dollars (C$)</option>
                  <option value="JPY">Japanese Yen (¥)</option>
                  <option value="CUSTOM">Custom Currency…</option>
                </select>
              </div>

              <div>
                <label class="admin-field-label">ISO Code</label>
                <input
                  type="text"
                  [(ngModel)]="config.currency_code"
                  class="admin-field-input uppercase font-mono font-bold"
                  placeholder="EUR"
                />
              </div>

              <div>
                <label class="admin-field-label">Symbol</label>
                <input
                  type="text"
                  [(ngModel)]="config.currency_symbol"
                  class="admin-field-input font-bold text-center"
                  placeholder="€"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label class="admin-field-label">Symbol Position</label>
                <select [(ngModel)]="config.currency_position" class="admin-field-input font-medium">
                  <option value="before">Before Amount (e.g. {{ config.currency_symbol || '€' }} 45.00)</option>
                  <option value="after">After Amount (e.g. 45.00 {{ config.currency_symbol || '€' }})</option>
                </select>
              </div>

              <div>
                <label class="admin-field-label">Price Preview</label>
                <div class="h-9 px-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between">
                  <span class="text-2xs text-slate-500 font-mono">Sample Bottle:</span>
                  <span class="text-xs font-mono font-bold text-wine-800">
                    {{ formatPreview(45) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Store Operation Section -->
        <div class="pt-4 border-t border-slate-200/80">
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Operation &amp; Stock</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Enable active checkouts or keep in catalog mode. Set thresholds for the "Low Stock" indicator badge.
            </p>
          </div>

          <div class="admin-card space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div class="pr-3">
                  <span class="text-xs font-bold text-slate-900 block">e-Shop Checkout Active</span>
                  <span class="text-2xs text-slate-500 block mt-0.5">
                    {{ config.store_enabled ? 'Customers can add allocations to cart and checkout.' : 'Store is in showcase-only mode (viewing only).' }}
                  </span>
                </div>
                <label class="ios-toggle shrink-0">
                  <input
                    type="checkbox"
                    [(ngModel)]="config.store_enabled"
                  />
                  <span class="ios-toggle-slider"></span>
                </label>
              </div>

              <div class="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <label class="text-xs font-bold text-slate-900 block">Low Stock Badge Threshold</label>
                  <p class="text-2xs text-slate-500 mt-0.5">Bottles at or below this count show "LOW STOCK" badge.</p>
                </div>
                <input
                  type="number"
                  min="1"
                  max="50"
                  [(ngModel)]="config.low_stock_threshold"
                  class="admin-field-input w-24 text-center font-bold shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- TAB 2: Categories Management -->
    @if (activeTab() === 'categories') {
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Product Categories</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Define the wine category filters (Soil, Reserve, Vintage, Cellar) presented to customers in the catalog.
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm self-start sm:self-auto flex items-center gap-1.5 cursor-pointer" (click)="addCategory()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Category</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cat of config.categories; track $index) {
            <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono font-bold text-slate-400">#{{ $index + 1 }}</span>
                  <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-2xs font-mono font-bold uppercase">
                    {{ cat.key || 'NEW' }}
                  </span>
                </div>

                <div class="flex items-center gap-1">
                  <button type="button" (click)="moveCatUp($index)" [disabled]="$index === 0" class="btn btn-secondary btn-xs !py-0.5 !px-1.5" title="Move Up">↑</button>
                  <button type="button" (click)="moveCatDown($index)" [disabled]="$index === config.categories.length - 1" class="btn btn-secondary btn-xs !py-0.5 !px-1.5" title="Move Down">↓</button>
                  <button type="button" (click)="removeCategory($index)" class="text-red-500 hover:text-red-700 text-xs px-1 cursor-pointer font-bold" title="Delete">✕</button>
                </div>
              </div>

              <div class="space-y-2.5">
                <div>
                  <label class="admin-field-label">Category Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="cat.key"
                    placeholder="e.g. RESERVE"
                    class="admin-field-input uppercase font-mono font-bold text-xs"
                  />
                </div>

                <wh-i18n-input label="Display Label (Bilingual)" [(value)]="cat.label" />
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- TAB 3: Tax & Shipping -->
    @if (activeTab() === 'shipping') {
      <div class="space-y-6">
        <!-- VAT & Tax Section -->
        <div>
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">VAT &amp; Taxes</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Define the percentage applied to items and whether bottle retail prices are inclusive of taxes.
            </p>
          </div>

          <div class="admin-card">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label class="admin-field-label">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  [(ngModel)]="config.tax_rate"
                  placeholder="24"
                  class="admin-field-input font-bold"
                />
              </div>

              <div class="sm:pt-5">
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="config.tax_included"
                    class="rounded border-slate-300 text-wine-600 focus:ring-wine-500"
                  />
                  <span>Prices are inclusive of VAT / Taxes</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Shipping & Order Thresholds -->
        <div class="pt-4 border-t border-slate-200/80">
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Dispatch &amp; Order Rules</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Standard cellar delivery fee, complimentary free courier shipping threshold, and checkout minimums.
            </p>
          </div>

          <div class="admin-card">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label">Standard Dispatch Fee (€)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="config.shipping_fee"
                  placeholder="15.00"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">Free Dispatch Threshold (€)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="config.free_shipping_threshold"
                  placeholder="150.00"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">Minimum Order Value (€)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="config.order_minimum_amount"
                  placeholder="0.00"
                  class="admin-field-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- TAB 4: Bank Settlement Account -->
    @if (activeTab() === 'banking') {
      <div class="space-y-6">
        <div>
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Bank Wire Settlement</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Official company IBAN and SWIFT/BIC coordinates displayed to buyers for wire transfer checkouts.
            </p>
          </div>

          <div class="admin-card">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="admin-field-label">Beneficiary Company / Name</label>
                <input
                  type="text"
                  [(ngModel)]="config.bank_beneficiary"
                  placeholder="The Winehouse Ltd"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">Bank Institution Name</label>
                <input
                  type="text"
                  [(ngModel)]="config.bank_name"
                  placeholder="National Bank of Greece"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">IBAN Number</label>
                <input
                  type="text"
                  [(ngModel)]="config.bank_iban"
                  placeholder="GR12 0110 1250 0000 1234 5678 901"
                  class="admin-field-input uppercase font-mono text-xs"
                />
              </div>

              <div>
                <label class="admin-field-label">BIC / SWIFT Code</label>
                <input
                  type="text"
                  [(ngModel)]="config.bank_bic"
                  placeholder="ETHNGRAA"
                  class="admin-field-input uppercase font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminStoreConfig implements OnInit {
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);

  readonly activeTab = signal<'general' | 'categories' | 'shipping' | 'banking'>('general');
  readonly saving = signal(false);
  readonly savedMessage = signal('');
  readonly error = signal('');
  readonly isLoaded = signal(false);

  config: StoreConfig = {
    ...DEFAULT_STORE_CONFIG,
    categories: [],
  };

  readonly currencyPresets: Record<string, { code: string; symbol: string }> = {
    EUR: { code: 'EUR', symbol: '€' },
    USD: { code: 'USD', symbol: '$' },
    GBP: { code: 'GBP', symbol: '£' },
    CHF: { code: 'CHF', symbol: 'CHF' },
    AUD: { code: 'AUD', symbol: 'A$' },
    CAD: { code: 'CAD', symbol: 'C$' },
    JPY: { code: 'JPY', symbol: '¥' },
  };

  get selectedCurrencyKey(): string {
    const code = (this.config.currency_code || '').toUpperCase();
    if (this.currencyPresets[code]) {
      return code;
    }
    return 'CUSTOM';
  }

  onCurrencyPresetChange(key: string): void {
    if (key === 'CUSTOM') return;
    const preset = this.currencyPresets[key];
    if (preset) {
      this.config.currency_code = preset.code;
      this.config.currency_symbol = preset.symbol;
    }
  }

  formatPreview(amount: number): string {
    const sym = this.config.currency_symbol || '€';
    const formatted = amount.toFixed(2);
    return this.config.currency_position === 'after' ? `${formatted} ${sym}` : `${sym} ${formatted}`;
  }

  ngOnInit(): void {
    // 1. If settings service has already loaded, initialize from reactive state
    if (this.settingsService.isLoaded()) {
      const current = this.settingsService.settings();
      if (current && current.store_config) {
        this.applyStoreConfig(current.store_config);
      }
    }

    // 2. Fetch fresh from API to ensure database parity
    this.loadConfig();
  }

  private applyStoreConfig(sc: Partial<StoreConfig>): void {
    if (!sc) return;
    this.config = {
      ...DEFAULT_STORE_CONFIG,
      ...sc,
      currency_code: sc.currency_code || DEFAULT_STORE_CONFIG.currency_code,
      currency_symbol: sc.currency_symbol || DEFAULT_STORE_CONFIG.currency_symbol,
      currency_position: sc.currency_position || DEFAULT_STORE_CONFIG.currency_position,
      tax_rate: Number(sc.tax_rate ?? DEFAULT_STORE_CONFIG.tax_rate),
      tax_included: Boolean(sc.tax_included ?? DEFAULT_STORE_CONFIG.tax_included),
      store_enabled: Boolean(sc.store_enabled ?? DEFAULT_STORE_CONFIG.store_enabled),
      free_shipping_threshold: Number(sc.free_shipping_threshold ?? DEFAULT_STORE_CONFIG.free_shipping_threshold),
      shipping_fee: Number(sc.shipping_fee ?? DEFAULT_STORE_CONFIG.shipping_fee),
      order_minimum_amount: Number(sc.order_minimum_amount ?? DEFAULT_STORE_CONFIG.order_minimum_amount),
      bank_beneficiary: sc.bank_beneficiary || '',
      bank_name: sc.bank_name || '',
      bank_iban: sc.bank_iban || '',
      bank_bic: sc.bank_bic || '',
      categories: Array.isArray(sc.categories)
        ? JSON.parse(JSON.stringify(sc.categories))
        : JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG.categories)),
      low_stock_threshold: Number(sc.low_stock_threshold ?? DEFAULT_STORE_CONFIG.low_stock_threshold ?? 5),
    };
    this.isLoaded.set(true);
  }

  loadConfig(): void {
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings && settings.store_config) {
          this.applyStoreConfig(settings.store_config);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not load store configuration from database.');
      },
    });
  }

  addCategory(): void {
    this.config.categories.push({
      key: 'NEW_CAT',
      label: { en: 'New Category', el: 'Νέα Κατηγορία' },
      enabled: true,
    });
  }

  removeCategory(index: number): void {
    this.config.categories.splice(index, 1);
  }

  moveCatUp(index: number): void {
    if (index === 0) return;
    const item = this.config.categories.splice(index, 1)[0];
    this.config.categories.splice(index - 1, 0, item);
  }

  moveCatDown(index: number): void {
    if (index === this.config.categories.length - 1) return;
    const item = this.config.categories.splice(index, 1)[0];
    this.config.categories.splice(index + 1, 0, item);
  }

  saveConfig(): void {
    this.saving.set(true);
    this.error.set('');
    this.savedMessage.set('');

    const payload: StoreConfig = {
      currency_code: this.config.currency_code || 'EUR',
      currency_symbol: this.config.currency_symbol || '€',
      currency_position: this.config.currency_position || 'before',
      tax_rate: Number(this.config.tax_rate) || 0,
      tax_included: Boolean(this.config.tax_included),
      store_enabled: Boolean(this.config.store_enabled),
      free_shipping_threshold: Number(this.config.free_shipping_threshold) || 0,
      shipping_fee: Number(this.config.shipping_fee) || 0,
      order_minimum_amount: Number(this.config.order_minimum_amount) || 0,
      bank_beneficiary: this.config.bank_beneficiary || '',
      bank_name: this.config.bank_name || '',
      bank_iban: this.config.bank_iban || '',
      bank_bic: this.config.bank_bic || '',
      categories: this.config.categories || [],
      low_stock_threshold: Number(this.config.low_stock_threshold) || 5,
    };

    this.settingsService
      .update({
        store_config: payload,
      })
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.savedMessage.set('Store configuration saved to database successfully ✓');
          if (saved && saved.store_config) {
            this.applyStoreConfig(saved.store_config);
          }
          setTimeout(() => this.savedMessage.set(''), 4000);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.message || 'Could not save store configuration to database.');
        },
      });
  }
}
