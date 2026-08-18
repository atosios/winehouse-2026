import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, ContactMessage } from './api';
import { AdminConfirm } from './confirm-dialog';

@Component({
  selector: 'wh-admin-messages',
  imports: [FormsModule],
  template: `
    <!-- Top Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Inquiries &amp; Messages</h1>
          @if (unreadCount() > 0) {
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {{ unreadCount() }} Unread
            </span>
          }
        </div>
        <p class="text-xs text-slate-500 mt-0.5">
          Review and respond to guest inquiries, private tasting bookings, and website contact submissions.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadMessages()"
          class="btn btn-secondary text-xs cursor-pointer flex items-center gap-1.5"
          title="Refresh messages list"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Filter Tabs & Search Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <!-- Status Tabs -->
      <div class="admin-tabs overflow-x-auto">
        <button
          type="button"
          (click)="activeTab.set('all')"
          class="admin-tab whitespace-nowrap"
          [class.active]="activeTab() === 'all'"
        >
          All ({{ messages().length }})
        </button>
        <button
          type="button"
          (click)="activeTab.set('unread')"
          class="admin-tab whitespace-nowrap"
          [class.active]="activeTab() === 'unread'"
        >
          Unread ({{ unreadCount() }})
        </button>
        <button
          type="button"
          (click)="activeTab.set('read')"
          class="admin-tab whitespace-nowrap"
          [class.active]="activeTab() === 'read'"
        >
          Read ({{ readCount() }})
        </button>
        <button
          type="button"
          (click)="activeTab.set('archived')"
          class="admin-tab whitespace-nowrap"
          [class.active]="activeTab() === 'archived'"
        >
          Archived ({{ archivedCount() }})
        </button>
      </div>

      <!-- Search Input -->
      <input
        type="text"
        [(ngModel)]="searchQuery"
        placeholder="Search messages by sender, email, subject…"
        class="admin-search"
      />
    </div>

    <!-- Messages Table / Empty State -->
    @if (loading()) {
      <div class="admin-card p-12 text-center text-xs text-slate-400">
        Loading cellar inquiries…
      </div>
    } @else if (filteredMessages().length === 0) {
      <div class="admin-card p-12 text-center space-y-2">
        <p class="text-xs text-slate-500 font-semibold">No messages found matching your criteria.</p>
        <p class="text-2xs text-slate-400">New submissions from the website contact form will automatically appear here.</p>
      </div>
    } @else {
      <div class="admin-card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="w-8"></th>
                <th>Sender &amp; Contact</th>
                <th>Subject / Type</th>
                <th>Message Excerpt</th>
                <th>Received</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (msg of filteredMessages(); track msg.id) {
                <tr
                  class="cursor-pointer transition-colors"
                  [class.bg-amber-50/40]="!msg.is_read"
                  (click)="openMessageModal(msg)"
                >
                  <!-- Read Status Indicator -->
                  <td class="text-center" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      (click)="toggleReadStatus(msg)"
                      class="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                      [class.bg-amber-500]="!msg.is_read"
                      [class.bg-slate-300]="msg.is_read"
                      [title]="msg.is_read ? 'Mark as unread' : 'Mark as read'"
                    ></button>
                  </td>

                  <!-- Sender & Email -->
                  <td>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold" [class.text-slate-900]="!msg.is_read" [class.text-slate-700]="msg.is_read">
                        {{ msg.name }}
                      </span>
                      <span class="text-2xs text-slate-500 font-mono">
                        {{ msg.email }}
                        @if (msg.phone) {
                          • {{ msg.phone }}
                        }
                      </span>
                    </div>
                  </td>

                  <!-- Subject Badge -->
                  <td>
                    <span class="admin-badge admin-badge-tag font-mono !text-[10px]">
                      {{ msg.subject || msg.project_type || 'General Inquiry' }}
                    </span>
                  </td>

                  <!-- Message Preview -->
                  <td class="max-w-xs sm:max-w-md">
                    <p class="text-xs text-slate-600 truncate line-clamp-1" [class.font-semibold]="!msg.is_read">
                      {{ msg.message }}
                    </p>
                  </td>

                  <!-- Date -->
                  <td class="whitespace-nowrap">
                    <span class="text-2xs font-mono text-slate-400">
                      {{ formatDate(msg.created_at) }}
                    </span>
                  </td>

                  <!-- Action Buttons -->
                  <td class="text-right" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        (click)="openMessageModal(msg)"
                        class="btn btn-secondary btn-xs cursor-pointer"
                      >
                        Read
                      </button>
                      <a
                        [href]="getReplyMailto(msg)"
                        class="btn btn-secondary btn-xs cursor-pointer !text-wine-700"
                        title="Reply via Email client"
                      >
                        Reply
                      </a>
                      <button
                        type="button"
                        (click)="deleteMessage(msg)"
                        class="btn btn-secondary btn-xs !text-red-600 hover:!bg-red-50 cursor-pointer"
                        title="Delete message"
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
      </div>
    }

    <!-- Single Message Detail Modal -->
    @if (selectedMessage(); as activeMsg) {
      <div class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div class="flex items-center gap-2.5">
              <span class="admin-badge admin-badge-tag font-mono !text-[10px]">
                {{ activeMsg.subject || activeMsg.project_type || 'General Inquiry' }}
              </span>
              <span class="text-2xs font-mono text-slate-400">
                / {{ formatDate(activeMsg.created_at) }}
              </span>
            </div>

            <button
              type="button"
              (click)="closeMessageModal()"
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            
            <!-- Sender Identity Card -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-900">{{ activeMsg.name }}</p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-600">
                  <a [href]="'mailto:' + activeMsg.email" class="hover:text-wine-700 underline">
                    {{ activeMsg.email }}
                  </a>
                  @if (activeMsg.phone) {
                    <span>•</span>
                    <a [href]="'tel:' + activeMsg.phone" class="hover:text-wine-700 underline">
                      {{ activeMsg.phone }}
                    </a>
                  }
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <a
                  [href]="getReplyMailto(activeMsg)"
                  class="btn btn-primary btn-xs cursor-pointer flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>

            <!-- Message Body -->
            <div class="space-y-2">
              <span class="text-2xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Message Content
              </span>
              <div class="p-5 rounded-xl bg-stone-50 border border-slate-200 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap selection:bg-wine-100">
                {{ activeMsg.message }}
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="toggleReadStatus(activeMsg)"
                class="btn btn-secondary btn-xs cursor-pointer"
              >
                {{ activeMsg.is_read ? 'Mark as Unread' : 'Mark as Read' }}
              </button>
              <button
                type="button"
                (click)="toggleArchive(activeMsg)"
                class="btn btn-secondary btn-xs cursor-pointer"
              >
                {{ activeMsg.status === 'archived' ? 'Unarchive' : 'Archive' }}
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="deleteMessage(activeMsg)"
                class="btn btn-secondary btn-xs !text-red-600 hover:!bg-red-50 cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                (click)="closeMessageModal()"
                class="btn btn-primary btn-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class AdminMessages implements OnInit {
  private api = inject(AdminApi);
  private confirmDialog = inject(AdminConfirm);

  readonly messages = signal<ContactMessage[]>([]);
  readonly loading = signal(true);
  readonly selectedMessage = signal<ContactMessage | null>(null);

  searchQuery = '';
  readonly activeTab = signal<'all' | 'unread' | 'read' | 'archived'>('all');

  readonly unreadCount = computed(() => {
    return this.messages().filter((m) => !m.is_read).length;
  });

  readonly readCount = computed(() => {
    return this.messages().filter((m) => m.is_read && m.status !== 'archived').length;
  });

  readonly archivedCount = computed(() => {
    return this.messages().filter((m) => m.status === 'archived').length;
  });

  readonly filteredMessages = computed(() => {
    const list = this.messages();
    const tab = this.activeTab();
    const query = this.searchQuery.trim().toLowerCase();

    return list.filter((msg) => {
      // Tab matching
      if (tab === 'unread' && msg.is_read) return false;
      if (tab === 'read' && (!msg.is_read || msg.status === 'archived')) return false;
      if (tab === 'archived' && msg.status !== 'archived') return false;

      // Search matching
      if (!query) return true;
      return (
        msg.name.toLowerCase().includes(query) ||
        msg.email.toLowerCase().includes(query) ||
        (msg.phone && msg.phone.toLowerCase().includes(query)) ||
        (msg.subject && msg.subject.toLowerCase().includes(query)) ||
        (msg.project_type && msg.project_type.toLowerCase().includes(query)) ||
        msg.message.toLowerCase().includes(query)
      );
    });
  });

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading.set(true);
    this.api.listMessages().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res.messages || [];
        this.messages.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching contact messages:', err);
        this.loading.set(false);
      },
    });
  }

  openMessageModal(msg: ContactMessage): void {
    this.selectedMessage.set(msg);
    if (!msg.is_read) {
      this.api.updateMessageStatus(msg.id, { is_read: true, status: 'read' }).subscribe({
        next: (updated) => {
          this.messages.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        },
      });
    }
  }

  closeMessageModal(): void {
    this.selectedMessage.set(null);
  }

  toggleReadStatus(msg: ContactMessage): void {
    const newStatus = !msg.is_read;
    this.api.updateMessageStatus(msg.id, { is_read: newStatus, status: newStatus ? 'read' : 'new' }).subscribe({
      next: (updated) => {
        this.messages.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        if (this.selectedMessage()?.id === updated.id) {
          this.selectedMessage.set(updated);
        }
      },
    });
  }

  toggleArchive(msg: ContactMessage): void {
    const isArchived = msg.status === 'archived';
    const nextStatus = isArchived ? (msg.is_read ? 'read' : 'new') : 'archived';
    this.api.updateMessageStatus(msg.id, { status: nextStatus }).subscribe({
      next: (updated) => {
        this.messages.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        if (this.selectedMessage()?.id === updated.id) {
          this.selectedMessage.set(updated);
        }
      },
    });
  }

  async deleteMessage(msg: ContactMessage): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: `Delete Message from ${msg.name}?`,
      message: `Are you sure you want to delete this message regarding "${msg.subject || msg.project_type || 'General Inquiry'}"?`,
      confirmLabel: 'Delete Message',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (confirmed) {
      this.api.deleteMessage(msg.id).subscribe({
        next: () => {
          this.messages.update((list) => list.filter((m) => m.id !== msg.id));
          if (this.selectedMessage()?.id === msg.id) {
            this.selectedMessage.set(null);
          }
        },
      });
    }
  }

  getReplyMailto(msg: ContactMessage): string {
    const subject = encodeURIComponent(`Re: ${msg.subject || msg.project_type || 'The Winehouse Inquiry'}`);
    return `mailto:${msg.email}?subject=${subject}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
