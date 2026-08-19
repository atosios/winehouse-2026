import { DatePipe } from '@angular/common';
import { Component, inject, signal, computed, OnInit, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Page, Folder } from './api';
import { AdminConfirm } from './confirm-dialog';
import { WhFolderSidebar, FOLDER_COLORS } from './folder-sidebar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'wh-admin-pages',
  imports: [RouterLink, DatePipe, FormsModule, WhFolderSidebar],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Custom Pages</h1>
          @if (activeFolder()) {
            <span class="text-slate-400 font-mono text-xs">/</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" [class]="getFolderBadgeClass(activeFolder()?.color)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{{ activeFolder()?.name }}</span>
            </span>
          } @else if (selectedFolderId() === 'root') {
            <span class="text-slate-400 font-mono text-xs">/</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Unorganized
            </span>
          }
        </div>
        <p class="text-xs text-slate-500 mt-0.5">
          Manage standalone web pages, editorial landings, and legal documentation.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <a routerLink="new" class="btn btn-primary self-start sm:self-auto shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Page</span>
        </a>
      </div>
    </div>

    <!-- Toast Notification for Hotkey Feedback -->
    @if (copiedToast(); as msg) {
      <div class="fixed top-6 right-6 z-[99999] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
        <span>{{ msg }}</span>
      </div>
    }

    <!-- Main Workspace: Folder Sidebar + Pages Table -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <!-- Left Folder Navigation Sidebar -->
      <div class="md:col-span-4 lg:col-span-3 sticky top-6 z-30">
        <wh-folder-sidebar
          #folderSidebar
          type="page"
          title="Page Folders"
          [selectedFolderId]="selectedFolderId()"
          [totalCount]="pages().length"
          [unorganizedCount]="unorganizedCount()"
          (folderChange)="onFolderChange($event)"
          (foldersUpdated)="onFoldersUpdated($event)"
          (itemDroppedOnFolder)="onDropOnFolder($event)"
        />
      </div>

      <!-- Right Main Content Area -->
      <div class="md:col-span-8 lg:col-span-9 flex flex-col gap-5">
        <!-- Search & Filter Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            class="admin-search flex-1"
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
            <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>
            <p>
              @if (searchQuery || activeFilter() !== 'all') {
                No pages match your filter criteria.
              } @else if (activeFolder()) {
                No pages in folder "{{ activeFolder()?.name }}" yet.
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
                  <th class="w-10 text-center">
                    <input
                      type="checkbox"
                      [checked]="isAllSelected()"
                      (change)="toggleSelectAll()"
                      class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 cursor-pointer"
                      title="Select all pages (Ctrl+A)"
                    />
                  </th>
                  <th (click)="toggleSort('title')" class="cursor-pointer">
                    Page Title
                    @if (sortField() === 'title') {
                      <span>{{ sortDir() === 'asc' ? ' ↑' : ' ↓' }}</span>
                    }
                  </th>
                  <th class="hidden sm:table-cell">Folder</th>
                  <th class="hidden md:table-cell">Route Slug</th>
                  <th class="hidden md:table-cell">Status</th>
                  <th (click)="toggleSort('date')" class="cursor-pointer hidden lg:table-cell">
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
                  <tr
                    [class.bg-wine-50/30]="isSelected(page.id)"
                    class="cursor-pointer select-none"
                    draggable="true"
                    (click)="handleRowClick(page, $event, $index)"
                    (dragstart)="onPageDragStart($event, page)"
                  >
                    <td class="w-10 text-center" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        [checked]="isSelected(page.id)"
                        (change)="toggleSelect(page.id, $event)"
                        class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 cursor-pointer"
                      />
                    </td>
                    <td>
                      <a [routerLink]="[page.id]" class="font-semibold text-slate-900 hover:text-wine-800 hover:underline" (click)="$event.stopPropagation()">
                        {{ page.title }}
                      </a>
                    </td>
                    <td class="hidden sm:table-cell">
                      @if (page.folder) {
                        <span class="px-2 py-0.5 rounded-full text-2xs font-bold" [class]="getFolderBadgeClass(page.folder.color)">
                          {{ page.folder.name }}
                        </span>
                      } @else {
                        <span class="text-2xs text-slate-400 font-mono">Unorganized</span>
                      }
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
                    <td class="hidden lg:table-cell">
                      <span class="text-xs text-slate-500 whitespace-nowrap">
                        {{ page.updated_at | date: 'mediumDate' }}
                      </span>
                    </td>
                    <td class="text-right" (click)="$event.stopPropagation()">
                      <div class="flex items-center justify-end gap-1.5">
                        <!-- Quick Move to Folder Dropdown with bridge wrapper -->
                        <div class="relative group/folder">
                          <button
                            type="button"
                            class="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Assign to folder"
                          >
                            Folder ▾
                          </button>

                          <!-- Outer pt-1 bridge wrapper prevents gap -->
                          <div class="hidden group-hover/folder:block absolute right-0 top-full pt-1 z-30 min-w-[170px]">
                            <div class="bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 space-y-0.5 text-xs text-left">
                              <button
                                type="button"
                                (click)="movePage(page, null)"
                                class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                              >
                                <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                                <span>Unorganized</span>
                              </button>
                              @for (f of availableFolders(); track f.id) {
                                <button
                                  type="button"
                                  (click)="movePage(page, f.id)"
                                  class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                                  [class.font-bold]="page.folder_id === f.id"
                                >
                                  <span class="w-2 h-2 rounded-full" [class]="getFolderDotClass(f.color)"></span>
                                  <span class="truncate">{{ f.name }}</span>
                                </button>
                              }
                            </div>
                          </div>
                        </div>

                        <a
                          [routerLink]="[page.id]"
                          class="px-2 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          Edit
                        </a>

                        <button
                          type="button"
                          (click)="deletePage(page)"
                          class="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
          <p class="text-xs text-slate-400 px-1">{{ filteredPages().length }} page{{ filteredPages().length !== 1 ? 's' : '' }} shown ({{ pages().length }} total)</p>
        }
      </div>
    </div>

    <!-- Floating Batch Actions Bar for Pages -->
    @if (selectedCount() > 0) {
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center flex-wrap gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white transition-all animate-slideUp">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-wine-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs">
            {{ selectedCount() }}
          </span>
          <span class="text-xs font-medium text-slate-200 whitespace-nowrap">
            {{ selectedCount() === 1 ? '1 page' : selectedCount() + ' pages' }} selected
          </span>
        </div>

        <div class="h-4 w-px bg-white/20"></div>

        <!-- Copy Page URLs -->
        <button
          type="button"
          (click)="copySelectedLinks()"
          class="text-xs text-slate-200 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Copy URLs (Ctrl+C)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>Copy Link(s)</span>
          <kbd class="text-3xs font-mono text-slate-400 bg-white/10 px-1 py-0.2 rounded">^C</kbd>
        </button>

        <!-- Bulk Move to Folder Dropdown in Dock with Zero-Gap Bridge -->
        <div class="relative group/bulkMove">
          <button
            type="button"
            (click)="showBulkMove.set(!showBulkMove())"
            class="text-xs text-slate-200 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Move ▾</span>
          </button>

          <!-- Outer bridge container with pb-2 prevents mouseleave gap -->
          <div
            class="absolute bottom-full left-0 pb-2 z-50 min-w-[200px]"
            [class.hidden]="!showBulkMove()"
            [class.group-hover/bulkMove:block]="true"
          >
            <div class="bg-slate-900 text-white rounded-xl shadow-2xl border border-white/20 p-2 space-y-1 text-xs">
              <button
                type="button"
                (click)="bulkMoveSelected(null); showBulkMove.set(false)"
                class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/15 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Unorganized / Root</span>
              </button>
              @for (f of availableFolders(); track f.id) {
                <button
                  type="button"
                  (click)="bulkMoveSelected(f.id); showBulkMove.set(false)"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/15 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span class="w-2 h-2 rounded-full" [class]="getFolderDotClass(f.color)"></span>
                  <span class="truncate">{{ f.name }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <button
          type="button"
          class="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer select-none"
          (click)="deleteSelected()"
          title="Delete selected pages (Delete / Backspace)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          <span>Delete ({{ selectedCount() }})</span>
          <kbd class="text-3xs font-mono text-red-200 bg-red-800/60 px-1 py-0.2 rounded">Del</kbd>
        </button>

        <button
          type="button"
          class="text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer select-none"
          (click)="deselectAll()"
          title="Deselect all (Esc)"
        >
          <span>Esc</span>
        </button>
      </div>
    }
  `,
})
export class AdminPages implements OnInit {
  @ViewChild('folderSidebar') folderSidebarComponent?: WhFolderSidebar;

  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);

  readonly pages = signal<Page[]>([]);
  readonly availableFolders = signal<Folder[]>([]);
  readonly selectedFolderId = signal<number | 'all' | 'root'>('all');
  readonly loading = signal(true);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly copiedToast = signal<string | null>(null);
  readonly showBulkMove = signal(false);
  lastSelectedIndex: number | null = null;

  searchQuery = '';
  readonly activeFilter = signal<'all' | 'published' | 'hidden'>('all');
  readonly sortField = signal<'title' | 'date'>('date');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly filterTabs = [
    { label: 'All Pages', value: 'all' as const },
    { label: 'Live', value: 'published' as const },
    { label: 'Hidden', value: 'hidden' as const },
  ];

  readonly activeFolder = computed(() => {
    const sel = this.selectedFolderId();
    if (typeof sel === 'number') {
      return this.availableFolders().find((f) => f.id === sel) || null;
    }
    return null;
  });

  readonly unorganizedCount = computed(() => {
    return this.pages().filter((p) => !p.folder_id).length;
  });

  readonly filteredPages = computed(() => {
    let items = this.pages();
    const selFolder = this.selectedFolderId();

    if (selFolder === 'root') {
      items = items.filter((p) => !p.folder_id);
    } else if (typeof selFolder === 'number') {
      items = items.filter((p) => p.folder_id === selFolder);
    }

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

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly isAllSelected = computed(() => {
    const list = this.filteredPages();
    if (list.length === 0) return false;
    const set = this.selectedIds();
    return list.every((p) => set.has(p.id));
  });

  ngOnInit() {
    this.refreshPages();
  }

  refreshPages(): void {
    this.loading.set(true);
    this.api.listPages().subscribe({
      next: (pages) => {
        this.pages.set(pages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onFolderChange(id: number | 'all' | 'root'): void {
    this.selectedFolderId.set(id);
    this.deselectAll();
  }

  onFoldersUpdated(folders: Folder[]): void {
    this.availableFolders.set(folders);
  }

  getFolderBadgeClass(colorKey?: string | null): string {
    const found = FOLDER_COLORS.find((c) => c.key === colorKey) || FOLDER_COLORS[0];
    return found.badgeBg;
  }

  getFolderDotClass(colorKey?: string | null): string {
    const found = FOLDER_COLORS.find((c) => c.key === colorKey) || FOLDER_COLORS[0];
    return found.badgeBg;
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  handleRowClick(page: Page, event: MouseEvent, index: number): void {
    if (event.shiftKey && this.lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(this.lastSelectedIndex, index);
      const end = Math.max(this.lastSelectedIndex, index);
      const list = this.filteredPages();
      const current = new Set(this.selectedIds());
      for (let i = start; i <= end; i++) {
        if (list[i]) current.add(list[i].id);
      }
      this.selectedIds.set(current);
    } else if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.toggleSelect(page.id);
      this.lastSelectedIndex = index;
    } else {
      this.toggleSelect(page.id);
      this.lastSelectedIndex = index;
    }
  }

  toggleSelect(id: number, event?: Event): void {
    if (event) event.stopPropagation();
    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.deselectAll();
    } else {
      const allIds = new Set(this.filteredPages().map((p) => p.id));
      this.selectedIds.set(allIds);
    }
  }

  deselectAll(): void {
    this.selectedIds.set(new Set());
    this.lastSelectedIndex = null;
  }

  showToast(message: string): void {
    this.copiedToast.set(message);
    setTimeout(() => this.copiedToast.set(null), 2200);
  }

  copySelectedLinks(): void {
    const selected = this.pages().filter((p) => this.selectedIds().has(p.id));
    if (selected.length === 0) return;
    const text = selected.map((p) => `${window.location.origin}/${p.slug}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`Copied ${selected.length} page URL${selected.length !== 1 ? 's' : ''}`);
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.isTypingInInput(e.target)) return;

    // Ctrl+A / Cmd+A: Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      this.toggleSelectAll();
      return;
    }

    // Ctrl+C / Cmd+C: Copy selected URLs
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (this.selectedCount() > 0) {
        e.preventDefault();
        this.copySelectedLinks();
      }
      return;
    }

    // Delete / Backspace: Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedCount() > 0) {
        e.preventDefault();
        this.deleteSelected();
      }
      return;
    }

    // Escape: Deselect
    if (e.key === 'Escape') {
      if (this.selectedCount() > 0) {
        this.deselectAll();
      }
    }
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  movePage(page: Page, folderId: number | null): void {
    this.api.updatePage(page.id, { folder_id: folderId }).subscribe({
      next: (updated) => {
        this.pages.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.folderSidebarComponent?.loadFolders();
      },
    });
  }

  bulkMoveSelected(folderId: number | null): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.api.bulkMoveItems('page', ids, folderId).subscribe({
      next: () => {
        const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
        this.pages.update((list) =>
          list.map((p) => (ids.includes(p.id) ? { ...p, folder_id: folderId, folder: folderObj } : p))
        );
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
        this.showToast(`Moved ${ids.length} page${ids.length !== 1 ? 's' : ''}`);
      },
    });
  }

  onPageDragStart(event: DragEvent, page: Page): void {
    if (event.dataTransfer) {
      const selected = this.selectedIds().has(page.id) ? Array.from(this.selectedIds()) : [page.id];
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'page', ids: selected }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDropOnFolder({ folderId, event }: { folderId: number | null; event: DragEvent }): void {
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type === 'page' && Array.isArray(data.ids)) {
        this.api.bulkMoveItems('page', data.ids, folderId).subscribe({
          next: () => {
            const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
            this.pages.update((list) =>
              list.map((p) => (data.ids.includes(p.id) ? { ...p, folder_id: folderId, folder: folderObj } : p))
            );
            this.deselectAll();
            this.folderSidebarComponent?.loadFolders();
            this.showToast(`Moved ${data.ids.length} page${data.ids.length !== 1 ? 's' : ''}`);
          },
        });
      }
    } catch {}
  }

  toggleSort(field: 'title' | 'date') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'title' ? 'asc' : 'desc');
    }
  }

  async deletePage(page: Page) {
    const ok = await this.confirm.open({
      title: 'Delete page',
      message: `Are you sure you want to delete "${page.title}" (/ ${page.slug})? This action cannot be undone.`,
      confirmLabel: 'Delete Page',
      danger: true,
    });
    if (!ok) return;
    this.api.deletePage(page.id).subscribe(() => {
      this.pages.update((list) => list.filter((p) => p.id !== page.id));
      if (this.selectedIds().has(page.id)) {
        const next = new Set(this.selectedIds());
        next.delete(page.id);
        this.selectedIds.set(next);
      }
      this.folderSidebarComponent?.loadFolders();
    });
  }

  async deleteSelected() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    const ok = await this.confirm.open({
      title: `Delete ${ids.length} page${ids.length !== 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete these ${ids.length} selected pages? This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length} Page${ids.length !== 1 ? 's' : ''}`,
      danger: true,
    });
    if (!ok) return;

    forkJoin(ids.map((id) => this.api.deletePage(id).pipe(catchError(() => of(null))))).subscribe({
      next: () => {
        const set = new Set(ids);
        this.pages.update((list) => list.filter((p) => !set.has(p.id)));
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
        this.showToast(`Deleted ${ids.length} page${ids.length !== 1 ? 's' : ''}`);
      },
    });
  }
}

