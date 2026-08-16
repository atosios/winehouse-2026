import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WhMediaPicker } from './media-picker';
import { WhI18nInput } from './i18n-input';
import {
  AdminApi,
  HomepageContent,
  AboutPageContent,
  ShopPageContent,
  ContactPageContent,
  MaintenancePageContent,
  SiteSettings,
  ServiceItemContent,
  CraftMetricContent,
  CellarItemContent,
  PressQuoteContent,
  TestimonialContent,
  ContactSocialLink,
  FooterLinkContent,
  AboutBenchmarkItem,
  AboutValueItem,
  AboutProtocolItem,
  ShopCategoryItem,
  ShopBottleItem,
  ContactSubjectOption,
} from './api';
import {
  SiteSettingsService,
  DEFAULT_HOMEPAGE_CONTENT,
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_SHOP_CONTENT,
  DEFAULT_CONTACT_PAGE_CONTENT,
  DEFAULT_MAINTENANCE_CONTENT,
} from '../core/site-settings.service';
import { Language, I18nText, normalizeI18n } from '../core/i18n.service';

export type EditablePageKey = 'home' | 'about' | 'shop' | 'contact' | 'maintenance';

@Component({
  selector: 'wh-admin-homepage-editor',
  imports: [FormsModule, RouterLink, WhMediaPicker, WhI18nInput],
  template: `
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 text-2xs font-bold uppercase rounded bg-wine-100 text-wine-800 font-mono">Global Studio</span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Page Content Editor</h1>
        </div>
        <p class="text-xs text-slate-500">Select any page below to modify its content, headlines, images, and translations live.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
        <!-- Global Language Flag Toggle (Toggles all inputs) -->
        <button
          type="button"
          class="p-1.5 text-lg leading-none rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer select-none transition-transform hover:scale-110"
          (click)="toggleGlobalLang()"
          [title]="globalEditingLang() === 'en' ? 'Global: English (🇬🇧) — Click to switch all inputs to Greek (🇬🇷)' : 'Global: Greek (🇬🇷) — Click to switch all inputs to English (🇬🇧)'"
        >
          {{ globalEditingLang() === 'en' ? '🇬🇧' : '🇬🇷' }}
        </button>

        <a
          [routerLink]="activePreviewPath"
          target="_blank"
          class="btn btn-secondary btn-sm"
          [title]="'Open live ' + activePageLabel + ' in a new tab'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>Preview {{ activePageLabel }}</span>
        </a>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          (click)="resetActivePageToDefaults()"
          [title]="'Reset ' + activePageLabel + ' content back to defaults'"
        >
          <span>Reset Defaults</span>
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="saving()"
          (click)="saveActivePage()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>{{ saving() ? 'Saving…' : 'Save ' + activePageLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Alert / Toast Messages -->
    @if (savedMessage()) {
      <div class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>✓</span>
          <span>{{ savedMessage() }}</span>
        </div>
        <button type="button" (click)="savedMessage.set('')" class="text-emerald-600 hover:text-emerald-900 font-bold cursor-pointer">✕</button>
      </div>
    }
    @if (error()) {
      <div class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>⚠</span>
          <span>{{ error() }}</span>
        </div>
        <button type="button" (click)="error.set('')" class="text-red-600 hover:text-red-900 font-bold cursor-pointer">✕</button>
      </div>
    }

    <!-- ============================================================ PAGE SELECTOR BAR -->
    <div class="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs mb-6 flex flex-wrap items-center gap-2">
      <span class="text-2xs font-mono font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Select Page:</span>
      @for (page of pages; track page.key) {
        <button
          type="button"
          (click)="selectPage(page.key)"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-tight transition-all duration-200 cursor-pointer"
          [class.bg-slate-900]="activePage() === page.key"
          [class.text-white]="activePage() === page.key"
          [class.shadow-sm]="activePage() === page.key"
          [class.bg-slate-50]="activePage() !== page.key"
          [class.text-slate-600]="activePage() !== page.key"
          [class.hover:bg-slate-100]="activePage() !== page.key"
          [class.hover:text-slate-900]="activePage() !== page.key"
        >
          <span class="text-sm">{{ page.icon }}</span>
          <span>{{ page.label }}</span>
          <span class="text-2xs opacity-60 font-mono font-normal">({{ page.route }})</span>
        </button>
      }
    </div>

    <!-- ========================================================================================= -->
    <!-- 1. HOMEPAGE EDITOR                                                                        -->
    <!-- ========================================================================================= -->
    @if (activePage() === 'home') {
      <!-- Segmented Section Tabs (Named by Section Tag) -->
      <div class="admin-tabs overflow-x-auto pb-1 mb-6">
        @for (tab of homeSectionTabs; track tab.id) {
          <button
            type="button"
            class="admin-tab whitespace-nowrap font-mono text-xs font-bold"
            [class.active]="activeHomeTab() === tab.id"
            (click)="activeHomeTab.set(tab.id)"
          >
            <span>{{ getHomeSectionTag(tab.id) }}</span>
          </button>
        }
      </div>

      <!-- TAB: HERO -->
      @if (activeHomeTab() === 'hero') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('hero') }}</h2>
              <span class="admin-badge admin-badge-live">Sticky Canvas</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag / Breadcrumb" [(value)]="content.hero.tag" [globalLang]="globalEditingLang()" helperText="e.g. / HERO or / ATELIER" />
              <wh-i18n-input label="Small Prefix" [(value)]="content.hero.small_prefix" [globalLang]="globalEditingLang()" helperText="Upper serif script, e.g. The" />
              <wh-i18n-input label="Main Big Title" [(value)]="content.hero.big_title" [globalLang]="globalEditingLang()" helperText="Giant editorial display title, e.g. Winehouse" />
              
              <div class="flex items-center gap-3 pt-6">
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" [(ngModel)]="content.hero.show_stain" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                  <span>Show Wine Stain Accent Mark</span>
                </label>
              </div>

              <div class="md:col-span-2">
                <wh-media-picker
                  label="Primary Hero Video (MP4 / WebM)"
                  [(value)]="content.hero.video_url"
                  helperText="Primary background ambient loop video (e.g. def.mp4 or hero_video.mp4)"
                />
              </div>

              <div class="md:col-span-2">
                <wh-media-picker
                  label="Fallback / Alternative Video"
                  [(value)]="content.hero.video_alt_url"
                  helperText="Fallback video if primary stream fails to load"
                />
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: INTRO -->
      @if (activeHomeTab() === 'intro') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('intro') }}</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="content.intro.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                <span>Section Enabled</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag" [(value)]="content.intro.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Tape Sticker Label" [(value)]="content.intro.tape_sticker" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Heading Line 1" [(value)]="content.intro.heading_line1" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Heading Line 2" [(value)]="content.intro.heading_line2" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Philosophy Label" [(value)]="content.intro.philosophy_label" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Philosophy Quote" [(value)]="content.intro.philosophy_quote" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              
              <div class="md:col-span-2">
                <wh-media-picker label="Intro Showcase Image" [(value)]="content.intro.image_url" helperText="Editorial fashion portrait" />
              </div>
              <wh-i18n-input label="Image Tag Pill" [(value)]="content.intro.image_tag" [globalLang]="globalEditingLang()" />
              <div>
                <label class="admin-field-label">Monogram Stamp (e.g. WH)</label>
                <input type="text" [(ngModel)]="content.intro.monogram" class="admin-field-input uppercase" />
              </div>
              <wh-i18n-input label="Vertical Banner Text" [(value)]="content.intro.vertical_banner" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="CTA Circular Badge Text" [(value)]="content.intro.cta_text" [globalLang]="globalEditingLang()" />
              <div class="md:col-span-2">
                <label class="admin-field-label">CTA Link / Route</label>
                <input type="text" [(ngModel)]="content.intro.cta_link" class="admin-field-input" />
              </div>
            </div>

            <!-- Bullet Points -->
            <div class="mt-6 pt-5 border-t border-slate-100">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">Bullet Commitments</span>
                <button type="button" class="btn btn-secondary btn-xs" (click)="addIntroBullet()">+ Add Bullet</button>
              </div>
              <div class="space-y-3">
                @for (bullet of content.intro.bullet_points; track $index) {
                  <div class="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div class="flex-1">
                      <wh-i18n-input [label]="'Bullet #' + ($index + 1)" [(value)]="content.intro.bullet_points[$index]" [globalLang]="globalEditingLang()" />
                    </div>
                    <button type="button" (click)="removeIntroBullet($index)" class="text-red-500 hover:text-red-700 p-2 text-xs font-bold cursor-pointer mt-4" title="Delete bullet">✕</button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: MANIFESTO -->
      @if (activeHomeTab() === 'manifesto') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('manifesto') }}</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="content.manifesto.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                <span>Section Enabled</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag" [(value)]="content.manifesto.tag" [globalLang]="globalEditingLang()" />
              <div>
                <label class="admin-field-label">Stamp Center Icon (e.g. 🍇)</label>
                <input type="text" [(ngModel)]="content.manifesto.stamp_icon" class="admin-field-input" />
              </div>
              <div class="md:col-span-2">
                <wh-i18n-input label="Main Headline" [(value)]="content.manifesto.headline" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <div class="md:col-span-2">
                <wh-i18n-input label="Paragraph 1 (Narrative)" [(value)]="content.manifesto.paragraph_1" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <div class="md:col-span-2">
                <wh-i18n-input label="Paragraph 2 (Narrative)" [(value)]="content.manifesto.paragraph_2" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <wh-i18n-input label="Rotating Stamp Circular Text" [(value)]="content.manifesto.stamp_text" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Side Vertical Tags" [(value)]="content.manifesto.side_tags" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- TAB: SERVICES -->
      @if (activeHomeTab() === 'services') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('services') }}</h2>
              <div class="flex items-center gap-3">
                <button type="button" class="btn btn-secondary btn-xs" (click)="addServiceItem()">+ Add Pillar</button>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="content.services.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                  <span>Section Enabled</span>
                </label>
              </div>
            </div>

            <div class="mb-5">
              <wh-i18n-input label="Section Tag" [(value)]="content.services.tag" [globalLang]="globalEditingLang()" />
            </div>

            <div class="space-y-4">
              @for (srv of content.services.items; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 relative space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span class="font-mono text-xs font-bold text-wine-700">Pillar #{{ srv.num }}</span>
                    <div class="flex items-center gap-1.5">
                      <button type="button" (click)="moveServiceUp($index)" [disabled]="$index === 0" class="btn btn-secondary btn-xs">↑</button>
                      <button type="button" (click)="moveServiceDown($index)" [disabled]="$index === content.services.items.length - 1" class="btn btn-secondary btn-xs">↓</button>
                      <button type="button" (click)="removeServiceItem($index)" class="text-red-500 hover:text-red-700 px-2 text-xs font-bold cursor-pointer">✕ Delete</button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label class="admin-field-label">Number Code</label>
                      <input type="text" [(ngModel)]="srv.num" class="admin-field-input" />
                    </div>
                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Service Title" [(value)]="srv.title" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-3">
                      <wh-i18n-input label="Subtitle / Capabilities" [(value)]="srv.subtitle" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-3">
                      <label class="admin-field-label">Target Link / Route</label>
                      <input type="text" [(ngModel)]="srv.link" class="admin-field-input" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB: CRAFT -->
      @if (activeHomeTab() === 'craft') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('craft') }}</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="content.craft.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                <span>Section Enabled</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <wh-i18n-input label="Section Tag" [(value)]="content.craft.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Asterisk Banner Tape" [(value)]="content.craft.asterisk_tape" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Terracotta Kraft Note" [(value)]="content.craft.kraft_note" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>

            <!-- Metrics -->
            <div class="pt-4 border-t border-slate-100">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">Skill & Terroir Progress Bars</span>
                <button type="button" class="btn btn-secondary btn-xs" (click)="addCraftMetric()">+ Add Metric</button>
              </div>

              <div class="space-y-3">
                @for (m of content.craft.metrics; track $index) {
                  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <input type="text" [(ngModel)]="m.num" class="admin-input font-mono text-xs w-16" placeholder="01" />
                    <div class="flex-1 w-full">
                      <wh-i18n-input label="Metric Name" [(value)]="m.name" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="flex items-center gap-2">
                      <input type="number" [(ngModel)]="m.pct" min="0" max="100" class="admin-input font-mono text-xs w-20 text-right" />
                      <span class="text-xs font-mono font-bold text-slate-500">%</span>
                      <button type="button" (click)="removeCraftMetric($index)" class="text-red-500 hover:text-red-700 p-2 text-xs font-bold cursor-pointer">✕</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: CELLAR -->
      @if (activeHomeTab() === 'cellar') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('cellar') }}</h2>
              <div class="flex items-center gap-3">
                <button type="button" class="btn btn-secondary btn-xs" (click)="addCellarItem()">+ Add Bottle Card</button>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="content.cellar.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                  <span>Section Enabled</span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <wh-i18n-input label="Section Tag" [(value)]="content.cellar.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Bottom Link Label" [(value)]="content.cellar.view_all_text" [globalLang]="globalEditingLang()" />
              <div>
                <label class="admin-field-label">View All Route</label>
                <input type="text" [(ngModel)]="content.cellar.view_all_link" class="admin-field-input" />
              </div>
            </div>

            <!-- Bottle Cards -->
            <div class="space-y-5">
              @for (card of content.cellar.items; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span class="font-mono text-xs font-bold text-wine-700">Bottle Showcase #{{ $index + 1 }}</span>
                    <div class="flex items-center gap-1.5">
                      <button type="button" (click)="moveCellarUp($index)" [disabled]="$index === 0" class="btn btn-secondary btn-xs">↑</button>
                      <button type="button" (click)="moveCellarDown($index)" [disabled]="$index === content.cellar.items.length - 1" class="btn btn-secondary btn-xs">↓</button>
                      <button type="button" (click)="removeCellarItem($index)" class="text-red-500 hover:text-red-700 px-2 text-xs font-bold cursor-pointer">✕ Delete</button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <wh-i18n-input label="Bottle Name" [(value)]="card.name" [globalLang]="globalEditingLang()" />
                    <div>
                      <label class="admin-field-label">Card Link / Route</label>
                      <input type="text" [(ngModel)]="card.link" class="admin-field-input" />
                    </div>
                    <div class="sm:col-span-2">
                      <wh-media-picker label="Bottle Showcase Image" [(value)]="card.img" helperText="Card cover photo" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="admin-field-label">Tags (comma separated)</label>
                      <input
                        type="text"
                        [ngModel]="getCellarTagsString(card)"
                        (ngModelChange)="updateCellarTags(card, $event)"
                        class="admin-field-input uppercase"
                        placeholder="e.g. BRANDING, XINOMAVRO, 2021"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB: PRESS -->
      @if (activeHomeTab() === 'press') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('press') }}</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="content.press.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                <span>Section Enabled</span>
              </label>
            </div>

            <div class="mb-6">
              <wh-i18n-input label="Section Tag" [(value)]="content.press.tag" [globalLang]="globalEditingLang()" />
            </div>

            <!-- Press Quotes -->
            <div class="mb-8">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">Giant Critic Acclaim Quotes</span>
                <button type="button" class="btn btn-secondary btn-xs" (click)="addPressQuote()">+ Add Quote</button>
              </div>

              <div class="space-y-4">
                @for (q of content.press.quotes; track $index) {
                  <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold text-slate-600">Quote #{{ $index + 1 }}</span>
                      <button type="button" (click)="removePressQuote($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕ Delete</button>
                    </div>
                    <wh-i18n-input label="Quote Text" [(value)]="q.quote" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
                    <wh-i18n-input label="Author / Publication" [(value)]="q.author" [globalLang]="globalEditingLang()" />
                  </div>
                }
              </div>
            </div>

            <!-- Partner Logos -->
            <div class="pt-6 border-t border-slate-100">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono block">Partner Logos &amp; Press Outlets</span>
                  <span class="text-2xs text-slate-500">Provide an image logo or fallback text name. Grid wraps uniformly.</span>
                </div>
                <button type="button" class="btn btn-secondary btn-xs" (click)="addPressLogo()">+ Add Logo</button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (item of content.press.logos; track $index) {
                  <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold text-slate-600">Logo #{{ $index + 1 }}</span>
                      <button type="button" (click)="removePressLogo($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕</button>
                    </div>
                    <wh-i18n-input label="Outlet Name (Text Fallback)" [value]="getLogoNameValue($index)" (valueChange)="setLogoNameValue($index, $event)" [globalLang]="globalEditingLang()" />
                    <wh-media-picker label="Logo Image (Optional)" [value]="getLogoImgValue($index)" (valueChange)="setLogoImgValue($index, $event)" />
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: CONTACT -->
      @if (activeHomeTab() === 'contact') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('contact') }}</h2>
              <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" [(ngModel)]="content.contact.enabled" class="rounded border-slate-300 text-wine-600 focus:ring-wine-500" />
                <span>Section Enabled</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag" [(value)]="content.contact.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Submit Button Label" [(value)]="content.contact.button_text" [globalLang]="globalEditingLang()" />
              <div class="md:col-span-2">
                <wh-i18n-input label="Main Headline" [(value)]="content.contact.headline" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <div class="md:col-span-2">
                <wh-i18n-input label="Subtext" [(value)]="content.contact.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <wh-i18n-input label="Dispatch Kraft Note" [(value)]="content.contact.card_kraft_note" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- TAB: FOOTER -->
      @if (activeHomeTab() === 'footer') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">{{ getHomeSectionTag('footer') }}</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag" [(value)]="content.footer.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Brand Display Name" [(value)]="content.footer.brand_name" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Tagline" [(value)]="content.footer.tagline" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Copyright Notice" [(value)]="content.footer.copyright_text" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }
    }

    <!-- ========================================================================================= -->
    <!-- 2. ABOUT US PAGE EDITOR                                                                   -->
    <!-- ========================================================================================= -->
    @if (activePage() === 'about') {
      <div class="admin-tabs overflow-x-auto pb-1 mb-6">
        @for (tab of aboutSectionTabs; track tab.id) {
          <button
            type="button"
            class="admin-tab whitespace-nowrap font-mono text-xs font-bold"
            [class.active]="activeAboutTab() === tab.id"
            (click)="activeAboutTab.set(tab.id)"
          >
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- ABOUT: HERO -->
      @if (activeAboutTab() === 'hero') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">01 / HERO & HEADLINE</h2>
            <div class="space-y-5">
              <wh-i18n-input label="Section Tag / Breadcrumb" [(value)]="aboutContent.hero.tag" [globalLang]="globalEditingLang()" helperText="e.g. / OUR STORY & PHILOSOPHY" />
              <wh-i18n-input label="Main Editorial Headline" [(value)]="aboutContent.hero.headline" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Hero Subtext" [(value)]="aboutContent.hero.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- ABOUT: STORY & MANIFESTO -->
      @if (activeAboutTab() === 'story') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">02 / NARRATIVE & MANIFESTO CARD</h2>
            <div class="space-y-5">
              <wh-i18n-input label="Story Tag" [(value)]="aboutContent.story.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Lead Quote" [(value)]="aboutContent.story.quote" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Narrative Paragraph 1" [(value)]="aboutContent.story.body_1" [isTextarea]="true" [rows]="3" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Narrative Paragraph 2" [(value)]="aboutContent.story.body_2" [isTextarea]="true" [rows]="3" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Sommelier Team Note" [(value)]="aboutContent.story.note" [globalLang]="globalEditingLang()" />
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                <wh-i18n-input label="Terracotta Manifesto Tape" [(value)]="aboutContent.story.manifesto_tape" [globalLang]="globalEditingLang()" />
                <wh-i18n-input label="Terracotta Kraft Note" [(value)]="aboutContent.story.manifesto_note" [isTextarea]="true" [rows]="3" [globalLang]="globalEditingLang()" />
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ABOUT: BENCHMARKS -->
      @if (activeAboutTab() === 'benchmarks') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">03 / CELLAR BENCHMARKS (METRICS STRIP)</h2>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addAboutBenchmark()">+ Add Benchmark</button>
            </div>
            
            <div class="mb-5">
              <wh-i18n-input label="Section Tag" [(value)]="aboutContent.benchmarks.tag" [globalLang]="globalEditingLang()" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (item of aboutContent.benchmarks.items; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-wine-700">Metric Card #{{ $index + 1 }}</span>
                    <button type="button" (click)="removeAboutBenchmark($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕ Delete</button>
                  </div>
                  <div>
                    <label class="admin-field-label">Number / Metric Value (e.g. 120+, 100%, 18 yrs)</label>
                    <input type="text" [(ngModel)]="item.num" class="admin-field-input" />
                  </div>
                  <wh-i18n-input label="Metric Title" [(value)]="item.label" [globalLang]="globalEditingLang()" />
                  <wh-i18n-input label="Metric Subtext / Note" [(value)]="item.note" [globalLang]="globalEditingLang()" />
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ABOUT: HOUSE VALUES -->
      @if (activeAboutTab() === 'values') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">04 / HOUSE PRINCIPLES</h2>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addAboutValue()">+ Add Principle</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <wh-i18n-input label="Section Tag" [(value)]="aboutContent.values.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Main Headline" [(value)]="aboutContent.values.headline" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Subtext / Badge" [(value)]="aboutContent.values.subtext" [globalLang]="globalEditingLang()" />
            </div>

            <div class="space-y-4">
              @for (val of aboutContent.values.items; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-wine-700">Principle #{{ val.num }}</span>
                    <button type="button" (click)="removeAboutValue($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕ Delete</button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label class="admin-field-label">Number (e.g. 01)</label>
                      <input type="text" [(ngModel)]="val.num" class="admin-field-input" />
                    </div>
                    <div>
                      <label class="admin-field-label">Pill Tag (e.g. / ORIGIN)</label>
                      <input type="text" [(ngModel)]="val.tag" class="admin-field-input" />
                    </div>
                    <div class="sm:col-span-3">
                      <wh-i18n-input label="Principle Title" [(value)]="val.title" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-3">
                      <wh-i18n-input label="Principle Narrative" [(value)]="val.text" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ABOUT: PROTOCOLS -->
      @if (activeAboutTab() === 'protocols') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">05 / CELLAR PROCESS &amp; PROTOCOLS</h2>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addAboutProtocol()">+ Add Protocol</button>
            </div>

            <div class="mb-5">
              <wh-i18n-input label="Section Tag" [(value)]="aboutContent.protocols.tag" [globalLang]="globalEditingLang()" />
            </div>

            <div class="space-y-4">
              @for (prot of aboutContent.protocols.items; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-wine-700">Protocol #{{ prot.num }}</span>
                    <button type="button" (click)="removeAboutProtocol($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕ Delete</button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label class="admin-field-label">Protocol Key (e.g. A, B, C)</label>
                      <input type="text" [(ngModel)]="prot.num" class="admin-field-input" />
                    </div>
                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Protocol Title" [(value)]="prot.title" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-3">
                      <wh-i18n-input label="Protocol Description" [(value)]="prot.desc" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ABOUT: CTA -->
      @if (activeAboutTab() === 'cta') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">06 / BOTTOM CTA SECTION</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Tape Sticker Note" [(value)]="aboutContent.cta.tape" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Main Headline" [(value)]="aboutContent.cta.headline" [globalLang]="globalEditingLang()" />
              <div class="md:col-span-2">
                <wh-i18n-input label="Subtext" [(value)]="aboutContent.cta.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <wh-i18n-input label="Shop Button Text" [(value)]="aboutContent.cta.button_shop_text" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Contact Button Text" [(value)]="aboutContent.cta.button_contact_text" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }
    }

    <!-- ========================================================================================= -->
    <!-- 3. E-SHOP & CELLAR PAGE EDITOR                                                            -->
    <!-- ========================================================================================= -->
    @if (activePage() === 'shop') {
      <div class="admin-tabs overflow-x-auto pb-1 mb-6">
        @for (tab of shopSectionTabs; track tab.id) {
          <button
            type="button"
            class="admin-tab whitespace-nowrap font-mono text-xs font-bold"
            [class.active]="activeShopTab() === tab.id"
            (click)="activeShopTab.set(tab.id)"
          >
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- SHOP: HERO -->
      @if (activeShopTab() === 'hero') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">01 / HERO &amp; HEADER</h2>
            <div class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <wh-i18n-input label="Section Tag" [(value)]="shopContent.hero.tag" [globalLang]="globalEditingLang()" />
                <wh-i18n-input label="Top Badge Label" [(value)]="shopContent.hero.badge" [globalLang]="globalEditingLang()" />
              </div>
              <wh-i18n-input label="Main Headline" [(value)]="shopContent.hero.headline" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Subtext" [(value)]="shopContent.hero.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- SHOP: CATEGORIES -->
      @if (activeShopTab() === 'categories') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 class="text-base font-bold text-slate-900 font-mono">02 / CATEGORY FILTER BUTTONS</h2>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addShopCategory()">+ Add Category</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (cat of shopContent.categories; track $index) {
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-wine-700">Category Filter #{{ $index + 1 }}</span>
                    <button type="button" (click)="removeShopCategory($index)" class="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">✕ Delete</button>
                  </div>
                  <div>
                    <label class="admin-field-label">Filter Key Code (e.g. ALL, VOLCANIC, NATURAL)</label>
                    <input type="text" [(ngModel)]="cat.key" class="admin-field-input uppercase" />
                  </div>
                  <wh-i18n-input label="Category Display Label" [(value)]="cat.label" [globalLang]="globalEditingLang()" />
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- SHOP: BOTTLE ALLOCATIONS -->
      @if (activeShopTab() === 'bottles') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 class="text-base font-bold text-slate-900 font-mono">03 / CELLAR BOTTLE ALLOCATIONS</h2>
                <span class="text-2xs text-slate-500">Edit prices, tasting notes, grape varietals, and cover imagery for each bottle.</span>
              </div>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addShopBottle()">+ Add New Bottle</button>
            </div>

            <div class="space-y-5">
              @for (bottle of shopContent.bottles; track bottle.id; let idx = $index) {
                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div class="flex items-center gap-3">
                      <span class="px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold">{{ bottle.name }} ({{ bottle.vintage }})</span>
                      <span class="font-mono text-xs text-wine-700 font-bold">{{ bottle.price }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button type="button" (click)="moveShopBottleUp(idx)" [disabled]="idx === 0" class="btn btn-secondary btn-xs">↑</button>
                      <button type="button" (click)="moveShopBottleDown(idx)" [disabled]="idx === shopContent.bottles.length - 1" class="btn btn-secondary btn-xs">↓</button>
                      <button type="button" (click)="removeShopBottle(idx)" class="text-red-500 hover:text-red-700 px-2 text-xs font-bold cursor-pointer">✕ Delete</button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label class="admin-field-label">Bottle Name</label>
                      <input type="text" [(ngModel)]="bottle.name" class="admin-field-input uppercase" />
                    </div>
                    <div>
                      <label class="admin-field-label">Vintage Year</label>
                      <input type="text" [(ngModel)]="bottle.vintage" class="admin-field-input" />
                    </div>
                    <div>
                      <label class="admin-field-label">Price</label>
                      <input type="text" [(ngModel)]="bottle.price" class="admin-field-input" />
                    </div>
                    <div>
                      <label class="admin-field-label">Category Match Key</label>
                      <select [(ngModel)]="bottle.category" class="admin-field-input">
                        @for (c of shopContent.categories; track c.key) {
                          <option [value]="c.key">{{ c.key }}</option>
                        }
                      </select>
                    </div>

                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Region / Origin" [(value)]="bottle.region" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Grape Varietal" [(value)]="bottle.varietal" [globalLang]="globalEditingLang()" />
                    </div>

                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Status Pill Label" [(value)]="bottle.status" [globalLang]="globalEditingLang()" helperText="e.g. LIMITED ALLOCATION" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="admin-field-label">Status Badge Background CSS</label>
                      <input type="text" [(ngModel)]="bottle.statusBg" class="admin-field-input" placeholder="bg-[#922e1b] or bg-[var(--color-foreground)]" />
                    </div>

                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Soil Composition" [(value)]="bottle.soil" [globalLang]="globalEditingLang()" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="admin-field-label">Alcohol (ABV)</label>
                      <input type="text" [(ngModel)]="bottle.alcohol" class="admin-field-input" placeholder="13.5%" />
                    </div>

                    <div class="sm:col-span-4">
                      <wh-i18n-input label="Sommelier Tasting Notes" [(value)]="bottle.tastingNote" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
                    </div>

                    <div class="sm:col-span-4">
                      <wh-media-picker label="Bottle Image" [(value)]="bottle.img" helperText="Card showcase bottle photo" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- SHOP: SOMMELIER CONCIERGE -->
      @if (activeShopTab() === 'concierge') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">04 / SOMMELIER CONCIERGE BANNER</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Tape Sticker" [(value)]="shopContent.concierge.tape" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Main Headline" [(value)]="shopContent.concierge.headline" [globalLang]="globalEditingLang()" />
              <div class="md:col-span-2">
                <wh-i18n-input label="Subtext" [(value)]="shopContent.concierge.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <wh-i18n-input label="Button Text" [(value)]="shopContent.concierge.button_text" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Bottom Kraft Note" [(value)]="shopContent.concierge.kraft_note" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }
    }

    <!-- ========================================================================================= -->
    <!-- 4. CONTACT PAGE EDITOR                                                                    -->
    <!-- ========================================================================================= -->
    @if (activePage() === 'contact') {
      <div class="admin-tabs overflow-x-auto pb-1 mb-6">
        @for (tab of contactSectionTabs; track tab.id) {
          <button
            type="button"
            class="admin-tab whitespace-nowrap font-mono text-xs font-bold"
            [class.active]="activeContactTab() === tab.id"
            (click)="activeContactTab.set(tab.id)"
          >
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- CONTACT: HERO -->
      @if (activeContactTab() === 'hero') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">01 / HERO &amp; HEADER</h2>
            <div class="space-y-5">
              <wh-i18n-input label="Section Tag" [(value)]="contactContent.hero.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Main Headline" [(value)]="contactContent.hero.headline" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Subtext" [(value)]="contactContent.hero.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- CONTACT: FORM & SUBJECTS -->
      @if (activeContactTab() === 'form') {
        <div class="space-y-6">
          <div class="admin-card">
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 class="text-base font-bold text-slate-900 font-mono">02 / CORRESPONDENCE FORM &amp; SUBJECT DROPDOWN</h2>
                <span class="text-2xs text-slate-500">Configure the options available in the atelier subject dropdown.</span>
              </div>
              <button type="button" class="btn btn-secondary btn-xs" (click)="addContactSubject()">+ Add Subject Option</button>
            </div>

            <div class="mb-6">
              <wh-i18n-input label="Submit Button Label" [(value)]="contactContent.form.button_text" [globalLang]="globalEditingLang()" />
            </div>

            <div class="space-y-3">
              @for (opt of contactContent.form.subjects; track $index) {
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div class="w-full sm:w-1/3">
                    <label class="admin-field-label">Value (Identifier)</label>
                    <input type="text" [(ngModel)]="opt.value" class="admin-field-input" />
                  </div>
                  <div class="flex-1 w-full">
                    <label class="admin-field-label">Dropdown Display Text</label>
                    <input type="text" [(ngModel)]="opt.label" class="admin-field-input uppercase" />
                  </div>
                  <button type="button" (click)="removeContactSubject($index)" class="text-red-500 hover:text-red-700 p-2 text-xs font-bold cursor-pointer mt-4 sm:mt-0">✕</button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- CONTACT: DISPATCH -->
      @if (activeContactTab() === 'dispatch') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">03 / CELLAR DISPATCH CARD</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Tape Sticker Label" [(value)]="contactContent.dispatch.tape" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Kraft Tape Note (Bottom)" [(value)]="contactContent.dispatch.kraft_note" [isTextarea]="true" [rows]="3" [globalLang]="globalEditingLang()" />
            </div>
          </div>
        </div>
      }

      <!-- CONTACT: SCHEDULE & LOCATION -->
      @if (activeContactTab() === 'schedule') {
        <div class="space-y-6">
          <div class="admin-card">
            <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">04 / SCHEDULE &amp; LOCATION SECTION</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <wh-i18n-input label="Section Tag" [(value)]="contactContent.schedule.tag" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Hours Card Title" [(value)]="contactContent.schedule.hours_title" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Hours Tape Sticker" [(value)]="contactContent.schedule.hours_tape" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Hours Card Footnote" [(value)]="contactContent.schedule.hours_note" [globalLang]="globalEditingLang()" />
              
              <wh-i18n-input label="Location Card Title" [(value)]="contactContent.schedule.location_title" [globalLang]="globalEditingLang()" />
              <wh-i18n-input label="Location Tape Sticker" [(value)]="contactContent.schedule.location_tape" [globalLang]="globalEditingLang()" />
              <div class="md:col-span-2">
                <wh-i18n-input label="Location Access Description" [(value)]="contactContent.schedule.location_desc" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
              </div>
              <div class="md:col-span-2">
                <wh-i18n-input label="Google Maps Button Label" [(value)]="contactContent.schedule.map_button_text" [globalLang]="globalEditingLang()" />
              </div>
            </div>
          </div>
        </div>
      }
    }

    <!-- ========================================================================================= -->
    <!-- 5. MAINTENANCE PAGE EDITOR                                                                -->
    <!-- ========================================================================================= -->
    @if (activePage() === 'maintenance') {
      <div class="space-y-6">
        <div class="admin-card">
          <h2 class="text-base font-bold text-slate-900 font-mono mb-4 border-b border-slate-100 pb-3">MAINTENANCE HOLDING SPACE</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <wh-i18n-input label="Tag / Breadcrumb" [(value)]="maintenanceContent.tag" [globalLang]="globalEditingLang()" helperText="e.g. / HOLDING STATE" />
            <wh-i18n-input label="Top Tape Badge" [(value)]="maintenanceContent.badge" [globalLang]="globalEditingLang()" helperText="e.g. CELLAR CURATION" />
            <div class="md:col-span-2">
              <wh-i18n-input label="Main Big Headline" [(value)]="maintenanceContent.headline" [globalLang]="globalEditingLang()" />
            </div>
            <div class="md:col-span-2">
              <wh-i18n-input label="Subtext / Explanation" [(value)]="maintenanceContent.subtext" [isTextarea]="true" [rows]="2" [globalLang]="globalEditingLang()" />
            </div>
            <div class="md:col-span-2">
              <wh-media-picker label="Ambient Background Video (MP4)" [(value)]="maintenanceContent.video_url" helperText="Video loop shown on maintenance page" />
            </div>
            <wh-i18n-input label="Video Badge Pill" [(value)]="maintenanceContent.video_badge" [globalLang]="globalEditingLang()" helperText="e.g. REOPENING SOON" />
            <wh-i18n-input label="Direct Inquiries Prefix" [(value)]="maintenanceContent.inquiry_prefix" [globalLang]="globalEditingLang()" helperText="e.g. Direct Inquiries:" />
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminHomepageEditor implements OnInit {
  private settingsService = inject(SiteSettingsService);

  readonly activePage = signal<EditablePageKey>('home');
  readonly globalEditingLang = signal<Language>('en');
  readonly saving = signal(false);
  readonly savedMessage = signal('');
  readonly error = signal('');

  /* Active tabs per page */
  readonly activeHomeTab = signal('hero');
  readonly activeAboutTab = signal('hero');
  readonly activeShopTab = signal('hero');
  readonly activeContactTab = signal('hero');

  /* Pages navigation */
  readonly pages: Array<{ key: EditablePageKey; label: string; route: string; icon: string }> = [
    { key: 'home', label: 'Homepage', route: '/', icon: '🏠' },
    { key: 'about', label: 'About Us', route: '/about', icon: '📖' },
    { key: 'shop', label: 'e-Shop & Cellar', route: '/shop', icon: '🍷' },
    { key: 'contact', label: 'Contact', route: '/contact', icon: '✉️' },
    { key: 'maintenance', label: 'Maintenance Mode', route: '/maintenance', icon: '🚧' },
  ];

  /* Sub-tabs */
  readonly homeSectionTabs = [
    { id: 'hero', defaultTag: '/ HERO' },
    { id: 'intro', defaultTag: '/ WINE ATELIER & CELLAR' },
    { id: 'manifesto', defaultTag: '/ MANIFESTO' },
    { id: 'services', defaultTag: '/ WHAT WE DO' },
    { id: 'craft', defaultTag: '/ EXPERTISE & CRAFT' },
    { id: 'cellar', defaultTag: '/ SELECTED WORK & CELLAR' },
    { id: 'press', defaultTag: '/ PRESS & WORDS' },
    { id: 'contact', defaultTag: '/ GET IN TOUCH' },
    { id: 'footer', defaultTag: '/ FOOTER' },
  ];

  readonly aboutSectionTabs = [
    { id: 'hero', label: '01. Hero' },
    { id: 'story', label: '02. Story & Manifesto' },
    { id: 'benchmarks', label: '03. Cellar Benchmarks' },
    { id: 'values', label: '04. Principles' },
    { id: 'protocols', label: '05. Protocols' },
    { id: 'cta', label: '06. Bottom CTA' },
  ];

  readonly shopSectionTabs = [
    { id: 'hero', label: '01. Hero & Badge' },
    { id: 'categories', label: '02. Category Filters' },
    { id: 'bottles', label: '03. Bottle Allocations' },
    { id: 'concierge', label: '04. Sommelier Concierge' },
  ];

  readonly contactSectionTabs = [
    { id: 'hero', label: '01. Hero' },
    { id: 'form', label: '02. Form & Subjects' },
    { id: 'dispatch', label: '03. Dispatch Card' },
    { id: 'schedule', label: '04. Hours & Location' },
  ];

  /* Content Models */
  content: HomepageContent = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONTENT));
  aboutContent: AboutPageContent = JSON.parse(JSON.stringify(DEFAULT_ABOUT_CONTENT));
  shopContent: ShopPageContent = JSON.parse(JSON.stringify(DEFAULT_SHOP_CONTENT));
  contactContent: ContactPageContent = JSON.parse(JSON.stringify(DEFAULT_CONTACT_PAGE_CONTENT));
  maintenanceContent: MaintenancePageContent = JSON.parse(JSON.stringify(DEFAULT_MAINTENANCE_CONTENT));

  ngOnInit(): void {
    this.syncFromSettings();
  }

  syncFromSettings(): void {
    const s = this.settingsService.settings();
    if (s.homepage_content) {
      this.content = JSON.parse(JSON.stringify(s.homepage_content));
    }
    if (s.about_content) {
      this.aboutContent = JSON.parse(JSON.stringify(s.about_content));
    }
    if (s.shop_content) {
      this.shopContent = JSON.parse(JSON.stringify(s.shop_content));
    }
    if (s.contact_content) {
      this.contactContent = JSON.parse(JSON.stringify(s.contact_content));
    }
    if (s.maintenance_content) {
      this.maintenanceContent = JSON.parse(JSON.stringify(s.maintenance_content));
    }
  }

  selectPage(key: EditablePageKey): void {
    this.activePage.set(key);
    this.savedMessage.set('');
    this.error.set('');
  }

  get activePreviewPath(): string {
    switch (this.activePage()) {
      case 'about':
        return '/about';
      case 'shop':
        return '/shop';
      case 'contact':
        return '/contact';
      case 'maintenance':
        return '/';
      default:
        return '/';
    }
  }

  get activePageLabel(): string {
    const found = this.pages.find((p) => p.key === this.activePage());
    return found ? found.label : 'Page';
  }

  toggleGlobalLang(): void {
    this.globalEditingLang.update((l) => (l === 'en' ? 'el' : 'en'));
  }

  getHomeSectionTag(id: string): string {
    const defaultItem = this.homeSectionTabs.find((t) => t.id === id);
    const defaultTag = defaultItem ? defaultItem.defaultTag : `/${id.toUpperCase()}`;

    const sec = (this.content as any)[id];
    if (sec && sec.tag) {
      const normalized = normalizeI18n(sec.tag);
      const str = normalized[this.globalEditingLang()] || normalized.en || normalized.el;
      if (str && str.trim().length > 0) {
        return str;
      }
    }
    return defaultTag;
  }

  saveActivePage(): void {
    this.saving.set(true);
    this.error.set('');
    this.savedMessage.set('');

    const payload: Partial<SiteSettings> = {};
    const page = this.activePage();

    if (page === 'home') {
      payload.homepage_content = this.content;
    } else if (page === 'about') {
      payload.about_content = this.aboutContent;
    } else if (page === 'shop') {
      payload.shop_content = this.shopContent;
    } else if (page === 'contact') {
      payload.contact_content = this.contactContent;
    } else if (page === 'maintenance') {
      payload.maintenance_content = this.maintenanceContent;
    }

    this.settingsService.update(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedMessage.set(`${this.activePageLabel} content updated & published live ✓`);
        setTimeout(() => this.savedMessage.set(''), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || `Could not save ${this.activePageLabel} content.`);
      },
    });
  }

  resetActivePageToDefaults(): void {
    const label = this.activePageLabel;
    if (confirm(`Are you sure you want to reset all content for ${label} back to default curation?`)) {
      const page = this.activePage();
      if (page === 'home') {
        this.content = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONTENT));
      } else if (page === 'about') {
        this.aboutContent = JSON.parse(JSON.stringify(DEFAULT_ABOUT_CONTENT));
      } else if (page === 'shop') {
        this.shopContent = JSON.parse(JSON.stringify(DEFAULT_SHOP_CONTENT));
      } else if (page === 'contact') {
        this.contactContent = JSON.parse(JSON.stringify(DEFAULT_CONTACT_PAGE_CONTENT));
      } else if (page === 'maintenance') {
        this.maintenanceContent = JSON.parse(JSON.stringify(DEFAULT_MAINTENANCE_CONTENT));
      }
      this.saveActivePage();
    }
  }

  /* ---------------- HOMEPAGE HELPERS ---------------- */
  addIntroBullet(): void {
    this.content.intro.bullet_points.push({ en: '+ NEW ATELIER COMMITMENT', el: '' });
  }

  removeIntroBullet(index: number): void {
    this.content.intro.bullet_points.splice(index, 1);
  }

  addServiceItem(): void {
    const nextNum = (this.content.services.items.length + 1).toString().padStart(2, '0');
    this.content.services.items.push({
      num: nextNum,
      title: { en: 'NEW SERVICE TITLE', el: '' },
      subtitle: { en: 'DETAILED SERVICE HIGHLIGHTS & CAPABILITIES', el: '' },
      link: '/contact',
    });
  }

  removeServiceItem(index: number): void {
    this.content.services.items.splice(index, 1);
  }

  moveServiceUp(index: number): void {
    if (index > 0) {
      const item = this.content.services.items.splice(index, 1)[0];
      this.content.services.items.splice(index - 1, 0, item);
    }
  }

  moveServiceDown(index: number): void {
    if (index < this.content.services.items.length - 1) {
      const item = this.content.services.items.splice(index, 1)[0];
      this.content.services.items.splice(index + 1, 0, item);
    }
  }

  addCraftMetric(): void {
    const nextNum = (this.content.craft.metrics.length + 1).toString().padStart(2, '0');
    this.content.craft.metrics.push({
      num: nextNum,
      name: { en: 'NEW CRAFT METRIC', el: '' },
      pct: 90,
    });
  }

  removeCraftMetric(index: number): void {
    this.content.craft.metrics.splice(index, 1);
  }

  addCellarItem(): void {
    this.content.cellar.items.push({
      name: { en: 'NEW BOTTLE', el: '' },
      font_style: 'font-serif tracking-wider font-semibold',
      img: 'cellar_ritual.jpg',
      tags: [{ en: 'EXCLUSIVE', el: '' }, { en: 'VINTAGE', el: '' }],
      link: '/shop',
    });
  }

  removeCellarItem(index: number): void {
    this.content.cellar.items.splice(index, 1);
  }

  moveCellarUp(index: number): void {
    if (index > 0) {
      const item = this.content.cellar.items.splice(index, 1)[0];
      this.content.cellar.items.splice(index - 1, 0, item);
    }
  }

  moveCellarDown(index: number): void {
    if (index < this.content.cellar.items.length - 1) {
      const item = this.content.cellar.items.splice(index, 1)[0];
      this.content.cellar.items.splice(index + 1, 0, item);
    }
  }

  getCellarTagsString(card: CellarItemContent): string {
    if (!card.tags || !Array.isArray(card.tags)) return '';
    return card.tags
      .map((t) => {
        if (!t) return '';
        if (typeof t === 'string') return t;
        return t.en || t.el || '';
      })
      .filter((s) => Boolean(s))
      .join(', ');
  }

  updateCellarTags(card: CellarItemContent, rawValue: string): void {
    card.tags = rawValue
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);
  }

  addPressQuote(): void {
    this.content.press.quotes.push({
      quote: { en: 'NEW CRITIC ACCLAIM QUOTE THAT CELEBRATES THE WINEHOUSE CRAFT.', el: '' },
      author: { en: '— PUBLICATION NAME', el: '' },
    });
  }

  removePressQuote(index: number): void {
    this.content.press.quotes.splice(index, 1);
  }

  getLogoNameValue(idx: number): I18nText {
    const item = this.content.press.logos[idx];
    if (item && typeof item === 'object' && 'name' in item) {
      return item.name;
    }
    return item;
  }

  setLogoNameValue(idx: number, val: any): void {
    const current = this.content.press.logos[idx];
    if (current && typeof current === 'object' && 'name' in current) {
      current.name = val;
    } else {
      this.content.press.logos[idx] = { name: val, image_url: '' };
    }
  }

  getLogoImgValue(idx: number): string {
    const item = this.content.press.logos[idx];
    if (item && typeof item === 'object' && 'image_url' in item) {
      return item.image_url || '';
    }
    return '';
  }

  setLogoImgValue(idx: number, url?: string): void {
    const safeUrl = url || '';
    const current = this.content.press.logos[idx];
    if (current && typeof current === 'object' && 'name' in current) {
      current.image_url = safeUrl;
    } else {
      this.content.press.logos[idx] = { name: current || '', image_url: safeUrl };
    }
  }

  addPressLogo(): void {
    this.content.press.logos.push({ name: { en: 'NEW PUBLICATION', el: '' }, image_url: '' });
  }

  removePressLogo(index: number): void {
    this.content.press.logos.splice(index, 1);
  }

  /* ---------------- ABOUT US HELPERS ---------------- */
  addAboutBenchmark(): void {
    this.aboutContent.benchmarks.items.push({
      num: '99+',
      label: { en: 'New Benchmark Metric', el: '' },
      note: { en: 'Description note for metric', el: '' },
    });
  }

  removeAboutBenchmark(index: number): void {
    this.aboutContent.benchmarks.items.splice(index, 1);
  }

  addAboutValue(): void {
    const num = (this.aboutContent.values.items.length + 1).toString().padStart(2, '0');
    this.aboutContent.values.items.push({
      num,
      title: { en: 'NEW HOUSE PRINCIPLE', el: '' },
      tag: '/ DISCIPLINE',
      text: { en: 'Principle narrative and commitment to craft and terroir.', el: '' },
    });
  }

  removeAboutValue(index: number): void {
    this.aboutContent.values.items.splice(index, 1);
  }

  addAboutProtocol(): void {
    const code = String.fromCharCode(65 + this.aboutContent.protocols.items.length);
    this.aboutContent.protocols.items.push({
      num: code,
      title: { en: 'New Cellar Protocol', el: '' },
      desc: { en: 'Detailed protocol standard and logistical guarantee.', el: '' },
    });
  }

  removeAboutProtocol(index: number): void {
    this.aboutContent.protocols.items.splice(index, 1);
  }

  /* ---------------- SHOP HELPERS ---------------- */
  addShopCategory(): void {
    this.shopContent.categories.push({
      key: 'NEW_CATEGORY',
      label: { en: 'NEW CATEGORY', el: '' },
    });
  }

  removeShopCategory(index: number): void {
    this.shopContent.categories.splice(index, 1);
  }

  addShopBottle(): void {
    const newId = 'bottle-' + Date.now();
    this.shopContent.bottles.push({
      id: newId,
      name: 'NEW BOTTLE',
      vintage: '2024',
      region: { en: 'Santorini, Greece', el: '' },
      varietal: { en: 'Assyrtiko', el: '' },
      category: this.shopContent.categories[0]?.key || 'ALL',
      price: '€ 50.00',
      status: { en: 'LIMITED ALLOCATION', el: '' },
      statusBg: 'bg-[#922e1b]',
      tastingNote: { en: 'Fresh acidity, crisp minerality and citrus notes.', el: '' },
      img: 'cellar_ritual.jpg',
      alcohol: '13.5%',
      soil: { en: 'Volcanic Soil', el: '' },
    });
  }

  removeShopBottle(index: number): void {
    this.shopContent.bottles.splice(index, 1);
  }

  moveShopBottleUp(index: number): void {
    if (index > 0) {
      const item = this.shopContent.bottles.splice(index, 1)[0];
      this.shopContent.bottles.splice(index - 1, 0, item);
    }
  }

  moveShopBottleDown(index: number): void {
    if (index < this.shopContent.bottles.length - 1) {
      const item = this.shopContent.bottles.splice(index, 1)[0];
      this.shopContent.bottles.splice(index + 1, 0, item);
    }
  }

  /* ---------------- CONTACT HELPERS ---------------- */
  addContactSubject(): void {
    this.contactContent.form.subjects.push({
      value: 'New Occasion',
      label: 'NEW OCCASION / SUBJECT',
    });
  }

  removeContactSubject(index: number): void {
    this.contactContent.form.subjects.splice(index, 1);
  }
}

export const AdminPageEditor = AdminHomepageEditor;
