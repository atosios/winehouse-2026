import { DatePipe } from '@angular/common';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Page } from './api';
import { AdminConfirm } from './confirm-dialog';

@Component({
  selector: 'wh-admin-pages',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Custom Pages</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage standalone web pages and editorial landing layouts.</p>
      </div>
      <a routerLink="new" class="btn btn-primary self-start sm:self-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>New Page</span>
      </a>
    </div>

    <!-- Apple-style Search & Segmented Filter Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <input
        class="admin-search"
        placeholder="Search pages by title or slug…"
        [(ngModel)]="searchQuery"
      />
      <div class="admin-tabs">
        @for (tab of filterTabs; track tab.value) {
          <button
            type="button"
            class="admin-tab"
            [class.active]="activeFilter() === tab.value"
            (click)="activeFilter.set(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="admin-card text-center py-12 text-slate-400 text-sm">
        Loading pages…
      </div>
    } @else if (filteredPages().length === 0) {
      <div class="admin-card admin-empty-state">
        <div class="admin-empty-state-icon">📄</div>
        <p>
          @if (searchQuery || activeFilter() !== 'all') {
            No pages match your filter criteria.
          } @else {
            No custom pages created yet. Click "New Page" to create your first one.
          }
        </p>
        @if (!searchQuery && activeFilter() === 'all') {
          <a routerLink="new" class="btn btn-primary btn-sm mt-2 inline-flex items-center gap-1.5">
            + New Page
          </a>
        }
      </div>
    } @else {
      <div class="admin-card !p-0 overflow-hidden">
        <table class="admin-table">
          <thead>
            <tr>
              <th (click)="toggleSort('title')" class="cursor-pointer">
                Page Title
                @if (sortField() === 'title') {
                  <span>{{ sortDir() === 'asc' ? ' ↑' : ' ↓' }}</span>
                }
              </th>
              <th class="hidden md:table-cell">Route Slug</th>
              <th class="hidden md:table-cell">Status</th>
              <th (click)="toggleSort('date')" class="cursor-pointer">
                Last Updated
                @if (sortField() === 'date') {
                  <span>{{ sortDir() === 'asc' ? ' ↑' : ' ↓' }}</span>
                }
              </th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (page of filteredPages(); track page.id) {
              <tr>
                <td>
                  <a [routerLink]="[page.id]" class="font-semibold text-slate-900 hover:text-slate-700 hover:underline">
                    {{ page.title }}
                  </a>
                </td>
                <td class="hidden md:table-cell">
                  <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">/{{ page.slug }}</span>
                </td>
                <td class="hidden md:table-cell">
                  <span
                    class="admin-badge"
                    [class]="page.published ? 'admin-badge-live' : 'admin-badge-hidden'"
                  >
                    <span class="admin-badge-dot"></span>
                    {{ page.published ? 'Live' : 'Hidden' }}
                  </span>
                </td>
                <td>
                  <span class="text-xs text-slate-500 whitespace-nowrap">
                    {{ page.updated_at | date: 'mediumDate' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <a [routerLink]="[page.id]" class="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                      Edit
                    </a>
                    <button type="button" class="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors" (click)="remove(page)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="text-xs text-slate-400 mt-3 px-1">{{ filteredPages().length }} page{{ filteredPages().length !== 1 ? 's' : '' }} total</p>
    }
  `,
})
export class AdminPages implements OnInit {
  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);
  pages = signal<Page[]>([]);
  loading = signal(true);
  searchQuery = '';
  activeFilter = signal<'all' | 'published' | 'hidden'>('all');
  sortField = signal<'title' | 'date'>('date');
  sortDir = signal<'asc' | 'desc'>('desc');

  filterTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Live Pages', value: 'published' as const },
    { label: 'Hidden', value: 'hidden' as const },
  ];

  filteredPages = computed(() => {
    let items = this.pages();
    const filter = this.activeFilter();
    if (filter === 'published') items = items.filter((p) => p.published);
    else if (filter === 'hidden') items = items.filter((p) => !p.published);

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      items = items.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }

    const field = this.sortField();
    const dir = this.sortDir();
    items = [...items].sort((a, b) => {
      let cmp = 0;
      if (field === 'title') cmp = a.title.localeCompare(b.title);
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return dir === 'asc' ? cmp : -cmp;
    });

    return items;
  });

  ngOnInit() {
    this.api.listPages().subscribe((pages) => {
      this.pages.set(pages);
      this.loading.set(false);
    });
  }

  toggleSort(field: 'title' | 'date') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'title' ? 'asc' : 'desc');
    }
  }

  async remove(page: Page) {
    const ok = await this.confirm.open({
      title: 'Delete page',
      message: `Are you sure you want to delete "${page.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deletePage(page.id).subscribe(() => {
      this.pages.update((list) => list.filter((p) => p.id !== page.id));
    });
  }
}

@Component({
  selector: 'wh-admin-page-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/pages" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      <span>Back to Pages</span>
    </a>

    <div class="flex items-center justify-between gap-4 mb-6">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{{ isNew ? 'Create New Page' : 'Edit Page' }}</h1>
      @if (!isNew && hasChanges) {
        <span class="inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Unsaved changes
        </span>
      }
    </div>

    <!-- Segmented Tabs -->
    <div class="admin-tabs mb-6">
      <button type="button" class="admin-tab" [class.active]="editorTab() === 'content'" (click)="editorTab.set('content')">Page Content</button>
      <button type="button" class="admin-tab" [class.active]="editorTab() === 'settings'" (click)="editorTab.set('settings')">Route & Status</button>
    </div>

    <form class="w-full space-y-6" (ngSubmit)="save()">
      <div class="admin-card space-y-5">
        @if (editorTab() === 'content') {
          <div>
            <label class="admin-field-label" for="page-title">Page Title</label>
            <input id="page-title" class="admin-field-input text-base font-semibold" name="title" [(ngModel)]="model.title" required placeholder="e.g. Private Cellar Tastings" (ngModelChange)="hasChanges = true" />
          </div>

          <div>
            <label class="admin-field-label" for="page-body">Page Body (HTML / Markdown supported)</label>
            <textarea id="page-body" class="admin-field-input min-h-80 font-mono text-xs leading-relaxed" name="body" [(ngModel)]="model.body" placeholder="Write page content here..." (ngModelChange)="hasChanges = true"></textarea>
          </div>
        }

        @if (editorTab() === 'settings') {
          <div>
            <label class="admin-field-label" for="slug">Web Address Slug</label>
            <input id="slug" class="admin-field-input font-mono text-xs" name="slug" [(ngModel)]="model.slug" placeholder="e.g. private-tastings" (ngModelChange)="hasChanges = true" />
            <p class="text-xs text-slate-500 mt-1.5 font-mono">Public URL: <span class="font-bold text-slate-900">/{{ model.slug || slugPreview || '…' }}</span></p>
          </div>

          <!-- iOS Toggle for Published state -->
          <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <span class="text-xs font-semibold text-slate-900 block">Publication State</span>
              <span class="text-2xs text-slate-500">
                {{ model.published ? 'Page is accessible at its URL.' : 'Page is hidden and returns 404.' }}
              </span>
            </div>
            <label class="ios-toggle">
              <input type="checkbox" name="published" [(ngModel)]="model.published" (ngModelChange)="hasChanges = true" />
              <span class="ios-toggle-slider"></span>
            </label>
          </div>
        }
      </div>

      @if (error()) {
        <p class="text-xs text-red-600 font-semibold px-1">{{ error() }}</p>
      }

      <div class="flex items-center gap-3">
        <button class="btn btn-primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving…' : (isNew ? 'Create Page' : 'Save Changes') }}
        </button>
        @if (saved()) {
          <span class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span>✓</span> Saved successfully
          </span>
        }
        <span class="text-2xs text-slate-400 ml-auto hidden sm:block">Shortcut: ⌘S / Ctrl+S</span>
      </div>
    </form>
  `,
  host: {
    '(document:keydown.control.s)': 'onCtrlS($event)',
  },
})
export class AdminPageEdit implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  model: Partial<Page> = { title: '', slug: '', body: '', published: true };
  busy = signal(false);
  saved = signal(false);
  error = signal('');
  editorTab = signal<'content' | 'settings'>('content');
  hasChanges = false;

  get slugPreview(): string {
    return (this.model.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
  }

  ngOnInit() {
    if (!this.isNew) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getPage(id).subscribe((page) => (this.model = page));
    }
  }

  onCtrlS(e: Event) {
    e.preventDefault();
    this.save();
  }

  save() {
    if (!this.model.title) return;
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);

    const req = this.isNew
      ? this.api.createPage(this.model)
      : this.api.updatePage(this.model.id!, this.model);

    req.subscribe({
      next: (page) => {
        this.busy.set(false);
        this.saved.set(true);
        this.hasChanges = false;
        if (this.isNew) {
          this.router.navigate(['/admin/pages', page.id]);
        } else {
          this.model = page;
        }
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Could not save. Please try again.');
      },
    });
  }
}