@Component({
  selector: 'wh-admin-page-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <a routerLink="/admin/pages" class="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>All Pages</span>
        </a>

        <!-- Undo / Redo Toolbar -->
        <div class="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            class="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            [disabled]="!canUndo()"
            (click)="undo()"
            title="Undo (Ctrl+Z)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <button
            type="button"
            class="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            [disabled]="!canRedo()"
            (click)="redo()"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </button>
        </div>

        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{{ isNew ? 'Create New Page' : 'Edit Page' }}</h1>
      </div>

      @if (!isNew && hasChanges) {
        <span class="inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Unsaved changes
        </span>
      }
    </div>

    <form (ngSubmit)="save()" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Main Content Column (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="admin-card space-y-4">
            <div>
              <label class="admin-field-label" for="page-title">Page Title</label>
              <input id="page-title" class="admin-field-input text-base font-semibold" name="title" [(ngModel)]="model.title" required placeholder="e.g. Private Cellar Tastings" (ngModelChange)="onContentChange()" />
            </div>

            <div>
              <label class="admin-field-label" for="page-body">Page Content (HTML / Markdown supported)</label>
              <textarea id="page-body" class="admin-field-input min-h-96 font-mono text-xs leading-relaxed" name="body" [(ngModel)]="model.body" placeholder="Write page content here..." (ngModelChange)="onContentChange()"></textarea>
            </div>
          </div>
        </div>

        <!-- Meta & Publishing Sidebar (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="admin-card space-y-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-2">Publishing &amp; Route</h2>

            <!-- Folder Assignment -->
            <div>
              <label class="admin-field-label" for="page-folder">Folder</label>
              <select id="page-folder" class="admin-field-input text-xs" name="folder_id" [(ngModel)]="model.folder_id" (ngModelChange)="onContentChange()">
                <option [ngValue]="null">⚪ Unorganized</option>
                @for (f of availableFolders(); track f.id) {
                  <option [ngValue]="f.id">📁 {{ f.name }}</option>
                }
              </select>
            </div>

            <div>
              <label class="admin-field-label" for="slug">Web Address Slug</label>
              <input id="slug" class="admin-field-input font-mono text-xs" name="slug" [(ngModel)]="model.slug" placeholder="e.g. private-tastings" (ngModelChange)="onContentChange()" />
              <p class="text-2xs text-slate-500 mt-1.5 font-mono">Public URL: <span class="font-bold text-slate-900">/{{ model.slug || slugPreview || '…' }}</span></p>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <span class="text-xs font-semibold text-slate-900 block">Published</span>
                <span class="text-2xs text-slate-500">
                  {{ model.published ? 'Live to visitors' : 'Hidden draft' }}
                </span>
              </div>
              <label class="ios-toggle">
                <input type="checkbox" name="published" [(ngModel)]="model.published" (ngModelChange)="onContentChange()" />
                <span class="ios-toggle-slider"></span>
              </label>
            </div>

            @if (error()) {
              <p class="text-xs text-red-600 font-semibold">{{ error() }}</p>
            }

            <div class="pt-2">
              <button class="btn btn-primary w-full justify-center cursor-pointer" type="submit" [disabled]="busy()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>{{ busy() ? 'Saving…' : (isNew ? 'Create Page' : 'Save Changes') }}</span>
              </button>
            </div>

            @if (saved()) {
              <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1">
                <span>✓</span> Saved successfully
              </div>
            }
          </div>
        </div>
      </div>
    </form>
  `,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AdminPageEdit implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  model: Partial<Page> = { title: '', slug: '', body: '', published: true, folder_id: null };
  availableFolders = signal<Folder[]>([]);
  busy = signal(false);
  saved = signal(false);
  error = signal('');
  editorTab = signal<'content' | 'settings'>('content');
  hasChanges = false;

  // --- Undo / Redo History ---
  private undoStack: Array<Partial<Page>> = [];
  private redoStack: Array<Partial<Page>> = [];
  private isApplyingHistory = false;
  private historyDebounceTimer: any = null;

  readonly undoCount = signal(0);
  readonly redoCount = signal(0);
  readonly canUndo = computed(() => this.undoCount() > 0);
  readonly canRedo = computed(() => this.redoCount() > 0);

  recordSnapshot() {
    if (this.isApplyingHistory) return;
    try {
      const snap = JSON.parse(JSON.stringify(this.model));
      if (this.undoStack.length > 0) {
        const last = this.undoStack[this.undoStack.length - 1];
        if (JSON.stringify(last) === JSON.stringify(snap)) {
          return;
        }
      }
      this.undoStack.push(snap);
      if (this.undoStack.length > 60) this.undoStack.shift();
      this.redoStack = [];
      this.undoCount.set(this.undoStack.length);
      this.redoCount.set(0);
    } catch {}
  }

  onContentChange() {
    this.hasChanges = true;
    if (this.isApplyingHistory) return;
    clearTimeout(this.historyDebounceTimer);
    this.historyDebounceTimer = setTimeout(() => {
      this.recordSnapshot();
    }, 500);
  }

  undo() {
    if (this.undoStack.length === 0) return;
    clearTimeout(this.historyDebounceTimer);
    this.isApplyingHistory = true;
    try {
      const currentSnap = JSON.parse(JSON.stringify(this.model));
      let prev = this.undoStack.pop()!;
      if (this.undoStack.length > 0 && JSON.stringify(prev) === JSON.stringify(currentSnap)) {
        prev = this.undoStack.pop()!;
      }
      this.redoStack.push(currentSnap);
      this.model = JSON.parse(JSON.stringify(prev));
      this.hasChanges = true;
      this.undoCount.set(this.undoStack.length);
      this.redoCount.set(this.redoStack.length);
    } catch {}
    this.isApplyingHistory = false;
  }

  redo() {
    if (this.redoStack.length === 0) return;
    clearTimeout(this.historyDebounceTimer);
    this.isApplyingHistory = true;
    try {
      const currentSnap = JSON.parse(JSON.stringify(this.model));
      let next = this.redoStack.pop()!;
      if (this.redoStack.length > 0 && JSON.stringify(next) === JSON.stringify(currentSnap)) {
        next = this.redoStack.pop()!;
      }
      this.undoStack.push(currentSnap);
      this.model = JSON.parse(JSON.stringify(next));
      this.hasChanges = true;
      this.undoCount.set(this.undoStack.length);
      this.redoCount.set(this.redoStack.length);
    } catch {}
    this.isApplyingHistory = false;
  }

  onDocumentKeydown(e: KeyboardEvent) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    if (!isCmdOrCtrl) return;

    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      this.save();
      return;
    }
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
  }

  get slugPreview(): string {
    return (this.model.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
  }

  ngOnInit() {
    this.api.listFolders('page').subscribe({
      next: (folders) => this.availableFolders.set(folders),
    });

    if (!this.isNew) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getPage(id).subscribe((page) => {
        this.model = page;
        this.undoStack = [];
        this.redoStack = [];
        this.undoCount.set(0);
        this.redoCount.set(0);
      });
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
