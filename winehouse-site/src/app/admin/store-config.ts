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
        <div class="admin-card space-y-4">
          <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Currency Display &amp; Locale</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="admin-field-label">Store Currency *</label>
              <select
                [ngModel]="selectedCurrencyKey"
                (ngModelChange)="onCurrencyChange($event)"
                class="admin-field-input"
              >
                <option value="EUR">Euros (€ - EUR)</option>
                <option value="USD">US Dollars ($ - USD)</option>
              </select>
            </div>

            <div>
              <label class="admin-field-label">Symbol Position</label>
              <select [(ngModel)]="config.currency_position" class="admin-field-input">
                <option value="before">Before Amount (e.g. {{ config.currency_symbol }} 45.00)</option>
                <option value="after">After Amount (e.g. 45.00 {{ config.currency_symbol }})</option>
              </select>
            </div>
          </div>

          <!-- Live Currency Preview -->
          <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between">
            <span class="text-xs text-slate-500">Live Price Formatting:</span>
            <span class="text-xs font-bold text-slate-900">
              {{ config.currency_position === 'before' ? config.currency_symbol + ' 45.00' : '45.00 ' + config.currency_symbol }}
              <span class="text-[11px] text-slate-400 font-normal ml-1">({{ config.currency_code }})</span>
            </span>
          </div>
        </div>

        <div class="admin-card space-y-4">
          <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Store Operation Mode</h2>

          <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <span class="text-xs font-semibold text-slate-900 block">e-Shop Purchasing Enabled</span>
              <span class="text-xs text-slate-500">
                {{ config.store_enabled ? 'Customers can add bottles to basket and submit allocation checkouts.' : 'Store is in catalog-only mode (viewing only).' }}
              </span>
            </div>
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                [(ngModel)]="config.store_enabled"
                class="rounded border-slate-300 text-wine-600 focus:ring-wine-500"
              />
              <span>Active</span>
            </label>
          </div>
        </div>
      </div>
    }

    <!-- TAB 2: Categories Management -->
    @if (activeTab() === 'categories') {
      <div class="space-y-6">
        <div class="admin-card space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Product Categories</h2>
              <p class="text-xs text-slate-500">Define the catalog filters available to customers in the e-Shop.</p>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" (click)="addCategory()">
              + Add Category
            </button>
          </div>

          <div class="space-y-3">
            @for (cat of config.categories; track $index) {
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">#{{ $index + 1 }}</span>
                    <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-semibold uppercase">
                      {{ cat.key || 'NEW' }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button type="button" (click)="moveCatUp($index)" [disabled]="$index === 0" class="btn btn-secondary btn-xs">↑</button>
                    <button type="button" (click)="moveCatDown($index)" [disabled]="$index === config.categories.length - 1" class="btn btn-secondary btn-xs">↓</button>
                    <button type="button" (click)="removeCategory($index)" class="text-red-600 hover:text-red-800 text-xs font-semibold px-2 cursor-pointer">✕ Delete</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="admin-field-label">Category Code (Key) *</label>
                    <input
                      type="text"
                      [(ngModel)]="cat.key"
                      placeholder="e.g. RESERVE"
                      class="admin-field-input uppercase"
                    />
                  </div>

                  <div class="sm:col-span-2">
                    <wh-i18n-input label="Category Display Label (Bilingual)" [(value)]="cat.label" />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- TAB 3: Tax & Shipping -->
    @if (activeTab() === 'shipping') {
      <div class="space-y-6">
        <div class="admin-card space-y-4">
          <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">VAT &amp; Taxes</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="admin-field-label">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                [(ngModel)]="config.tax_rate"
                placeholder="24"
                class="admin-field-input"
              />
            </div>

            <div class="flex items-center pt-5">
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

        <div class="admin-card space-y-4">
          <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Shipping &amp; Orders Rules</h2>

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
              <label class="admin-field-label">Free Shipping Threshold (€)</label>
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
    }

    <!-- TAB 4: Bank Settlement Account -->
    @if (activeTab() === 'banking') {
      <div class="space-y-6">
        <div class="admin-card space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h2 class="text-sm font-bold text-slate-900">Direct Bank Settlement Details</h2>
            <p class="text-xs text-slate-500">These details are provided to customers upon allocation submission for bank wire payments.</p>
          </div>

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
    }
  `,
})
export class AdminStoreConfig implements OnInit {
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);

  readonly activeTab = signal<'general' | 'categories' | 'shipping' | 'banking'>('general');
  readonly saving = signal(false);
  readonly savedMessage = signal('');

  config: StoreConfig = JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG));

  get selectedCurrencyKey(): string {
    return this.config.currency_code === 'USD' ? 'USD' : 'EUR';
  }

  onCurrencyChange(key: string): void {
    if (key === 'USD') {
      this.config.currency_code = 'USD';
      this.config.currency_symbol = '$';
    } else {
      this.config.currency_code = 'EUR';
      this.config.currency_symbol = '€';
    }
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings.store_config) {
          this.config = {
            ...DEFAULT_STORE_CONFIG,
            ...settings.store_config,
            categories: Array.isArray(settings.store_config.categories)
              ? settings.store_config.categories
              : DEFAULT_STORE_CONFIG.categories,
          };
        }
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
    this.api
      .updateSettings({
        store_config: this.config,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.savedMessage.set('Store configuration saved successfully.');
          setTimeout(() => this.savedMessage.set(''), 4000);
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }
}
