import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, SiteSettings, MailConfig, NewsletterConfig, SeoConfigSettings } from './api';
import {
  SiteSettingsService,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SITE_COLORS,
  DEFAULT_MAIL_CONFIG,
  DEFAULT_NEWSLETTER_CONFIG,
  DEFAULT_SEO_CONFIG,
} from '../core/site-settings.service';
import { resolveMediaUrl } from '../core/media.utils';
import { WhSocialIcon, SOCIAL_ICON_LIBRARY, resolveSocialIconKey, SocialIconDef } from '../shared/social-icon';

@Component({
  selector: 'wh-admin-settings',
  imports: [FormsModule, WhSocialIcon],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage brand metadata, contact info, operating hours, and system mode.</p>
      </div>
      @if (activeTab() !== 'security') {
        <button
          type="button"
          class="btn btn-primary self-start sm:self-auto"
          [disabled]="saving()"
          (click)="saveSettings()"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>{{ saving() ? 'Saving Changes…' : 'Save Settings' }}</span>
        </button>
      }
    </div>

    <!-- Apple-style Segmented Navigation Tabs -->
    <div class="admin-tabs mb-8">
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">General</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'contact'" (click)="activeTab.set('contact')">Contact &amp; Hours</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'seo'" (click)="activeTab.set('seo')">SEO &amp; Analytics</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'email'" (click)="activeTab.set('email')">Mail &amp; Alerts</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'appearance'" (click)="activeTab.set('appearance')">Mode &amp; Aesthetics</button>
      <button type="button" class="admin-tab" [class.active]="activeTab() === 'security'" (click)="activeTab.set('security')">Security</button>
    </div>

    @if (error()) {
      <div class="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
        {{ error() }}
      </div>
    }

    @if (savedMessage()) {
      <div class="p-3.5 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
        <span class="flex items-center gap-1.5">
          <span>✓</span> {{ savedMessage() }}
        </span>
        <button type="button" class="text-2xs text-emerald-900 underline font-normal" (click)="savedMessage.set('')">Dismiss</button>
      </div>
    }

    <!-- Tab: General (Brand & Identity) -->
    @if (activeTab() === 'general') {
      <div class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Brand Identity -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Brand &amp; Identity</h2>
              <p class="text-xs text-slate-500 mt-0.5">Define your estate name, motto, and legal entity for headers and footers.</p>
            </div>

            <div class="admin-card space-y-4">
              <div>
                <label class="admin-field-label" for="site-name">Site / Business Name</label>
                <input id="site-name" class="admin-field-input" name="name" [(ngModel)]="model.name" required />
              </div>

              <div>
                <label class="admin-field-label" for="site-tagline">Tagline / Motto</label>
                <input id="site-tagline" class="admin-field-input" name="tagline" [(ngModel)]="model.tagline" />
              </div>

              <div>
                <label class="admin-field-label" for="site-legal">Footer Legal Entity / Copyright Name</label>
                <input id="site-legal" class="admin-field-input" name="legalName" [(ngModel)]="model.legalName" />
              </div>
            </div>
          </div>

          <!-- Section 2: SEO & Meta Description -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">SEO &amp; Story Intro</h2>
              <p class="text-xs text-slate-500 mt-0.5">Search engine meta descriptions and search summary previews.</p>
            </div>

            <div class="admin-card space-y-4">
              <div>
                <label class="admin-field-label" for="site-desc">Meta Description (SEO)</label>
                <textarea id="site-desc" class="admin-field-input min-h-28" name="description" [(ngModel)]="model.description" placeholder="Brief summary of the atelier..."></textarea>
              </div>

              <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span class="text-[10px] font-mono font-bold uppercase text-slate-400 block">Search Snippet Preview</span>
                <p class="text-xs font-bold text-blue-800 truncate">{{ model.name || 'The Winehouse' }} · Fine Greek Terroir</p>
                <p class="text-2xs text-slate-500 line-clamp-2">{{ model.description || 'Curated natural wines and rare vintages from Greece.' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Brand Settings' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Contact & Opening Hours & Socials -->
    @if (activeTab() === 'contact') {
      <div class="space-y-6">
        <!-- Row 1: Contact Coordinates & Physical Address (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Contact Coordinates -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Contact &amp; Communication</h2>
              <p class="text-xs text-slate-500 mt-0.5">Public concierge email, phone number, and Google Maps link.</p>
            </div>

            <div class="admin-card space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="admin-field-label" for="contact-email">Public Email</label>
                  <input id="contact-email" class="admin-field-input" type="email" name="email" [(ngModel)]="model.contact.email" />
                </div>
                <div>
                  <label class="admin-field-label" for="contact-phone">Phone Number</label>
                  <input id="contact-phone" class="admin-field-input" name="phone" [(ngModel)]="model.contact.phone" />
                </div>
              </div>

              <div>
                <label class="admin-field-label" for="contact-map">Google Maps Location Link</label>
                <input id="contact-map" class="admin-field-input" name="mapUrl" [(ngModel)]="model.contact.mapUrl" placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </div>

          <!-- Section 2: Physical Estate Address -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Physical Estate Address</h2>
              <p class="text-xs text-slate-500 mt-0.5">Cellar street address, postal code, and country location.</p>
            </div>

            <div class="admin-card space-y-4">
              <div>
                <label class="admin-field-label" for="address-street">Street Address</label>
                <input id="address-street" class="admin-field-input" name="street" [(ngModel)]="model.contact.address.street" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label class="admin-field-label" for="address-city">City</label>
                  <input id="address-city" class="admin-field-input" name="city" [(ngModel)]="model.contact.address.city" />
                </div>
                <div>
                  <label class="admin-field-label" for="address-postal">Postal Code</label>
                  <input id="address-postal" class="admin-field-input" name="postalCode" [(ngModel)]="model.contact.address.postalCode" />
                </div>
                <div>
                  <label class="admin-field-label" for="address-country">Country</label>
                  <input id="address-country" class="admin-field-input" name="country" [(ngModel)]="model.contact.address.country" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Operating Hours & Social Channels (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-2 border-t border-slate-200/80">
          <!-- Section 3: Operating Hours -->
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-base font-bold text-slate-900 tracking-tight">Operating Hours</h2>
                <p class="text-xs text-slate-500 mt-0.5">Operating schedule shown across footer, contact page, and cellar notices.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs flex items-center gap-1 cursor-pointer" (click)="addHourRow()">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="12" y2="12"/></svg>
                <span>Add Row</span>
              </button>
            </div>

            <div class="admin-card space-y-2.5">
              @for (hour of model.hours; track $index) {
                <div class="flex items-center gap-2 p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                  <input
                    class="admin-field-input flex-1 text-xs"
                    placeholder="e.g. Tuesday – Friday"
                    [(ngModel)]="hour.days"
                  />
                  <input
                    class="admin-field-input flex-1 text-xs"
                    placeholder="e.g. 12:00 – 22:00"
                    [(ngModel)]="hour.time"
                  />
                  <button
                    type="button"
                    class="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors cursor-pointer text-xs"
                    (click)="removeHourRow($index)"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Section 4: Social Channels -->
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-base font-bold text-slate-900 tracking-tight">Social Channels</h2>
                <p class="text-xs text-slate-500 mt-0.5">Configured social media accounts displayed on the site.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs flex items-center gap-1 cursor-pointer" (click)="addSocialRow()">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="12" y2="12"/></svg>
                <span>Add Social Channel</span>
              </button>
            </div>

            <div class="admin-card space-y-3">
              @if (model.socials.length === 0) {
                <div class="p-6 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 rounded-xl">
                  No social channels added yet. Click "+ Add Social Channel" to configure one.
                </div>
              }

              @for (social of model.socials; track $index) {
                <div class="relative flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors">
                  
                  <!-- Icon Selector Trigger Button with Popover -->
                  <div class="relative shrink-0">
                    <button
                      type="button"
                      (click)="toggleSocialIconPicker($index, $event)"
                      class="h-9 px-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 hover:border-wine-600 hover:bg-wine-50/50 transition-all cursor-pointer shadow-2xs group"
                      title="Click to choose icon from library"
                    >
                      <wh-social-icon [name]="getSocialIcon(social)" [size]="16" class="w-4 h-4 text-slate-700 group-hover:text-wine-800" />
                      <span class="text-2xs font-mono font-bold uppercase text-slate-600 group-hover:text-wine-800">
                        {{ getSocialIcon(social) }}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-400"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    <!-- Icon Selection Popover / Grid -->
                    @if (openSocialIconPickerIndex() === $index) {
                      <div
                        class="absolute left-0 top-full mt-1.5 z-50 p-3 bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 sm:w-80 space-y-2"
                        (click)="$event.stopPropagation()"
                      >
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span class="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">Icon Library</span>
                          <button type="button" (click)="openSocialIconPickerIndex.set(null)" class="text-slate-400 hover:text-slate-700 text-xs font-bold p-1">✕</button>
                        </div>
                        <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto p-0.5">
                          @for (opt of socialIconLibrary; track opt.key) {
                            <button
                              type="button"
                              (click)="selectSocialIcon(social, opt.key)"
                              class="flex flex-col items-center justify-center p-2 rounded-xl border text-xs gap-1 transition-all cursor-pointer"
                              [class.border-wine-600]="getSocialIcon(social) === opt.key"
                              [class.bg-wine-50]="getSocialIcon(social) === opt.key"
                              [class.text-wine-800]="getSocialIcon(social) === opt.key"
                              [class.border-slate-200/80]="getSocialIcon(social) !== opt.key"
                              [class.hover:border-slate-300]="getSocialIcon(social) !== opt.key"
                              [class.hover:bg-slate-50]="getSocialIcon(social) !== opt.key"
                            >
                              <wh-social-icon [name]="opt.key" [size]="18" class="w-4.5 h-4.5" />
                              <span class="text-[10px] font-mono font-medium truncate max-w-full text-center">{{ opt.name }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Label Input -->
                  <input
                    class="admin-field-input w-full sm:w-36 shrink-0 font-medium text-xs !py-2"
                    placeholder="e.g. Instagram"
                    [(ngModel)]="social.label"
                    (ngModelChange)="onSocialLabelChange(social)"
                  />

                  <!-- URL Input -->
                  <input
                    class="admin-field-input flex-1 text-xs !py-2 font-mono"
                    placeholder="https://instagram.com/..."
                    [(ngModel)]="social.url"
                    (ngModelChange)="onSocialLabelChange(social)"
                  />

                  <!-- Actions / Delete Button -->
                  <div class="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    @if (social.url) {
                      <a
                        [href]="social.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-xs"
                        title="Test Open Link in New Tab"
                      >
                        ↗
                      </a>
                    }
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      (click)="removeSocialRow($index)"
                      title="Remove social link"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Contact & Hours' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: SEO & Analytics -->
    @if (activeTab() === 'seo') {
      <div class="space-y-6">
        <!-- Row 1: Search Console Verification & Crawling -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Search Engine Verifications -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Search Engine Verifications</h2>
              <p class="text-xs text-slate-500 mt-0.5">Ownership verification meta tokens for major search engines.</p>
            </div>

            <div class="admin-card space-y-3.5">
              <div>
                <label class="admin-field-label" for="seo-google-verify">Google Search Console Token</label>
                <input
                  id="seo-google-verify"
                  class="admin-field-input font-mono text-xs"
                  placeholder="google-site-verification token or code"
                  [(ngModel)]="ensureSeoConfig().google_verification"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Injects &lt;meta name="google-site-verification" content="..."&gt;</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="admin-field-label" for="seo-bing-verify">Bing Webmaster Token</label>
                  <input
                    id="seo-bing-verify"
                    class="admin-field-input font-mono text-xs"
                    placeholder="msvalidate.01 token"
                    [(ngModel)]="ensureSeoConfig().bing_verification"
                  />
                </div>
                <div>
                  <label class="admin-field-label" for="seo-pinterest-verify">Pinterest Domain Token</label>
                  <input
                    id="seo-pinterest-verify"
                    class="admin-field-input font-mono text-xs"
                    placeholder="p:domain_verify token"
                    [(ngModel)]="ensureSeoConfig().pinterest_verification"
                  />
                </div>
              </div>

              <div>
                <label class="admin-field-label" for="seo-keywords">Default Meta Keywords</label>
                <input
                  id="seo-keywords"
                  class="admin-field-input text-xs"
                  placeholder="natural wine, santorini assyrtiko, xinomavro, wine atelier..."
                  [(ngModel)]="ensureSeoConfig().meta_keywords"
                />
              </div>
            </div>
          </div>

          <!-- Section 2: Indexing & Social Fallback -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Indexing &amp; Social Share Fallback</h2>
              <p class="text-xs text-slate-500 mt-0.5">Crawler indexing permission and default social preview card.</p>
            </div>

            <div class="admin-card space-y-4">
              <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="pr-3">
                  <span class="text-xs font-bold text-slate-900 block">Search Engine Indexing</span>
                  <span class="text-2xs text-slate-500 block mt-0.5">
                    {{ ensureSeoConfig().indexing_enabled !== false ? 'Active (index, follow) — Search engines are allowed to index public pages.' : 'Disabled (noindex, nofollow) — Pages are hidden from search engines.' }}
                  </span>
                </div>
                <label class="ios-toggle shrink-0">
                  <input type="checkbox" [(ngModel)]="ensureSeoConfig().indexing_enabled" />
                  <span class="ios-toggle-slider"></span>
                </label>
              </div>

              <div>
                <label class="admin-field-label" for="seo-og-image">Default Social Share Image (OG Image)</label>
                <input
                  id="seo-og-image"
                  class="admin-field-input font-mono text-xs"
                  placeholder="hero_cellar.png or full image URL"
                  [(ngModel)]="ensureSeoConfig().og_image"
                />
              </div>

              @if (ensureSeoConfig().og_image) {
                <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span class="text-[10px] font-mono font-bold uppercase text-slate-400 block">Social Card Preview</span>
                  <div class="rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs">
                    <img
                      [src]="mediaUrl(ensureSeoConfig().og_image)"
                      alt="Social share preview"
                      class="w-full h-28 object-cover"
                    />
                    <div class="p-2.5 space-y-0.5">
                      <p class="text-2xs font-mono uppercase text-slate-400">thewinehouse.gr</p>
                      <p class="text-xs font-bold text-slate-900 truncate">{{ model.name || 'The Winehouse' }} · Artisanal Wine Atelier</p>
                      <p class="text-[11px] text-slate-500 line-clamp-1">{{ model.description || 'Curated artisanal wines from independent Mediterranean vineyards.' }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Row 2: Analytics & Tag Measurement -->
        <div class="pt-2 border-t border-slate-200/80">
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Measurement &amp; Tracking Pixels</h2>
            <p class="text-xs text-slate-500 mt-0.5">Safe client-side tracking for Google Analytics 4, GTM, and Meta Pixel.</p>
          </div>

          <div class="admin-card">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label" for="seo-ga4">Google Analytics 4 (GA4)</label>
                <input
                  id="seo-ga4"
                  class="admin-field-input font-mono text-xs"
                  placeholder="G-XXXXXXXXXX"
                  [(ngModel)]="ensureSeoConfig().google_analytics_id"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Format: G-XXXXXXXXXX</span>
              </div>

              <div>
                <label class="admin-field-label" for="seo-gtm">Google Tag Manager (GTM)</label>
                <input
                  id="seo-gtm"
                  class="admin-field-input font-mono text-xs"
                  placeholder="GTM-XXXXXXX"
                  [(ngModel)]="ensureSeoConfig().google_tag_manager_id"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Format: GTM-XXXXXXX</span>
              </div>

              <div>
                <label class="admin-field-label" for="seo-pixel">Meta Pixel (Facebook/Instagram)</label>
                <input
                  id="seo-pixel"
                  class="admin-field-input font-mono text-xs"
                  placeholder="e.g. 123456789012345"
                  [(ngModel)]="ensureSeoConfig().meta_pixel_id"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Numeric Pixel ID</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3: Per-Page Bilingual SEO Overrides -->
        <div class="pt-2 border-t border-slate-200/80">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Per-Page Bilingual Metadata Overrides</h2>
              <p class="text-xs text-slate-500 mt-0.5">Customize individual page titles and meta descriptions for English and Greek.</p>
            </div>

            <!-- Subtabs for Pages -->
            <div class="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 text-xs">
              <button
                type="button"
                class="px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer"
                [class.bg-white]="selectedSeoPage() === 'home'"
                [class.shadow-2xs]="selectedSeoPage() === 'home'"
                [class.text-slate-900]="selectedSeoPage() === 'home'"
                [class.text-slate-600]="selectedSeoPage() !== 'home'"
                (click)="selectedSeoPage.set('home')"
              >
                Home
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer"
                [class.bg-white]="selectedSeoPage() === 'shop'"
                [class.shadow-2xs]="selectedSeoPage() === 'shop'"
                [class.text-slate-900]="selectedSeoPage() === 'shop'"
                [class.text-slate-600]="selectedSeoPage() !== 'shop'"
                (click)="selectedSeoPage.set('shop')"
              >
                e-Shop
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer"
                [class.bg-white]="selectedSeoPage() === 'about'"
                [class.shadow-2xs]="selectedSeoPage() === 'about'"
                [class.text-slate-900]="selectedSeoPage() === 'about'"
                [class.text-slate-600]="selectedSeoPage() !== 'about'"
                (click)="selectedSeoPage.set('about')"
              >
                About Us
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer"
                [class.bg-white]="selectedSeoPage() === 'contact'"
                [class.shadow-2xs]="selectedSeoPage() === 'contact'"
                [class.text-slate-900]="selectedSeoPage() === 'contact'"
                [class.text-slate-600]="selectedSeoPage() !== 'contact'"
                (click)="selectedSeoPage.set('contact')"
              >
                Contact
              </button>
            </div>
          </div>

          <div class="admin-card space-y-4">
            @let pageMeta = ensurePageSeo(selectedSeoPage());
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- English -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div class="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <span class="text-sm">🇬🇧</span>
                  <span>English Metadata</span>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="admin-field-label !mb-0">Page Title (EN)</label>
                    <span class="text-[10px] font-mono" [class.text-emerald-700]="getMetaLength($any(pageMeta.title).en, 40, 60)" [class.text-amber-700]="!getMetaLength($any(pageMeta.title).en, 40, 60)">
                      {{ ($any(pageMeta.title).en || '').length }}/60 chars
                    </span>
                  </div>
                  <input class="admin-field-input text-xs" [(ngModel)]="$any(pageMeta.title).en" placeholder="Page Title in English" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="admin-field-label !mb-0">Meta Description (EN)</label>
                    <span class="text-[10px] font-mono" [class.text-emerald-700]="getMetaLength($any(pageMeta.description).en, 130, 160)" [class.text-amber-700]="!getMetaLength($any(pageMeta.description).en, 130, 160)">
                      {{ ($any(pageMeta.description).en || '').length }}/160 chars
                    </span>
                  </div>
                  <textarea class="admin-field-input text-xs min-h-20" [(ngModel)]="$any(pageMeta.description).en" placeholder="Meta description in English..."></textarea>
                </div>
              </div>

              <!-- Greek -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div class="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <span class="text-sm">🇬🇷</span>
                  <span>Greek Metadata (Ελληνικά)</span>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="admin-field-label !mb-0">Τίτλος Σελίδας (EL)</label>
                    <span class="text-[10px] font-mono" [class.text-emerald-700]="getMetaLength($any(pageMeta.title).el, 40, 60)" [class.text-amber-700]="!getMetaLength($any(pageMeta.title).el, 40, 60)">
                      {{ ($any(pageMeta.title).el || '').length }}/60 chars
                    </span>
                  </div>
                  <input class="admin-field-input text-xs" [(ngModel)]="$any(pageMeta.title).el" placeholder="Τίτλος σελίδας στα ελληνικά" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="admin-field-label !mb-0">Meta Περιγραφή (EL)</label>
                    <span class="text-[10px] font-mono" [class.text-emerald-700]="getMetaLength($any(pageMeta.description).el, 130, 160)" [class.text-amber-700]="!getMetaLength($any(pageMeta.description).el, 130, 160)">
                      {{ ($any(pageMeta.description).el || '').length }}/160 chars
                    </span>
                  </div>
                  <textarea class="admin-field-input text-xs min-h-20" [(ngModel)]="$any(pageMeta.description).el" placeholder="Περιγραφή σελίδας για μηχανές αναζήτησης..."></textarea>
                </div>
              </div>
            </div>

            <!-- Interactive Google SERP Simulator Card -->
            <div class="mt-4 pt-4 border-t border-slate-200/80">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-black text-xs">G</span>
                  <div>
                    <h3 class="text-xs font-bold text-slate-900 tracking-tight">Live Google Search Result Preview</h3>
                    <p class="text-[11px] text-slate-500">Real-time simulation of how this page appears on Google search results.</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Language Toggle -->
                  <div class="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 text-[11px]">
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all"
                      [class.bg-white]="serpLanguage() === 'en'"
                      [class.shadow-2xs]="serpLanguage() === 'en'"
                      [class.text-slate-900]="serpLanguage() === 'en'"
                      [class.text-slate-500]="serpLanguage() !== 'en'"
                      (click)="serpLanguage.set('en')"
                    >
                      🇬🇧 EN
                    </button>
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all"
                      [class.bg-white]="serpLanguage() === 'el'"
                      [class.shadow-2xs]="serpLanguage() === 'el'"
                      [class.text-slate-900]="serpLanguage() === 'el'"
                      [class.text-slate-500]="serpLanguage() !== 'el'"
                      (click)="serpLanguage.set('el')"
                    >
                      🇬🇷 EL
                    </button>
                  </div>

                  <!-- Device Toggle -->
                  <div class="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 text-[11px]">
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all"
                      [class.bg-white]="serpDeviceMode() === 'desktop'"
                      [class.shadow-2xs]="serpDeviceMode() === 'desktop'"
                      [class.text-slate-900]="serpDeviceMode() === 'desktop'"
                      [class.text-slate-500]="serpDeviceMode() !== 'desktop'"
                      (click)="serpDeviceMode.set('desktop')"
                    >
                      🖥️ Desktop
                    </button>
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all"
                      [class.bg-white]="serpDeviceMode() === 'mobile'"
                      [class.shadow-2xs]="serpDeviceMode() === 'mobile'"
                      [class.text-slate-900]="serpDeviceMode() === 'mobile'"
                      [class.text-slate-500]="serpDeviceMode() !== 'mobile'"
                      (click)="serpDeviceMode.set('mobile')"
                    >
                      📱 Mobile
                    </button>
                  </div>
                </div>
              </div>

              <!-- Google SERP Card -->
              <div
                class="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-[#ffffff] shadow-sm transition-all"
                [class.max-w-md]="serpDeviceMode() === 'mobile'"
                [class.mx-auto]="serpDeviceMode() === 'mobile'"
              >
                <!-- Google Site Identity Header -->
                <div class="flex items-center gap-2.5 mb-1.5">
                  <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="logo_default_mark.png" alt="Favicon" class="w-4 h-4 object-contain" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[13px] font-medium text-[#202124] leading-tight truncate">
                      {{ getSerpSiteName() }}
                    </div>
                    <div class="text-[11px] text-[#4d5156] font-mono leading-tight truncate">
                      https://thewinehouse.gr{{ getSerpPagePath() }}
                    </div>
                  </div>
                </div>

                <!-- Google Clickable Blue Title -->
                <div class="mb-1.5">
                  <h4 class="text-[17px] sm:text-[19px] text-[#1a0dab] hover:underline font-normal cursor-pointer leading-snug tracking-tight">
                    {{ getSerpTitle() }}
                  </h4>
                </div>

                <!-- Google Snippet Description -->
                <p class="text-[13px] text-[#4d5156] leading-relaxed line-clamp-3">
                  {{ getSerpDescription() }}
                </p>

                <!-- Optional Sitelinks & Sitelinks Searchbox (Shown on Home preview) -->
                @if (selectedSeoPage() === 'home') {
                  <div class="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <span class="text-[#1a0dab] font-medium block hover:underline">e-Shop &amp; Rare Allocations</span>
                        <span class="text-[11px] text-[#5f6368] line-clamp-1">Small-batch natural wines &amp; cellar reserves.</span>
                      </div>
                      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <span class="text-[#1a0dab] font-medium block hover:underline">About Our Philosophy</span>
                        <span class="text-[11px] text-[#5f6368] line-clamp-1">Sommelier curation &amp; terroir slow living.</span>
                      </div>
                      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <span class="text-[#1a0dab] font-medium block hover:underline">Cellar Tastings &amp; Visits</span>
                        <span class="text-[11px] text-[#5f6368] line-clamp-1">Book private tasting flights &amp; cellar tours.</span>
                      </div>
                      <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <span class="text-[#1a0dab] font-medium block hover:underline">Contact &amp; Concierge</span>
                        <span class="text-[11px] text-[#5f6368] line-clamp-1">Direct inquiries &amp; sommelier consultations.</span>
                      </div>
                    </div>

                    <!-- Searchbox Preview -->
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-400">
                      <span>🔍</span>
                      <span class="font-sans text-[11px]">Search thewinehouse.gr wines (Google Sitelinks Searchbox)</span>
                    </div>
                  </div>
                }

                <!-- Rich Features Quality Badges -->
                <div class="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200/80">
                    ✓ Google Knowledge Graph (Winery)
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200/80">
                    ✓ Sitelinks Searchbox
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200/80">
                    ✓ BreadcrumbList Schema
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200/80">
                    ✓ 14-Day Return &amp; Express Transit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 4: AI & Machine-Readable Crawler Inspector -->
        <div class="pt-2 border-t border-slate-200/80">
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Machine-Readable &amp; AI Directives</h2>
            <p class="text-xs text-slate-500 mt-0.5">Live endpoints and protocols available to Google, Bing, and AI search bots.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/sitemap.xml"
              target="_blank"
              class="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group"
            >
              <div>
                <span class="text-xs font-bold text-slate-900 block group-hover:text-blue-700">XML Sitemap</span>
                <span class="text-2xs text-slate-500 font-mono">/sitemap.xml</span>
              </div>
              <span class="text-xs text-slate-400 group-hover:text-blue-700">↗</span>
            </a>

            <a
              href="/llms.txt"
              target="_blank"
              class="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group"
            >
              <div>
                <span class="text-xs font-bold text-slate-900 block group-hover:text-emerald-700">AI Context File</span>
                <span class="text-2xs text-slate-500 font-mono">/llms.txt</span>
              </div>
              <span class="text-xs text-slate-400 group-hover:text-emerald-700">↗</span>
            </a>

            <a
              href="/robots.txt"
              target="_blank"
              class="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group"
            >
              <div>
                <span class="text-xs font-bold text-slate-900 block group-hover:text-purple-700">Robots Rules</span>
                <span class="text-2xs text-slate-500 font-mono">/robots.txt</span>
              </div>
              <span class="text-xs text-slate-400 group-hover:text-purple-700">↗</span>
            </a>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save SEO & Analytics' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Mail & Alerts -->
    @if (activeTab() === 'email') {
      <div class="space-y-6">
        <!-- Row 1: Ingestion Alerts & Connectivity Diagnostic (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Alert Notifications -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Alert Notifications</h2>
              <p class="text-xs text-slate-500 mt-0.5">Notification mailbox for inquiries and new order allocations.</p>
            </div>

            <div class="admin-card space-y-3.5">
              <div>
                <label class="admin-field-label" for="company-notify-email">Notification Recipient Email</label>
                <input
                  id="company-notify-email"
                  class="admin-field-input font-mono text-xs"
                  type="email"
                  placeholder="info@thewinehouse.gr"
                  [(ngModel)]="ensureMailConfig().company_notification_email"
                />
              </div>

              <div class="space-y-2 pt-1">
                <label class="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <span class="text-xs font-bold text-slate-900 block">Inquiry Alerts</span>
                    <span class="text-2xs text-slate-500">Forward contact form submissions immediately.</span>
                  </div>
                  <input
                    type="checkbox"
                    class="rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                    [(ngModel)]="ensureMailConfig().notify_on_new_message"
                  />
                </label>

                <label class="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <span class="text-xs font-bold text-slate-900 block">New Order Alerts</span>
                    <span class="text-2xs text-slate-500">Receive alert on completed customer checkout.</span>
                  </div>
                  <input
                    type="checkbox"
                    class="rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                    [(ngModel)]="ensureMailConfig().notify_on_new_order"
                  />
                </label>

                <label class="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <span class="text-xs font-bold text-slate-900 block">Buyer Order Receipts</span>
                    <span class="text-2xs text-slate-500">Send order confirmations &amp; IBAN bank details.</span>
                  </div>
                  <input
                    type="checkbox"
                    class="rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                    [(ngModel)]="ensureMailConfig().send_customer_order_confirmation"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Test Diagnostic Dispatcher -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Test Connectivity</h2>
              <p class="text-xs text-slate-500 mt-0.5">Send a test diagnostic message to confirm SMTP credentials.</p>
            </div>

            <div class="admin-card space-y-3.5">
              <div>
                <label class="admin-field-label">Recipient Test Email</label>
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    class="admin-field-input font-mono flex-1 text-xs"
                    type="email"
                    placeholder="Enter test recipient email..."
                    [(ngModel)]="testEmailRecipient"
                  />
                  <button
                    type="button"
                    class="btn btn-secondary shrink-0 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    [disabled]="testingEmail()"
                    (click)="sendTestEmail()"
                  >
                    @if (testingEmail()) {
                      <span class="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                      <span>Testing…</span>
                    } @else {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      <span>Send Test</span>
                    }
                  </button>
                </div>
              </div>

              @if (testEmailResult(); as res) {
                @if (res.success) {
                  <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <span>✓</span>
                    <span>{{ res.message || 'Test email successfully dispatched!' }}</span>
                  </div>
                } @else {
                  <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                    <p class="font-bold">SMTP Diagnostic Failed</p>
                    <p class="font-mono text-2xs whitespace-pre-wrap">{{ res.error }}</p>
                  </div>
                }
              }

              <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span class="text-2xs text-slate-500 leading-relaxed block">
                  Clicking "Send Test" performs an immediate live TLS handshake to verify your mail server settings.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: SMTP Mail Server Configuration -->
        <div class="pt-2 border-t border-slate-200/80">
          <div class="mb-3">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">SMTP Mail Server Settings</h2>
            <p class="text-xs text-slate-500 mt-0.5">Outgoing server host, port, authentication credentials, and sender address.</p>
          </div>

          <div class="admin-card space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label" for="mail-driver">Mail Driver</label>
                <select id="mail-driver" class="admin-field-input" [(ngModel)]="ensureMailConfig().mail_driver">
                  <option value="smtp">SMTP Server</option>
                  <option value="log">Log to Disk</option>
                  <option value="sendmail">Sendmail</option>
                </select>
              </div>

              <div>
                <label class="admin-field-label" for="mail-host">SMTP Host Server</label>
                <input id="mail-host" class="admin-field-input font-mono text-xs" type="text" placeholder="mail.winehouse.gr" [(ngModel)]="ensureMailConfig().mail_host" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="admin-field-label" for="mail-port">Port</label>
                  <input id="mail-port" class="admin-field-input font-mono text-xs" type="number" placeholder="587" [(ngModel)]="ensureMailConfig().mail_port" />
                </div>
                <div>
                  <label class="admin-field-label" for="mail-encryption">Encryption</label>
                  <select id="mail-encryption" class="admin-field-input text-xs" [(ngModel)]="ensureMailConfig().mail_encryption">
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label class="admin-field-label" for="mail-user">SMTP Username / Account</label>
                <input id="mail-user" class="admin-field-input font-mono text-xs" type="text" placeholder="info@thewinehouse.gr" [(ngModel)]="ensureMailConfig().mail_username" />
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label class="admin-field-label" for="mail-pass">SMTP Password</label>
                  <button type="button" (click)="showMailPassword.update(v => !v)" class="text-2xs text-slate-500 hover:text-slate-800 underline cursor-pointer mb-1">
                    {{ showMailPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <input id="mail-pass" class="admin-field-input font-mono text-xs" [type]="showMailPassword() ? 'text' : 'password'" placeholder="••••••••••••" [(ngModel)]="ensureMailConfig().mail_password" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label class="admin-field-label" for="mail-from-email">Sender "From" Email</label>
                <input id="mail-from-email" class="admin-field-input font-mono text-xs" type="email" placeholder="info@thewinehouse.gr" [(ngModel)]="ensureMailConfig().mail_from_address" />
              </div>

              <div>
                <label class="admin-field-label" for="mail-from-name">Sender "From" Name</label>
                <input id="mail-from-name" class="admin-field-input text-xs" type="text" placeholder="The Winehouse Atelier" [(ngModel)]="ensureMailConfig().mail_from_name" />
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3: Newsletter & Marketing Dispatches Mail Configuration (EU GDPR Compliant) -->
        <div class="pt-2 border-t border-slate-200/80">
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="px-2 py-0.5 text-2xs font-bold uppercase rounded bg-wine-100 text-wine-800 font-mono">EU GDPR Mandatory</span>
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Newsletter &amp; Marketing Sender Information</h2>
            </div>
            <p class="text-xs text-slate-500">Configure the dedicated sender mailbox and mandatory EU legal footer disclosure for all broadcast dispatches.</p>
          </div>

          <div class="admin-card space-y-4">
            <!-- Dedicated Newsletter Sender Coordinates -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label" for="nl-from-name">Newsletter Sender Name *</label>
                <input id="nl-from-name" class="admin-field-input text-xs" type="text" placeholder="The Winehouse Cellar Dispatches" [(ngModel)]="ensureNewsletterConfig().newsletter_from_name" />
              </div>

              <div>
                <label class="admin-field-label" for="nl-from-address">Newsletter "From" Email *</label>
                <input id="nl-from-address" class="admin-field-input font-mono text-xs" type="email" placeholder="newsletter@winehouse.gr" [(ngModel)]="ensureNewsletterConfig().newsletter_from_address" />
              </div>

              <div>
                <label class="admin-field-label" for="nl-reply-to">Reply-To Email</label>
                <input id="nl-reply-to" class="admin-field-input font-mono text-xs" type="email" placeholder="info@winehouse.gr" [(ngModel)]="ensureNewsletterConfig().newsletter_reply_to" />
              </div>
            </div>

            <!-- Mandatory Legal Footprint -->
            <div class="pt-2 border-t border-slate-100">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Mandatory EU Legal Entity Footprint
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="admin-field-label" for="nl-legal-name">Registered Company Legal Name *</label>
                  <input id="nl-legal-name" class="admin-field-input text-xs" type="text" placeholder="The Winehouse Fine Terroirs Single Member P.C." [(ngModel)]="ensureNewsletterConfig().company_legal_name" />
                </div>

                <div>
                  <label class="admin-field-label" for="nl-legal-addr">Valid Physical Postal Address *</label>
                  <input id="nl-legal-addr" class="admin-field-input text-xs" type="text" placeholder="14 Vasilissis Sofias Ave, Athens 106 74, Greece" [(ngModel)]="ensureNewsletterConfig().company_physical_address" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <label class="admin-field-label" for="nl-contact-email">Company Contact Email</label>
                  <input id="nl-contact-email" class="admin-field-input font-mono text-xs" type="email" placeholder="info@winehouse.gr" [(ngModel)]="ensureNewsletterConfig().company_contact_email" />
                </div>

                <div>
                  <label class="admin-field-label" for="nl-phone">Company Phone</label>
                  <input id="nl-phone" class="admin-field-input text-xs" type="text" placeholder="+30 210 000 0000" [(ngModel)]="ensureNewsletterConfig().company_phone" />
                </div>

                <div>
                  <label class="admin-field-label" for="nl-privacy-url">Privacy Policy URL</label>
                  <input id="nl-privacy-url" class="admin-field-input text-xs" type="text" placeholder="/about" [(ngModel)]="ensureNewsletterConfig().privacy_policy_url" />
                </div>
              </div>

              <div class="mt-3">
                <label class="admin-field-label" for="nl-disclaimer">Footer Consent Disclaimer Notice</label>
                <textarea id="nl-disclaimer" rows="2" class="admin-field-input text-xs leading-relaxed" placeholder="You are receiving this communication because you subscribed to The Winehouse Cellar Dispatches..." [(ngModel)]="ensureNewsletterConfig().footer_disclaimer"></textarea>
              </div>
            </div>

            <!-- Optional Custom Dedicated SMTP for Newsletters -->
            <div class="pt-2 border-t border-slate-100">
              <label class="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <span class="text-xs font-bold text-slate-900 block">Use Custom Dedicated SMTP for Newsletters</span>
                  <span class="text-2xs text-slate-500">Route bulk newsletter campaigns through a separate dedicated SMTP server (e.g. SendGrid, Mailgun, or AWS SES).</span>
                </div>
                <input
                  type="checkbox"
                  class="rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                  [(ngModel)]="ensureNewsletterConfig().custom_smtp_enabled"
                />
              </label>

              @if (ensureNewsletterConfig().custom_smtp_enabled) {
                <div class="mt-3 p-4 rounded-xl border border-wine-200 bg-wine-50/30 space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="admin-field-label">Custom SMTP Host</label>
                      <input class="admin-field-input font-mono text-xs" type="text" placeholder="smtp.mailgun.org" [(ngModel)]="ensureNewsletterConfig().smtp_host" />
                    </div>
                    <div>
                      <label class="admin-field-label">Port</label>
                      <input class="admin-field-input font-mono text-xs" type="number" placeholder="587" [(ngModel)]="ensureNewsletterConfig().smtp_port" />
                    </div>
                    <div>
                      <label class="admin-field-label">Encryption</label>
                      <select class="admin-field-input text-xs" [(ngModel)]="ensureNewsletterConfig().smtp_encryption">
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="admin-field-label">SMTP Username</label>
                      <input class="admin-field-input font-mono text-xs" type="text" placeholder="postmaster@domain.com" [(ngModel)]="ensureNewsletterConfig().smtp_username" />
                    </div>
                    <div>
                      <label class="admin-field-label">SMTP Password</label>
                      <input class="admin-field-input font-mono text-xs" type="password" placeholder="••••••••••••" [(ngModel)]="ensureNewsletterConfig().smtp_password" />
                    </div>
                  </div>
                </div>
              }
            </div>

          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Mail Settings' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Mode & Aesthetics -->
    @if (activeTab() === 'appearance') {
      <div class="space-y-6">
        <!-- Row 1: Maintenance & Presets (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Maintenance Mode -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Maintenance &amp; Gateway</h2>
              <p class="text-xs text-slate-500 mt-0.5">Control public storefront access vs holding screen.</p>
            </div>

            <div class="admin-card space-y-4">
              <div class="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="pr-3">
                  <span class="text-xs font-bold text-slate-900 block">Holding Gateway Mode</span>
                  <span class="text-2xs text-slate-500 block mt-0.5">
                    {{ model.maintenance_mode ? 'Active — Public visitors see holding screen.' : 'Inactive — Public sees the live storefront.' }}
                  </span>
                </div>
                <label class="ios-toggle shrink-0">
                  <input type="checkbox" [(ngModel)]="model.maintenance_mode" />
                  <span class="ios-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Palette Presets -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Curated Palette Presets</h2>
              <p class="text-xs text-slate-500 mt-0.5">Click any harmonious preset to quickly restyle the store.</p>
            </div>

            <div class="admin-card space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (preset of colorPresets; track preset.name) {
                  <button
                    type="button"
                    (click)="applyPreset(preset)"
                    class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span class="text-xs font-bold text-slate-800 truncate group-hover:text-slate-950">{{ preset.name }}</span>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="w-3 h-3 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.primary"></span>
                      <span class="w-3 h-3 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.paper"></span>
                      <span class="w-3 h-3 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.terracotta"></span>
                      <span class="w-3 h-3 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.ink"></span>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Custom Color Swatches & Live Atelier Preview (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-2 border-t border-slate-200/80">
          <!-- Section 3: Custom Color Swatches -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Custom Color Swatches</h2>
              <p class="text-xs text-slate-500 mt-0.5">Granular HSL &amp; Hex swatch overrides for UI tokens.</p>
            </div>

            <div class="admin-card space-y-3">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <!-- Primary Brand -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-800">Primary</span>
                    <input type="color" [(ngModel)]="model.colors.primary" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.primary" (ngModelChange)="onColorChange()" placeholder="#C84B31" />
                </div>

                <!-- Canvas Paper -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-800">Paper</span>
                    <input type="color" [(ngModel)]="model.colors.paper" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.paper" (ngModelChange)="onColorChange()" placeholder="#ECE7E1" />
                </div>

                <!-- Dark Ink / Text -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-800">Ink</span>
                    <input type="color" [(ngModel)]="model.colors.ink" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.ink" (ngModelChange)="onColorChange()" placeholder="#111111" />
                </div>

                <!-- Terracotta Highlight -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-800">Terracotta</span>
                    <input type="color" [(ngModel)]="model.colors.terracotta" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.terracotta" (ngModelChange)="onColorChange()" placeholder="#C84B31" />
                </div>

                <!-- Gold Amber Highlight -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-800">Gold Accent</span>
                    <input type="color" [(ngModel)]="model.colors.accent" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.accent" (ngModelChange)="onColorChange()" placeholder="#C9A227" />
                </div>

                <!-- Dark Sections -->
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-2xs font-bold text-slate-900">Dark Card</span>
                    <input type="color" [(ngModel)]="model.colors.card_dark" (ngModelChange)="onColorChange()" class="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <input class="admin-field-input font-mono text-xs uppercase !py-1" [(ngModel)]="model.colors.card_dark" (ngModelChange)="onColorChange()" placeholder="#111111" />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Live Theme Preview -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Live Theme Preview</h2>
              <p class="text-xs text-slate-500 mt-0.5">Real-time simulation of canvas colors and contrast.</p>
            </div>

            <div class="admin-card space-y-3">
              <div
                class="p-4 rounded-xl border transition-all"
                [style.background-color]="model.colors.paper"
                [style.color]="model.colors.ink"
                [style.border-color]="model.colors.ink"
              >
                <div class="flex items-center justify-between gap-4 mb-2">
                  <span
                    class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase"
                    [style.background-color]="model.colors.terracotta"
                    style="color: #ffffff"
                  >
                    WINE ATELIER
                  </span>
                  <span class="text-xs font-mono font-bold uppercase" [style.color]="model.colors.primary">
                    EXPLORE SELECTION →
                  </span>
                </div>
                <h4 class="text-base font-bold uppercase tracking-tight mb-1" [style.color]="model.colors.ink">
                  Good Wine Isn't Decoration. It's Direction.
                </h4>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Appearance & Colors' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Security (Password & Sessions) -->
    @if (activeTab() === 'security') {
      <div class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <!-- Section 1: Change Administrator Password -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Change Password</h2>
              <p class="text-xs text-slate-500 mt-0.5">Update login credentials for your administrator profile.</p>
            </div>

            <div class="admin-card">
              <form class="space-y-4" (ngSubmit)="savePassword()">
                <div>
                  <label class="admin-field-label" for="current-pwd">Current Password</label>
                  <input id="current-pwd" class="admin-field-input" type="password" name="current" [(ngModel)]="currentPassword" required autocomplete="current-password" />
                </div>

                <div>
                  <label class="admin-field-label" for="new-pwd">New Password</label>
                  <input id="new-pwd" class="admin-field-input" type="password" name="new" [(ngModel)]="newPassword" required minlength="10" autocomplete="new-password" />
                  @if (newPassword) {
                    <div class="mt-1.5 flex items-center gap-2">
                      <div class="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-300"
                          [style.width]="passwordStrength + '%'"
                          [style.background-color]="passwordStrength >= 75 ? '#10b981' : passwordStrength >= 40 ? '#f59e0b' : '#ef4444'"
                        ></div>
                      </div>
                      <span class="text-[10px] font-semibold text-slate-500">{{ passwordStrengthLabel }}</span>
                    </div>
                  }
                </div>

                <div>
                  <label class="admin-field-label" for="confirm-pwd">Confirm New Password</label>
                  <input id="confirm-pwd" class="admin-field-input" type="password" name="confirm" [(ngModel)]="confirmPassword" required autocomplete="new-password" />
                  @if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                    <p class="text-2xs text-red-600 font-semibold mt-1">Passwords do not match</p>
                  }
                </div>

                @if (passwordError()) {
                  <p class="text-xs text-red-600 font-semibold">{{ passwordError() }}</p>
                }
                @if (passwordSaved()) {
                  <p class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span>✓</span> Password updated successfully
                  </p>
                }

                <div class="pt-2 flex justify-end">
                  <button class="btn btn-primary btn-sm" type="submit" [disabled]="savingPassword()">
                    {{ savingPassword() ? 'Saving…' : 'Update Password' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Section 2: Session & Security Status -->
          <div>
            <div class="mb-3">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">Active Session Status</h2>
              <p class="text-xs text-slate-500 mt-0.5">Authentication state and security guidelines.</p>
            </div>

            <div class="admin-card space-y-4">
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Current browser session — Authenticated &amp; Active</span>
              </div>

              <div class="space-y-2 text-xs text-slate-500 leading-relaxed">
                <p>• Your session token is stored with HttpOnly authentication protection.</p>
                <p>• We recommend using a unique password with at least 10 characters combining numbers, letters, and symbols.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminSettings implements OnInit {
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);

  activeTab = signal<'general' | 'contact' | 'seo' | 'email' | 'appearance' | 'security'>('general');
  selectedSeoPage = signal<'home' | 'shop' | 'about' | 'contact'>('home');

  model: SiteSettings = {
    ...JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS)),
    colors: { ...DEFAULT_SITE_COLORS },
    mail_config: { ...DEFAULT_MAIL_CONFIG },
    newsletter_config: { ...DEFAULT_NEWSLETTER_CONFIG },
    seo_config: { ...DEFAULT_SEO_CONFIG },
  };

  saving = signal(false);
  savedMessage = signal('');
  error = signal('');

  testEmailRecipient = '';
  testingEmail = signal(false);
  testEmailResult = signal<{ success: boolean; message?: string; error?: string } | null>(null);
  showMailPassword = signal(false);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = signal(false);
  passwordSaved = signal(false);
  passwordError = signal('');

  ensureMailConfig(): MailConfig {
    if (!this.model.mail_config) {
      this.model.mail_config = { ...DEFAULT_MAIL_CONFIG };
    }
    return this.model.mail_config;
  }

  ensureNewsletterConfig(): NewsletterConfig {
    if (!this.model.newsletter_config) {
      this.model.newsletter_config = { ...DEFAULT_NEWSLETTER_CONFIG };
    }
    return this.model.newsletter_config;
  }

  ensureSeoConfig(): SeoConfigSettings {
    if (!this.model.seo_config) {
      this.model.seo_config = JSON.parse(JSON.stringify(DEFAULT_SEO_CONFIG));
    }
    const config = this.model.seo_config!;
    if (!config.page_seo) {
      config.page_seo = JSON.parse(JSON.stringify(DEFAULT_SEO_CONFIG.page_seo));
    }
    return config;
  }

  ensurePageSeo(pageKey: 'home' | 'shop' | 'about' | 'contact') {
    const seo = this.ensureSeoConfig();
    if (!seo.page_seo) {
      seo.page_seo = JSON.parse(JSON.stringify(DEFAULT_SEO_CONFIG.page_seo));
    }
    if (!seo.page_seo![pageKey]) {
      seo.page_seo![pageKey] = {
        title: { en: '', el: '' },
        description: { en: '', el: '' },
      };
    }
    const page = seo.page_seo![pageKey]!;
    if (!page.title || typeof page.title !== 'object') {
      page.title = { en: String(page.title || ''), el: '' };
    }
    if (!page.description || typeof page.description !== 'object') {
      page.description = { en: String(page.description || ''), el: '' };
    }
    return page;
  }

  serpDeviceMode = signal<'desktop' | 'mobile'>('desktop');
  serpLanguage = signal<'en' | 'el'>('en');

  getMetaLength(val: any, min: number, max: number): boolean {
    const len = (String(val || '')).trim().length;
    return len >= min && len <= max;
  }

  getSerpSiteName(): string {
    return this.model.name || 'The Winehouse';
  }

  getSerpPagePath(): string {
    const p = this.selectedSeoPage();
    if (p === 'home') return '';
    if (p === 'shop') return ' › shop';
    if (p === 'about') return ' › about';
    if (p === 'contact') return ' › contact';
    return '';
  }

  getSerpTitle(): string {
    const p = this.selectedSeoPage();
    const lang = this.serpLanguage();
    const pageMeta = this.ensurePageSeo(p);
    const titleObj = pageMeta?.title as { en?: string; el?: string } | undefined;
    const custom = titleObj?.[lang]?.trim();
    if (custom) return custom;

    if (p === 'home') {
      return lang === 'el'
        ? `${this.model.name || 'The Winehouse'} — Εκλεκτά Χειροποίητα Κρασιά, Terroir & Γευσιγνωσίες`
        : `${this.model.name || 'The Winehouse'} — Artisanal Wines, Terroir & Tasting Atelier`;
    }
    if (p === 'shop') {
      return lang === 'el'
        ? `Επιλεγμένες Φιάλες & Σπάνιες Εσοδείες | ${this.model.name || 'The Winehouse'}`
        : `Curated Bottlings & Cellar Vault | ${this.model.name || 'The Winehouse'}`;
    }
    if (p === 'about') {
      return lang === 'el'
        ? `Η Φιλοσοφία & οι Ρίζες της Κάβας μας | ${this.model.name || 'The Winehouse'}`
        : `Our Philosophy & Cellar Roots | ${this.model.name || 'The Winehouse'}`;
    }
    if (p === 'contact') {
      return lang === 'el'
        ? `Επικοινωνία, Γευσιγνωσίες & Ερωτήσεις | ${this.model.name || 'The Winehouse'}`
        : `Cellar Atelier, Tastings & Inquiries | ${this.model.name || 'The Winehouse'}`;
    }
    return `${this.model.name || 'The Winehouse'}`;
  }

  getSerpDescription(): string {
    const p = this.selectedSeoPage();
    const lang = this.serpLanguage();
    const pageMeta = this.ensurePageSeo(p);
    const descObj = pageMeta?.description as { en?: string; el?: string } | undefined;
    const custom = descObj?.[lang]?.trim();
    if (custom) return custom;

    if (p === 'home') {
      return lang === 'el'
        ? 'Επιλεγμένα φυσικά και παραδοσιακά μεσογειακά κρασιά, μικροί ανεξάρτητοι παραγωγοί, καθοδηγούμενες γευσιγνωσίες και συμβουλευτική κάβας.'
        : 'Curated natural and ancestral Mediterranean wines, small-batch independent growers, guided sommelier flights and cellar consulting.';
    }
    if (p === 'shop') {
      return lang === 'el'
        ? 'Ανακαλύψτε φυσικά κρασιά μικρής παραγωγής, αυτόριζα ηφαιστειακά Ασύρτικα, Ξινόμαυρα παλαιών κλημάτων και σπάνιες αρχειακές φιάλες.'
        : 'Browse small-batch natural wines, ungrafted volcanic Assyrtiko, old-vine Xinomavro, and allocated cellar reserves.';
    }
    if (p === 'about') {
      return lang === 'el'
        ? 'Ανακαλύψτε τη φιλοσοφία του αργού χρόνου, τους αφοσιωμένους μικρούς παραγωγούς και τη διατήρηση του μεσογειακού terroir.'
        : 'Discover our slow-living philosophy, passionate small-batch vignerons, and sustainable Mediterranean terroir preservation.';
    }
    if (p === 'contact') {
      return lang === 'el'
        ? 'Κλείστε ιδιωτικές γευσιγνωσίες sommelier, ζητήστε προσωποποιημένη συμβουλευτική κάβας ή επισκεφθείτε τον χώρο μας.'
        : 'Book private sommelier tastings, inquire about bespoke cellar consulting, or visit our central Athens atelier.';
    }
    return this.model.description || '';
  }

  mediaUrl(path?: string): string {
    return resolveMediaUrl(path);
  }

  sendTestEmail(): void {
    const config = this.ensureMailConfig();
    const recipient =
      this.testEmailRecipient.trim() ||
      config.company_notification_email ||
      this.model.contact.email;

    if (!recipient) {
      this.testEmailResult.set({
        success: false,
        error: 'Please enter a destination email address to receive the test message.',
      });
      return;
    }

    this.testingEmail.set(true);
    this.testEmailResult.set(null);

    this.api
      .sendTestEmail({
        recipient_email: recipient,
        mail_config: config,
      })
      .subscribe({
        next: (res) => {
          this.testingEmail.set(false);
          this.testEmailResult.set(res);
        },
        error: (err) => {
          this.testingEmail.set(false);
          this.testEmailResult.set({
            success: false,
            error:
              err.error?.error ||
              err.error?.message ||
              err.message ||
              'SMTP connection failed. Check host, port, username and password.',
          });
        },
      });
  }

  readonly colorPresets = [
    {
      name: 'Terracotta (Current)',
      colors: {
        primary: '#c84b31',
        paper: '#ece7e1',
        ink: '#111111',
        accent: '#c9a227',
        terracotta: '#c84b31',
        card_dark: '#111111',
      },
    },
    {
      name: 'Bordeaux & Cream',
      colors: {
        primary: '#6e1423',
        paper: '#faf6ef',
        ink: '#1c1714',
        accent: '#c9a227',
        terracotta: '#8c2535',
        card_dark: '#250509',
      },
    },
    {
      name: 'Volcanic Noir',
      colors: {
        primary: '#e06046',
        paper: '#1a1817',
        ink: '#f3ece0',
        accent: '#dec069',
        terracotta: '#c84b31',
        card_dark: '#0f0e0e',
      },
    },
    {
      name: 'Olive & Sand',
      colors: {
        primary: '#52643b',
        paper: '#f5f3ec',
        ink: '#22281b',
        accent: '#c9a227',
        terracotta: '#879a6b',
        card_dark: '#1e2417',
      },
    },
    {
      name: 'Monochrome Noir',
      colors: {
        primary: '#262626',
        paper: '#f3f3f3',
        ink: '#0a0a0a',
        accent: '#737373',
        terracotta: '#404040',
        card_dark: '#141414',
      },
    },
  ];

  get passwordStrength(): number {
    const p = this.newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 10) score += 25;
    if (p.length >= 14) score += 15;
    if (/[A-Z]/.test(p)) score += 15;
    if (/[a-z]/.test(p)) score += 10;
    if (/[0-9]/.test(p)) score += 15;
    if (/[^A-Za-z0-9]/.test(p)) score += 20;
    return Math.min(score, 100);
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s >= 75) return 'Strong';
    if (s >= 40) return 'Fair';
    return 'Weak';
  }

  ngOnInit(): void {
    const current = this.settingsService.settings();
    this.model = {
      ...JSON.parse(JSON.stringify(current)),
      colors: {
        ...DEFAULT_SITE_COLORS,
        ...(current.colors || {}),
      },
    };

    this.api.getSettings().subscribe({
      next: (data) => {
        if (data) {
          this.model = {
            ...DEFAULT_SITE_SETTINGS,
            ...data,
            contact: {
              ...DEFAULT_SITE_SETTINGS.contact,
              ...(data.contact || {}),
              address: {
                ...DEFAULT_SITE_SETTINGS.contact.address,
                ...(data.contact?.address || {}),
              },
            },
            hours: Array.isArray(data.hours) ? data.hours : DEFAULT_SITE_SETTINGS.hours,
            socials: Array.isArray(data.socials) ? data.socials : DEFAULT_SITE_SETTINGS.socials,
            nav: Array.isArray(data.nav) ? data.nav : DEFAULT_SITE_SETTINGS.nav,
            colors: {
              ...DEFAULT_SITE_COLORS,
              ...(data.colors || {}),
            },
            mail_config: {
              ...DEFAULT_MAIL_CONFIG,
              ...(data.mail_config || {}),
            },
            newsletter_config: {
              ...DEFAULT_NEWSLETTER_CONFIG,
              ...(data.newsletter_config || {}),
            },
            seo_config: {
              ...DEFAULT_SEO_CONFIG,
              ...(data.seo_config || {}),
              page_seo: {
                home: { ...DEFAULT_SEO_CONFIG.page_seo?.home, ...(data.seo_config?.page_seo?.home || {}) },
                shop: { ...DEFAULT_SEO_CONFIG.page_seo?.shop, ...(data.seo_config?.page_seo?.shop || {}) },
                about: { ...DEFAULT_SEO_CONFIG.page_seo?.about, ...(data.seo_config?.page_seo?.about || {}) },
                contact: { ...DEFAULT_SEO_CONFIG.page_seo?.contact, ...(data.seo_config?.page_seo?.contact || {}) },
              },
            },
          };
          this.settingsService.settings.set(this.model);
          this.settingsService.applyTheme(this.model.colors);
        }
      },
      error: () => {},
    });
  }

  onColorChange(): void {
    if (this.model.colors) {
      this.settingsService.applyTheme(this.model.colors);
    }
  }

  applyPreset(preset: (typeof this.colorPresets)[number]): void {
    this.model.colors = { ...preset.colors };
    this.onColorChange();
  }

  addHourRow(): void {
    this.model.hours.push({ days: '', time: '' });
  }

  removeHourRow(index: number): void {
    this.model.hours.splice(index, 1);
  }

  readonly socialIconLibrary = SOCIAL_ICON_LIBRARY;
  readonly openSocialIconPickerIndex = signal<number | null>(null);

  getSocialIcon(social: { icon?: string; label?: string; url?: string }): string {
    return resolveSocialIconKey(social.icon, social.label, social.url);
  }

  toggleSocialIconPicker(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.openSocialIconPickerIndex.update((curr) => (curr === index ? null : index));
  }

  selectSocialIcon(social: { icon?: string; label?: string; url?: string }, iconKey: string): void {
    social.icon = iconKey;
    this.openSocialIconPickerIndex.set(null);
  }

  onSocialLabelChange(social: { icon?: string; label?: string; url?: string }): void {
    if (!social.icon || social.icon === 'globe') {
      const detected = resolveSocialIconKey(null, social.label, social.url);
      if (detected !== 'globe') {
        social.icon = detected;
      }
    }
  }

  addSocialRow(): void {
    this.model.socials.push({ label: '', url: '', icon: 'instagram' });
  }

  removeSocialRow(index: number): void {
    this.model.socials.splice(index, 1);
    if (this.openSocialIconPickerIndex() === index) {
      this.openSocialIconPickerIndex.set(null);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openSocialIconPickerIndex() !== null) {
      this.openSocialIconPickerIndex.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.openSocialIconPickerIndex() !== null) {
      this.openSocialIconPickerIndex.set(null);
    }
  }

  saveSettings(): void {
    this.saving.set(true);
    this.error.set('');
    this.savedMessage.set('');

    this.settingsService.update(this.model).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.savedMessage.set('Settings saved to database successfully ✓');
        if (saved) {
          this.model = JSON.parse(JSON.stringify(this.settingsService.settings()));
        }
        setTimeout(() => this.savedMessage.set(''), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(
          err.error?.message ||
          'Could not save settings to the database.'
        );
      },
    });
  }

  savePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('The two new passwords do not match.');
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set('');
    this.passwordSaved.set(false);

    this.api
      .updatePassword({
        current_password: this.currentPassword,
        password: this.newPassword,
        password_confirmation: this.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordSaved.set(true);
          this.currentPassword = this.newPassword = this.confirmPassword = '';
          setTimeout(() => this.passwordSaved.set(false), 4000);
        },
        error: (err) => {
          this.savingPassword.set(false);
          this.passwordError.set(err.error?.message ?? 'Could not change password.');
        },
      });
  }
}
