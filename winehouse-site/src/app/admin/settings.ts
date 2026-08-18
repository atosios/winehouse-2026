import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, SiteSettings, MailConfig } from './api';
import {
  SiteSettingsService,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SITE_COLORS,
  DEFAULT_MAIL_CONFIG,
} from '../core/site-settings.service';

@Component({
  selector: 'wh-admin-settings',
  imports: [FormsModule],
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

        <!-- Row 2: Visiting Hours & Social Channels (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-2 border-t border-slate-200/80">
          <!-- Section 3: Visiting Hours -->
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-base font-bold text-slate-900 tracking-tight">Visiting &amp; Cellar Hours</h2>
                <p class="text-xs text-slate-500 mt-0.5">Operating schedule shown in footer and contact page.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs flex items-center gap-1 cursor-pointer" (click)="addHourRow()">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
                <p class="text-xs text-slate-500 mt-0.5">Links to Instagram, Facebook, Vivino, etc.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-xs flex items-center gap-1 cursor-pointer" (click)="addSocialRow()">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Add Link</span>
              </button>
            </div>

            <div class="admin-card space-y-2.5">
              @for (social of model.socials; track $index) {
                <div class="flex items-center gap-2 p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                  <input
                    class="admin-field-input w-28 shrink-0 font-medium text-xs"
                    placeholder="e.g. Instagram"
                    [(ngModel)]="social.label"
                  />
                  <input
                    class="admin-field-input flex-1 text-xs"
                    placeholder="https://..."
                    [(ngModel)]="social.url"
                  />
                  <button
                    type="button"
                    class="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors cursor-pointer text-xs"
                    (click)="removeSocialRow($index)"
                    title="Remove profile"
                  >
                    ✕
                  </button>
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

  activeTab = signal<'general' | 'contact' | 'email' | 'appearance' | 'security'>('general');

  model: SiteSettings = {
    ...JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS)),
    colors: { ...DEFAULT_SITE_COLORS },
    mail_config: { ...DEFAULT_MAIL_CONFIG },
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

  addSocialRow(): void {
    this.model.socials.push({ label: '', url: '' });
  }

  removeSocialRow(index: number): void {
    this.model.socials.splice(index, 1);
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
