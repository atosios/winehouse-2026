import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, NewsletterSubscriber, NewsletterCampaign, SubscribersListResponse } from './api';
import { SiteSettingsService } from '../core/site-settings.service';
import { AdminConfirm } from './confirm-dialog';

type NewsletterTab = 'subscribers' | 'campaigns';

@Component({
  selector: 'wh-admin-newsletter',
  imports: [FormsModule],
  template: `
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 text-2xs font-bold uppercase rounded bg-wine-100 text-wine-800 font-mono">Audience &amp; GDPR</span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Newsletter Studio</h1>
        </div>
        <p class="text-xs text-slate-500">Manage GDPR-compliant subscribers, compose editorial dispatches, and broadcast campaigns.</p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        @if (activeTab() === 'subscribers') {
          <a
            [href]="exportCsvUrl"
            target="_blank"
            class="btn btn-secondary btn-sm"
            title="Download CSV for EU audit compliance"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export CSV</span>
          </a>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            (click)="openAddSubscriberModal()"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Subscriber</span>
          </button>
        } @else if (activeTab() === 'campaigns' && !editingCampaign()) {
          <button
            type="button"
            class="btn btn-primary btn-sm"
            (click)="createNewCampaign()"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Compose Newsletter</span>
          </button>
        }
      </div>
    </div>

    <!-- Apple-style Segmented Navigation Tabs -->
    <div class="admin-tabs mb-6">
      <button
        type="button"
        class="admin-tab"
        [class.active]="activeTab() === 'subscribers'"
        (click)="switchTab('subscribers')"
      >
        <span>Subscribers Registry</span>
        @if (stats().active > 0) {
          <span class="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-wine-100 text-wine-800">
            {{ stats().active }}
          </span>
        }
      </button>
      <button
        type="button"
        class="admin-tab"
        [class.active]="activeTab() === 'campaigns'"
        (click)="switchTab('campaigns')"
      >
        <span>Campaigns &amp; Dispatches</span>
        @if (campaigns().length > 0) {
          <span class="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
            {{ campaigns().length }}
          </span>
        }
      </button>
    </div>

    <!-- Global Notice & Feedback -->
    @if (feedbackMsg()) {
      <div class="p-3.5 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
        <span class="flex items-center gap-1.5">
          <span>✓</span> {{ feedbackMsg() }}
        </span>
        <button type="button" class="text-2xs text-emerald-900 underline font-normal cursor-pointer" (click)="feedbackMsg.set('')">Dismiss</button>
      </div>
    }

    @if (errorMsg()) {
      <div class="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between shadow-2xs">
        <span>⚠ {{ errorMsg() }}</span>
        <button type="button" class="text-2xs text-red-900 underline font-normal cursor-pointer" (click)="errorMsg.set('')">Dismiss</button>
      </div>
    }

    <!-- ========================================================================================= -->
    <!-- TAB 1: SUBSCRIBERS REGISTRY                                                              -->
    <!-- ========================================================================================= -->
    @if (activeTab() === 'subscribers') {
      <div class="space-y-6">
        
        <!-- Summary Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="admin-card !p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-wine-50 text-wine-800 border border-wine-200/80 flex items-center justify-center font-bold text-base shrink-0">
              👥
            </div>
            <div class="min-w-0">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Total Signups</span>
              <span class="text-lg font-bold text-slate-900 leading-tight">{{ stats().total }}</span>
            </div>
          </div>

          <div class="admin-card !p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center font-bold text-base shrink-0">
              ✓
            </div>
            <div class="min-w-0">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Active Subscribed</span>
              <span class="text-lg font-bold text-emerald-800 leading-tight">{{ stats().active }}</span>
            </div>
          </div>

          <div class="admin-card !p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center font-bold text-base shrink-0">
              ✕
            </div>
            <div class="min-w-0">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Unsubscribed</span>
              <span class="text-lg font-bold text-slate-700 leading-tight">{{ stats().unsubscribed }}</span>
            </div>
          </div>

          <div class="admin-card !p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center font-bold text-base shrink-0">
              ✦
            </div>
            <div class="min-w-0">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">New (Last 30 Days)</span>
              <span class="text-lg font-bold text-amber-800 leading-tight">+{{ stats().recent_30d }}</span>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              class="admin-field-input !pl-9 !py-1.5 text-xs"
              placeholder="Search by subscriber email, name, or channel source..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
            />
          </div>

          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/70 text-2xs font-mono font-bold">
              <button
                type="button"
                (click)="filterStatus.set('all'); loadSubscribers()"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                [class.bg-white]="filterStatus() === 'all'"
                [class.shadow-2xs]="filterStatus() === 'all'"
                [class.text-slate-900]="filterStatus() === 'all'"
                [class.text-slate-500]="filterStatus() !== 'all'"
              >
                All
              </button>
              <button
                type="button"
                (click)="filterStatus.set('subscribed'); loadSubscribers()"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                [class.bg-white]="filterStatus() === 'subscribed'"
                [class.shadow-2xs]="filterStatus() === 'subscribed'"
                [class.text-emerald-800]="filterStatus() === 'subscribed'"
                [class.text-slate-500]="filterStatus() !== 'subscribed'"
              >
                Active ({{ stats().active }})
              </button>
              <button
                type="button"
                (click)="filterStatus.set('unsubscribed'); loadSubscribers()"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                [class.bg-white]="filterStatus() === 'unsubscribed'"
                [class.shadow-2xs]="filterStatus() === 'unsubscribed'"
                [class.text-slate-900]="filterStatus() === 'unsubscribed'"
                [class.text-slate-500]="filterStatus() !== 'unsubscribed'"
              >
                Unsubscribed ({{ stats().unsubscribed }})
              </button>
            </div>
          </div>
        </div>

        <!-- Subscribers Table -->
        <div class="admin-card !p-0 overflow-hidden">
          @if (loadingSubscribers()) {
            <div class="p-12 text-center text-xs font-mono text-slate-500">
              <span class="inline-block w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></span>
              Loading subscribers ledger…
            </div>
          } @else if (subscribers().length === 0) {
            <div class="p-12 text-center space-y-2">
              <span class="text-3xl block">📭</span>
              <p class="text-sm font-bold text-slate-800">No subscribers match your search.</p>
              <p class="text-xs text-slate-500">Visitors who subscribe via the homepage or contact inquiry form will appear here.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    <th class="py-3 px-4 font-semibold">Subscriber</th>
                    <th class="py-3 px-3 font-semibold">Status</th>
                    <th class="py-3 px-3 font-semibold">Channel</th>
                    <th class="py-3 px-3 font-semibold">GDPR Consent Date</th>
                    <th class="py-3 px-3 font-semibold">IP Address</th>
                    <th class="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (sub of subscribers(); track sub.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <!-- Subscriber Info -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-2xs text-slate-700 uppercase shrink-0">
                            {{ (sub.name || sub.email)[0] }}
                          </div>
                          <div class="min-w-0">
                            <span class="font-bold text-slate-900 block truncate">{{ sub.email }}</span>
                            @if (sub.name) {
                              <span class="text-2xs text-slate-500 block truncate">{{ sub.name }}</span>
                            }
                          </div>
                        </div>
                      </td>

                      <!-- Status Badge -->
                      <td class="py-3 px-3">
                        @if (sub.status === 'subscribed') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Opted-out
                          </span>
                        }
                      </td>

                      <!-- Source Channel -->
                      <td class="py-3 px-3 font-mono text-2xs uppercase">
                        <span class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                          {{ sub.source || 'homepage' }}
                        </span>
                      </td>

                      <!-- Consent Log Date -->
                      <td class="py-3 px-3 font-mono text-2xs text-slate-600">
                        @if (sub.consent_given_at) {
                          <span>{{ formatDate(sub.consent_given_at) }}</span>
                        } @else {
                          <span class="text-slate-400">—</span>
                        }
                      </td>

                      <!-- IP Address -->
                      <td class="py-3 px-3 font-mono text-2xs text-slate-500">
                        {{ sub.ip_address || '127.0.0.1' }}
                      </td>

                      <!-- Actions -->
                      <td class="py-3 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5">
                          @if (sub.status === 'subscribed') {
                            <button
                              type="button"
                              (click)="toggleSubscriberStatus(sub)"
                              class="text-2xs font-mono font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Unsubscribe member"
                            >
                              Opt-out
                            </button>
                          } @else {
                            <button
                              type="button"
                              (click)="toggleSubscriberStatus(sub)"
                              class="text-2xs font-mono font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Reactivate subscription"
                            >
                              Re-activate
                            </button>
                          }

                          <button
                            type="button"
                            (click)="deleteSubscriber(sub)"
                            class="text-2xs font-mono font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Erase record under GDPR Right to Erasure"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

      </div>
    }

    <!-- ========================================================================================= -->
    <!-- TAB 2: CAMPAIGNS & COMPOSE STUDIO                                                        -->
    <!-- ========================================================================================= -->
    @if (activeTab() === 'campaigns') {
      @if (!editingCampaign()) {
        <!-- Campaigns List View -->
        <div class="space-y-6">
          <div class="admin-card !p-0 overflow-hidden">
            @if (loadingCampaigns()) {
              <div class="p-12 text-center text-xs font-mono text-slate-500">
                <span class="inline-block w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                Loading campaign drafts…
              </div>
            } @else if (campaigns().length === 0) {
              <div class="p-12 text-center space-y-3">
                <span class="text-3xl block">✉️</span>
                <h3 class="text-sm font-bold text-slate-900">No Newsletter Campaigns Yet</h3>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">
                  Create your first seasonal dispatch to announce new vintage releases, winemaker dinners, or cellar tasting flights.
                </p>
                <button
                  type="button"
                  class="btn btn-primary btn-sm mt-2"
                  (click)="createNewCampaign()"
                >
                  + Compose First Newsletter
                </button>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-50/80 border-b border-slate-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                      <th class="py-3 px-4 font-semibold">Subject &amp; Title</th>
                      <th class="py-3 px-3 font-semibold">Status</th>
                      <th class="py-3 px-3 font-semibold">Recipients</th>
                      <th class="py-3 px-3 font-semibold">Date</th>
                      <th class="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (camp of campaigns(); track camp.id) {
                      <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-3.5 px-4">
                          <div class="min-w-0">
                            <span class="font-bold text-slate-900 text-sm block truncate">{{ camp.subject }}</span>
                            @if (camp.title) {
                              <span class="text-2xs font-mono text-slate-500 block truncate">{{ camp.title }}</span>
                            }
                          </div>
                        </td>

                        <td class="py-3.5 px-3">
                          @if (camp.status === 'sent') {
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Dispatched
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ✎ Draft
                            </span>
                          }
                        </td>

                        <td class="py-3.5 px-3 font-mono text-2xs">
                          @if (camp.status === 'sent') {
                            <span class="font-bold text-slate-800">{{ camp.sent_count }} / {{ camp.recipient_count }}</span>
                          } @else {
                            <span class="text-slate-400">— (Draft)</span>
                          }
                        </td>

                        <td class="py-3.5 px-3 font-mono text-2xs text-slate-600">
                          {{ formatDate(camp.sent_at || camp.created_at) }}
                        </td>

                        <td class="py-3.5 px-4 text-right">
                          <div class="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              (click)="editCampaign(camp)"
                              class="btn btn-secondary btn-xs cursor-pointer"
                            >
                              {{ camp.status === 'sent' ? 'View / Duplicate' : 'Edit Draft' }}
                            </button>

                            <button
                              type="button"
                              (click)="openTestModal(camp)"
                              class="btn btn-secondary btn-xs cursor-pointer"
                              title="Send preview test email"
                            >
                              Test
                            </button>

                            @if (camp.status !== 'sent') {
                              <button
                                type="button"
                                (click)="confirmBroadcast(camp)"
                                class="btn btn-primary btn-xs cursor-pointer"
                                title="Broadcast to active subscribers"
                              >
                                Send Broadcast
                              </button>
                            }

                            <button
                              type="button"
                              (click)="deleteCampaign(camp)"
                              class="text-red-500 hover:text-red-700 p-1 text-xs font-bold cursor-pointer"
                              title="Delete campaign"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- ========================================================================================= -->
        <!-- CAMPAIGN COMPOSER & LIVE EMAIL PREVIEW SPLIT STUDIO                                      -->
        <!-- ========================================================================================= -->
        <div class="space-y-6">
          <!-- Top Composer Bar -->
          <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="closeComposer()"
                class="text-xs font-mono font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                ← Back to Campaigns
              </button>
              <span class="text-slate-300">|</span>
              <span class="text-xs font-bold text-slate-800">
                {{ currentCampaign.id ? 'Editing Campaign #' + currentCampaign.id : 'New Newsletter Dispatch' }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                [disabled]="savingCampaign()"
                (click)="saveCampaignDraft()"
              >
                <span>{{ savingCampaign() ? 'Saving Draft…' : 'Save Draft' }}</span>
              </button>

              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="openTestModal(currentCampaign)"
              >
                <span>Send Test Preview</span>
              </button>

              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="confirmBroadcast(currentCampaign)"
              >
                <span>Broadcast to {{ stats().active }} Subscribers →</span>
              </button>
            </div>
          </div>

          <!-- Two-Column Split: Form Editor + Real-time Preview -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <!-- Left 6 Cols: Form Inputs & Formatting Tools -->
            <div class="lg:col-span-6 space-y-4">
              <div class="admin-card space-y-4">
                <div>
                  <label class="admin-field-label" for="camp-subject">Subject Line *</label>
                  <input
                    id="camp-subject"
                    type="text"
                    [(ngModel)]="currentCampaign.subject"
                    required
                    placeholder="e.g. Winter Allocations & Rare Old-Vine Xinomavro Release"
                    class="admin-field-input font-medium"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="admin-field-label" for="camp-title">Editorial Headline / Title</label>
                    <input
                      id="camp-title"
                      type="text"
                      [(ngModel)]="currentCampaign.title"
                      placeholder="e.g. The 2026 Cellar Allocations Are Open"
                      class="admin-field-input"
                    />
                  </div>

                  <div>
                    <label class="admin-field-label" for="camp-preview">Inbox Preheader Text</label>
                    <input
                      id="camp-preview"
                      type="text"
                      [(ngModel)]="currentCampaign.preview_text"
                      placeholder="Brief teaser snippet before opening..."
                      class="admin-field-input"
                    />
                  </div>
                </div>

                <!-- Quick Content Snippet Inserters -->
                <div class="pt-2 border-t border-slate-100">
                  <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick Formatting Inserts
                  </span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      (click)="insertSnippet('p')"
                      class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-2xs font-mono font-semibold text-slate-700 cursor-pointer"
                    >
                      + Paragraph
                    </button>
                    <button
                      type="button"
                      (click)="insertSnippet('h3')"
                      class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-2xs font-mono font-semibold text-slate-700 cursor-pointer"
                    >
                      + Subheading
                    </button>
                    <button
                      type="button"
                      (click)="insertSnippet('bottle')"
                      class="px-2 py-1 rounded bg-wine-50 hover:bg-wine-100 text-2xs font-mono font-bold text-wine-800 cursor-pointer"
                    >
                      + Bottle Spotlight Card
                    </button>
                    <button
                      type="button"
                      (click)="insertSnippet('button')"
                      class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-2xs font-mono font-semibold text-slate-700 cursor-pointer"
                    >
                      + Action Button
                    </button>
                    <button
                      type="button"
                      (click)="insertSnippet('tag')"
                      class="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-2xs font-mono font-semibold text-amber-800 cursor-pointer"
                    >
                      + Name Tag (&#123;&#123;'name'&#125;&#125;)
                    </button>
                  </div>
                </div>

                <!-- Content HTML / Body Area -->
                <div>
                  <label class="admin-field-label" for="camp-content">Newsletter Body Content (HTML or Plain Text) *</label>
                  <textarea
                    id="camp-content"
                    [(ngModel)]="currentCampaign.content"
                    rows="14"
                    class="admin-field-input font-mono text-xs leading-relaxed resize-y"
                    placeholder="Enter your dispatch message..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Right 6 Cols: Real-time Live Email Preview (Styled with GDPR footer) -->
            <div class="lg:col-span-6 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                  Live Inbox Preview
                </span>
                <span class="text-[10px] font-mono text-slate-400">Desktop &amp; Mobile Responsive</span>
              </div>

              <!-- Email Frame Container -->
              <div class="bg-[#ece7e1] p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm max-w-[580px] mx-auto overflow-hidden">
                
                <div class="bg-[#fcfbfa] border-[1.5px] border-[#111111] rounded shadow-[4px_4px_0px_0px_#111111] overflow-hidden text-[#111111]">
                  
                  <!-- Email Header -->
                  <div class="bg-[#111111] text-white p-5 border-b-2 border-[#c84b31] flex items-center justify-between">
                    <div>
                      <span class="font-mono text-[9px] font-bold uppercase tracking-widest text-[#c84b31] block">
                        {{ newsletterCfg().newsletter_from_name || 'The Winehouse Cellar Dispatches' }}
                      </span>
                      <span class="font-serif text-lg font-bold tracking-tight uppercase text-white">The Winehouse</span>
                    </div>
                    <span class="bg-[#c84b31] text-white font-mono text-[8px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                      Atelier Gazette
                    </span>
                  </div>

                  <!-- Email Body -->
                  <div class="p-6 space-y-4 text-sm leading-relaxed">
                    @if (currentCampaign.title) {
                      <h2 class="font-big text-2xl uppercase tracking-tight text-[#111111] leading-tight">
                        {{ currentCampaign.title }}
                      </h2>
                    }

                    <div
                      class="text-xs text-[#2b2b2b] leading-relaxed space-y-3 prose prose-xs max-w-none"
                      [innerHTML]="renderedPreviewContent"
                    ></div>
                  </div>

                  <!-- Mandatory EU GDPR Sender Legal Footer -->
                  <div class="bg-[#f4f1ea] border-t-[1.5px] border-[#111111] p-5 text-[10px] text-slate-600 space-y-3">
                    <p class="text-2xs text-slate-600 leading-normal">
                      {{ newsletterCfg().footer_disclaimer || 'You received this email because you subscribed to The Winehouse Cellar Dispatches.' }}
                    </p>

                    <div class="p-2.5 bg-white border border-[#e0deda] rounded font-mono text-[9px] text-slate-600 leading-tight space-y-0.5">
                      <div class="font-bold text-slate-800">{{ newsletterCfg().company_legal_name || 'The Winehouse Fine Terroirs Single Member P.C.' }}</div>
                      <div>{{ newsletterCfg().company_physical_address || '14 Vasilissis Sofias Ave, Athens 106 74, Greece' }}</div>
                      <div>Contact: {{ newsletterCfg().company_contact_email || 'info@winehouse.gr' }}</div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-dashed border-slate-300 font-mono text-[10px]">
                      <span class="text-slate-500 underline">Privacy Policy</span>
                      <span class="px-2 py-0.5 rounded bg-white text-[#c84b31] border border-[#c84b31] font-bold uppercase tracking-wide text-[9px]">
                        Unsubscribe →
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      }
    }

    <!-- ========================================================================================= -->
    <!-- MODAL: ADD SUBSCRIBER                                                                     -->
    <!-- ========================================================================================= -->
    @if (showAddSubscriberModal()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-base font-bold text-slate-900">Add New Subscriber</h3>
            <button type="button" (click)="showAddSubscriberModal.set(false)" class="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="admin-field-label">Email Address *</label>
              <input type="email" [(ngModel)]="newSubEmail" required placeholder="patron@domain.com" class="admin-field-input" />
            </div>

            <div>
              <label class="admin-field-label">Full Name (Optional)</label>
              <input type="text" [(ngModel)]="newSubName" placeholder="Alexander Bond" class="admin-field-input" />
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-2xs text-slate-600">
              ℹ This subscriber will be recorded with EU GDPR manual consent and provided with a 1-click tokenized unsubscribe link on all dispatches.
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" class="btn btn-secondary btn-sm" (click)="showAddSubscriberModal.set(false)">Cancel</button>
            <button type="button" class="btn btn-primary btn-sm" [disabled]="!newSubEmail || savingSubscriber()" (click)="saveNewSubscriber()">
              {{ savingSubscriber() ? 'Saving…' : 'Add Subscriber' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ========================================================================================= -->
    <!-- MODAL: SEND TEST EMAIL                                                                    -->
    <!-- ========================================================================================= -->
    @if (showTestModal()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-base font-bold text-slate-900">Send Test Preview Email</h3>
            <button type="button" (click)="showTestModal.set(false)" class="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
          </div>

          <div class="space-y-3">
            <p class="text-xs text-slate-500">
              Send a rendered test email of <strong>{{ targetCampaignForTest?.subject }}</strong> to your personal inbox to inspect formatting and verify delivery.
            </p>

            <div>
              <label class="admin-field-label">Test Recipient Email *</label>
              <input type="email" [(ngModel)]="testRecipientEmail" required class="admin-field-input" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" class="btn btn-secondary btn-sm" (click)="showTestModal.set(false)">Cancel</button>
            <button type="button" class="btn btn-primary btn-sm" [disabled]="!testRecipientEmail || sendingTest()" (click)="executeSendTest()">
              {{ sendingTest() ? 'Sending Test…' : 'Send Test Now' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminNewsletter implements OnInit {
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);
  private confirm = inject(AdminConfirm);

  readonly activeTab = signal<NewsletterTab>('subscribers');
  readonly subscribers = signal<NewsletterSubscriber[]>([]);
  readonly campaigns = signal<NewsletterCampaign[]>([]);
  readonly loadingSubscribers = signal(false);
  readonly loadingCampaigns = signal(false);
  readonly feedbackMsg = signal('');
  readonly errorMsg = signal('');

  readonly stats = signal({
    total: 0,
    active: 0,
    unsubscribed: 0,
    recent_30d: 0,
  });

  readonly filterStatus = signal<'all' | 'subscribed' | 'unsubscribed'>('all');
  searchQuery = '';

  // Composer
  readonly editingCampaign = signal(false);
  readonly savingCampaign = signal(false);
  currentCampaign: Partial<NewsletterCampaign> = {
    subject: '',
    title: '',
    preview_text: '',
    content: '',
  };

  // Add Subscriber Modal
  readonly showAddSubscriberModal = signal(false);
  readonly savingSubscriber = signal(false);
  newSubEmail = '';
  newSubName = '';

  // Test Modal
  readonly showTestModal = signal(false);
  readonly sendingTest = signal(false);
  targetCampaignForTest: Partial<NewsletterCampaign> | null = null;
  testRecipientEmail = 'admin@winehouse.gr';

  readonly newsletterCfg = computed(() => this.settingsService.newsletterConfig());

  get exportCsvUrl(): string {
    return this.api.getExportSubscribersUrl();
  }

  get renderedPreviewContent(): string {
    let content = this.currentCampaign.content || '<p class="text-slate-400 italic">No message content entered yet...</p>';
    content = content.replace(/\{\{name\}\}/g, 'Alexandra Bond');
    content = content.replace(/\{\{email\}\}/g, 'patron@winehouse.gr');
    if (!content.includes('<p>') && !content.includes('<div>')) {
      content = '<p>' + content.replace(/\n/g, '<br/>') + '</p>';
    }
    return content;
  }

  ngOnInit(): void {
    this.loadSubscribers();
    this.loadCampaigns();
  }

  switchTab(tab: NewsletterTab): void {
    this.activeTab.set(tab);
    if (tab === 'subscribers') {
      this.loadSubscribers();
    } else {
      this.loadCampaigns();
    }
  }

  loadSubscribers(): void {
    this.loadingSubscribers.set(true);
    const params: { status?: string; search?: string } = {};
    if (this.filterStatus() !== 'all') {
      params.status = this.filterStatus();
    }
    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }

    this.api.listSubscribers(params).subscribe({
      next: (res) => {
        this.loadingSubscribers.set(false);
        this.subscribers.set(res.subscribers);
        if (res.stats) {
          this.stats.set(res.stats);
        }
      },
      error: () => {
        this.loadingSubscribers.set(false);
      },
    });
  }

  onSearchChange(): void {
    this.loadSubscribers();
  }

  loadCampaigns(): void {
    this.loadingCampaigns.set(true);
    this.api.listCampaigns().subscribe({
      next: (res) => {
        this.loadingCampaigns.set(false);
        this.campaigns.set(res);
      },
      error: () => {
        this.loadingCampaigns.set(false);
      },
    });
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Subscriber Actions
  openAddSubscriberModal(): void {
    this.newSubEmail = '';
    this.newSubName = '';
    this.showAddSubscriberModal.set(true);
  }

  saveNewSubscriber(): void {
    if (!this.newSubEmail.trim()) return;
    this.savingSubscriber.set(true);

    this.api
      .createSubscriber({
        email: this.newSubEmail.trim(),
        name: this.newSubName.trim() || undefined,
        status: 'subscribed',
      })
      .subscribe({
        next: () => {
          this.savingSubscriber.set(false);
          this.showAddSubscriberModal.set(false);
          this.feedbackMsg.set(`Subscriber ${this.newSubEmail} added successfully.`);
          this.loadSubscribers();
        },
        error: (err) => {
          this.savingSubscriber.set(false);
          this.errorMsg.set(err?.error?.message || 'Could not add subscriber. Make sure the email is unique.');
        },
      });
  }

  toggleSubscriberStatus(sub: NewsletterSubscriber): void {
    const newStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    this.api.updateSubscriber(sub.id, { status: newStatus }).subscribe({
      next: () => {
        this.feedbackMsg.set(`Status updated for ${sub.email}.`);
        this.loadSubscribers();
      },
    });
  }

  async deleteSubscriber(sub: NewsletterSubscriber): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Erase Subscriber Record?',
      message: `Are you sure you want to permanently delete ${sub.email} under GDPR Right to Erasure?`,
      confirmLabel: 'Erase Record',
      danger: true,
    });
    if (!ok) return;

    this.api.deleteSubscriber(sub.id).subscribe({
      next: () => {
        this.feedbackMsg.set(`Subscriber ${sub.email} permanently erased.`);
        this.loadSubscribers();
      },
    });
  }

  // Campaign Actions
  createNewCampaign(): void {
    this.currentCampaign = {
      subject: '',
      title: '',
      preview_text: '',
      content: `Dear {{name}},\n\nWe are pleased to unveil our latest seasonal cellar dispatches from the Mediterranean terroirs.\n\nEnjoy allocation privileges on our rare bottles vault.\n\nWarm regards,\nThe Winehouse Atelier Team`,
    };
    this.editingCampaign.set(true);
  }

  editCampaign(camp: NewsletterCampaign): void {
    this.currentCampaign = { ...camp };
    this.editingCampaign.set(true);
  }

  closeComposer(): void {
    this.editingCampaign.set(false);
  }

  saveCampaignDraft(): void {
    if (!this.currentCampaign.subject?.trim() || !this.currentCampaign.content?.trim()) {
      this.errorMsg.set('Please provide both a Subject Line and Message Content.');
      return;
    }

    this.savingCampaign.set(true);
    const data = {
      subject: this.currentCampaign.subject.trim(),
      title: this.currentCampaign.title?.trim() || undefined,
      preview_text: this.currentCampaign.preview_text?.trim() || undefined,
      content: this.currentCampaign.content.trim(),
    };

    const request = this.currentCampaign.id
      ? this.api.updateCampaign(this.currentCampaign.id, data)
      : this.api.createCampaign(data);

    request.subscribe({
      next: (res) => {
        this.savingCampaign.set(false);
        this.currentCampaign = { ...res };
        this.feedbackMsg.set('Campaign draft saved successfully.');
        this.loadCampaigns();
      },
      error: (err) => {
        this.savingCampaign.set(false);
        this.errorMsg.set(err?.error?.message || 'Could not save campaign draft.');
      },
    });
  }

  async deleteCampaign(camp: NewsletterCampaign): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Delete Campaign?',
      message: `Are you sure you want to delete campaign "${camp.subject}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.api.deleteCampaign(camp.id).subscribe({
      next: () => {
        this.feedbackMsg.set('Campaign deleted.');
        this.loadCampaigns();
      },
    });
  }

  openTestModal(camp: Partial<NewsletterCampaign>): void {
    this.targetCampaignForTest = camp;
    this.testRecipientEmail = this.settingsService.settings().contact?.email || 'admin@winehouse.gr';
    this.showTestModal.set(true);
  }

  executeSendTest(): void {
    if (!this.testRecipientEmail || !this.targetCampaignForTest) return;

    this.sendingTest.set(true);

    const sendTestCall = (campId: number) => {
      this.api.sendTestCampaign(campId, this.testRecipientEmail).subscribe({
        next: () => {
          this.sendingTest.set(false);
          this.showTestModal.set(false);
          this.feedbackMsg.set(`Test email successfully dispatched to ${this.testRecipientEmail}.`);
        },
        error: (err) => {
          this.sendingTest.set(false);
          this.errorMsg.set(err?.error?.message || 'Could not send test email.');
        },
      });
    };

    if (this.targetCampaignForTest.id) {
      sendTestCall(this.targetCampaignForTest.id);
    } else {
      // Save draft first
      const data = {
        subject: this.currentCampaign.subject || 'Draft Newsletter Test',
        title: this.currentCampaign.title || undefined,
        preview_text: this.currentCampaign.preview_text || undefined,
        content: this.currentCampaign.content || 'Draft content',
      };
      this.api.createCampaign(data).subscribe({
        next: (created) => {
          this.currentCampaign = { ...created };
          sendTestCall(created.id);
        },
      });
    }
  }

  async confirmBroadcast(camp: Partial<NewsletterCampaign>): Promise<void> {
    if (!camp.subject || !camp.content) {
      this.errorMsg.set('Please provide both a Subject Line and Content before broadcasting.');
      return;
    }

    const count = this.stats().active;
    if (count === 0) {
      this.errorMsg.set('There are no active subscribers in the registry to receive this campaign.');
      return;
    }

    const ok = await this.confirm.open({
      title: 'Broadcast Newsletter Dispatch?',
      message: `You are about to dispatch "${camp.subject}" to all ${count} active subscribers. Every email will contain a 1-click unsubscribe token and mandatory EU legal sender info. Proceed?`,
      confirmLabel: `Broadcast to ${count} Subscribers`,
      danger: false,
    });
    if (!ok) return;

    const executeBroadcast = (id: number) => {
      this.api.sendCampaign(id).subscribe({
        next: (res) => {
          this.feedbackMsg.set(res.message || 'Campaign successfully dispatched.');
          this.loadCampaigns();
          this.editingCampaign.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message || 'Failed to dispatch campaign.');
        },
      });
    };

    if (camp.id) {
      executeBroadcast(camp.id);
    } else {
      this.api.createCampaign({
        subject: camp.subject,
        title: camp.title || undefined,
        preview_text: camp.preview_text || undefined,
        content: camp.content,
      }).subscribe({
        next: (created) => {
          executeBroadcast(created.id);
        },
      });
    }
  }

  insertSnippet(type: 'p' | 'h3' | 'bottle' | 'button' | 'tag'): void {
    let snippet = '';
    switch (type) {
      case 'p':
        snippet = '\n<p>Enter your paragraph text here.</p>\n';
        break;
      case 'h3':
        snippet = '\n<h3 style="font-size:18px;font-weight:bold;margin:16px 0 6px 0;color:#c84b31;text-transform:uppercase;">Seasonal Vintage Focus</h3>\n';
        break;
      case 'bottle':
        snippet = `\n<div style="background-color:#ffffff;border:1.5px solid #111111;padding:16px;margin:16px 0;border-radius:4px;">
  <span style="background-color:#c84b31;color:#ffffff;font-family:monospace;font-size:9px;font-weight:bold;padding:2px 6px;text-transform:uppercase;">Rare Parcel</span>
  <h4 style="font-size:16px;font-weight:bold;margin:8px 0 4px 0;text-transform:uppercase;">RITUÁL 2021 &bull; Old Vines Xinomavro</h4>
  <p style="font-size:13px;color:#555555;margin:0 0 10px 0;">Crushed volcanic pumice, sun-dried wild tomato, and intense mineral tannins.</p>
  <a href="${this.newsletterCfg().privacy_policy_url || '/shop'}" style="display:inline-block;background-color:#111111;color:#ffffff;padding:8px 16px;font-family:monospace;font-size:11px;font-weight:bold;text-decoration:none;text-transform:uppercase;">Reserve Allocation →</a>
</div>\n`;
        break;
      case 'button':
        snippet = `\n<div style="text-align:center;margin:20px 0;">
  <a href="${this.newsletterCfg().privacy_policy_url || '/shop'}" style="display:inline-block;background-color:#c84b31;color:#ffffff;padding:12px 26px;font-family:monospace;font-size:12px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:1px;border-radius:3px;">
    Explore Private Vault →
  </a>
</div>\n`;
        break;
      case 'tag':
        snippet = '{{name}}';
        break;
    }

    this.currentCampaign.content = (this.currentCampaign.content || '') + snippet;
  }
}
