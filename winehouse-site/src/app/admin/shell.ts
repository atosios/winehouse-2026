import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './auth';
import { ConfirmDialog } from './confirm-dialog';
import { I18nService } from '../core/i18n.service';
import { AdminApi } from './api';

@Component({
  selector: 'wh-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog],
  template: `
    <div class="admin-root">
      <!-- Mobile backdrop -->
      <div
        class="admin-mobile-backdrop"
        [class.open]="sidebarOpen()"
        (click)="sidebarOpen.set(false)"
      ></div>

      <!-- Apple-style Dark Charcoal Sidebar -->
      <aside class="admin-sidebar" [class.open]="sidebarOpen()">
        <!-- Brand Header -->
        <a routerLink="/" class="admin-sidebar-logo" title="View website">
          <div class="flex items-center gap-2.5">
            <img src="/logo_white_mark.png" alt="The Winehouse" class="h-7 w-auto" />
            <span class="font-semibold text-sm tracking-tight text-white">The Winehouse</span>
          </div>
          <span class="admin-sidebar-badge">Admin</span>
        </a>

        <!-- Commerce Section -->
        <div class="admin-sidebar-section">
          <span class="admin-sidebar-section-label">Store &amp; Commerce</span>
          @for (item of commerceNav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="admin-nav-item flex items-center justify-between"
              (click)="sidebarOpen.set(false)"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="nav-icon" [innerHTML]="item.icon"></span>
                <span class="truncate">{{ item.label }}</span>
              </div>
              @if (item.path === '/admin/messages' && unreadMessagesCount() > 0) {
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                  {{ unreadMessagesCount() }}
                </span>
              }
            </a>
          }
        </div>

        <!-- Content Section -->
        <div class="admin-sidebar-section">
          <span class="admin-sidebar-section-label">Content &amp; Editorial</span>
          @for (item of contentNav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="admin-nav-item"
              (click)="sidebarOpen.set(false)"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span>{{ item.label }}</span>
            </a>
          }
        </div>

        <!-- Administration Section -->
        <div class="admin-sidebar-section">
          <span class="admin-sidebar-section-label">System &amp; Settings</span>
          @for (item of adminNav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="admin-nav-item"
              (click)="sidebarOpen.set(false)"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span>{{ item.label }}</span>
            </a>
          }
        </div>

        <!-- User Profile Card in Sidebar Footer -->
        <div class="admin-sidebar-footer">
          <div class="admin-user-card">
            <div class="relative">
              <span class="admin-avatar">{{ initials }}</span>
              <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#111218]"></span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white truncate">{{ auth.user()?.name || 'Administrator' }}</p>
              <p class="text-2xs text-slate-400 truncate">{{ auth.user()?.email || 'admin@winehouse.gr' }}</p>
            </div>
          </div>
          <button
            type="button"
            class="w-full text-xs text-slate-400 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between"
            (click)="auth.logout()"
          >
            <span>Sign out</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main Content Stage (Scrolls independently while sidebar stays pinned) -->
      <div class="admin-stage">
        <!-- Apple Frosted Glass Header -->
        <header class="admin-header">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="admin-mobile-toggle"
              (click)="sidebarOpen.set(!sidebarOpen())"
              aria-label="Toggle menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Workspace</span>
          </div>

          <div class="admin-header-actions">
            <!-- Minimalist Editorial Language Switcher (Homepage Style) -->
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-mono font-bold tracking-widest uppercase transition-all duration-300 border border-slate-200/80 bg-white shadow-2xs select-none text-slate-700"
            >
              <button
                type="button"
                (click)="i18n.setLang('en')"
                class="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                [class.opacity-100]="i18n.currentLang() === 'en'"
                [class.opacity-35]="i18n.currentLang() !== 'en'"
                title="English"
              >
                EN
              </button>
              <span class="opacity-25 text-[10px] font-normal">/</span>
              <button
                type="button"
                (click)="i18n.setLang('el')"
                class="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                [class.opacity-100]="i18n.currentLang() === 'el'"
                [class.opacity-35]="i18n.currentLang() !== 'el'"
                title="Ελληνικά"
              >
                GR
              </button>
            </div>

            <a
              routerLink="/"
              target="_blank"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-2xs transition-colors"
              title="Open public website in new tab"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span>View Live Site</span>
            </a>
            <span class="admin-avatar">{{ initials }}</span>
          </div>
        </header>

        <!-- Page Canvas with full-width consistency -->
        <main class="flex-1 p-6 md:p-8 w-full min-w-0">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Global Confirm Dialog -->
    <wh-confirm-dialog />
  `,
})
export class AdminShell {
  auth = inject(AdminAuth);
  i18n = inject(I18nService);
  private api = inject(AdminApi);
  sidebarOpen = signal(false);
  readonly unreadMessagesCount = signal(0);

  constructor() {
    this.checkUnreadMessages();
  }

  checkUnreadMessages(): void {
    this.api.listMessages().subscribe({
      next: (res) => {
        const count = typeof res === 'object' && res && 'unread_count' in res ? res.unread_count : 0;
        this.unreadMessagesCount.set(count);
      },
      error: () => {},
    });
  }

  get initials(): string {
    const name = this.auth.user()?.name || 'A';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  private icon(d: string) {
    return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  commerceNav = [
    {
      path: '/admin/products',
      label: 'Products',
      exact: false,
      icon: this.icon(
        '<path d="M8 2h8v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V2z"/><path d="M12 10v10"/><path d="M7 22h10"/>'
      ),
    },
    {
      path: '/admin/orders',
      label: 'Orders',
      exact: false,
      icon: this.icon(
        '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'
      ),
    },
    {
      path: '/admin/messages',
      label: 'Messages',
      exact: false,
      icon: this.icon(
        '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
      ),
    },
    {
      path: '/admin/store-config',
      label: 'Store Settings',
      exact: false,
      icon: this.icon(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
      ),
    },
  ];

  contentNav = [
    {
      path: '/admin',
      label: 'Overview',
      exact: true,
      icon: this.icon(
        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
      ),
    },
    {
      path: '/admin/page-editor',
      label: 'Page Content Editor',
      exact: false,
      icon: this.icon(
        '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
      ),
    },
    {
      path: '/admin/posts',
      label: 'Journal & Posts',
      exact: false,
      icon: this.icon(
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'
      ),
    },
    {
      path: '/admin/pages',
      label: 'Pages',
      exact: false,
      icon: this.icon(
        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
      ),
    },
    {
      path: '/admin/assets',
      label: 'Media Library',
      exact: false,
      icon: this.icon(
        '<rect x="3" y="3" width="18" height="18" rx="3" ry="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
      ),
    },
  ];

  adminNav = [
    {
      path: '/admin/users',
      label: 'Team & Users',
      exact: false,
      icon: this.icon(
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
      ),
    },
    {
      path: '/admin/settings',
      label: 'Settings',
      exact: false,
      icon: this.icon(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
      ),
    },
  ];
}
