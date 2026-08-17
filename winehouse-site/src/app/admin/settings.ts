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
      <div class="w-full space-y-6">
        <div class="admin-card space-y-5">
          <h2 class="text-base font-bold text-slate-900 tracking-tight mb-2">Brand Identity</h2>

          <div>
            <label class="admin-field-label" for="site-name">Site / Business Name</label>
            <input id="site-name" class="admin-field-input" name="name" [(ngModel)]="model.name" required />
          </div>

          <div>
            <label class="admin-field-label" for="site-tagline">Tagline / Motto</label>
            <input id="site-tagline" class="admin-field-input" name="tagline" [(ngModel)]="model.tagline" />
          </div>

          <div>
            <label class="admin-field-label" for="site-desc">Meta Description (SEO & Story Intro)</label>
            <textarea id="site-desc" class="admin-field-input min-h-24" name="description" [(ngModel)]="model.description"></textarea>
          </div>

          <div>
            <label class="admin-field-label" for="site-legal">Footer Legal Entity / Copyright Name</label>
            <input id="site-legal" class="admin-field-input" name="legalName" [(ngModel)]="model.legalName" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Brand Settings' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Contact & Opening Hours & Socials -->
    @if (activeTab() === 'contact') {
      <div class="w-full space-y-6">
        <!-- Contact Details -->
        <div class="admin-card space-y-5">
          <h2 class="text-base font-bold text-slate-900 tracking-tight mb-2">Contact Channels</h2>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="admin-field-label" for="contact-email">Public Email</label>
              <input id="contact-email" class="admin-field-input" type="email" name="email" [(ngModel)]="model.contact.email" />
            </div>
            <div>
              <label class="admin-field-label" for="contact-phone">Phone Number</label>
              <input id="contact-phone" class="admin-field-input" name="phone" [(ngModel)]="model.contact.phone" />
            </div>
          </div>

          <div class="border-t border-slate-100 pt-5 mt-5">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Physical Address</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="admin-field-label" for="address-street">Street Address</label>
                <input id="address-street" class="admin-field-input" name="street" [(ngModel)]="model.contact.address.street" />
              </div>
              <div>
                <label class="admin-field-label" for="address-city">City</label>
                <input id="address-city" class="admin-field-input" name="city" [(ngModel)]="model.contact.address.city" />
              </div>
              <div>
                <label class="admin-field-label" for="address-postal">Postal Code</label>
                <input id="address-postal" class="admin-field-input" name="postalCode" [(ngModel)]="model.contact.address.postalCode" />
              </div>
              <div class="sm:col-span-2">
                <label class="admin-field-label" for="address-country">Country</label>
                <input id="address-country" class="admin-field-input" name="country" [(ngModel)]="model.contact.address.country" />
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-5 mt-5">
            <label class="admin-field-label" for="contact-map">Google Maps Location Link</label>
            <input id="contact-map" class="admin-field-input" name="mapUrl" [(ngModel)]="model.contact.mapUrl" placeholder="https://maps.google.com/..." />
          </div>
        </div>

        <!-- Opening Hours -->
        <div class="admin-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Opening Hours</h2>
            <button type="button" class="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors" (click)="addHourRow()">
              + Add Row
            </button>
          </div>

          <div class="space-y-3">
            @for (hour of model.hours; track $index) {
              <div class="flex items-center gap-3">
                <input
                  class="admin-field-input flex-1"
                  placeholder="e.g. Tuesday – Friday"
                  [(ngModel)]="hour.days"
                />
                <input
                  class="admin-field-input flex-1"
                  placeholder="e.g. 12:00 – 22:00 or Closed"
                  [(ngModel)]="hour.time"
                />
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                  (click)="removeHourRow($index)"
                  title="Remove row"
                >
                  ✕
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Social Media Links -->
        <div class="admin-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-slate-900 tracking-tight">Social Profiles</h2>
            <button type="button" class="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors" (click)="addSocialRow()">
              + Add Profile
            </button>
          </div>

          <div class="space-y-3">
            @for (social of model.socials; track $index) {
              <div class="flex items-center gap-3">
                <input
                  class="admin-field-input w-1/3"
                  placeholder="e.g. Instagram"
                  [(ngModel)]="social.label"
                />
                <input
                  class="admin-field-input flex-1"
                  placeholder="e.g. https://instagram.com/thewinehouse"
                  [(ngModel)]="social.url"
                />
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                  (click)="removeSocialRow($index)"
                  title="Remove profile"
                >
                  ✕
                </button>
              </div>
            }
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Contact & Hours' }}
          </button>
        </div>
      </div>
    }

    <!-- Tab: Mail & Alerts -->
    @if (activeTab() === 'email') {
      <div class="w-full space-y-6">
        
        <!-- Company Email Alerts Configuration -->
        <div class="admin-card space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 tracking-tight mb-1">Company Ingestion &amp; Notifications</h2>
            <p class="text-xs text-slate-500">
              Configure which company inbox receives live alerts whenever guest inquiries or customer orders arrive.
            </p>
          </div>

          <div>
            <label class="admin-field-label" for="company-notify-email">Company Notification Email Address</label>
            <input
              id="company-notify-email"
              class="admin-field-input font-mono"
              type="email"
              placeholder="info@thewinehouse.gr"
              [(ngModel)]="ensureMailConfig().company_notification_email"
            />
            <span class="text-2xs text-slate-400 mt-1 block">
              Direct destination for all cellar orders and website inquiries.
            </span>
          </div>

          <div class="space-y-3 pt-2">
            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                class="mt-0.5 rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                [(ngModel)]="ensureMailConfig().notify_on_new_message"
              />
              <div>
                <span class="text-xs font-bold text-slate-900 block">Contact &amp; Tasting Inquiries Alert</span>
                <span class="text-2xs text-slate-500">
                  Immediately forward all website contact form submissions and sommelier booking requests to the company inbox.
                </span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                class="mt-0.5 rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                [(ngModel)]="ensureMailConfig().notify_on_new_order"
              />
              <div>
                <span class="text-xs font-bold text-slate-900 block">New Order &amp; Cellar Allocation Alert</span>
                <span class="text-2xs text-slate-500">
                  Receive an automated itemized breakdown whenever a customer completes an online order.
                </span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                class="mt-0.5 rounded border-slate-300 text-wine-700 focus:ring-wine-500"
                [(ngModel)]="ensureMailConfig().send_customer_order_confirmation"
              />
              <div>
                <span class="text-xs font-bold text-slate-900 block">Send Customer Order Receipts &amp; Bank Settlement Details</span>
                <span class="text-2xs text-slate-500">
                  Automatically email an official cellar confirmation and wire transfer instructions (IBAN/BIC) to the customer.
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- Mail Server & SMTP Configuration -->
        <div class="admin-card space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 tracking-tight mb-1">Mail Server &amp; SMTP Hosting Credentials</h2>
            <p class="text-xs text-slate-500">
              Configure your hosting provider's outgoing SMTP server to dispatch authentic branded emails.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="admin-field-label" for="mail-driver">Mail Delivery Driver</label>
              <select
                id="mail-driver"
                class="admin-field-input"
                [(ngModel)]="ensureMailConfig().mail_driver"
              >
                <option value="smtp">SMTP (Dedicated Mail Server / Hosting Provider)</option>
                <option value="log">Log File (Development Mode — write to disk)</option>
                <option value="sendmail">Sendmail (Host Server Binary)</option>
              </select>
            </div>

            <div>
              <label class="admin-field-label" for="mail-encryption">Encryption Protocol</label>
              <select
                id="mail-encryption"
                class="admin-field-input"
                [(ngModel)]="ensureMailConfig().mail_encryption"
              >
                <option value="tls">TLS (STARTTLS — Recommended on Port 587)</option>
                <option value="ssl">SSL (Port 465)</option>
                <option value="none">None / Plain (Port 25 or 587)</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label class="admin-field-label" for="mail-host">SMTP Host Server</label>
              <input
                id="mail-host"
                class="admin-field-input font-mono"
                type="text"
                placeholder="mail.winehouse.gr or smtp.yourhost.com"
                [(ngModel)]="ensureMailConfig().mail_host"
              />
            </div>
            <div>
              <label class="admin-field-label" for="mail-port">SMTP Port</label>
              <input
                id="mail-port"
                class="admin-field-input font-mono"
                type="number"
                placeholder="587"
                [(ngModel)]="ensureMailConfig().mail_port"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="admin-field-label" for="mail-user">SMTP Username / Account</label>
              <input
                id="mail-user"
                class="admin-field-input font-mono"
                type="text"
                placeholder="info@thewinehouse.gr"
                [(ngModel)]="ensureMailConfig().mail_username"
              />
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label class="admin-field-label" for="mail-pass">SMTP Password</label>
                <button
                  type="button"
                  (click)="showMailPassword.update(v => !v)"
                  class="text-2xs text-slate-500 hover:text-slate-800 underline cursor-pointer mb-1"
                >
                  {{ showMailPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
              <input
                id="mail-pass"
                class="admin-field-input font-mono"
                [type]="showMailPassword() ? 'text' : 'password'"
                placeholder="••••••••••••"
                [(ngModel)]="ensureMailConfig().mail_password"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="admin-field-label" for="mail-from-email">Sender "From" Email</label>
              <input
                id="mail-from-email"
                class="admin-field-input font-mono"
                type="email"
                placeholder="info@thewinehouse.gr"
                [(ngModel)]="ensureMailConfig().mail_from_address"
              />
            </div>
            <div>
              <label class="admin-field-label" for="mail-from-name">Sender "From" Name</label>
              <input
                id="mail-from-name"
                class="admin-field-input"
                type="text"
                placeholder="The Winehouse Atelier"
                [(ngModel)]="ensureMailConfig().mail_from_name"
              />
            </div>
          </div>
        </div>

        <!-- Live SMTP Diagnostic / Test Dispatcher -->
        <div class="admin-card space-y-4">
          <div>
            <h2 class="text-base font-bold text-slate-900 tracking-tight mb-1">Test Mail Server Connectivity</h2>
            <p class="text-xs text-slate-500">
              Send a test diagnostic message to verify authentication and SMTP delivery with your mailhost before saving.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              class="admin-field-input font-mono flex-1"
              type="email"
              placeholder="Enter destination email (e.g. your personal email)"
              [(ngModel)]="testEmailRecipient"
            />
            <button
              type="button"
              class="btn btn-secondary shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
              [disabled]="testingEmail()"
              (click)="sendTestEmail()"
            >
              @if (testingEmail()) {
                <span class="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Testing Connection…</span>
              } @else {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                <span>Send Test Email</span>
              }
            </button>
          </div>

          @if (testEmailResult(); as res) {
            @if (res.success) {
              <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>{{ res.message || 'Test email successfully dispatched!' }}</span>
              </div>
            } @else {
              <div class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                <p class="font-bold">✕ SMTP Diagnostic Failed</p>
                <p class="font-mono text-2xs whitespace-pre-wrap">{{ res.error }}</p>
              </div>
            }
          }
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Saving…' : 'Save Mail & Notification Settings' }}
          </button>
        </div>

      </div>
    }

    <!-- Tab: Mode & Aesthetics -->
    @if (activeTab() === 'appearance') {
      <div class="w-full space-y-6">
        <!-- Apple-style Maintenance Mode Toggle Card -->
        <div class="admin-card space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-slate-900 tracking-tight mb-1">Maintenance & Coming Soon Mode</h2>
              <p class="text-xs text-slate-500 max-w-lg">
                When activated, regular visitors land on the holding page with the ambient video. Logged-in administrators have full website access.
              </p>
            </div>
            <span
              class="admin-badge shrink-0"
              [class]="model.maintenance_mode ? 'admin-badge-draft' : 'admin-badge-live'"
            >
              <span class="admin-badge-dot"></span>
              {{ model.maintenance_mode ? 'Maintenance Active' : 'Live to Public' }}
            </span>
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span class="text-sm font-semibold text-slate-900 block">Enable Maintenance Holding Screen</span>
              <span class="text-xs text-slate-500">
                {{ model.maintenance_mode ? 'Visitors currently see holding screen.' : 'Visitors see the live full website.' }}
              </span>
            </div>
            <label class="ios-toggle">
              <input
                type="checkbox"
                [(ngModel)]="model.maintenance_mode"
              />
              <span class="ios-toggle-slider"></span>
            </label>
          </div>

          <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
            {{ saving() ? 'Applying…' : 'Save Mode Setting' }}
          </button>
        </div>

        <!-- Interactive Theme & Color Palette Customizer -->
        <div class="admin-card space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-slate-900 tracking-tight mb-1">Color Palette &amp; Atelier Theme</h2>
              <p class="text-xs text-slate-500 max-w-lg">
                Customize the palette used across the website. Changing colors updates the live site immediately upon saving.
              </p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="saveSettings()">
              {{ saving() ? 'Saving…' : 'Save Colors' }}
            </button>
          </div>

          <!-- Color Presets -->
          <div>
            <label class="admin-field-label mb-2">Curated Color Presets</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              @for (preset of colorPresets; track preset.name) {
                <button
                  type="button"
                  (click)="applyPreset(preset)"
                  class="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left group cursor-pointer"
                >
                  <div class="flex items-center gap-1 mb-2">
                    <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.primary"></span>
                    <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.paper"></span>
                    <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.terracotta"></span>
                    <span class="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" [style.background-color]="preset.colors.ink"></span>
                  </div>
                  <span class="text-xs font-bold text-slate-800 block truncate group-hover:text-slate-950">{{ preset.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Individual Color Controls -->
          <div class="border-t border-slate-100 pt-5">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Custom Color Configuration</h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <!-- Primary Brand -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Primary Brand</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.primary"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.primary"
                  (ngModelChange)="onColorChange()"
                  placeholder="#C84B31"
                />
                <span class="text-2xs text-slate-400 block">Buttons, active links, accents</span>
              </div>

              <!-- Canvas Paper -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Canvas / Paper</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.paper"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.paper"
                  (ngModelChange)="onColorChange()"
                  placeholder="#ECE7E1"
                />
                <span class="text-2xs text-slate-400 block">Light background & canvas panels</span>
              </div>

              <!-- Dark Ink / Text -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Typography / Ink</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.ink"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.ink"
                  (ngModelChange)="onColorChange()"
                  placeholder="#111111"
                />
                <span class="text-2xs text-slate-400 block">Headings, body text, structural borders</span>
              </div>

              <!-- Terracotta Highlight -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Terracotta Accent</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.terracotta"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.terracotta"
                  (ngModelChange)="onColorChange()"
                  placeholder="#C84B31"
                />
                <span class="text-2xs text-slate-400 block">Tape stickers, asterisk card, badges</span>
              </div>

              <!-- Gold Amber Highlight -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Gold Accent</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.accent"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.accent"
                  (ngModelChange)="onColorChange()"
                  placeholder="#C9A227"
                />
                <span class="text-2xs text-slate-400 block">Foil highlights, stamps, sparkle details</span>
              </div>

              <!-- Dark Sections -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-900">Dark Sections</span>
                  <input
                    type="color"
                    [(ngModel)]="model.colors.card_dark"
                    (ngModelChange)="onColorChange()"
                    class="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
                <input
                  class="admin-field-input font-mono text-xs uppercase"
                  [(ngModel)]="model.colors.card_dark"
                  (ngModelChange)="onColorChange()"
                  placeholder="#111111"
                />
                <span class="text-2xs text-slate-400 block">Manifesto block & showcase cards</span>
              </div>

            </div>
          </div>

          <!-- Live Preview Banner -->
          <div class="border-t border-slate-100 pt-5">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Live Atelier Preview</h3>
            <div
              class="p-6 rounded-2xl border transition-all"
              [style.background-color]="model.colors.paper"
              [style.color]="model.colors.ink"
              [style.border-color]="model.colors.ink"
            >
              <div class="flex items-center justify-between gap-4 mb-4">
                <span
                  class="px-2.5 py-1 text-[11px] font-mono font-bold uppercase"
                  [style.background-color]="model.colors.terracotta"
                  style="color: #ffffff"
                >
                  WINE ATELIER
                </span>
                <span class="text-xs font-mono font-bold uppercase" [style.color]="model.colors.primary">
                  EXPLORE SELECTION →
                </span>
              </div>
              <h4 class="text-2xl font-bold uppercase tracking-tight mb-2" [style.color]="model.colors.ink">
                Good Wine Isn't Decoration. It's Direction.
              </h4>
              <p class="text-xs font-serif italic mb-4" [style.color]="model.colors.ink">
                Curating small-batch independent growers with low intervention.
              </p>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border"
                  [style.background-color]="model.colors.primary"
                  [style.border-color]="model.colors.primary"
                  style="color: #ffffff"
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border"
                  [style.border-color]="model.colors.ink"
                  [style.color]="model.colors.ink"
                  style="background-color: transparent"
                >
                  Outline Action
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Typography Specimens -->
        <div class="admin-card">
          <h2 class="text-base font-bold text-slate-900 tracking-tight mb-4">Typography Hierarchy</h2>
          <div class="space-y-4">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Headline Font (Anton)</span>
              <p class="font-big text-2xl uppercase text-slate-900">THE WINEHOUSE — CELLAR &amp; STORIES</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Editorial Serif (Cormorant Garamond / Cinzel)</span>
              <p class="font-serif text-xl text-slate-800" style="font-family: var(--font-serif)">A glass poured with care, told with love</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Monospace Labels (Space Mono)</span>
              <p class="text-xs font-mono text-slate-700">/ MANIFESTO • SMALL-BATCH INDEPENDENT GROWERS</p>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Tab: Security (Password & Sessions) -->
    @if (activeTab() === 'security') {
      <div class="w-full grid gap-6 md:grid-cols-2">
        <div class="admin-card">
          <h2 class="text-base font-bold text-slate-900 tracking-tight mb-4">Update Administrator Password</h2>

          <form class="space-y-4" (ngSubmit)="savePassword()">
            <div>
              <label class="admin-field-label" for="current-pwd">Current Password</label>
              <input id="current-pwd" class="admin-field-input" type="password" name="current" [(ngModel)]="currentPassword" required autocomplete="current-password" />
            </div>

            <div>
              <label class="admin-field-label" for="new-pwd">New Password <span class="text-slate-400 font-normal normal-case">(min 10 characters)</span></label>
              <input id="new-pwd" class="admin-field-input" type="password" name="new" [(ngModel)]="newPassword" required minlength="10" autocomplete="new-password" />
              @if (newPassword) {
                <div class="mt-2 flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      [style.width]="passwordStrength + '%'"
                      [style.background-color]="passwordStrength >= 75 ? '#10b981' : passwordStrength >= 40 ? '#f59e0b' : '#ef4444'"
                    ></div>
                  </div>
                  <span class="text-xs font-semibold text-slate-500">{{ passwordStrengthLabel }}</span>
                </div>
              }
            </div>

            <div>
              <label class="admin-field-label" for="confirm-pwd">Confirm New Password</label>
              <input id="confirm-pwd" class="admin-field-input" type="password" name="confirm" [(ngModel)]="confirmPassword" required autocomplete="new-password" />
              @if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                <p class="text-xs text-red-600 font-semibold mt-1">Passwords do not match</p>
              }
            </div>

            @if (passwordError()) {
              <p class="text-sm text-red-600 font-semibold">{{ passwordError() }}</p>
            }
            @if (passwordSaved()) {
              <p class="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                <span>✓</span> Password updated successfully
              </p>
            }

            <button class="btn btn-primary btn-sm" type="submit" [disabled]="savingPassword()">
              {{ savingPassword() ? 'Saving…' : 'Change Password' }}
            </button>
          </form>
        </div>

        <div class="admin-card">
          <h2 class="text-base font-bold text-slate-900 tracking-tight mb-2">Active Session Security</h2>
          <p class="text-xs text-slate-500">Your current browser is securely authenticated with Sanctum Bearer tokens.</p>
          <div class="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Current browser session — Authenticated & active</span>
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
