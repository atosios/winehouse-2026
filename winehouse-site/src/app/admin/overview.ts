import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApi, Post, Page, Asset } from './api';
import { AdminAuth } from './auth';

@Component({
  selector: 'wh-admin-overview',
  imports: [RouterLink, DatePipe],
  template: `
    <!-- Top Greeting Banner -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{{ greeting }}, {{ userName }}</h1>
        <p class="text-xs text-slate-500 mt-0.5">{{ today | date: 'EEEE, MMMM d, y' }} · System Overview</p>
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/admin/posts/new" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Entry</span>
        </a>
      </div>
    </div>

    <!-- Apple KPI Stat Widgets Row -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
      @for (stat of stats(); track stat.label) {
        <a [routerLink]="stat.link || null" class="admin-stat-card block transition-transform hover:-translate-y-0.5">
          <div class="flex items-start justify-between">
            <div>
              <div class="admin-stat-value">{{ stat.value }}</div>
              <div class="admin-stat-label">{{ stat.label }}</div>
            </div>
            <div class="admin-stat-icon" [innerHTML]="stat.icon"></div>
          </div>
          @if (stat.subtext) {
            <p class="text-[11px] font-mono text-slate-400 mt-2">{{ stat.subtext }}</p>
          }
        </a>
      }
    </div>

    <!-- Quick Action Cards (6-Column Grid) -->
    <div class="mb-8">
      <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-3">Quick Navigation Hub</h2>
      <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        @for (action of quickActions; track action.path) {
          <a [routerLink]="action.path" class="admin-action-card">
            <div class="admin-action-card-icon" [innerHTML]="action.icon"></div>
            <span class="admin-action-card-label">{{ action.label }}</span>
          </a>
        }
      </div>
    </div>

    <!-- Recent Content & Activity -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">Recent Activity &amp; Updates</h2>
        <a routerLink="/admin/posts" class="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          View all posts →
        </a>
      </div>

      @if (loading()) {
        <div class="admin-card text-center py-8 text-slate-400 text-sm">
          Loading activity…
        </div>
      } @else if (recentItems().length === 0) {
        <div class="admin-card admin-empty-state">
          <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
          <p>No activity yet. Create your first post or page to get started.</p>
        </div>
      } @else {
        <div class="admin-card !p-0 overflow-hidden">
          <div class="divide-y divide-slate-100">
            @for (item of recentItems(); track item.id + item.type) {
              <div class="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {{ item.type === 'post' ? 'P' : 'Pg' }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <a
                        [routerLink]="item.type === 'post' ? ['/admin/posts', item.id] : ['/admin/pages', item.id]"
                        class="text-sm font-semibold text-slate-900 hover:underline truncate"
                      >
                        {{ item.title }}
                      </a>
                      <span
                        class="admin-badge text-2xs"
                        [class]="item.type === 'post' ? 'admin-badge-live' : 'admin-badge-draft'"
                      >
                        {{ item.type === 'post' ? 'Journal' : 'Page' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">
                      {{ item.published ? 'Live on website' : 'Draft' }} · {{ item.updated_at | date: 'medium' }}
                    </p>
                  </div>
                </div>

                <a
                  [routerLink]="item.type === 'post' ? ['/admin/posts', item.id] : ['/admin/pages', item.id]"
                  class="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-200/60 transition-colors shrink-0"
                >
                  Edit
                </a>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminOverview implements OnInit {
  private api = inject(AdminApi);
  private auth = inject(AdminAuth);

  today = new Date();
  loading = signal(true);
  stats = signal<{ label: string; value: number | string; icon: string; link?: string; subtext?: string }[]>([]);
  recentItems = signal<{ id: number; title: string; type: string; published: boolean; updated_at: string }[]>([]);

  get userName(): string {
    return this.auth.user()?.name?.split(' ')[0] || 'Admin';
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private svgIcon(d: string) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  quickActions = [
    {
      path: '/admin/messages',
      label: 'Inquiries',
      icon: this.svgIcon('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
    },
    {
      path: '/admin/homepage-editor',
      label: 'Page Studio',
      icon: this.svgIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'),
    },
    {
      path: '/admin/products',
      label: 'Products',
      icon: this.svgIcon('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    },
    {
      path: '/admin/posts',
      label: 'Journal Posts',
      icon: this.svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
    },
    {
      path: '/admin/assets',
      label: 'Media Library',
      icon: this.svgIcon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    },
    {
      path: '/admin/settings',
      label: 'Site Settings',
      icon: this.svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    },
  ];

  ngOnInit() {
    forkJoin({
      posts: this.api.listPosts(),
      pages: this.api.listPages(),
      assets: this.api.listAssets(),
      messages: this.api.listMessages(),
    }).subscribe({
      next: ({ posts, pages, assets, messages }) => {
        const publishedPosts = posts.filter((p) => p.published).length;
        const unreadMessages = messages.unread_count || 0;
        const totalMessages = messages.total_count ?? messages.messages.length;

        this.stats.set([
          {
            label: 'Inquiries',
            value: totalMessages,
            subtext: unreadMessages > 0 ? `${unreadMessages} unread` : 'All read',
            icon: this.svgIcon('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
            link: '/admin/messages',
          },
          {
            label: 'Journal Posts',
            value: posts.length,
            subtext: `${publishedPosts} published`,
            icon: this.svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
            link: '/admin/posts',
          },
          {
            label: 'Custom Pages',
            value: pages.length,
            subtext: 'Static & studio pages',
            icon: this.svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),
            link: '/admin/pages',
          },
          {
            label: 'Media Files',
            value: assets.length,
            subtext: 'Atelier gallery assets',
            icon: this.svgIcon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
            link: '/admin/assets',
          },
        ]);

        const items = [
          ...posts.map((p) => ({ id: p.id, title: p.title, type: 'post' as const, published: p.published, updated_at: p.updated_at })),
          ...pages.map((p) => ({ id: p.id, title: p.title, type: 'page' as const, published: p.published, updated_at: p.updated_at })),
        ];
        items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        this.recentItems.set(items.slice(0, 7));

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
