import { DatePipe, NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal, computed, OnInit, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Post, Asset, PostMetaData, Folder } from './api';
import { AdminConfirm } from './confirm-dialog';
import { resolveMediaUrl } from '../core/media.utils';
import { WhFolderSidebar, FOLDER_COLORS } from './folder-sidebar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type EditorBlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'quote'
  | 'wine_card'
  | 'pairing_box'
  | 'event_box'
  | 'divider';

export interface BlockTypography {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: string;
  lineHeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface EditorBlock {
  id: string;
  type: EditorBlockType;
  // Typography
  typography?: BlockTypography;
  // Heading
  headingText?: string;
  headingLevel?: 'h2' | 'h3';
  // Paragraph
  paragraphText?: string;
  // Image
  imageUrl?: string;
  imageCaption?: string;
  // Video
  videoUrl?: string;
  videoCaption?: string;
  // Quote
  quoteText?: string;
  quoteAuthor?: string;
  // Wine Card
  wineName?: string;
  winery?: string;
  vintage?: string;
  region?: string;
  grape?: string;
  tastingNotes?: string;
  sommelierRating?: string;
  // Pairing Box
  dishName?: string;
  matchedWine?: string;
  pairingNotes?: string;
  // Event Box
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  rsvpLink?: string;
}

@Component({
  selector: 'wh-admin-posts',
  imports: [RouterLink, DatePipe, FormsModule, WhFolderSidebar],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Journal &amp; Articles</h1>
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
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          Create and manage stories, tastings, and cellar notes with the WYSIWYG canvas editor.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <a routerLink="new" class="btn btn-primary btn-sm inline-flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Create Article</span>
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

    <!-- Main Workspace Layout: Left Folder Sidebar + Right Articles List -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <!-- Left Folder Navigation Sidebar -->
      <div class="md:col-span-4 lg:col-span-3 sticky top-6 z-30">
        <wh-folder-sidebar
          #folderSidebar
          type="post"
          title="Article Folders"
          [selectedFolderId]="selectedFolderId()"
          [totalCount]="posts().length"
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
            placeholder="Search articles by title or excerpt…"
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
            Loading journal database…
          </div>
        } @else if (filteredPosts().length === 0) {
          <div class="admin-card admin-empty-state">
            <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
            <p>
              @if (searchQuery || activeFilter() !== 'all') {
                No articles match your filter or search query.
              } @else if (activeFolder()) {
                No articles in folder "{{ activeFolder()?.name }}" yet.
              } @else {
                No articles found. Click "Create Article" to write your first story.
              }
            </p>
            @if (!searchQuery && activeFilter() === 'all') {
              <a routerLink="new" class="btn btn-primary btn-sm mt-2 inline-flex items-center gap-1.5">
                + Create Article
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
                      title="Select all articles (Ctrl+A)"
                    />
                  </th>
                  <th (click)="toggleSort('title')" class="cursor-pointer">
                    Article
                    @if (sortField() === 'title') {
                      <span>{{ sortDir() === 'asc' ? ' ↑' : ' ↓' }}</span>
                    }
                  </th>
                  <th class="hidden sm:table-cell">Folder</th>
                  <th>Status</th>
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
                @for (post of filteredPosts(); track post.id) {
                  <tr
                    [class.bg-wine-50/30]="isSelected(post.id)"
                    class="cursor-pointer select-none"
                    draggable="true"
                    (click)="handleRowClick(post, $event, $index)"
                    (dragstart)="onPostDragStart($event, post)"
                  >
                    <td class="w-10 text-center" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        [checked]="isSelected(post.id)"
                        (change)="toggleSelect(post.id, $event)"
                        class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 cursor-pointer"
                      />
                    </td>
                    <td>
                      <div class="flex items-center gap-3">
                        @if (post.cover_image) {
                          <img [src]="mediaUrl(post.cover_image)" alt="" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        } @else {
                          <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>
                        }
                        <div class="min-w-0">
                          <a [routerLink]="[post.id]" class="font-semibold text-slate-900 hover:text-wine-800 hover:underline block truncate max-w-xs sm:max-w-md" (click)="$event.stopPropagation()">
                            {{ post.title }}
                          </a>
                          <p class="text-2xs text-slate-400 truncate max-w-xs sm:max-w-md mt-0.5">
                            {{ post.excerpt || 'No summary' }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="hidden sm:table-cell">
                      @if (post.folder) {
                        <span class="px-2 py-0.5 rounded-full text-2xs font-bold" [class]="getFolderBadgeClass(post.folder.color)">
                          {{ post.folder.name }}
                        </span>
                      } @else {
                        <span class="text-2xs text-slate-400 font-mono">Unorganized</span>
                      }
                    </td>
                    <td>
                      <span
                        class="admin-badge"
                        [class]="post.published ? 'admin-badge-live' : 'admin-badge-draft'"
                      >
                        <span class="admin-badge-dot"></span>
                        {{ post.published ? 'Live' : 'Draft' }}
                      </span>
                    </td>
                    <td class="hidden lg:table-cell">
                      <span class="text-xs text-slate-500 whitespace-nowrap">
                        {{ post.updated_at | date: 'mediumDate' }}
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
                                (click)="movePost(post, null)"
                                class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                              >
                                <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                                <span>Unorganized</span>
                              </button>
                              @for (f of availableFolders(); track f.id) {
                                <button
                                  type="button"
                                  (click)="movePost(post, f.id)"
                                  class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                                  [class.font-bold]="post.folder_id === f.id"
                                >
                                  <span class="w-2 h-2 rounded-full" [class]="getFolderDotClass(f.color)"></span>
                                  <span class="truncate">{{ f.name }}</span>
                                </button>
                              }
                            </div>
                          </div>
                        </div>

                        <a [routerLink]="[post.id]" class="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                          Edit
                        </a>
                        <button type="button" class="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" (click)="remove(post)">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 px-1">{{ filteredPosts().length }} article{{ filteredPosts().length !== 1 ? 's' : '' }} shown ({{ posts().length }} total)</p>
        }
      </div>
    </div>

    <!-- Floating Batch Actions Bar for Journal/Articles -->
    @if (selectedCount() > 0) {
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center flex-wrap gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white transition-all animate-slideUp">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-wine-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs">
            {{ selectedCount() }}
          </span>
          <span class="text-xs font-medium text-slate-200 whitespace-nowrap">
            {{ selectedCount() === 1 ? '1 article' : selectedCount() + ' articles' }} selected
          </span>
        </div>

        <div class="h-4 w-px bg-white/20"></div>

        <!-- Copy Article Links -->
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
          title="Delete selected articles (Delete / Backspace)"
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
export class AdminPosts implements OnInit {
  @ViewChild('folderSidebar') folderSidebarComponent?: WhFolderSidebar;

  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);
  readonly posts = signal<Post[]>([]);
  readonly availableFolders = signal<Folder[]>([]);
  readonly selectedFolderId = signal<number | 'all' | 'root'>('all');
  readonly loading = signal(true);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly copiedToast = signal<string | null>(null);
  readonly showBulkMove = signal(false);
  lastSelectedIndex: number | null = null;

  searchQuery = '';
  readonly activeFilter = signal<'all' | 'published' | 'draft'>('all');
  readonly sortField = signal<'title' | 'date'>('date');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly filterTabs = [
    { label: 'All Articles', value: 'all' as const },
    { label: 'Published', value: 'published' as const },
    { label: 'Drafts', value: 'draft' as const },
  ];

  readonly activeFolder = computed(() => {
    const sel = this.selectedFolderId();
    if (typeof sel === 'number') {
      return this.availableFolders().find((f) => f.id === sel) || null;
    }
    return null;
  });

  readonly unorganizedCount = computed(() => {
    return this.posts().filter((p) => !p.folder_id).length;
  });

  readonly filteredPosts = computed(() => {
    let items = this.posts();
    const selFolder = this.selectedFolderId();

    if (selFolder === 'root') {
      items = items.filter((p) => !p.folder_id);
    } else if (typeof selFolder === 'number') {
      items = items.filter((p) => p.folder_id === selFolder);
    }

    const filter = this.activeFilter();
    if (filter === 'published') items = items.filter((p) => p.published);
    else if (filter === 'draft') items = items.filter((p) => !p.published);

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt?.toLowerCase().includes(q) ?? false)
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
    const list = this.filteredPosts();
    if (list.length === 0) return false;
    const set = this.selectedIds();
    return list.every((p) => set.has(p.id));
  });

  ngOnInit() {
    this.refreshPosts();
  }

  refreshPosts(): void {
    this.loading.set(true);
    this.api.listPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
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

  handleRowClick(post: Post, event: MouseEvent, index: number): void {
    if (event.shiftKey && this.lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(this.lastSelectedIndex, index);
      const end = Math.max(this.lastSelectedIndex, index);
      const list = this.filteredPosts();
      const current = new Set(this.selectedIds());
      for (let i = start; i <= end; i++) {
        if (list[i]) current.add(list[i].id);
      }
      this.selectedIds.set(current);
    } else if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.toggleSelect(post.id);
      this.lastSelectedIndex = index;
    } else {
      this.toggleSelect(post.id);
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
      const allIds = new Set(this.filteredPosts().map((p) => p.id));
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
    const selected = this.posts().filter((p) => this.selectedIds().has(p.id));
    if (selected.length === 0) return;
    const text = selected.map((p) => `${window.location.origin}/journal/${p.slug}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`Copied ${selected.length} article URL${selected.length !== 1 ? 's' : ''}`);
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

  movePost(post: Post, folderId: number | null): void {
    this.api.updatePost(post.id, { folder_id: folderId }).subscribe({
      next: (updated) => {
        this.posts.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.folderSidebarComponent?.loadFolders();
      },
    });
  }

  bulkMoveSelected(folderId: number | null): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.api.bulkMoveItems('post', ids, folderId).subscribe({
      next: () => {
        const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
        this.posts.update((list) =>
          list.map((p) => (ids.includes(p.id) ? { ...p, folder_id: folderId, folder: folderObj } : p))
        );
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
        this.showToast(`Moved ${ids.length} article${ids.length !== 1 ? 's' : ''}`);
      },
    });
  }

  onPostDragStart(event: DragEvent, post: Post): void {
    if (event.dataTransfer) {
      const selected = this.selectedIds().has(post.id) ? Array.from(this.selectedIds()) : [post.id];
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'post', ids: selected }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDropOnFolder({ folderId, event }: { folderId: number | null; event: DragEvent }): void {
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type === 'post' && Array.isArray(data.ids)) {
        this.api.bulkMoveItems('post', data.ids, folderId).subscribe({
          next: () => {
            const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
            this.posts.update((list) =>
              list.map((p) => (data.ids.includes(p.id) ? { ...p, folder_id: folderId, folder: folderObj } : p))
            );
            this.deselectAll();
            this.folderSidebarComponent?.loadFolders();
            this.showToast(`Moved ${data.ids.length} article${data.ids.length !== 1 ? 's' : ''}`);
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

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  async remove(post: Post) {
    const ok = await this.confirm.open({
      title: 'Delete article',
      message: `Are you sure you want to permanently delete "${post.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.deletePost(post.id).subscribe(() => {
      this.posts.update((list) => list.filter((p) => p.id !== post.id));
      if (this.selectedIds().has(post.id)) {
        const next = new Set(this.selectedIds());
        next.delete(post.id);
        this.selectedIds.set(next);
      }
      this.folderSidebarComponent?.loadFolders();
    });
  }

  async deleteSelected() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    const ok = await this.confirm.open({
      title: `Delete ${ids.length} article${ids.length !== 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete these ${ids.length} selected articles? This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length} Article${ids.length !== 1 ? 's' : ''}`,
      danger: true,
    });
    if (!ok) return;

    forkJoin(ids.map((id) => this.api.deletePost(id).pipe(catchError(() => of(null))))).subscribe({
      next: () => {
        const set = new Set(ids);
        this.posts.update((list) => list.filter((p) => !set.has(p.id)));
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
        this.showToast(`Deleted ${ids.length} article${ids.length !== 1 ? 's' : ''}`);
      },
    });
  }
}

@Component({
  selector: 'wh-admin-post-edit',
  imports: [FormsModule, RouterLink, NgStyle, NgTemplateOutlet],
  template: `
    <!-- Top Action Bar: Navigation, Status Badge, Draft & Publish Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
      <a routerLink="/admin/posts" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>Back to Articles</span>
      </a>

      <!-- Action Row -->
      <div class="flex items-center gap-2.5 flex-wrap">
        @if (!isNew && hasChanges) {
          <span class="inline-flex items-center gap-1.5 text-2xs text-amber-600 font-semibold px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Unsaved changes
          </span>
        }

        <span
          class="admin-badge text-2xs"
          [class]="model.published ? 'admin-badge-live' : 'admin-badge-draft'"
        >
          <span class="admin-badge-dot"></span>
          {{ model.published ? 'Status: Live' : 'Status: Draft' }}
        </span>

        @if (model.published) {
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="busy()"
            (click)="unpublish()"
            title="Revert to draft"
          >
            Switch to Draft
          </button>
        } @else {
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="busy()"
            (click)="saveAsDraft()"
          >
            Save as Draft
          </button>
        }

        <button
          class="btn btn-primary"
          type="button"
          [disabled]="busy()"
          (click)="publishOrSave()"
        >
          {{ busy() ? 'Saving…' : (model.published ? 'Save Updates' : 'Publish Post') }}
        </button>
      </div>
    </div>

    <!-- MAIN WYSIWYG CANVAS LAYOUT (Center Main Canvas + Right Settings & Draggable Palette Sidebar) -->
    <div class="flex flex-col lg:flex-row items-start gap-8 w-full" (click)="closeTypography(); closeInsertPopover()">

      <!-- CENTER/MAIN: Authentic Article Canvas -->
      <div class="flex-1 w-full min-w-0">

        <div class="article-live-canvas space-y-6">

          <!-- 1. Article Header (Title & Teaser) -->
          @if (showTitle || showExcerpt) {
            <div class="space-y-4">

              <!-- Title -->
              @if (showTitle) {
                <div class="relative group/input group/title">
                  <input
                    class="w-full font-serif font-bold text-3xl sm:text-4xl text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 pr-16"
                    placeholder="Post Title..."
                    [(ngModel)]="model.title"
                    [ngStyle]="getCustomStyle('title')"
                    (ngModelChange)="hasChanges = true"
                  />
                  <div class="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/input:opacity-100 group-hover/title:opacity-100 transition-opacity">
                    <button
                      type="button"
                      class="typography-floating-btn !static"
                      [class.active]="isTypographyOpenFor('title')"
                      [class.has-custom]="hasCustomTypography('title')"
                      (click)="toggleTypography('title', $event)"
                      title="Format Title Typography (T)"
                    >
                      T
                    </button>
                    <button
                      type="button"
                      class="preview-tool-btn danger !w-6 !h-6"
                      (click)="removeTitle()"
                      title="Remove Title"
                    >
                      ✕
                    </button>
                  </div>

                  @if (isTypographyOpenFor('title')) {
                    <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                      <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                    </div>
                  }
                </div>
              }

              <!-- Teaser -->
              @if (showExcerpt) {
                <div class="relative group/input group/excerpt">
                  <textarea
                    class="w-full font-serif italic text-base sm:text-lg text-slate-600 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 resize-none min-h-12 pr-16"
                    placeholder="Write an evocative subtitle or teaser sentence..."
                    [(ngModel)]="model.excerpt"
                    [ngStyle]="getCustomStyle('excerpt')"
                    (ngModelChange)="hasChanges = true"
                  ></textarea>
                  <div class="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/input:opacity-100 group-hover/excerpt:opacity-100 transition-opacity">
                    <button
                      type="button"
                      class="typography-floating-btn !static"
                      [class.active]="isTypographyOpenFor('excerpt')"
                      [class.has-custom]="hasCustomTypography('excerpt')"
                      (click)="toggleTypography('excerpt', $event)"
                      title="Format Teaser Typography (T)"
                    >
                      T
                    </button>
                    <button
                      type="button"
                      class="preview-tool-btn danger !w-6 !h-6"
                      (click)="removeExcerpt()"
                      title="Remove Subtitle"
                    >
                      ✕
                    </button>
                  </div>

                  @if (isTypographyOpenFor('excerpt')) {
                    <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                      <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                    </div>
                  }
                </div>
              }

              <!-- Authentic Journal Byline -->
              <div class="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
                <span class="font-semibold text-slate-900 font-serif">{{ model.author_name || 'The Winehouse' }}</span>
                <span>·</span>
                <span>Cellar Journal</span>
                <span>·</span>
                <span>{{ (model.published ? 'Live Edition' : 'Draft Preview') }}</span>
              </div>
            </div>
          }

          <!-- 3. Dynamic Article Content Blocks with Drag & Drop Targets -->
          <div class="space-y-4 pt-2">
            @for (block of blocks; track block.id; let idx = $index) {

              <!-- Drop Target / Insert Line between blocks with Block Picker Popover -->
              <div
                class="canvas-insert-line"
                [class.drag-active]="dragOverIdx === idx"
                (dragover)="onCanvasDragOver($event, idx)"
                (dragleave)="onCanvasDragLeave()"
                (drop)="onCanvasDrop($event, idx)"
              >
                <button
                  type="button"
                  class="canvas-insert-btn"
                  [class.active]="activeInsertPopoverIdx === idx"
                  (click)="toggleInsertPopover(idx, $event)"
                  title="Insert Section"
                >
                  <span>＋</span> Insert Section
                </button>

                @if (activeInsertPopoverIdx === idx) {
                  <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                      <span class="font-bold text-slate-900 text-2xs uppercase tracking-wider">
                        Insert Section
                      </span>
                      <button type="button" class="text-slate-400 hover:text-slate-700 text-xs font-bold" (click)="closeInsertPopover()">✕</button>
                    </div>

                    <div class="grid grid-cols-2 gap-1.5">
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'heading')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Heading
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'paragraph')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="shrink-0"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg> Text
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'image')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'video')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'quote')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Quote
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'wine_card')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> Wine Card
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'pairing_box')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> Pairing
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(idx, 'event_box')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Event
                      </button>
                      <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start col-span-2" (click)="pickInsertBlock(idx, 'divider')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line></svg> Divider
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Content Block Wrapper -->
              <div
                class="canvas-block-wrapper group/block"
                [id]="'block-' + block.id"
                draggable="true"
                (dragstart)="onBlockDragStart(idx, $event)"
                (dragover)="onCanvasDragOver($event, idx)"
                (dragleave)="onCanvasDragLeave()"
                (drop)="onCanvasDrop($event, idx)"
              >

                <!-- Floating Minimal Block Toolbar on Hover -->
                <div class="canvas-block-toolbar">
                  <span class="admin-drag-handle !w-5 !h-5 !text-xs cursor-grab" title="Drag to reorder">⠿</span>
                  @if (isTextBlock(block.type)) {
                    <button
                      type="button"
                      class="preview-tool-btn font-serif font-bold text-xs"
                      (click)="toggleTypography({ blockIdx: idx }, $event)"
                      title="Typography (T)"
                    >
                      T
                    </button>
                  }
                  @if (block.type === 'heading') {
                    <button
                      type="button"
                      class="preview-tool-btn text-2xs font-bold font-mono"
                      (click)="toggleHeadingLevel(block)"
                      title="Toggle H2 / H3"
                    >
                      {{ block.headingLevel?.toUpperCase() || 'H2' }}
                    </button>
                  }
                  @if (block.type === 'image') {
                    <button
                      type="button"
                      class="preview-tool-btn"
                      (click)="openMediaPicker({ blockIdx: idx, field: 'image' })"
                      title="Replace Image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                  }
                  @if (block.type === 'video') {
                    <button
                      type="button"
                      class="preview-tool-btn"
                      (click)="openMediaPicker({ blockIdx: idx, field: 'video' })"
                      title="Replace Video"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    </button>
                  }
                  <button
                    type="button"
                    class="preview-tool-btn"
                    [disabled]="idx === 0"
                    (click)="moveBlock(idx, -1)"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    class="preview-tool-btn"
                    [disabled]="idx === blocks.length - 1"
                    (click)="moveBlock(idx, 1)"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    class="preview-tool-btn danger"
                    (click)="removeBlock(idx)"
                    title="Delete Block"
                  >
                    ✕
                  </button>
                </div>

                <!-- 1. HEADING BLOCK -->
                @if (block.type === 'heading') {
                  <div class="relative group/input">
                    @if (block.headingLevel === 'h3') {
                      <input
                        class="w-full font-bold text-xl text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 pr-8"
                        placeholder="Subheading..."
                        [(ngModel)]="block.headingText"
                        [ngStyle]="getTypographyStyle(block.typography)"
                        (ngModelChange)="hasChanges = true"
                      />
                    } @else {
                      <input
                        class="w-full font-serif font-bold text-2xl text-slate-900 pb-1 border-b border-slate-100 bg-transparent outline-none focus:ring-0 p-0 placeholder:text-slate-300 pr-8"
                        placeholder="Section Heading..."
                        [(ngModel)]="block.headingText"
                        [ngStyle]="getTypographyStyle(block.typography)"
                        (ngModelChange)="hasChanges = true"
                      />
                    }
                    <button
                      type="button"
                      class="typography-floating-btn"
                      [class.active]="isTypographyOpenFor({ blockIdx: idx })"
                      [class.has-custom]="!!block.typography"
                      (click)="toggleTypography({ blockIdx: idx }, $event)"
                      title="Typography Options (T)"
                    >
                      T
                    </button>
                    @if (isTypographyOpenFor({ blockIdx: idx })) {
                      <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                        <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                      </div>
                    }
                  </div>
                }

                <!-- 2. PARAGRAPH BLOCK -->
                @if (block.type === 'paragraph') {
                  <div class="relative group/input">
                    <textarea
                      class="w-full font-sans text-slate-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 resize-none min-h-20 pr-8 text-sm sm:text-base"
                      placeholder="Write your story narrative here..."
                      [(ngModel)]="block.paragraphText"
                      [ngStyle]="getTypographyStyle(block.typography)"
                      (ngModelChange)="hasChanges = true"
                    ></textarea>
                    <button
                      type="button"
                      class="typography-floating-btn"
                      [class.active]="isTypographyOpenFor({ blockIdx: idx })"
                      [class.has-custom]="!!block.typography"
                      (click)="toggleTypography({ blockIdx: idx }, $event)"
                      title="Typography Options (T)"
                    >
                      T
                    </button>
                    @if (isTypographyOpenFor({ blockIdx: idx })) {
                      <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                        <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                      </div>
                    }
                  </div>
                }

                <!-- 3. IMAGE BLOCK -->
                @if (block.type === 'image') {
                  <figure class="my-2 space-y-2">
                    <div
                      class="relative group/img rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 cursor-pointer max-h-96"
                      (click)="openMediaPicker({ blockIdx: idx, field: 'image' })"
                    >
                      @if (block.imageUrl) {
                        <img [src]="mediaUrl(block.imageUrl)" alt="" class="w-full object-cover max-h-96" />
                      } @else {
                        <div class="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="mb-1 text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span class="font-semibold text-slate-600">Select or Upload Image</span>
                        </div>
                      }
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                        <span class="bg-black/70 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Choose / Upload Image</span>
                      </div>
                    </div>
                    <input
                      class="w-full text-center text-xs text-slate-400 italic bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                      placeholder="Add caption description (optional)..."
                      [(ngModel)]="block.imageCaption"
                      (ngModelChange)="hasChanges = true"
                    />
                  </figure>
                }

                <!-- 4. VIDEO BLOCK -->
                @if (block.type === 'video') {
                  <figure class="my-2 space-y-2">
                    <div
                      class="relative group/vid rounded-2xl overflow-hidden border border-slate-900 bg-slate-950 cursor-pointer max-h-96"
                    >
                      @if (block.videoUrl) {
                        <video [src]="mediaUrl(block.videoUrl)" controls class="w-full max-h-96" preload="metadata"></video>
                      } @else {
                        <div
                          class="h-44 flex flex-col items-center justify-center text-slate-400 text-xs"
                          (click)="openMediaPicker({ blockIdx: idx, field: 'video' })"
                        >
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="mb-1 text-slate-400"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                          <span class="font-semibold text-slate-300">Select or Upload Video (.mp4)</span>
                        </div>
                      }
                    </div>
                    <input
                      class="w-full text-center text-xs text-slate-400 italic bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                      placeholder="Add video caption (optional)..."
                      [(ngModel)]="block.videoCaption"
                      (ngModelChange)="hasChanges = true"
                    />
                  </figure>
                }

                <!-- 5. QUOTE BLOCK -->
                @if (block.type === 'quote') {
                  <div class="relative group/input my-2 p-5 rounded-2xl bg-slate-50 border-l-4 border-[#701423] space-y-2">
                    <textarea
                      class="w-full font-serif italic text-slate-800 text-base sm:text-lg bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-14 pr-8"
                      placeholder="Quote or reflection from the winemaker..."
                      [(ngModel)]="block.quoteText"
                      [ngStyle]="getTypographyStyle(block.typography)"
                      (ngModelChange)="hasChanges = true"
                    ></textarea>
                    <input
                      class="w-full text-xs font-semibold text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                      placeholder="— Author / Attribution (e.g. Elena Vassiliou)"
                      [(ngModel)]="block.quoteAuthor"
                      (ngModelChange)="hasChanges = true"
                    />
                    <button
                      type="button"
                      class="typography-floating-btn"
                      [class.active]="isTypographyOpenFor({ blockIdx: idx })"
                      [class.has-custom]="!!block.typography"
                      (click)="toggleTypography({ blockIdx: idx }, $event)"
                      title="Typography Options (T)"
                    >
                      T
                    </button>
                    @if (isTypographyOpenFor({ blockIdx: idx })) {
                      <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                        <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                      </div>
                    }
                  </div>
                }

                <!-- 6. WINE CARD BLOCK (Live Site Tasting Highlight Frame) -->
                @if (block.type === 'wine_card') {
                  <div class="my-3 p-5 sm:p-6 rounded-2xl bg-[#faf7f2] border border-[#e8ded0] space-y-3.5 shadow-2xs">
                    <div class="flex items-center justify-between border-b border-[#e8ded0]/80 pb-2">
                      <span class="text-2xs font-bold uppercase tracking-wider text-[#701423] flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> <span>Wine Tasting Highlight</span></span>
                      <input
                        class="text-2xs font-bold px-2.5 py-0.5 bg-[#701423]/10 text-[#701423] rounded-full border-none outline-none text-right w-44 font-mono"
                        placeholder="Rating Badge / 95 pts..."
                        [(ngModel)]="block.sommelierRating"
                        (ngModelChange)="hasChanges = true"
                      />
                    </div>

                    <!-- 2-Column Split: Square Bottle Photo on Left, Wine Dossier on Right -->
                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                      
                      <!-- Left Bottle Frame (Never full width) -->
                      <div class="sm:col-span-3">
                        <div
                          class="relative group/wineimg rounded-xl overflow-hidden border border-[#e8ded0] bg-white aspect-square flex items-center justify-center cursor-pointer shadow-xs"
                          (click)="openMediaPicker({ blockIdx: idx, field: 'image' })"
                          title="Choose or change bottle image"
                        >
                          @if (block.imageUrl) {
                            <img [src]="mediaUrl(block.imageUrl)" alt="" class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/wineimg:opacity-100 transition-opacity flex items-center justify-center text-white text-3xs font-bold uppercase tracking-wider">
                              Change Photo
                            </div>
                          } @else {
                            <div class="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="mb-1 text-slate-400"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg>
                              <span class="text-[10px] font-bold text-slate-500">+ Bottle Photo</span>
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Right Wine Specs -->
                      <div class="sm:col-span-9 space-y-2">
                        <div class="flex items-baseline gap-2">
                          <input
                            class="font-serif font-bold text-xl text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400"
                            placeholder="Wine Name (e.g. Kavalieros)"
                            [(ngModel)]="block.wineName"
                            (ngModelChange)="hasChanges = true"
                          />
                          <input
                            class="text-xs text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-24 text-right placeholder:text-slate-400 font-mono"
                            placeholder="Vintage (e.g. 2022)"
                            [(ngModel)]="block.vintage"
                            (ngModelChange)="hasChanges = true"
                          />
                        </div>
                        <div class="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <input
                            class="bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400 text-xs"
                            placeholder="Producer / Estate (e.g. Domaine Sigalas)"
                            [(ngModel)]="block.winery"
                            (ngModelChange)="hasChanges = true"
                          />
                          <span>·</span>
                          <input
                            class="bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400 text-xs"
                            placeholder="Region (e.g. Santorini PDO)"
                            [(ngModel)]="block.region"
                            (ngModelChange)="hasChanges = true"
                          />
                        </div>
                        <input
                          class="bg-transparent border-none outline-none focus:ring-0 p-0 w-full text-2xs text-slate-500 placeholder:text-slate-400 pt-0.5 font-mono"
                          placeholder="Grape Variety (e.g. 100% Assyrtiko)"
                          [(ngModel)]="block.grape"
                          (ngModelChange)="hasChanges = true"
                        />
                      </div>

                    </div>

                    <div class="relative group/input border-t border-[#e8ded0] pt-2.5">
                      <textarea
                        class="w-full text-xs text-slate-700 italic bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-12 pr-8"
                        placeholder="Tasting Notes (Nose, Palate, Texture, Finish)..."
                        [(ngModel)]="block.tastingNotes"
                        [ngStyle]="getTypographyStyle(block.typography)"
                        (ngModelChange)="hasChanges = true"
                      ></textarea>
                      <button
                        type="button"
                        class="typography-floating-btn"
                        [class.active]="isTypographyOpenFor({ blockIdx: idx })"
                        [class.has-custom]="!!block.typography"
                        (click)="toggleTypography({ blockIdx: idx }, $event)"
                        title="Typography Options (T)"
                      >
                        T
                      </button>
                      @if (isTypographyOpenFor({ blockIdx: idx })) {
                        <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                          <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 7. PAIRING BOX BLOCK -->
                @if (block.type === 'pairing_box') {
                  <div class="my-2 p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <span class="text-2xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> <span>Pairing Suggestion</span></span>
                    <div class="space-y-1">
                      <input
                        class="w-full font-bold text-sm text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                        placeholder="Dish Name (e.g. Grilled Octopus with Santorini Fava)"
                        [(ngModel)]="block.dishName"
                        (ngModelChange)="hasChanges = true"
                      />
                      <input
                        class="w-full text-xs font-medium text-amber-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                        placeholder="Matched Wine (e.g. Oaked Assyrtiko 2021)"
                        [(ngModel)]="block.matchedWine"
                        (ngModelChange)="hasChanges = true"
                      />
                    </div>
                    <div class="relative group/input">
                      <textarea
                        class="w-full text-xs text-slate-600 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-12 pr-8"
                        placeholder="Why this pairing works..."
                        [(ngModel)]="block.pairingNotes"
                        [ngStyle]="getTypographyStyle(block.typography)"
                        (ngModelChange)="hasChanges = true"
                      ></textarea>
                      <button
                        type="button"
                        class="typography-floating-btn"
                        [class.active]="isTypographyOpenFor({ blockIdx: idx })"
                        [class.has-custom]="!!block.typography"
                        (click)="toggleTypography({ blockIdx: idx }, $event)"
                        title="Typography Options (T)"
                      >
                        T
                      </button>
                      @if (isTypographyOpenFor({ blockIdx: idx })) {
                        <div class="typography-popover-minimal" (click)="$event.stopPropagation()">
                          <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 8. EVENT BOX BLOCK -->
                @if (block.type === 'event_box') {
                  <div class="my-2 p-5 rounded-2xl bg-slate-900 text-white space-y-2">
                    <span class="text-2xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> <span>Cellar Experience</span></span>
                    <input
                      class="w-full font-bold text-sm text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
                      placeholder="Event Title..."
                      [(ngModel)]="block.eventTitle"
                      (ngModelChange)="hasChanges = true"
                    />
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <input
                        class="text-slate-300 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
                        placeholder="Date & Time (e.g. Oct 24 · 19:30)"
                        [(ngModel)]="block.eventDate"
                        (ngModelChange)="hasChanges = true"
                      />
                      <input
                        class="text-slate-300 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
                        placeholder="Location (e.g. Cellar Room)"
                        [(ngModel)]="block.eventLocation"
                        (ngModelChange)="hasChanges = true"
                      />
                    </div>
                  </div>
                }

                <!-- 9. DIVIDER BLOCK -->
                @if (block.type === 'divider') {
                  <div class="py-4 text-center text-slate-300 text-xs">
                    ──────────
                  </div>
                }

              </div>
            }

            <!-- Bottom Drop Zone for appending blocks by dragging or clicking -->
            <div class="relative">
              <div
                class="canvas-drop-zone-bottom cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
                [class.drag-over]="dragOverIdx === blocks.length"
                (dragover)="onCanvasDragOver($event, blocks.length)"
                (dragleave)="onCanvasDragLeave()"
                (drop)="onCanvasDrop($event, blocks.length)"
                (click)="toggleInsertPopover(blocks.length, $event)"
              >
                <span>＋ Click or drag here to append a new block</span>
              </div>

              @if (activeInsertPopoverIdx === blocks.length) {
                <div class="canvas-insert-popover !top-auto !bottom-full !mb-2" (click)="$event.stopPropagation()">
                  <div class="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                    <span class="font-bold text-slate-900 text-2xs uppercase tracking-wider">
                      Append Section
                    </span>
                    <button type="button" class="text-slate-400 hover:text-slate-700 text-xs font-bold" (click)="closeInsertPopover()">✕</button>
                  </div>

                  <div class="grid grid-cols-2 gap-1.5">
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'heading')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Heading
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'paragraph')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="shrink-0"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg> Text
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'image')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'video')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'quote')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Quote
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'wine_card')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> Wine Card
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'pairing_box')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> Pairing
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start" (click)="pickInsertBlock(blocks.length, 'event_box')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Event
                    </button>
                    <button type="button" class="admin-block-btn text-2xs !p-1.5 justify-start col-span-2" (click)="pickInsertBlock(blocks.length, 'divider')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line></svg> Divider
                    </button>
                  </div>
                </div>
              }
            </div>

          </div>

        </div>

      </div>

      <!-- RIGHT SIDEBAR: Overall Settings on Top, Draggable Palette, and Outline -->
      <div class="w-full lg:w-80 shrink-0 canvas-sidebar-panel space-y-4">

        <!-- 1. OVERALL POST SETTINGS (ON TOP) -->
        <div class="admin-card space-y-3.5">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span>Post Metadata</span>
            </span>
          </div>

          <!-- Cover Photo -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="admin-field-label !mb-0">Cover Photo</label>
              @if (model.cover_image) {
                <button
                  type="button"
                  class="text-2xs font-semibold text-red-600 hover:text-red-800"
                  (click)="model.cover_image = ''; hasChanges = true"
                >
                  Remove
                </button>
              }
            </div>

            @if (model.cover_image) {
              <div class="relative group/cover rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-1.5">
                <img [src]="mediaUrl(model.cover_image)" alt="" class="w-full h-24 object-cover" />
                <div
                  class="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white text-xs font-semibold"
                  (click)="openMediaPicker('cover')"
                >
                  <span class="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Change Photo</span>
                </div>
              </div>
            } @else {
              <button
                type="button"
                class="w-full py-2.5 px-2 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl text-center text-slate-500 hover:text-slate-800 bg-slate-50 transition-colors cursor-pointer block mb-1.5"
                (click)="openMediaPicker('cover')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-1 text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span class="text-2xs font-semibold">Select / Upload Cover Photo</span>
              </button>
            }

            <input
              class="admin-field-input font-mono text-2xs"
              placeholder="Or paste image URL..."
              [(ngModel)]="model.cover_image"
              (ngModelChange)="hasChanges = true"
            />
          </div>

          <!-- Folder Selection -->
          <div class="border-t border-slate-100 pt-3">
            <label class="admin-field-label !mb-1">Article Folder</label>
            <select
              class="admin-field-input cursor-pointer font-medium text-slate-800"
              [(ngModel)]="model.folder_id"
              (ngModelChange)="hasChanges = true"
            >
              <option [ngValue]="null">⚪ Unorganized</option>
              @for (f of availableFolders(); track f.id) {
                <option [ngValue]="f.id">📁 {{ f.name }}</option>
              }
            </select>
          </div>

          <!-- Category Selection & Management -->
          <div class="border-t border-slate-100 pt-3">
            <div class="flex items-center justify-between mb-1">
              <label class="admin-field-label !mb-0">Category</label>
              <button
                type="button"
                class="text-2xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
                (click)="categoryManagerOpen = true"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span>Manage / New</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5">
              <select
                class="admin-field-input cursor-pointer font-medium text-slate-800 flex-1"
                [(ngModel)]="model.category"
                (ngModelChange)="hasChanges = true"
              >
                <option [ngValue]="null">No Category (General)</option>
                @for (cat of availableCategories(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
              <button
                type="button"
                class="btn btn-secondary btn-sm shrink-0"
                title="Manage Categories"
                (click)="categoryManagerOpen = true"
              >
                Manage
              </button>
            </div>
          </div>

          <!-- Custom URL Slug -->
          <div class="border-t border-slate-100 pt-3">
            <label class="admin-field-label">Custom URL Slug</label>
            <input
              class="admin-field-input font-mono text-2xs"
              placeholder="auto-generated-from-title"
              [(ngModel)]="model.slug"
              (ngModelChange)="hasChanges = true"
            />
          </div>

          <!-- Author Attribution -->
          <div class="border-t border-slate-100 pt-3">
            <label class="admin-field-label">Author Name</label>
            <input
              class="admin-field-input"
              placeholder="The Winehouse"
              [(ngModel)]="model.author_name"
              (ngModelChange)="hasChanges = true"
            />
          </div>
        </div>

        <!-- 2. DRAGGABLE BLOCK PALETTE -->
        <div class="admin-card space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> <span>Block Palette</span>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            @if (!showTitle) {
              <button
                type="button"
                class="admin-block-btn justify-start col-span-2 !bg-amber-50/80 !border-amber-200 text-amber-900 font-semibold"
                (click)="restoreTitle()"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> + Add Title
              </button>
            }
            @if (!showExcerpt) {
              <button
                type="button"
                class="admin-block-btn justify-start col-span-2 !bg-amber-50/80 !border-amber-200 text-amber-900 font-semibold"
                (click)="restoreExcerpt()"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="shrink-0"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg> + Add Subtitle
              </button>
            }
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('heading', $event)"
              (click)="addBlock('heading')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Heading
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('paragraph', $event)"
              (click)="addBlock('paragraph')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="shrink-0"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg> Text
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('image', $event)"
              (click)="addBlock('image')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('video', $event)"
              (click)="addBlock('video')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('quote', $event)"
              (click)="addBlock('quote')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Quote
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('wine_card', $event)"
              (click)="addBlock('wine_card')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> Wine Card
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('pairing_box', $event)"
              (click)="addBlock('pairing_box')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> Pairing
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start"
              draggable="true"
              (dragstart)="onPaletteDragStart('event_box', $event)"
              (click)="addBlock('event_box')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Event
            </button>
            <button
              type="button"
              class="admin-block-btn justify-start col-span-2"
              draggable="true"
              (dragstart)="onPaletteDragStart('divider', $event)"
              (click)="addBlock('divider')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line></svg> Divider
            </button>
          </div>
        </div>

        <!-- 3. DOCUMENT STRUCTURE OUTLINE -->
        <div class="admin-card space-y-2">
          <div class="flex items-center justify-between pb-1 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> <span>Article Outline</span>
            </span>
            <span class="text-2xs text-slate-400 font-semibold">{{ blocks.length }} blocks</span>
          </div>

          @if (blocks.length === 0) {
            <p class="text-2xs text-slate-400 py-2 text-center">No blocks yet</p>
          } @else {
            <div class="space-y-1 max-h-60 overflow-y-auto pr-1">
              @for (block of blocks; track block.id; let idx = $index) {
                <div
                  class="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-100 text-2xs text-slate-700 cursor-pointer transition-colors"
                  (click)="scrollToBlock(block.id)"
                >
                  <span class="flex items-center gap-1.5 truncate">
                    <span>{{ getBlockIcon(block.type) }}</span>
                    <span class="truncate font-medium">{{ getBlockOutlineTitle(block) }}</span>
                  </span>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" class="btn-icon !w-5 !h-5 text-slate-400 hover:text-slate-700 text-2xs" [disabled]="idx === 0" (click)="moveBlock(idx, -1); $event.stopPropagation()">▲</button>
                    <button type="button" class="btn-icon !w-5 !h-5 text-slate-400 hover:text-slate-700 text-2xs" [disabled]="idx === blocks.length - 1" (click)="moveBlock(idx, 1); $event.stopPropagation()">▼</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      </div>

    </div>

    <!-- Media Picker Modal -->
    @if (mediaPickerOpen()) {
      <div class="admin-dialog-backdrop" (click)="closeMediaPicker()">
        <div class="admin-dialog !max-w-3xl w-full max-h-[85vh] flex flex-col p-0" (click)="$event.stopPropagation()">
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Select or Upload Media File</h2>
              <p class="text-2xs text-slate-500">Pick from existing media stored in the database or upload a new file.</p>
            </div>
            <button type="button" class="btn-icon text-slate-400 hover:text-slate-700 text-sm font-bold" (click)="closeMediaPicker()">✕</button>
          </div>

          <!-- Filter & Search Toolbar inside modal -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
            <input
              class="admin-search flex-1"
              placeholder="Search media by filename..."
              [(ngModel)]="mediaSearchQuery"
            />
            <div class="admin-tabs">
              <button type="button" class="admin-tab text-2xs" [class.active]="mediaFilter() === 'all'" (click)="mediaFilter.set('all')">All</button>
              <button type="button" class="admin-tab text-2xs" [class.active]="mediaFilter() === 'images'" (click)="mediaFilter.set('images')">Images</button>
              <button type="button" class="admin-tab text-2xs" [class.active]="mediaFilter() === 'videos'" (click)="mediaFilter.set('videos')">Videos</button>
            </div>
          </div>

          <!-- Quick Dropzone in Modal -->
          <div class="px-5 pt-3">
            <div class="p-3 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50 relative hover:border-slate-400 transition-colors">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.mov,.ogg,.m4v"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                (change)="uploadFromPicker($event)"
              />
              <p class="text-xs font-semibold text-slate-700">
                {{ modalUploading() ? 'Uploading file…' : '＋ Drag or click to upload a new Image or Video' }}
              </p>
              <p class="text-2xs text-slate-400">Uploads to database and automatically inserts it into the article.</p>
            </div>
          </div>

          <!-- Media Files Grid -->
          <div class="flex-1 overflow-y-auto max-h-80 p-5">
            @if (filteredMediaAssets().length === 0) {
              <div class="text-center py-8 text-xs text-slate-400">
                No matching media files found. Upload one above.
              </div>
            } @else {
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                @for (asset of filteredMediaAssets(); track asset.id) {
                  <button
                    type="button"
                    class="group relative rounded-xl border border-slate-200 hover:border-slate-900 bg-slate-100 overflow-hidden text-left p-1 cursor-pointer transition-all flex flex-col"
                    (click)="selectAsset(asset)"
                  >
                    @if (isAssetImage(asset)) {
                      <img [src]="asset.url" [alt]="asset.name" class="w-full aspect-video object-cover rounded-lg" />
                    } @else if (isAssetVideo(asset)) {
                      <div class="w-full aspect-video bg-slate-950 rounded-lg flex items-center justify-center relative">
                        <video [src]="asset.url" class="w-full h-full object-cover rounded-lg opacity-75" preload="metadata"></video>
                        <span class="absolute w-6 h-6 rounded-full bg-white/90 text-slate-900 flex items-center justify-center text-xs shadow">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </span>
                      </div>
                    } @else {
                      <div class="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center text-slate-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>
                    }
                    <div class="p-1 min-w-0">
                      <p class="text-2xs font-semibold text-slate-800 truncate">{{ asset.name }}</p>
                    </div>
                  </button>
                }
              </div>
            }
          </div>

          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeMediaPicker()">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- Reusable Minimal Typography Controls Template -->
    <ng-template #typoControls>
      <div class="space-y-3 text-xs" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <span class="font-bold text-slate-900 flex items-center gap-1.5 text-2xs uppercase tracking-wider">
            <span class="font-serif text-sm">T</span> Typography
          </span>
          <button type="button" class="text-slate-400 hover:text-slate-700 text-xs font-bold" (click)="closeTypography()">✕</button>
        </div>

        <!-- Font Family Select -->
        <div>
          <select
            class="admin-field-input !py-1 text-xs cursor-pointer font-semibold text-slate-800"
            [ngModel]="activeTypo.fontFamily || ''"
            (ngModelChange)="updateActiveTypoField('fontFamily', $event)"
          >
            <option value="">Default Font</option>
            @for (f of fontFamilies; track f.value) {
              <option [value]="f.value">{{ f.name }}</option>
            }
          </select>
        </div>

        <!-- Size & Weight -->
        <div class="grid grid-cols-2 gap-1.5">
          <select
            class="admin-field-input !py-1 text-2xs cursor-pointer"
            [ngModel]="activeTypo.fontSize || ''"
            (ngModelChange)="updateActiveTypoField('fontSize', $event)"
          >
            <option value="">Default Size</option>
            <option value="12px">12px Tiny</option>
            <option value="14px">14px Compact</option>
            <option value="16px">16px Body</option>
            <option value="18px">18px Large</option>
            <option value="22px">22px Lead</option>
            <option value="26px">26px Subhead</option>
            <option value="32px">32px Title</option>
          </select>

          <select
            class="admin-field-input !py-1 text-2xs cursor-pointer"
            [ngModel]="activeTypo.fontWeight || ''"
            (ngModelChange)="updateActiveTypoField('fontWeight', $event)"
          >
            <option value="">Default Weight</option>
            <option value="300">300 Light</option>
            <option value="400">400 Regular</option>
            <option value="500">500 Medium</option>
            <option value="600">600 SemiBold</option>
            <option value="700">700 Bold</option>
          </select>
        </div>

        <!-- Colors -->
        <div>
          <div class="flex items-center gap-1.5 flex-wrap">
            @for (c of colorPalette; track c.hex) {
              <button
                type="button"
                class="color-swatch-sm"
                [class.active]="activeTypo.color === c.hex"
                [style.background-color]="c.hex"
                [title]="c.name"
                (click)="updateActiveTypoField('color', c.hex)"
              ></button>
            }
            <input
              type="color"
              class="w-5 h-5 rounded-full border border-slate-300 cursor-pointer p-0 bg-transparent ml-auto"
              [ngModel]="activeTypo.color || '#0f172a'"
              (ngModelChange)="updateActiveTypoField('color', $event)"
            />
          </div>
        </div>

        <!-- Quick Style & Transform Pills -->
        <div class="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center font-bold text-2xs border"
              [class.bg-slate-900]="activeTypo.fontWeight === '700'"
              [class.text-white]="activeTypo.fontWeight === '700'"
              [class.border-slate-900]="activeTypo.fontWeight === '700'"
              [class.border-slate-200]="activeTypo.fontWeight !== '700'"
              (click)="toggleBold()"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center italic text-2xs border font-serif"
              [class.bg-slate-900]="activeTypo.fontStyle === 'italic'"
              [class.text-white]="activeTypo.fontStyle === 'italic'"
              [class.border-slate-900]="activeTypo.fontStyle === 'italic'"
              [class.border-slate-200]="activeTypo.fontStyle !== 'italic'"
              (click)="toggleItalic()"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center text-3xs font-bold border"
              [class.bg-slate-900]="activeTypo.textTransform === 'uppercase'"
              [class.text-white]="activeTypo.textTransform === 'uppercase'"
              [class.border-slate-900]="activeTypo.textTransform === 'uppercase'"
              [class.border-slate-200]="activeTypo.textTransform !== 'uppercase'"
              (click)="toggleUppercase()"
              title="UPPERCASE"
            >
              AA
            </button>
          </div>

          <!-- Alignment -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center text-3xs border"
              [class.bg-slate-900]="(activeTypo.textAlign || 'left') === 'left'"
              [class.text-white]="(activeTypo.textAlign || 'left') === 'left'"
              [class.border-slate-200]="(activeTypo.textAlign || 'left') !== 'left'"
              (click)="updateActiveTypoField('textAlign', 'left')"
              title="Align Left"
            >
              ⇤
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center text-3xs border"
              [class.bg-slate-900]="activeTypo.textAlign === 'center'"
              [class.text-white]="activeTypo.textAlign === 'center'"
              [class.border-slate-200]="activeTypo.textAlign !== 'center'"
              (click)="updateActiveTypoField('textAlign', 'center')"
              title="Align Center"
            >
              ≡
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center text-3xs border"
              [class.bg-slate-900]="activeTypo.textAlign === 'right'"
              [class.text-white]="activeTypo.textAlign === 'right'"
              [class.border-slate-200]="activeTypo.textAlign !== 'right'"
              (click)="updateActiveTypoField('textAlign', 'right')"
              title="Align Right"
            >
              ⇥
            </button>
          </div>
        </div>

        <!-- Footer: Reset & Done -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            class="text-3xs font-semibold text-red-600 hover:text-red-800"
            (click)="resetActiveTypo()"
          >
            Reset
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md bg-slate-900 text-white text-3xs font-bold hover:bg-slate-800"
            (click)="closeTypography()"
          >
            Done
          </button>
        </div>
      </div>
    </ng-template>

    <!-- CATEGORY MANAGER MODAL -->
    @if (categoryManagerOpen) {
      <div
        class="admin-dialog-backdrop"
        (click)="categoryManagerOpen = false"
      >
        <div
          class="admin-dialog !max-w-md w-full overflow-hidden p-0"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> <span>Category Manager</span>
              </h3>
              <p class="text-2xs text-slate-500 mt-0.5">
                Create new categories or delete existing ones across all posts.
              </p>
            </div>
            <button
              type="button"
              class="w-7 h-7 rounded-lg hover:bg-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors cursor-pointer"
              (click)="categoryManagerOpen = false"
            >
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <!-- Create Category Input -->
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
              <label class="text-3xs font-bold uppercase tracking-wider text-slate-600">Create New Category</label>
              <div class="flex items-center gap-2">
                <input
                  class="admin-field-input !py-1.5 text-xs bg-white flex-1"
                  placeholder="e.g. Winery Spotlight, Harvest 2026..."
                  [(ngModel)]="newCategoryName"
                  (keydown.enter)="saveNewCategory(); $event.preventDefault()"
                />
                <button
                  type="button"
                  class="btn btn-primary btn-sm !py-1.5 !px-3 shrink-0 text-xs shadow-sm cursor-pointer"
                  [disabled]="!newCategoryName.trim() || savingCategory"
                  (click)="saveNewCategory()"
                >
                  {{ savingCategory ? 'Adding...' : '＋ Add' }}
                </button>
              </div>
            </div>

            <!-- Categories List -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-3xs font-bold uppercase tracking-wider text-slate-500">
                  Available Categories ({{ availableCategories().length }})
                </span>
                @if (categoryActionMsg) {
                  <span class="text-3xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {{ categoryActionMsg }}
                  </span>
                }
              </div>

              @if (availableCategories().length === 0) {
                <div class="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  No categories created yet.
                </div>
              } @else {
                <div class="space-y-1.5">
                  @for (cat of availableCategories(); track cat) {
                    <div
                      class="flex items-center justify-between p-2.5 rounded-xl border transition-all"
                      [class.bg-slate-900]="model.category === cat"
                      [class.text-white]="model.category === cat"
                      [class.border-slate-900]="model.category === cat"
                      [class.bg-white]="model.category !== cat"
                      [class.border-slate-200]="model.category !== cat"
                      [class.hover:border-slate-300]="model.category !== cat"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        
                        <span class="text-xs font-semibold truncate">{{ cat }}</span>
                        @if (model.category === cat) {
                          <span class="text-3xs px-1.5 py-0.5 rounded bg-white/20 text-white font-medium shrink-0">
                            Selected
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-1.5 shrink-0">
                        @if (model.category !== cat) {
                          <button
                            type="button"
                            class="px-2 py-1 text-3xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            (click)="selectCategory(cat)"
                          >
                            Select
                          </button>
                        }
                        <button
                          type="button"
                          class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          [class.!text-slate-300]="model.category === cat"
                          [class.!hover:text-red-400]="model.category === cat"
                          title="Delete Category"
                          (click)="confirmDeleteCategory(cat)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Delete Warning Confirmation Banner -->
            @if (categoryToDelete) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 text-xs">
                <div class="flex items-start gap-2 text-red-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  <div>
                    <span class="font-bold">Delete "{{ categoryToDelete }}"?</span>
                    <p class="text-2xs text-red-700 mt-0.5">
                      All posts currently assigned to this category will lose it and revert to General.
                    </p>
                  </div>
                </div>
                <div class="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-2xs font-semibold text-slate-600 hover:text-slate-900 bg-white rounded border border-slate-200 cursor-pointer"
                    [disabled]="deletingCategory"
                    (click)="categoryToDelete = null"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-2xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded shadow-sm flex items-center gap-1 cursor-pointer"
                    [disabled]="deletingCategory"
                    (click)="executeDeleteCategory()"
                  >
                    {{ deletingCategory ? 'Deleting...' : 'Delete & Clear Posts' }}
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
            <button
              type="button"
              class="btn btn-secondary btn-sm cursor-pointer"
              (click)="categoryManagerOpen = false"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    }
  `,
  host: {
    '(document:keydown.control.s)': 'onCtrlS($event)',
  },
})
export class AdminPostEdit implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';

  model: Partial<Post> = {
    title: '',
    slug: '',
    post_type: 'story',
    category: null,
    tags: [],
    author_name: 'The Winehouse',
    layout_style: 'editorial',
    mood_color: 'wine',
    meta_data: {},
    excerpt: '',
    body: '',
    cover_image: '',
    published: false,
  };

  blocks: EditorBlock[] = [];
  draggedBlockIdx: number | null = null;
  draggedPaletteType: EditorBlockType | null = null;
  dragOverIdx: number | null = null;

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  showTitle = true;
  showExcerpt = true;

  removeTitle() {
    this.showTitle = false;
    this.model.title = '';
    this.hasChanges = true;
  }

  restoreTitle() {
    this.showTitle = true;
    this.hasChanges = true;
  }

  removeExcerpt() {
    this.showExcerpt = false;
    this.model.excerpt = '';
    this.hasChanges = true;
  }

  restoreExcerpt() {
    this.showExcerpt = true;
    this.hasChanges = true;
  }

  // Categories State & Management
  availableCategories = signal<string[]>([
    'Tasting Notes',
    'Cellar Stories',
    'Vintage Reports',
    'Producer Spotlight',
    'Pairing Guide',
    'Events & Tastings',
  ]);
  categoryManagerOpen = false;
  savingCategory = false;
  deletingCategory = false;
  categoryToDelete: string | null = null;
  categoryActionMsg = '';
  newCategoryName = '';

  saveNewCategory() {
    const name = this.newCategoryName.trim();
    if (!name || this.savingCategory) return;
    this.savingCategory = true;
    this.api.createCategory(name).subscribe({
      next: (cats) => {
        this.availableCategories.set(cats);
        this.model.category = name;
        this.hasChanges = true;
        this.newCategoryName = '';
        this.savingCategory = false;
        this.categoryActionMsg = `Category "${name}" created!`;
        setTimeout(() => (this.categoryActionMsg = ''), 3500);
      },
      error: () => {
        if (!this.availableCategories().includes(name)) {
          this.availableCategories.update((c) => [...c, name]);
        }
        this.model.category = name;
        this.hasChanges = true;
        this.newCategoryName = '';
        this.savingCategory = false;
      },
    });
  }

  selectCategory(cat: string) {
    this.model.category = cat;
    this.hasChanges = true;
  }

  confirmDeleteCategory(cat: string) {
    this.categoryToDelete = cat;
  }

  executeDeleteCategory() {
    const cat = this.categoryToDelete;
    if (!cat || this.deletingCategory) return;
    this.deletingCategory = true;

    this.api.deleteCategory(cat).subscribe({
      next: (res) => {
        this.availableCategories.set(res.categories);
        if (this.model.category === cat) {
          this.model.category = null;
          this.hasChanges = true;
        }
        this.categoryToDelete = null;
        this.deletingCategory = false;
        this.categoryActionMsg = `"${cat}" deleted (${res.affected_posts} posts cleared)`;
        setTimeout(() => (this.categoryActionMsg = ''), 4000);
      },
      error: () => {
        this.availableCategories.update((c) => c.filter((x) => x !== cat));
        if (this.model.category === cat) {
          this.model.category = null;
          this.hasChanges = true;
        }
        this.categoryToDelete = null;
        this.deletingCategory = false;
      },
    });
  }

  loadCategories() {
    this.api.listCategories().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) {
          const current = this.availableCategories();
          const combined = Array.from(new Set([...current, ...cats]));
          this.availableCategories.set(combined);
        }
      },
      error: () => {},
    });
  }

  // Insert Popover State
  activeInsertPopoverIdx: number | null = null;

  toggleInsertPopover(idx: number, event?: Event) {
    if (event) event.stopPropagation();
    if (this.activeInsertPopoverIdx === idx) {
      this.activeInsertPopoverIdx = null;
    } else {
      this.activeInsertPopoverIdx = idx;
    }
  }

  closeInsertPopover() {
    this.activeInsertPopoverIdx = null;
  }

  pickInsertBlock(idx: number, type: EditorBlockType) {
    this.insertBlockAt(idx, type);
    this.closeInsertPopover();
  }

  // Media Picker State
  mediaPickerOpen = signal(false);
  mediaTarget: 'cover' | { blockIdx: number; field: 'image' | 'video' } | null = null;
  mediaAssets = signal<Asset[]>([]);
  mediaSearchQuery = '';
  mediaFilter = signal<'all' | 'images' | 'videos'>('all');
  modalUploading = signal(false);

  // Minimal Typography Popover State
  activeTypoTarget: 'title' | 'excerpt' | { blockIdx: number } | null = null;

  fontFamilies = [
    { name: 'Cinzel (Serif)', value: "'Cinzel', serif" },
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
    { name: 'Inter (Clean Sans)', value: "'Inter', sans-serif" },
    { name: 'Outfit (Modern)', value: "'Outfit', sans-serif" },
    { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  ];

  colorPalette = [
    { name: 'Charcoal Slate', hex: '#0f172a' },
    { name: 'Sommelier Wine', hex: '#701423' },
    { name: 'Crimson', hex: '#991b1b' },
    { name: 'Vintage Gold', hex: '#c5a059' },
    { name: 'Muted Slate', hex: '#64748b' },
    { name: 'Pure Black', hex: '#000000' },
  ];

  busy = signal(false);
  saved = signal(false);
  error = signal('');
  hasChanges = false;

  get activeTypo(): BlockTypography {
    if (!this.activeTypoTarget) return {};
    if (this.activeTypoTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      return meta.titleTypography || {};
    }
    if (this.activeTypoTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      return meta.excerptTypography || {};
    }
    return this.blocks[this.activeTypoTarget.blockIdx]?.typography || {};
  }

  readonly availableFolders = signal<Folder[]>([]);

  filteredMediaAssets = computed(() => {
    let list = this.mediaAssets();
    const filter = this.mediaFilter();

    if (filter === 'images') list = list.filter((a) => this.isAssetImage(a));
    else if (filter === 'videos') list = list.filter((a) => this.isAssetVideo(a));

    const q = this.mediaSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((a) => a.name.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.loadMediaLibrary();
    this.loadCategories();
    this.loadFolders();

    if (!this.isNew) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getPost(id).subscribe((post) => {
        this.model = { ...this.model, ...post };

        if (!post.title || post.title === 'Untitled') {
          this.showTitle = false;
        }
        if (!post.excerpt) {
          this.showExcerpt = false;
        }

        const savedBlocks = post.meta_data && (post.meta_data as any).blocks;
        if (Array.isArray(savedBlocks) && savedBlocks.length > 0) {
          this.blocks = savedBlocks;
        } else if (post.body) {
          this.blocks = this.parseBodyToBlocks(post.body);
        } else {
          this.blocks = this.getDefaultInitialBlocks();
        }
      });
    } else {
      this.blocks = this.getDefaultInitialBlocks();
    }
  }

  loadFolders() {
    this.api.listFolders('post').subscribe((folders) => {
      this.availableFolders.set(folders);
    });
  }

  loadMediaLibrary() {
    this.api.listAssets().subscribe((assets) => {
      this.mediaAssets.set(assets);
    });
  }

  isAssetImage(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('image/');
  }

  isAssetVideo(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(asset.name);
  }

  openMediaPicker(target: 'cover' | { blockIdx: number; field: 'image' | 'video' }) {
    this.mediaTarget = target;
    this.loadMediaLibrary();
    this.mediaPickerOpen.set(true);
  }

  closeMediaPicker() {
    this.mediaPickerOpen.set(false);
    this.mediaTarget = null;
  }

  selectAsset(asset: Asset) {
    if (!this.mediaTarget) return;

    if (this.mediaTarget === 'cover') {
      this.model.cover_image = asset.url;
    } else {
      const block = this.blocks[this.mediaTarget.blockIdx];
      if (block) {
        if (this.mediaTarget.field === 'image') {
          block.imageUrl = asset.url;
        } else if (this.mediaTarget.field === 'video') {
          block.videoUrl = asset.url;
        }
      }
    }

    this.hasChanges = true;
    this.closeMediaPicker();
  }

  uploadFromPicker(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    this.modalUploading.set(true);
    this.api.uploadAsset(files[0]).subscribe({
      next: (asset) => {
        this.mediaAssets.update((list) => [asset, ...list]);
        this.modalUploading.set(false);
        this.selectAsset(asset);
      },
      error: () => {
        this.modalUploading.set(false);
        alert('Could not upload media file.');
      },
    });
    input.value = '';
  }

  // --- Drag and Drop from Palette and Reordering ---
  onPaletteDragStart(type: EditorBlockType, e: DragEvent) {
    this.draggedPaletteType = type;
    this.draggedBlockIdx = null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', type);
    }
  }

  onBlockDragStart(index: number, e: DragEvent) {
    this.draggedBlockIdx = index;
    this.draggedPaletteType = null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  onCanvasDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.draggedPaletteType ? 'copy' : 'move';
    }
    this.dragOverIdx = index;
  }

  onCanvasDragLeave() {
    this.dragOverIdx = null;
  }

  onCanvasDrop(e: DragEvent, targetIdx: number) {
    e.preventDefault();
    if (this.draggedPaletteType) {
      this.insertBlockAt(targetIdx, this.draggedPaletteType);
      this.draggedPaletteType = null;
    } else if (this.draggedBlockIdx !== null && this.draggedBlockIdx !== targetIdx) {
      const item = this.blocks.splice(this.draggedBlockIdx, 1)[0];
      const dest = targetIdx > this.draggedBlockIdx ? targetIdx - 1 : targetIdx;
      this.blocks.splice(dest, 0, item);
      this.hasChanges = true;
      this.draggedBlockIdx = null;
    }
    this.dragOverIdx = null;
  }

  // --- Minimal Typography Popover Helpers ---
  isTextBlock(type: EditorBlockType): boolean {
    return ['heading', 'paragraph', 'quote', 'wine_card', 'pairing_box'].includes(type);
  }

  isTypographyOpenFor(target: 'title' | 'excerpt' | { blockIdx: number }): boolean {
    if (!this.activeTypoTarget) return false;
    if (typeof target === 'string' && typeof this.activeTypoTarget === 'string') {
      return target === this.activeTypoTarget;
    }
    if (typeof target === 'object' && typeof this.activeTypoTarget === 'object') {
      return target.blockIdx === this.activeTypoTarget.blockIdx;
    }
    return false;
  }

  toggleTypography(target: 'title' | 'excerpt' | { blockIdx: number }, event?: Event) {
    if (event) event.stopPropagation();
    if (this.isTypographyOpenFor(target)) {
      this.activeTypoTarget = null;
    } else {
      this.activeTypoTarget = target;
    }
  }

  closeTypography() {
    this.activeTypoTarget = null;
  }

  updateActiveTypoField(field: keyof BlockTypography, value: string) {
    if (!this.activeTypoTarget) return;

    if (this.activeTypoTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      meta.titleTypography = { ...(meta.titleTypography || {}), [field]: value || undefined };
      this.model.meta_data = meta;
    } else if (this.activeTypoTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      meta.excerptTypography = { ...(meta.excerptTypography || {}), [field]: value || undefined };
      this.model.meta_data = meta;
    } else {
      const block = this.blocks[this.activeTypoTarget.blockIdx];
      if (block) {
        block.typography = { ...(block.typography || {}), [field]: value || undefined };
      }
    }
    this.hasChanges = true;
  }

  toggleBold() {
    const cur = this.activeTypo.fontWeight;
    this.updateActiveTypoField('fontWeight', cur === '700' ? '' : '700');
  }

  toggleItalic() {
    const cur = this.activeTypo.fontStyle;
    this.updateActiveTypoField('fontStyle', cur === 'italic' ? '' : 'italic');
  }

  toggleUppercase() {
    const cur = this.activeTypo.textTransform;
    this.updateActiveTypoField('textTransform', cur === 'uppercase' ? '' : 'uppercase');
  }

  resetActiveTypo() {
    if (!this.activeTypoTarget) return;

    if (this.activeTypoTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      delete meta.titleTypography;
    } else if (this.activeTypoTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      delete meta.excerptTypography;
    } else {
      delete this.blocks[this.activeTypoTarget.blockIdx].typography;
    }
    this.hasChanges = true;
    this.closeTypography();
  }

  hasCustomTypography(target: 'title' | 'excerpt' | { blockIdx: number }): boolean {
    if (target === 'title') {
      return !!((this.model.meta_data || {}) as any).titleTypography;
    }
    if (target === 'excerpt') {
      return !!((this.model.meta_data || {}) as any).excerptTypography;
    }
    return !!this.blocks[target.blockIdx]?.typography;
  }

  getCustomStyle(target: 'title' | 'excerpt'): Record<string, string> {
    const meta = (this.model.meta_data || {}) as any;
    const typo = target === 'title' ? meta.titleTypography : meta.excerptTypography;
    return this.getTypographyStyle(typo);
  }

  getTypographyStyle(typography?: BlockTypography): Record<string, string> {
    if (!typography) return {};
    const styles: Record<string, string> = {};
    if (typography.fontFamily) styles['font-family'] = typography.fontFamily;
    if (typography.fontSize) styles['font-size'] = typography.fontSize;
    if (typography.fontWeight) styles['font-weight'] = typography.fontWeight;
    if (typography.color) styles['color'] = typography.color;
    if (typography.textTransform) styles['text-transform'] = typography.textTransform;
    if (typography.fontStyle) styles['font-style'] = typography.fontStyle;
    if (typography.letterSpacing) styles['letter-spacing'] = typography.letterSpacing;
    if (typography.lineHeight) styles['line-height'] = typography.lineHeight;
    if (typography.textAlign) styles['text-align'] = typography.textAlign;
    return styles;
  }

  toggleHeadingLevel(block: EditorBlock) {
    block.headingLevel = block.headingLevel === 'h3' ? 'h2' : 'h3';
    this.hasChanges = true;
  }

  scrollToBlock(blockId: string) {
    const el = document.getElementById('block-' + blockId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getBlockOutlineTitle(block: EditorBlock): string {
    switch (block.type) {
      case 'heading': return block.headingText || 'Heading';
      case 'paragraph': return block.paragraphText?.substring(0, 20) || 'Paragraph';
      case 'image': return block.imageCaption || 'Image';
      case 'video': return block.videoCaption || 'Video';
      case 'quote': return block.quoteAuthor || 'Quote';
      case 'wine_card': return block.wineName || 'Wine Tasting';
      case 'pairing_box': return block.dishName || 'Pairing';
      case 'event_box': return block.eventTitle || 'Event';
      case 'divider': return 'Divider';
    }
  }

  getDefaultInitialBlocks(): EditorBlock[] {
    return [
      {
        id: this.genId(),
        type: 'heading',
        headingLevel: 'h2',
        headingText: 'Notes from the Vineyard',
      },
      {
        id: this.genId(),
        type: 'paragraph',
        paragraphText:
          'Every bottle tells the tale of a season — the summer sun, volcanic sea winds, and the quiet patience of the cellar.',
      },
      {
        id: this.genId(),
        type: 'quote',
        quoteText: 'Wine is a place and a year captured in glass.',
        quoteAuthor: 'Elena Vassiliou — Sommelier',
      },
    ];
  }

  addBlock(type: EditorBlockType) {
    this.insertBlockAt(this.blocks.length, type);
  }

  insertBlockAt(index: number, type: EditorBlockType) {
    const newBlock: EditorBlock = {
      id: this.genId(),
      type,
    };

    switch (type) {
      case 'heading':
        newBlock.headingLevel = 'h2';
        newBlock.headingText = '';
        break;
      case 'paragraph':
        newBlock.paragraphText = '';
        break;
      case 'image':
        newBlock.imageUrl = '';
        newBlock.imageCaption = '';
        break;
      case 'video':
        newBlock.videoUrl = '';
        newBlock.videoCaption = '';
        break;
      case 'quote':
        newBlock.quoteText = '';
        newBlock.quoteAuthor = '';
        break;
      case 'wine_card':
        newBlock.wineName = '';
        newBlock.winery = '';
        newBlock.vintage = '';
        newBlock.region = '';
        newBlock.grape = '';
        newBlock.tastingNotes = '';
        newBlock.sommelierRating = 'Sommelier Reserve Selection';
        break;
      case 'pairing_box':
        newBlock.dishName = '';
        newBlock.matchedWine = '';
        newBlock.pairingNotes = '';
        break;
      case 'event_box':
        newBlock.eventTitle = '';
        newBlock.eventDate = '';
        newBlock.eventLocation = '';
        break;
      case 'divider':
        break;
    }

    this.blocks.splice(index, 0, newBlock);
    this.hasChanges = true;
    setTimeout(() => this.scrollToBlock(newBlock.id), 50);
  }

  moveBlock(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.blocks.length) return;
    const item = this.blocks.splice(index, 1)[0];
    this.blocks.splice(target, 0, item);
    this.hasChanges = true;
  }

  removeBlock(index: number) {
    this.blocks.splice(index, 1);
    this.hasChanges = true;
  }

  getBlockIcon(type: EditorBlockType): string {
    switch (type) {
      case 'heading': return 'H';
      case 'paragraph': return '¶';
      case 'image': return 'IMG';
      case 'video': return 'VID';
      case 'quote': return '“';
      case 'wine_card': return 'WINE';
      case 'pairing_box': return 'PAIR';
      case 'event_box': return 'EVENT';
      case 'divider': return '—';
    }
  }

  private genId(): string {
    return 'b_' + Math.random().toString(36).substring(2, 9);
  }

  private parseBodyToBlocks(body: string): EditorBlock[] {
    const lines = body.split('\n');
    const result: EditorBlock[] = [];
    let currentPara = '';

    const flushPara = () => {
      if (currentPara.trim()) {
        result.push({
          id: this.genId(),
          type: 'paragraph',
          paragraphText: currentPara.trim(),
        });
        currentPara = '';
      }
    };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        flushPara();
        result.push({ id: this.genId(), type: 'heading', headingLevel: 'h2', headingText: line.substring(3).trim() });
      } else if (line.startsWith('### ')) {
        flushPara();
        result.push({ id: this.genId(), type: 'heading', headingLevel: 'h3', headingText: line.substring(4).trim() });
      } else if (line.startsWith('> ')) {
        flushPara();
        result.push({ id: this.genId(), type: 'quote', quoteText: line.substring(2).trim() });
      } else if (line.trim() === '---') {
        flushPara();
        result.push({ id: this.genId(), type: 'divider' });
      } else {
        currentPara += (currentPara ? '\n' : '') + line;
      }
    }
    flushPara();
    return result.length ? result : this.getDefaultInitialBlocks();
  }

  private serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
    const parts: string[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case 'heading':
          const h = block.headingLevel === 'h3' ? '###' : '##';
          parts.push(`${h} ${block.headingText || ''}`);
          break;
        case 'paragraph':
          if (block.paragraphText) parts.push(block.paragraphText);
          break;
        case 'image':
          if (block.imageUrl) {
            parts.push(`![${block.imageCaption || ''}](${block.imageUrl})`);
          }
          break;
        case 'video':
          if (block.videoUrl) {
            parts.push(`<video src="${block.videoUrl}" controls></video>`);
          }
          break;
        case 'quote':
          if (block.quoteText) {
            let q = `> "${block.quoteText}"`;
            if (block.quoteAuthor) q += `\n> — ${block.quoteAuthor}`;
            parts.push(q);
          }
          break;
        case 'wine_card':
          parts.push(
            `### ${block.wineName || 'Wine'} (${block.vintage || 'NV'})\n**Producer:** ${block.winery || '—'}\n**Region:** ${block.region || '—'} · **Grape:** ${block.grape || '—'}\n*${block.tastingNotes || ''}*`
          );
          break;
        case 'pairing_box':
          parts.push(
            `> **Pairing:** ${block.dishName || ''}\n> **Matched Wine:** ${block.matchedWine || ''}\n> ${block.pairingNotes || ''}`
          );
          break;
        case 'event_box':
          parts.push(
            `### ${block.eventTitle || 'Event'}\n**Date:** ${block.eventDate || ''} · **Location:** ${block.eventLocation || ''}`
          );
          break;
        case 'divider':
          parts.push('---');
          break;
      }
    }

    return parts.join('\n\n');
  }

  onCtrlS(e: Event) {
    e.preventDefault();
    this.publishOrSave();
  }

  saveAsDraft() {
    this.model.published = false;
    this.save();
  }

  unpublish() {
    this.model.published = false;
    this.save();
  }

  publishOrSave() {
    if (!this.model.published) {
      this.model.published = true;
    }
    this.save();
  }

  save() {
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);

    if (!this.showTitle || !this.model.title?.trim()) {
      const firstHeading = this.blocks.find((b) => b.type === 'heading' && b.headingText?.trim());
      this.model.title = firstHeading?.headingText?.trim() || 'Untitled';
    }

    if (!this.showExcerpt) {
      this.model.excerpt = '';
    }

    if (!this.model.cover_image) {
      const firstImg = this.blocks.find((b) => b.type === 'image' && b.imageUrl);
      this.model.cover_image = firstImg?.imageUrl || '';
    }

    this.model.body = this.serializeBlocksToMarkdown(this.blocks);
    const existingMeta = (this.model.meta_data || {}) as Record<string, any>;
    this.model.meta_data = {
      ...existingMeta,
      blocks: this.blocks,
    } as PostMetaData;

    const req = this.isNew
      ? this.api.createPost(this.model)
      : this.api.updatePost(this.model.id!, this.model);

    req.subscribe({
      next: (post) => {
        this.busy.set(false);
        this.saved.set(true);
        this.hasChanges = false;
        if (this.isNew) {
          this.router.navigate(['/admin/posts', post.id]);
        } else {
          this.model = post;
        }
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Could not save post. Please try again.');
      },
    });
  }
}
