import { DatePipe, NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal, computed, OnInit, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Post, Asset, PostMetaData, Folder, Product } from './api';
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
  | 'divider'
  | 'container'
  | 'columns_2'
  | 'columns_3';

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

export interface BlockImageSettings {
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1' | '3/2' | '9/16';
  maxWidth?: 'full' | 'lg' | 'md' | 'sm' | 'center';
  maxHeight?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shadow?: 'none' | 'xs' | 'md' | 'lg' | 'xl';
  borderStyle?: 'none' | 'subtle' | 'sand' | 'crimson';
  altText?: string;
}

export interface BlockVideoSettings {
  maxHeight?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export interface BlockQuoteSettings {
  accentColor?: string;
  bgStyle?: 'white' | 'slate' | 'sand' | 'amber' | 'transparent';
}

export interface BlockWineCardSettings {
  badgeColor?: string;
  bgStyle?: 'sand' | 'white' | 'gold';
}

export interface BlockPairingSettings {
  bgStyle?: 'amber' | 'sand' | 'white';
}

export interface BlockEventSettings {
  theme?: 'slate' | 'sand' | 'crimson';
}

export interface BlockDividerSettings {
  style?: 'rule' | 'asterisks' | 'line' | 'dashed';
  spacing?: 'compact' | 'standard' | 'spacious';
}

export interface BlockContainerSettings {
  bgStyle?: 'transparent' | 'white' | 'sand' | 'slate' | 'gold';
  padding?: 'compact' | 'standard' | 'spacious';
  borderRadius?: 'none' | 'md' | 'xl' | '2xl';
  borderStyle?: 'none' | 'subtle' | 'sand' | 'crimson';
}

export interface BlockColumnsSettings {
  ratio?: '50-50' | '60-40' | '40-60';
  gap?: 'compact' | 'standard' | 'spacious';
  alignItems?: 'start' | 'center' | 'stretch';
}

export interface EditorBlock {
  id: string;
  type: EditorBlockType;
  // Typography & Settings
  typography?: BlockTypography;
  imageSettings?: BlockImageSettings;
  videoSettings?: BlockVideoSettings;
  quoteSettings?: BlockQuoteSettings;
  cardSettings?: BlockWineCardSettings;
  pairingSettings?: BlockPairingSettings;
  eventSettings?: BlockEventSettings;
  dividerSettings?: BlockDividerSettings;
  containerSettings?: BlockContainerSettings;
  columnsSettings?: BlockColumnsSettings;
  // Nesting Support
  children?: EditorBlock[]; // for container
  columns?: EditorBlock[][]; // for columns_2 (2 slots) and columns_3 (3 slots)
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
  // Wine Card & Shop Linking
  productId?: number | null;
  productSlug?: string | null;
  productPrice?: number | null;
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
        <a routerLink="new" class="btn btn-primary shadow-sm flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Article</span>
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

    <!-- Main Workspace: Folder Sidebar + Posts Table -->
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
            Loading articles…
          </div>
        } @else if (filteredPosts().length === 0) {
          <div class="admin-card admin-empty-state">
            <p class="font-bold text-slate-700">No articles found</p>
            <p class="text-xs text-slate-400 mt-1">
              @if (searchQuery) {
                No articles match "{{ searchQuery }}". Try a different search.
              } @else if (activeFolder()) {
                Folder "{{ activeFolder()?.name }}" is currently empty.
              } @else {
                Get started by creating your first journal article.
              }
            </p>
            <a routerLink="new" class="btn btn-primary btn-sm mt-4 inline-flex items-center gap-1">
              <span>＋ New Article</span>
            </a>
          </div>
        } @else {
          <div class="admin-table-container shadow-xs rounded-xl overflow-hidden border border-slate-200/80 bg-white">
            <table class="admin-table">
              <thead>
                <tr>
                  <th class="w-10 text-center">
                    <input
                      type="checkbox"
                      [checked]="isAllSelected()"
                      (change)="toggleSelectAll($event)"
                      class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 cursor-pointer"
                    />
                  </th>
                  <th (click)="toggleSort('title')" class="cursor-pointer">
                    Title
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

                          <div class="absolute right-0 top-full pt-1 hidden group-hover/folder:block z-50">
                            <div class="w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 text-xs space-y-0.5">
                              <span class="block px-2 py-1 text-3xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                Move to Folder
                              </span>
                              <button
                                type="button"
                                (click)="movePost(post, null)"
                                class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                                [class.font-bold]="post.folder_id === null"
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

                        @if (post.slug) {
                          <a
                            [routerLink]="['/posts', post.slug]"
                            [queryParams]="post.published ? null : { preview: 'true' }"
                            target="_blank"
                            class="px-2 py-1 text-xs font-medium text-slate-500 hover:text-wine-800 hover:bg-slate-100 rounded-md transition-colors inline-flex items-center gap-1"
                            title="View live dispatch in new tab"
                          >
                            <span>View ↗</span>
                          </a>
                        }
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
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center flex-wrap gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white transition-all animate-slideUp">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-wine-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs">
            {{ selectedCount() }}
          </span>
          <span class="text-xs font-semibold text-slate-200">
            Selected
          </span>
        </div>

        <div class="h-4 w-px bg-white/20 mx-1"></div>

        <div class="relative group/bulk">
          <button
            type="button"
            class="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Move to Folder ▾</span>
          </button>

          <div class="absolute left-0 bottom-full pb-1 hidden group-hover/bulk:block z-50">
            <div class="w-48 bg-slate-900 rounded-xl shadow-2xl border border-white/10 p-1.5 text-xs text-slate-200 space-y-0.5">
              <span class="block px-2 py-1 text-3xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                Target Folder
              </span>
              <button
                type="button"
                (click)="bulkMoveSelected(null)"
                class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 cursor-pointer text-slate-300"
              >
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Unorganized</span>
              </button>
              @for (f of availableFolders(); track f.id) {
                <button
                  type="button"
                  (click)="bulkMoveSelected(f.id)"
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 cursor-pointer text-slate-300"
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
          (click)="deleteSelected()"
          class="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Delete</span>
        </button>

        <div class="h-4 w-px bg-white/20 mx-1"></div>

        <button
          type="button"
          (click)="deselectAll()"
          class="text-xs text-slate-400 hover:text-white px-1.5 py-1 transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    }
  `,
  host: {
    '(window:keydown)': 'handleGlobalKeydown($event)',
  },
})
export class AdminPosts implements OnInit {
  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);

  @ViewChild('folderSidebar') folderSidebarComponent?: WhFolderSidebar;

  posts = signal<Post[]>([]);
  availableFolders = signal<Folder[]>([]);
  loading = signal(true);
  searchQuery = '';
  activeFilter = signal<'all' | 'published' | 'draft'>('all');
  selectedFolderId = signal<number | 'all' | 'root'>('all');

  selectedIds = signal<Set<number>>(new Set());
  lastSelectedIndex: number | null = null;

  sortField = signal<'title' | 'date'>('date');
  sortDir = signal<'asc' | 'desc'>('desc');

  copiedToast = signal<string | null>(null);

  filterTabs = [
    { label: 'All Articles', value: 'all' as const },
    { label: 'Published', value: 'published' as const },
    { label: 'Drafts', value: 'draft' as const },
  ];

  readonly activeFolder = computed(() => {
    const id = this.selectedFolderId();
    if (id === 'all' || id === 'root') return null;
    return this.availableFolders().find((f) => f.id === id) || null;
  });

  readonly unorganizedCount = computed(() => {
    return this.posts().filter((p) => p.folder_id === null).length;
  });

  readonly filteredPosts = computed(() => {
    let items = this.posts();

    const folderId = this.selectedFolderId();
    if (folderId === 'root') {
      items = items.filter((p) => p.folder_id === null);
    } else if (typeof folderId === 'number') {
      items = items.filter((p) => p.folder_id === folderId);
    }

    const filter = this.activeFilter();
    if (filter === 'published') items = items.filter((p) => p.published);
    else if (filter === 'draft') items = items.filter((p) => !p.published);

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(q))
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

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
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

  toggleSelectAll(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      const all = new Set(this.filteredPosts().map((p) => p.id));
      this.selectedIds.set(all);
    } else {
      this.deselectAll();
    }
  }

  deselectAll(): void {
    this.selectedIds.set(new Set());
    this.lastSelectedIndex = null;
  }

  showToast(msg: string) {
    this.copiedToast.set(msg);
    setTimeout(() => this.copiedToast.set(null), 3000);
  }

  handleGlobalKeydown(e: KeyboardEvent): void {
    if (this.isTypingInInput(e.target)) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const all = new Set(this.filteredPosts().map((p) => p.id));
      this.selectedIds.set(all);
      this.showToast(`Selected all ${all.size} articles`);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedCount() > 0) {
        e.preventDefault();
        this.deleteSelected();
      }
      return;
    }

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

  async remove(post: Post) {
    const ok = await this.confirm.open({
      title: 'Delete article',
      message: `Are you sure you want to delete "${post.title}"? This cannot be undone.`,
      confirmLabel: 'Delete Article',
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
      <div class="flex items-center gap-3">
        <a routerLink="/admin/posts" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Back to Articles</span>
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
      </div>

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

        @if (!isNew && model.slug) {
          <a
            [routerLink]="['/posts', model.slug]"
            [queryParams]="model.published ? null : { preview: 'true' }"
            target="_blank"
            class="btn btn-secondary flex items-center gap-1.5"
            title="Preview dispatch in a new tab"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Preview Dispatch ↗</span>
          </a>
        }

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

    <!-- MAIN WYSIWYG CANVAS LAYOUT (Center Main Canvas + Right Dynamic Inspector Sidebar) -->
    <div class="flex flex-col lg:flex-row items-start gap-8 w-full" (click)="deselectTarget($event)">

      <!-- CENTER/MAIN: Authentic Article Canvas -->
      <div class="flex-1 w-full min-w-0" (click)="$event.stopPropagation()">

        <div class="article-live-canvas space-y-6">

          <!-- 1. Article Header (Title & Teaser) -->
          @if (showTitle || showExcerpt) {
            <div class="space-y-4">

              <!-- Title -->
              @if (showTitle) {
                <div
                  class="relative group/input p-2 rounded-xl transition-all cursor-pointer"
                  [class.ring-2]="isTitleSelected()"
                  [class.ring-[#701423]]="isTitleSelected()"
                  [class.bg-slate-50/70]="isTitleSelected()"
                  (click)="selectTarget('title', $event)"
                >
                  <input
                    class="w-full font-serif font-bold text-3xl sm:text-4xl text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                    placeholder="Post Title..."
                    [(ngModel)]="model.title"
                    [ngStyle]="getCustomStyle('title')"
                    (focus)="selectTarget('title')"
                    (ngModelChange)="onContentChange()"
                  />
                </div>
              }

              <!-- Teaser -->
              @if (showExcerpt) {
                <div
                  class="relative group/input p-2 rounded-xl transition-all cursor-pointer"
                  [class.ring-2]="isExcerptSelected()"
                  [class.ring-[#701423]]="isExcerptSelected()"
                  [class.bg-slate-50/70]="isExcerptSelected()"
                  (click)="selectTarget('excerpt', $event)"
                >
                  <textarea
                    class="w-full font-serif italic text-base sm:text-lg text-slate-600 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 resize-none min-h-12"
                    placeholder="Write an evocative subtitle or teaser sentence..."
                    [(ngModel)]="model.excerpt"
                    [ngStyle]="getCustomStyle('excerpt')"
                    (focus)="selectTarget('excerpt')"
                    (ngModelChange)="onContentChange()"
                  ></textarea>
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

          <!-- 2. Dynamic Article Content Blocks with Drag & Drop Targets -->
          <div class="space-y-4 pt-2">
            @for (block of blocks; track block.id; let idx = $index) {

              <!-- Drop Target / Insert Line between blocks -->
              <div
                class="canvas-insert-line"
                [class.drag-active]="dragOverId === block.id && dragOverSlot === 'before'"
                (dragover)="onCanvasDragOver($event, block.id, 'before')"
                (dragleave)="onCanvasDragLeave()"
                (drop)="onCanvasDrop($event, block.id, 'before')"
              >
                <button
                  type="button"
                  class="canvas-insert-btn"
                  [class.active]="activeInsertPopoverId === block.id"
                  (click)="toggleInsertPopover(block.id, $event)"
                  title="Insert Section"
                >
                  <span>＋</span> Insert Section
                </button>

                @if (activeInsertPopoverId === block.id) {
                  <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                    <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: block.id, insertPos: 'before' }"></ng-container>
                  </div>
                }
              </div>

              <!-- Reusable Block Renderer Template invocation for Top-level block -->
              <ng-container *ngTemplateOutlet="renderBlock; context: { block: block, parentList: blocks, idx: idx }"></ng-container>
            }

            <!-- Bottom Drop Zone for appending blocks -->
            <div class="relative">
              <div
                class="canvas-drop-zone-bottom cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
                [class.drag-over]="dragOverId === 'bottom'"
                (dragover)="onCanvasDragOver($event, 'bottom', 'append')"
                (dragleave)="onCanvasDragLeave()"
                (drop)="onCanvasDrop($event, 'bottom', 'append')"
                (click)="toggleInsertPopover('bottom', $event)"
              >
                <span>＋ Click or drag here to append a new block</span>
              </div>

              @if (activeInsertPopoverId === 'bottom') {
                <div class="canvas-insert-popover !top-auto !bottom-full !mb-2" (click)="$event.stopPropagation()">
                  <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: 'bottom', insertPos: 'append' }"></ng-container>
                </div>
              }
            </div>

          </div>

        </div>

      </div>

      <!-- RIGHT DYNAMIC INSPECTOR SIDEBAR -->
      <div class="w-full lg:w-84 shrink-0 canvas-sidebar-panel space-y-4" (click)="$event.stopPropagation()">

        <!-- =================================================================================== -->
        <!-- MODE A: ELEMENT IS SELECTED (CONTEXTUAL INSPECTOR PANEL)                             -->
        <!-- =================================================================================== -->
        @if (selectedTarget !== 'post') {
          <div class="admin-card space-y-4 animate-in fade-in duration-150">
            
            <!-- Inspector Header: Back Arrow + Compact Element Title in Single Row -->
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 min-w-0">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
                  (click)="deselectTarget()"
                  title="Back to Article Settings"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <span class="text-xs font-bold text-slate-900 truncate tracking-tight">
                  {{ getSelectedBadgeLabel() }}
                </span>
              </div>

              <div class="flex items-center gap-0.5 shrink-0">
                @if (selectedBlockId) {
                  <button
                    type="button"
                    class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    (click)="removeBlockById(selectedBlockId)"
                    title="Delete Block"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                }
                <button
                  type="button"
                  class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                  (click)="deselectTarget()"
                  title="Close Inspector"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- 1. TITLE INSPECTOR -->
            @if (selectedTarget === 'title') {
              <div class="space-y-3.5">
                <div>
                  <label class="admin-field-label">Article Title</label>
                  <input
                    class="admin-field-input font-bold"
                    placeholder="Article title..."
                    [(ngModel)]="model.title"
                    (ngModelChange)="onContentChange()"
                  />
                </div>

                <div class="border-t border-slate-100 pt-3">
                  <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                </div>

                <div class="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    class="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                    (click)="removeTitle()"
                  >
                    Remove Title from Canvas
                  </button>
                </div>
              </div>
            }

            <!-- 2. SUBTITLE / EXCERPT INSPECTOR -->
            @else if (selectedTarget === 'excerpt') {
              <div class="space-y-3.5">
                <div>
                  <label class="admin-field-label">Subtitle / Evocative Teaser</label>
                  <textarea
                    class="admin-field-input min-h-20 text-xs leading-relaxed"
                    placeholder="Write a teaser..."
                    [(ngModel)]="model.excerpt"
                    (ngModelChange)="onContentChange()"
                  ></textarea>
                </div>

                <div class="border-t border-slate-100 pt-3">
                  <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                </div>

                <div class="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    class="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                    (click)="removeExcerpt()"
                  >
                    Remove Subtitle from Canvas
                  </button>
                </div>
              </div>
            }

            <!-- 3. BLOCK INSPECTOR -->
            @else if (selectedBlockId && currentSelectedBlock; as b) {
              
              <!-- CONTAINER BLOCK SETTINGS -->
              @if (b.type === 'container') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Layout Container</label>
                    <p class="text-2xs text-slate-500">Organizes and groups nested elements or multi-column layouts in a unified flow.</p>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Child Item Spacing (Gap)</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      @for (p of [{ label: 'Compact', val: 'compact' }, { label: 'Standard', val: 'standard' }, { label: 'Spacious', val: 'spacious' }]; track p.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.containerSettings?.padding || 'standard') === p.val"
                          (click)="ensureContainerSettings(b).padding = $any(p.val); hasChanges = true"
                        >
                          {{ p.label }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- 2 COLUMNS BLOCK SETTINGS -->
              @else if (b.type === 'columns_2') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Column Layout Ratio</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      @for (r of [{ label: '50 / 50 Equal', val: '50-50' }, { label: '60 / 40 Split', val: '60-40' }, { label: '40 / 60 Split', val: '40-60' }]; track r.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.columnsSettings?.ratio || '50-50') === r.val"
                          (click)="ensureColumnsSettings(b).ratio = $any(r.val); hasChanges = true"
                        >
                          {{ r.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Column Gap</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      @for (g of [{ label: 'Compact', val: 'compact' }, { label: 'Standard', val: 'standard' }, { label: 'Spacious', val: 'spacious' }]; track g.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.columnsSettings?.gap || 'standard') === g.val"
                          (click)="ensureColumnsSettings(b).gap = $any(g.val); hasChanges = true"
                        >
                          {{ g.label }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- 3 COLUMNS BLOCK SETTINGS -->
              @else if (b.type === 'columns_3') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">3-Column Grid</label>
                    <p class="text-2xs text-slate-500">Divides space into 3 equal responsive columns on desktop.</p>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Column Gap</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      @for (g of [{ label: 'Compact', val: 'compact' }, { label: 'Standard', val: 'standard' }, { label: 'Spacious', val: 'spacious' }]; track g.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.columnsSettings?.gap || 'standard') === g.val"
                          (click)="ensureColumnsSettings(b).gap = $any(g.val); hasChanges = true"
                        >
                          {{ g.label }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- HEADING BLOCK SETTINGS -->
              @else if (b.type === 'heading') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Heading Level</label>
                    <div class="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        class="admin-opt-btn"
                        [class.active]="b.headingLevel !== 'h3'"
                        (click)="b.headingLevel = 'h2'; hasChanges = true"
                      >
                        H2 Main Section
                      </button>
                      <button
                        type="button"
                        class="admin-opt-btn"
                        [class.active]="b.headingLevel === 'h3'"
                        (click)="b.headingLevel = 'h3'; hasChanges = true"
                      >
                        H3 Subheading
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="admin-field-label">Heading Text</label>
                    <input
                      class="admin-field-input font-bold"
                      placeholder="Heading text..."
                      [(ngModel)]="b.headingText"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                  </div>
                </div>
              }

              <!-- PARAGRAPH BLOCK SETTINGS -->
              @else if (b.type === 'paragraph') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Paragraph Text</label>
                    <textarea
                      class="admin-field-input min-h-28 text-xs leading-relaxed"
                      placeholder="Paragraph text..."
                      [(ngModel)]="b.paragraphText"
                      (ngModelChange)="onContentChange()"
                    ></textarea>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                  </div>
                </div>
              }

              <!-- IMAGE BLOCK SETTINGS -->
              @else if (b.type === 'image') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Image Source</label>
                    @if (b.imageUrl) {
                      <div class="relative group/imgpreview rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-2">
                        <img [src]="mediaUrl(b.imageUrl)" alt="" class="w-full h-28 object-cover" />
                        <div
                          class="absolute inset-0 bg-black/50 opacity-0 group-hover/imgpreview:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white text-xs font-semibold"
                          (click)="openMediaPicker({ blockId: b.id, field: 'image' })"
                        >
                          Change Image ↗
                        </div>
                      </div>
                    }

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm flex-1 text-xs"
                        (click)="openMediaPicker({ blockId: b.id, field: 'image' })"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>Choose Media</span>
                      </button>
                    </div>

                    <input
                      class="admin-field-input font-mono text-2xs mt-1.5"
                      placeholder="Or paste image URL..."
                      [(ngModel)]="b.imageUrl"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>

                  <!-- Object Fit Controls -->
                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Object Fit (Scaling)</label>
                    <div class="grid grid-cols-2 gap-1.5">
                      @for (fit of ['cover', 'contain', 'fill', 'scale-down']; track fit) {
                        <button
                          type="button"
                          class="admin-opt-btn capitalize"
                          [class.active]="(b.imageSettings?.objectFit || 'cover') === fit"
                          (click)="ensureImageSettings(b).objectFit = $any(fit); onContentChange()"
                        >
                          {{ fit }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Aspect Ratio Presets -->
                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Aspect Ratio</label>
                    <select
                      class="admin-field-input text-xs font-medium cursor-pointer"
                      [ngModel]="b.imageSettings?.aspectRatio || 'auto'"
                      (ngModelChange)="ensureImageSettings(b).aspectRatio = $event; onContentChange()"
                    >
                      <option value="auto">Original / Auto</option>
                      <option value="16/9">16:9 Landscape Banner</option>
                      <option value="4/3">4:3 Standard Classic</option>
                      <option value="1/1">1:1 Square</option>
                      <option value="3/2">3:2 Editorial Photo</option>
                      <option value="9/16">9:16 Portrait / Story</option>
                    </select>
                  </div>

                  <!-- Max Width / Sizing -->
                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Width Constraints</label>
                    <div class="grid grid-cols-2 gap-1.5">
                      @for (w of [{ label: '100% Full', val: 'full' }, { label: '768px Large', val: 'lg' }, { label: '520px Medium', val: 'md' }, { label: '360px Compact', val: 'sm' }]; track w.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.imageSettings?.maxWidth || 'full') === w.val"
                          (click)="ensureImageSettings(b).maxWidth = $any(w.val); onContentChange()"
                        >
                          {{ w.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Max Height -->
                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Max Height Cap</label>
                    <select
                      class="admin-field-input text-xs font-medium cursor-pointer"
                      [ngModel]="b.imageSettings?.maxHeight || '384px'"
                      (ngModelChange)="ensureImageSettings(b).maxHeight = $event; onContentChange()"
                    >
                      <option value="240px">240px (Small)</option>
                      <option value="384px">384px (Standard Medium)</option>
                      <option value="500px">500px (Large)</option>
                      <option value="650px">650px (Hero Magazine)</option>
                      <option value="none">Unconstrained (Full Height)</option>
                    </select>
                  </div>

                  <!-- Frame & Corner Radius -->
                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Border Radius</label>
                    <div class="grid grid-cols-4 gap-1.5">
                      @for (r of [{ label: 'Sharp', val: 'none' }, { label: 'Medium', val: 'lg' }, { label: 'Large', val: '2xl' }, { label: 'Pill', val: 'full' }]; track r.val) {
                        <button
                          type="button"
                          class="admin-opt-btn"
                          [class.active]="(b.imageSettings?.borderRadius || '2xl') === r.val"
                          (click)="ensureImageSettings(b).borderRadius = $any(r.val); onContentChange()"
                        >
                          {{ r.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Caption & Alt Text -->
                  <div class="border-t border-slate-100 pt-3 space-y-2">
                    <div>
                      <label class="admin-field-label">Caption Text</label>
                      <input
                        class="admin-field-input text-xs italic"
                        placeholder="Image caption..."
                        [(ngModel)]="b.imageCaption"
                        (ngModelChange)="onContentChange()"
                      />
                    </div>
                    <div>
                      <label class="admin-field-label">Alt Text (Accessibility / SEO)</label>
                      <input
                        class="admin-field-input text-xs"
                        placeholder="Describe image..."
                        [ngModel]="b.imageSettings?.altText || ''"
                        (ngModelChange)="ensureImageSettings(b).altText = $event; onContentChange()"
                      />
                    </div>
                  </div>
                </div>
              }

              <!-- VIDEO BLOCK SETTINGS -->
              @else if (b.type === 'video') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Video File (.mp4)</label>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm w-full text-xs mb-1.5"
                      (click)="openMediaPicker({ blockId: b.id, field: 'video' })"
                    >
                      Choose Video from Media Library
                    </button>
                    <input
                      class="admin-field-input font-mono text-2xs"
                      placeholder="Or paste video URL..."
                      [(ngModel)]="b.videoUrl"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Video Caption</label>
                    <input
                      class="admin-field-input text-xs italic"
                      placeholder="Video caption description..."
                      [(ngModel)]="b.videoCaption"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>
                </div>
              }

              <!-- QUOTE BLOCK SETTINGS -->
              @else if (b.type === 'quote') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Quote Text</label>
                    <textarea
                      class="admin-field-input min-h-20 text-xs italic font-serif"
                      placeholder="Quote..."
                      [(ngModel)]="b.quoteText"
                      (ngModelChange)="onContentChange()"
                    ></textarea>
                  </div>

                  <div>
                    <label class="admin-field-label">Attribution / Author</label>
                    <input
                      class="admin-field-input text-xs font-semibold"
                      placeholder="— Author Name"
                      [(ngModel)]="b.quoteAuthor"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Accent Border Color</label>
                    <div class="flex items-center gap-2 flex-wrap">
                      @for (c of colorPalette; track c.hex) {
                        <button
                          type="button"
                          class="color-swatch-sm"
                          [class.active]="(b.quoteSettings?.accentColor || '#701423') === c.hex"
                          [style.background-color]="c.hex"
                          [title]="c.name"
                          (click)="ensureQuoteSettings(b).accentColor = c.hex; onContentChange()"
                        ></button>
                      }
                    </div>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <ng-container *ngTemplateOutlet="typoControls"></ng-container>
                  </div>
                </div>
              }

              <!-- WINE CARD SETTINGS -->
              @else if (b.type === 'wine_card') {
                <div class="space-y-3.5">
                  <!-- Product Linking -->
                  <div class="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="admin-field-label !text-amber-950">Link to Shop Product</label>
                      @if (b.productId) {
                        <span class="text-3xs font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded">Linked</span>
                      }
                    </div>
                    <select
                      class="admin-field-input text-xs bg-white"
                      [ngModel]="b.productId"
                      (ngModelChange)="linkWineCardProduct(b, $event)"
                    >
                      <option [ngValue]="null">— Custom Wine (No link) —</option>
                      @for (p of availableProducts(); track p.id) {
                        <option [ngValue]="p.id">
                          {{ p.name }} {{ p.vintage ? '(' + p.vintage + ')' : '' }} — €{{ p.price }}
                        </option>
                      }
                    </select>

                    @if (b.productId) {
                      <div class="flex items-center justify-between pt-1 text-2xs text-amber-900">
                        <span>Price: <strong>€{{ b.productPrice }}</strong></span>
                        <button
                          type="button"
                          class="text-rose-600 hover:text-rose-800 text-3xs font-bold"
                          (click)="linkWineCardProduct(b, null)"
                        >
                          Unlink Product
                        </button>
                      </div>
                    }
                  </div>

                  <div>
                    <label class="admin-field-label">Rating Badge</label>
                    <input
                      class="admin-field-input text-xs font-bold"
                      placeholder="e.g. 95 pts Sommelier Selection"
                      [(ngModel)]="b.sommelierRating"
                      (ngModelChange)="onContentChange()"
                    />
                  </div>

                  <div class="border-t border-slate-100 pt-3 space-y-2">
                    <label class="admin-field-label">Wine Specifications</label>
                    <input class="admin-field-input text-xs font-bold font-serif" placeholder="Wine Name" [(ngModel)]="b.wineName" (ngModelChange)="onContentChange()" />
                    <input class="admin-field-input text-xs" placeholder="Vintage (e.g. 2022)" [(ngModel)]="b.vintage" (ngModelChange)="onContentChange()" />
                    <input class="admin-field-input text-xs" placeholder="Producer / Winery" [(ngModel)]="b.winery" (ngModelChange)="onContentChange()" />
                    <input class="admin-field-input text-xs" placeholder="Region (e.g. Santorini PDO)" [(ngModel)]="b.region" (ngModelChange)="onContentChange()" />
                    <input class="admin-field-input text-xs" placeholder="Grape Variety" [(ngModel)]="b.grape" (ngModelChange)="onContentChange()" />
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Bottle Photo</label>
                    <button type="button" class="btn btn-secondary btn-sm w-full text-xs mb-1.5" (click)="openMediaPicker({ blockId: b.id, field: 'image' })">
                      Choose Bottle Photo
                    </button>
                  </div>

                  <div class="border-t border-slate-100 pt-3">
                    <label class="admin-field-label">Tasting Notes</label>
                    <textarea class="admin-field-input min-h-16 text-xs italic" placeholder="Tasting notes..." [(ngModel)]="b.tastingNotes" (ngModelChange)="onContentChange()"></textarea>
                  </div>
                </div>
              }

              <!-- PAIRING BOX SETTINGS -->
              @else if (b.type === 'pairing_box') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Dish Name</label>
                    <input class="admin-field-input text-xs font-bold" placeholder="e.g. Grilled Aegean Seabass" [(ngModel)]="b.dishName" (ngModelChange)="onContentChange()" />
                  </div>
                  <div>
                    <label class="admin-field-label">Matched Wine</label>
                    <input class="admin-field-input text-xs font-semibold" placeholder="e.g. Assyrtiko Wild Ferment" [(ngModel)]="b.matchedWine" (ngModelChange)="onContentChange()" />
                  </div>
                  <div>
                    <label class="admin-field-label">Pairing Explanation</label>
                    <textarea class="admin-field-input min-h-20 text-xs" placeholder="Why this pairing works..." [(ngModel)]="b.pairingNotes" (ngModelChange)="onContentChange()"></textarea>
                  </div>
                </div>
              }

              <!-- EVENT BOX SETTINGS -->
              @else if (b.type === 'event_box') {
                <div class="space-y-3.5">
                  <div>
                    <label class="admin-field-label">Event Title</label>
                    <input class="admin-field-input text-xs font-bold" placeholder="Masterclass Title" [(ngModel)]="b.eventTitle" (ngModelChange)="onContentChange()" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="admin-field-label">Date &amp; Time</label>
                      <input class="admin-field-input text-xs" placeholder="e.g. Oct 24 · 19:30" [(ngModel)]="b.eventDate" (ngModelChange)="onContentChange()" />
                    </div>
                    <div>
                      <label class="admin-field-label">Location</label>
                      <input class="admin-field-input text-xs" placeholder="e.g. Cellar Room" [(ngModel)]="b.eventLocation" (ngModelChange)="onContentChange()" />
                    </div>
                  </div>
                  <div>
                    <label class="admin-field-label">RSVP Link</label>
                    <input class="admin-field-input text-xs font-mono" placeholder="/contact or URL" [(ngModel)]="b.rsvpLink" (ngModelChange)="onContentChange()" />
                  </div>
                </div>
              }

              <!-- DIVIDER SETTINGS -->
              @else if (b.type === 'divider') {
                <div class="space-y-3.5">
                  <label class="admin-field-label">Divider Style</label>
                  <p class="text-2xs text-slate-500">Separates content sections with signature editorial spacing.</p>
                </div>
              }

            }

          </div>
        }

        <!-- =================================================================================== -->
        <!-- MODE B: GLOBAL ARTICLE SETTINGS (SHOWN WHEN NO ELEMENT IS SELECTED)                 -->
        <!-- =================================================================================== -->
        @else {
          
          <!-- 1. COLLAPSIBLE ARTICLE METADATA CARD -->
          <div class="admin-card space-y-3.5">
            <div
              class="flex items-center justify-between pb-2 border-b border-slate-100 cursor-pointer select-none"
              (click)="metadataCollapsed.set(!metadataCollapsed())"
            >
              <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span>Article Metadata</span>
              </span>
              <span class="text-slate-400 text-xs font-bold transition-transform duration-200" [class.rotate-180]="metadataCollapsed()">
                ▼
              </span>
            </div>

            @if (!metadataCollapsed()) {
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
                  (ngModelChange)="onContentChange()"
                />
              </div>

              <!-- Folder Selection -->
              <div class="border-t border-slate-100 pt-3">
                <label class="admin-field-label !mb-1">Article Folder</label>
                <select
                  class="admin-field-input cursor-pointer font-medium text-slate-800"
                  [(ngModel)]="model.folder_id"
                  (ngModelChange)="onContentChange()"
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span>Manage</span>
                  </button>
                </div>

                <div class="flex items-center gap-1.5">
                  <select
                    class="admin-field-input cursor-pointer font-medium text-slate-800 flex-1"
                    [(ngModel)]="model.category"
                    (ngModelChange)="onContentChange()"
                  >
                    <option [ngValue]="null">No Category (General)</option>
                    @for (cat of availableCategories(); track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Custom URL Slug -->
              <div class="border-t border-slate-100 pt-3">
                <label class="admin-field-label">Custom URL Slug</label>
                <input
                  class="admin-field-input font-mono text-2xs"
                  placeholder="auto-generated-from-title"
                  [(ngModel)]="model.slug"
                  (ngModelChange)="onContentChange()"
                />
              </div>

              <!-- Author Attribution -->
              <div class="border-t border-slate-100 pt-3">
                <label class="admin-field-label">Author Name</label>
                <input
                  class="admin-field-input"
                  placeholder="The Winehouse"
                  [(ngModel)]="model.author_name"
                  (ngModelChange)="onContentChange()"
                />
              </div>
            }
          </div>

          <!-- 2. GROUPED BLOCK PALETTE -->
          <div class="admin-card space-y-3.5">
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> <span>Block Palette</span>
              </span>
            </div>

            <!-- Group 1: Layout & Grids -->
            <div class="space-y-1.5">
              <span class="palette-group-title">Layout &amp; Grids</span>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('container', $event)"
                  (click)="addBlock('container')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  <span>Container</span>
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('columns_2', $event)"
                  (click)="addBlock('columns_2')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0"><rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="13" y="3" width="8" height="18" rx="1.5"/></svg>
                  <span>2 Columns</span>
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('columns_3', $event)"
                  (click)="addBlock('columns_3')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0"><rect x="2" y="3" width="5.5" height="18" rx="1"/><rect x="9.25" y="3" width="5.5" height="18" rx="1"/><rect x="16.5" y="3" width="5.5" height="18" rx="1"/></svg>
                  <span>3 Columns</span>
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('divider', $event)"
                  (click)="addBlock('divider')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line></svg> <span>Divider</span>
                </button>
              </div>
            </div>

            <!-- Group 2: Typography & Content -->
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
              <span class="palette-group-title">Typography &amp; Content</span>
              <div class="grid grid-cols-2 gap-1.5">
                @if (!showTitle) {
                  <button
                    type="button"
                    class="admin-block-btn justify-start col-span-2 !bg-amber-50/80 !border-amber-200 text-amber-900 font-semibold text-2xs"
                    (click)="restoreTitle()"
                  >
                    + Add Title
                  </button>
                }
                @if (!showExcerpt) {
                  <button
                    type="button"
                    class="admin-block-btn justify-start col-span-2 !bg-amber-50/80 !border-amber-200 text-amber-900 font-semibold text-2xs"
                    (click)="restoreExcerpt()"
                  >
                    + Add Subtitle
                  </button>
                }
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('heading', $event)"
                  (click)="addBlock('heading')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Heading
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('paragraph', $event)"
                  (click)="addBlock('paragraph')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="shrink-0"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg> Text
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs col-span-2"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('quote', $event)"
                  (click)="addBlock('quote')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Sommelier Quote
                </button>
              </div>
            </div>

            <!-- Group 3: Media & Assets -->
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
              <span class="palette-group-title">Media &amp; Assets</span>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('image', $event)"
                  (click)="addBlock('image')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('video', $event)"
                  (click)="addBlock('video')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Video
                </button>
              </div>
            </div>

            <!-- Group 4: Cellar & Editorial Features -->
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
              <span class="palette-group-title">Cellar &amp; Features</span>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('wine_card', $event)"
                  (click)="addBlock('wine_card')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> Wine Card
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('pairing_box', $event)"
                  (click)="addBlock('pairing_box')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> Pairing
                </button>
                <button
                  type="button"
                  class="admin-block-btn justify-start text-2xs col-span-2"
                  draggable="true"
                  (dragstart)="onPaletteDragStart('event_box', $event)"
                  (click)="addBlock('event_box')"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Event Box
                </button>
              </div>
            </div>
          </div>

          <!-- 3. NESTED DOCUMENT STRUCTURE OUTLINE -->
          <div class="admin-card space-y-2">
            <div class="flex items-center justify-between pb-1 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> <span>Article Outline</span>
              </span>
            </div>

            @if (blocks.length === 0) {
              <p class="text-2xs text-slate-400 py-2 text-center">No blocks yet</p>
            } @else {
              <div class="space-y-1 max-h-72 overflow-y-auto pr-1">
                @for (block of blocks; track block.id; let idx = $index) {
                  <!-- Top Level Outline Item -->
                  <div
                    class="outline-tree-item flex items-center justify-between p-1.5 rounded-lg text-2xs text-slate-700 cursor-pointer"
                    [class.active]="selectedBlockId === block.id"
                    [class.drag-over]="outlineDragOverId === block.id"
                    draggable="true"
                    (dragstart)="onOutlineDragStart(block.id, $event)"
                    (dragover)="onOutlineDragOver(block.id, $event)"
                    (dragleave)="onOutlineDragLeave()"
                    (drop)="onOutlineDrop(block.id, $event)"
                    (click)="selectBlockById(block.id); scrollToBlock(block.id)"
                  >
                    <span class="flex items-center gap-1.5 truncate">
                      <span class="text-slate-400 font-mono text-3xs cursor-grab">⠿</span>
                      <span class="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold text-3xs flex items-center justify-center">{{ getBlockIcon(block.type) }}</span>
                      <span class="truncate font-medium">{{ getBlockOutlineTitle(block) }}</span>
                    </span>
                  </div>

                  <!-- Container Children in Outline -->
                  @if (block.type === 'container' && block.children && block.children.length > 0) {
                    <div class="pl-4 space-y-0.5 border-l border-slate-200 ml-2.5">
                      @for (child of block.children; track child.id) {
                        <div
                          class="outline-tree-item flex items-center justify-between p-1 rounded-md text-3xs text-slate-600 cursor-pointer"
                          [class.active]="selectedBlockId === child.id"
                          (click)="selectBlockById(child.id); scrollToBlock(child.id); $event.stopPropagation()"
                        >
                          <span class="flex items-center gap-1 truncate">
                            <span class="text-slate-400">└─</span>
                            <span class="font-bold">{{ getBlockIcon(child.type) }}</span>
                            <span class="truncate">{{ getBlockOutlineTitle(child) }}</span>
                          </span>
                        </div>
                      }
                    </div>
                  }

                  <!-- Columns Children in Outline -->
                  @if ((block.type === 'columns_2' || block.type === 'columns_3') && block.columns) {
                    <div class="pl-4 space-y-1 border-l border-slate-200 ml-2.5">
                      @for (col of block.columns; track $index; let cIdx = $index) {
                        <div class="text-3xs font-mono font-bold text-slate-400 uppercase pt-0.5">
                          Col {{ cIdx + 1 }}
                        </div>
                        @for (child of col; track child.id) {
                          <div
                            class="outline-tree-item flex items-center justify-between p-1 rounded-md text-3xs text-slate-600 cursor-pointer"
                            [class.active]="selectedBlockId === child.id"
                            (click)="selectBlockById(child.id); scrollToBlock(child.id); $event.stopPropagation()"
                          >
                            <span class="flex items-center gap-1 truncate">
                              <span class="text-slate-400">└─</span>
                              <span class="font-bold">{{ getBlockIcon(child.type) }}</span>
                              <span class="truncate">{{ getBlockOutlineTitle(child) }}</span>
                            </span>
                          </div>
                        }
                      }
                    </div>
                  }

                }
              </div>
            }
          </div>

        }

      </div>

    </div>

    <!-- REUSABLE BLOCK RENDERER TEMPLATE (Supports Recursive Nesting) -->
    <ng-template #renderBlock let-block="block" let-parentList="parentList" let-idx="idx">
      <div
        class="canvas-block-wrapper group/block cursor-pointer transition-all"
        [class.selected]="selectedBlockId === block.id"
        [class.is-being-dragged]="draggedBlockId === block.id"
        [class.drop-before-active]="hoverDropBlockId() === block.id && hoverDropBlockPos() === 'before'"
        [class.drop-after-active]="hoverDropBlockId() === block.id && hoverDropBlockPos() === 'after'"
        [id]="'block-' + block.id"
        (click)="selectBlockById(block.id, $event)"
        draggable="true"
        (dragstart)="onBlockDragStart(block.id, $event)"
        (dragend)="onDragEnd()"
        (dragover)="onBlockHoverDragOver(block.id, $event)"
        (dragleave)="onBlockHoverDragLeave(block.id, $event)"
        (drop)="onBlockHoverDrop(block.id, $event)"
      >

        <!-- Floating Minimal Block Toolbar on Hover -->
        <div class="canvas-block-toolbar" (click)="$event.stopPropagation()">
          <span
            class="admin-drag-handle !w-5 !h-5 !text-xs cursor-grab"
            title="Drag to reorder"
            draggable="true"
            (dragstart)="onBlockDragStart(block.id, $event)"
            (dragend)="onDragEnd()"
          >⠿</span>
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
          <button
            type="button"
            class="preview-tool-btn"
            (click)="duplicateBlockById(block.id, $event)"
            title="Duplicate Block"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button
            type="button"
            class="preview-tool-btn danger"
            (click)="removeBlockById(block.id)"
            title="Delete Block"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>

        <!-- 1. CONTAINER LAYOUT BLOCK -->
        @if (block.type === 'container') {
          <div class="my-2 relative group/container min-w-0 max-w-full">
            <!-- Children blocks inside container -->
            <div [class]="getContainerClasses(block)">
              @for (child of block.children || []; track child.id; let cIdx = $index) {
                <ng-container *ngTemplateOutlet="renderBlock; context: { block: child, parentList: block.children, idx: cIdx }"></ng-container>
              }
              @if ((!block.children || block.children.length === 0) && !isDraggingActive()) {
                <div class="layout-empty-drop-area cursor-pointer" (click)="toggleSlotInsert(block.id, 'container', $event)">
                  <span>Container (Empty) · Click to insert or drag blocks here</span>
                </div>
              }
            </div>

            <!-- Dynamic slot dropzone: only visible during dragging or when popover is open -->
            @if (isDraggingActive() || activeSlotPopoverKey === block.id + '_container') {
              <div
                class="layout-slot-box mt-1.5"
                (dragover)="onSlotDragOver($event, block.id, 'container')"
                (dragleave)="onSlotDragLeave()"
                (drop)="onSlotDrop($event, block.id, 'container')"
                (click)="toggleSlotInsert(block.id, 'container', $event)"
              >
                <span>＋ Drop into Container</span>
              </div>
            }

            @if (activeSlotPopoverKey === block.id + '_container') {
              <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: block.id, insertPos: 'container_child' }"></ng-container>
              </div>
            }
          </div>
        }

        <!-- 2. 2-COLUMNS LAYOUT BLOCK -->
        @else if (block.type === 'columns_2') {
          <div class="my-2 relative group/columns min-w-0 max-w-full">
            <div [class]="getColumns2Classes(block)">
              <!-- Column 1 Slot -->
              <div class="space-y-2 min-w-0 max-w-full overflow-hidden">
                @for (c1 of block.columns?.[0] || []; track c1.id; let c1Idx = $index) {
                  <ng-container *ngTemplateOutlet="renderBlock; context: { block: c1, parentList: block.columns![0], idx: c1Idx }"></ng-container>
                }
                @if ((!block.columns?.[0] || block.columns![0].length === 0) && !isDraggingActive()) {
                  <div class="layout-empty-drop-area cursor-pointer" (click)="toggleSlotInsert(block.id, 'col_0', $event)">
                    <span>Col 1 (Empty)</span>
                  </div>
                }
                @if (isDraggingActive() || activeSlotPopoverKey === block.id + '_col_0') {
                  <div
                    class="layout-slot-box"
                    (dragover)="onSlotDragOver($event, block.id, 'col_0')"
                    (dragleave)="onSlotDragLeave()"
                    (drop)="onSlotDrop($event, block.id, 'col_0')"
                    (click)="toggleSlotInsert(block.id, 'col_0', $event)"
                  >
                    <span>＋ Drop into Col 1</span>
                  </div>
                }
                @if (activeSlotPopoverKey === block.id + '_col_0') {
                  <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                    <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: block.id, insertPos: 'col_0_child' }"></ng-container>
                  </div>
                }
              </div>

              <!-- Column 2 Slot -->
              <div class="space-y-2 min-w-0 max-w-full overflow-hidden">
                @for (c2 of block.columns?.[1] || []; track c2.id; let c2Idx = $index) {
                  <ng-container *ngTemplateOutlet="renderBlock; context: { block: c2, parentList: block.columns![1], idx: c2Idx }"></ng-container>
                }
                @if ((!block.columns?.[1] || block.columns![1].length === 0) && !isDraggingActive()) {
                  <div class="layout-empty-drop-area cursor-pointer" (click)="toggleSlotInsert(block.id, 'col_1', $event)">
                    <span>Col 2 (Empty)</span>
                  </div>
                }
                @if (isDraggingActive() || activeSlotPopoverKey === block.id + '_col_1') {
                  <div
                    class="layout-slot-box"
                    (dragover)="onSlotDragOver($event, block.id, 'col_1')"
                    (dragleave)="onSlotDragLeave()"
                    (drop)="onSlotDrop($event, block.id, 'col_1')"
                    (click)="toggleSlotInsert(block.id, 'col_1', $event)"
                  >
                    <span>＋ Drop into Col 2</span>
                  </div>
                }
                @if (activeSlotPopoverKey === block.id + '_col_1') {
                  <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                    <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: block.id, insertPos: 'col_1_child' }"></ng-container>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- 3. 3-COLUMNS LAYOUT BLOCK -->
        @else if (block.type === 'columns_3') {
          <div class="my-2 relative group/columns min-w-0 max-w-full">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start min-w-0 max-w-full">
              @for (colList of block.columns || []; track $index; let colIdx = $index) {
                <div class="space-y-2 min-w-0 max-w-full overflow-hidden">
                  @for (cItem of colList; track cItem.id; let cItemIdx = $index) {
                    <ng-container *ngTemplateOutlet="renderBlock; context: { block: cItem, parentList: colList, idx: cItemIdx }"></ng-container>
                  }
                  @if ((!colList || colList.length === 0) && !isDraggingActive()) {
                    <div class="layout-empty-drop-area cursor-pointer" (click)="toggleSlotInsert(block.id, 'col_' + colIdx, $event)">
                      <span>Col {{ colIdx + 1 }} (Empty)</span>
                    </div>
                  }
                  @if (isDraggingActive() || activeSlotPopoverKey === block.id + '_col_' + colIdx) {
                    <div
                      class="layout-slot-box"
                      (dragover)="onSlotDragOver($event, block.id, 'col_' + colIdx)"
                      (dragleave)="onSlotDragLeave()"
                      (drop)="onSlotDrop($event, block.id, 'col_' + colIdx)"
                      (click)="toggleSlotInsert(block.id, 'col_' + colIdx, $event)"
                    >
                      <span>＋ Drop into Col {{ colIdx + 1 }}</span>
                    </div>
                  }
                  @if (activeSlotPopoverKey === block.id + '_col_' + colIdx) {
                    <div class="canvas-insert-popover" (click)="$event.stopPropagation()">
                      <ng-container *ngTemplateOutlet="paletteItems; context: { targetId: block.id, insertPos: 'col_' + colIdx + '_child' }"></ng-container>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- 4. HEADING BLOCK -->
        @else if (block.type === 'heading') {
          <div class="relative group/input">
            @if (block.headingLevel === 'h3') {
              <input
                class="w-full font-bold text-xl text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                placeholder="Subheading..."
                [(ngModel)]="block.headingText"
                [ngStyle]="getTypographyStyle(block.typography)"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
            } @else {
              <input
                class="w-full font-serif font-bold text-2xl text-slate-900 pb-1 border-b border-slate-100 bg-transparent outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                placeholder="Section Heading..."
                [(ngModel)]="block.headingText"
                [ngStyle]="getTypographyStyle(block.typography)"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
            }
          </div>
        }

        <!-- 5. PARAGRAPH BLOCK -->
        @else if (block.type === 'paragraph') {
          <div class="relative group/input">
            <textarea
              class="w-full font-sans text-slate-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300 resize-none min-h-20 text-sm sm:text-base"
              placeholder="Write your story narrative here..."
              [(ngModel)]="block.paragraphText"
              [ngStyle]="getTypographyStyle(block.typography)"
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            ></textarea>
          </div>
        }

        <!-- 6. IMAGE BLOCK -->
        @else if (block.type === 'image') {
          <figure class="my-2 space-y-2">
            <div
              [class]="getImageContainerClass(block)"
              (click)="selectBlockById(block.id, $event)"
            >
              @if (block.imageUrl) {
                <img
                  [src]="mediaUrl(block.imageUrl)"
                  [alt]="block.imageCaption || ''"
                  class="w-full"
                  [ngStyle]="getImageStyle(block)"
                />
              } @else {
                <div
                  class="h-44 flex flex-col items-center justify-center text-slate-400 text-xs cursor-pointer"
                  (click)="openMediaPicker({ blockId: block.id, field: 'image' })"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="mb-1 text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span class="font-semibold text-slate-600">Select or Upload Image</span>
                </div>
              }
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                <span class="bg-black/70 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 cursor-pointer" (click)="openMediaPicker({ blockId: block.id, field: 'image' })"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Change Image</span>
              </div>
            </div>
            <input
              class="w-full text-center text-xs text-slate-400 italic bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
              placeholder="Add caption description (optional)..."
              [(ngModel)]="block.imageCaption"
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            />
          </figure>
        }

        <!-- 7. VIDEO BLOCK -->
        @else if (block.type === 'video') {
          <figure class="my-2 space-y-2">
            <div
              class="relative group/vid rounded-xl overflow-hidden border border-slate-900 bg-slate-950 cursor-pointer max-h-96"
            >
              @if (block.videoUrl) {
                <video [src]="mediaUrl(block.videoUrl)" controls class="w-full max-h-96" preload="metadata"></video>
              } @else {
                <div
                  class="h-44 flex flex-col items-center justify-center text-slate-400 text-xs"
                  (click)="openMediaPicker({ blockId: block.id, field: 'video' })"
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
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            />
          </figure>
        }

        <!-- 8. QUOTE BLOCK -->
        @else if (block.type === 'quote') {
          <div
            class="relative group/input my-2 p-5 rounded-2xl bg-slate-50 border-l-4 space-y-2"
            [style.border-left-color]="block.quoteSettings?.accentColor || '#701423'"
          >
            <textarea
              class="w-full font-serif italic text-slate-800 text-base sm:text-lg bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-14"
              placeholder="Quote or reflection from the winemaker..."
              [(ngModel)]="block.quoteText"
              [ngStyle]="getTypographyStyle(block.typography)"
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            ></textarea>
            <input
              class="w-full text-xs font-semibold text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
              placeholder="— Author / Attribution (e.g. Elena Vassiliou)"
              [(ngModel)]="block.quoteAuthor"
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            />
          </div>
        }

        <!-- 9. WINE CARD BLOCK -->
        @else if (block.type === 'wine_card') {
          <div class="my-3 p-5 sm:p-6 rounded-2xl bg-[#faf7f2] border border-[#e8ded0] space-y-3.5 shadow-2xs">
            <div class="flex items-center justify-between border-b border-[#e8ded0]/80 pb-2">
              <div class="flex items-center gap-2">
                <span class="text-2xs font-bold uppercase tracking-wider text-[#701423] flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8M12 11v11M17 3H7c0 4.5 3 8 5 8s5-3.5 5-8z"/></svg> <span>Wine Tasting Highlight</span></span>
                @if (block.productId) {
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-semibold">
                    🛍 Linked in Shop
                  </span>
                }
              </div>
              <input
                class="text-2xs font-bold px-2.5 py-0.5 bg-[#701423]/10 text-[#701423] rounded-full border-none outline-none text-right w-44 font-mono"
                placeholder="Rating Badge / 95 pts..."
                [(ngModel)]="block.sommelierRating"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div class="sm:col-span-3">
                <div
                  class="relative group/wineimg rounded-xl overflow-hidden border border-[#e8ded0] bg-white aspect-square flex items-center justify-center cursor-pointer shadow-xs"
                  (click)="openMediaPicker({ blockId: block.id, field: 'image' })"
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

              <div class="sm:col-span-9 space-y-2">
                <div class="flex items-baseline gap-2">
                  <input
                    class="font-serif font-bold text-xl text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400"
                    placeholder="Wine Name (e.g. Kavalieros)"
                    [(ngModel)]="block.wineName"
                    (focus)="selectBlockById(block.id)"
                    (ngModelChange)="onContentChange()"
                  />
                  <input
                    class="text-xs text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-24 text-right placeholder:text-slate-400 font-mono"
                    placeholder="Vintage (e.g. 2022)"
                    [(ngModel)]="block.vintage"
                    (focus)="selectBlockById(block.id)"
                    (ngModelChange)="onContentChange()"
                  />
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <input
                    class="bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400 text-xs"
                    placeholder="Producer / Estate (e.g. Domaine Sigalas)"
                    [(ngModel)]="block.winery"
                    (focus)="selectBlockById(block.id)"
                    (ngModelChange)="onContentChange()"
                  />
                  <span>·</span>
                  <input
                    class="bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-slate-400 text-xs"
                    placeholder="Region (e.g. Santorini PDO)"
                    [(ngModel)]="block.region"
                    (focus)="selectBlockById(block.id)"
                    (ngModelChange)="onContentChange()"
                  />
                </div>
                <input
                  class="bg-transparent border-none outline-none focus:ring-0 p-0 w-full text-2xs text-slate-500 placeholder:text-slate-400 pt-0.5 font-mono"
                  placeholder="Grape Variety (e.g. 100% Assyrtiko)"
                  [(ngModel)]="block.grape"
                  (focus)="selectBlockById(block.id)"
                  (ngModelChange)="onContentChange()"
                />
              </div>
            </div>

            <div class="relative group/input border-t border-[#e8ded0] pt-2.5">
              <textarea
                class="w-full text-xs text-slate-700 italic bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-12"
                placeholder="Tasting Notes (Nose, Palate, Texture, Finish)..."
                [(ngModel)]="block.tastingNotes"
                [ngStyle]="getTypographyStyle(block.typography)"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              ></textarea>
            </div>

            @if (block.productId) {
              <div class="border-t border-[#e8ded0] pt-2.5 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 font-serif">Price: €{{ block.productPrice }}</span>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#701423] text-white text-xs font-semibold">
                  <span>View Wine in Shop</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </div>
            }
          </div>
        }

        <!-- 10. PAIRING BOX BLOCK -->
        @else if (block.type === 'pairing_box') {
          <div class="my-2 p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <span class="text-2xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> <span>Pairing Suggestion</span></span>
            <div class="space-y-1">
              <input
                class="w-full font-bold text-sm text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                placeholder="Dish Name (e.g. Grilled Octopus with Santorini Fava)"
                [(ngModel)]="block.dishName"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
              <input
                class="w-full text-xs font-medium text-amber-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                placeholder="Matched Wine (e.g. Oaked Assyrtiko 2021)"
                [(ngModel)]="block.matchedWine"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
            </div>
            <div class="relative group/input">
              <textarea
                class="w-full text-xs text-slate-600 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400 resize-none min-h-12"
                placeholder="Why this pairing works..."
                [(ngModel)]="block.pairingNotes"
                [ngStyle]="getTypographyStyle(block.typography)"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              ></textarea>
            </div>
          </div>
        }

        <!-- 11. EVENT BOX BLOCK -->
        @else if (block.type === 'event_box') {
          <div class="my-2 p-5 rounded-2xl bg-slate-900 text-white space-y-2 shadow-sm">
            <span class="text-2xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> <span>Cellar Experience</span></span>
            <input
              class="w-full font-bold text-sm text-white bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
              placeholder="Event Title..."
              [(ngModel)]="block.eventTitle"
              (focus)="selectBlockById(block.id)"
              (ngModelChange)="onContentChange()"
            />
            <div class="grid grid-cols-2 gap-2 text-xs">
              <input
                class="text-slate-300 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
                placeholder="Date & Time (e.g. Oct 24 · 19:30)"
                [(ngModel)]="block.eventDate"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
              <input
                class="text-slate-300 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-500"
                placeholder="Location (e.g. Cellar Room)"
                [(ngModel)]="block.eventLocation"
                (focus)="selectBlockById(block.id)"
                (ngModelChange)="onContentChange()"
              />
            </div>
          </div>
        }

        <!-- 12. DIVIDER BLOCK -->
        @else if (block.type === 'divider') {
          <div class="py-4 text-center text-slate-300 text-xs select-none">
            ──────────
          </div>
        }

      </div>
    </ng-template>

    <!-- PALETTE ITEMS FOR POPOVERS -->
    <ng-template #paletteItems let-targetId="targetId" let-insertPos="insertPos">
      <div class="p-1 space-y-2 max-w-xs">
        <div class="flex items-center justify-between pb-1 border-b border-slate-100">
          <span class="font-bold text-slate-900 text-2xs uppercase tracking-wider">Choose Block</span>
          <button type="button" class="text-slate-400 hover:text-slate-700 text-xs font-bold" (click)="closeAllPopovers()">✕</button>
        </div>

        <div class="space-y-1.5">
          <span class="palette-group-title">Layout</span>
          <div class="grid grid-cols-2 gap-1">
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'container')">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <span>Container</span>
            </button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'columns_2')">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="13" y="3" width="8" height="18" rx="1.5"/></svg>
              <span>2 Columns</span>
            </button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'columns_3')">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="2" y="3" width="5.5" height="18" rx="1"/><rect x="9.25" y="3" width="5.5" height="18" rx="1"/><rect x="16.5" y="3" width="5.5" height="18" rx="1"/></svg>
              <span>3 Columns</span>
            </button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'divider')">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Divider</span>
            </button>
          </div>
        </div>

        <div class="space-y-1.5 pt-1 border-t border-slate-100">
          <span class="palette-group-title">Content &amp; Media</span>
          <div class="grid grid-cols-2 gap-1">
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'heading')">H Heading</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'paragraph')">¶ Text</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'image')">🖼 Image</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'video')">▶ Video</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'quote')">“ Quote</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'wine_card')">🍷 Wine Card</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'pairing_box')">🍽 Pairing</button>
            <button type="button" class="admin-block-btn text-3xs !p-1.5 justify-start" (click)="executeInsert(targetId, insertPos, 'event_box')">🎟 Event</button>
          </div>
        </div>
      </div>
    </ng-template>

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

    <!-- Reusable Typography Studio Template in Right Sidebar -->
    <ng-template #typoControls>
      <div class="space-y-3.5">
        <div class="flex items-center justify-between pb-1 border-b border-slate-100">
          <span class="font-bold text-slate-900 flex items-center gap-1.5 text-2xs uppercase tracking-wider">
            <span class="font-serif font-bold text-sm">T</span> Typography Studio
          </span>
          <button
            type="button"
            class="text-3xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
            (click)="resetActiveTypo()"
          >
            Reset
          </button>
        </div>

        <!-- Font Family Select -->
        <div>
          <label class="admin-field-label">Font Family</label>
          <select
            class="admin-field-input !py-1 text-xs cursor-pointer font-medium text-slate-800"
            [ngModel]="activeTypo.fontFamily || ''"
            (ngModelChange)="updateActiveTypoField('fontFamily', $event)"
          >
            @for (f of fontFamilies; track f.value) {
              <option [value]="f.value">{{ f.name }}</option>
            }
          </select>
        </div>

        <!-- Size & Weight -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="admin-field-label">Size</label>
            <select
              class="admin-field-input !py-1 text-xs cursor-pointer"
              [ngModel]="activeTypo.fontSize || ''"
              (ngModelChange)="updateActiveTypoField('fontSize', $event)"
            >
              <option value="">Default Size</option>
              <option value="0.75rem">12px (Small)</option>
              <option value="0.875rem">14px (Compact)</option>
              <option value="1rem">16px (Body)</option>
              <option value="1.125rem">18px (Medium)</option>
              <option value="1.25rem">20px (Lead)</option>
              <option value="1.5rem">24px (Subhead)</option>
              <option value="2rem">32px (Section Title)</option>
              <option value="2.5rem">40px (Hero Title)</option>
            </select>
          </div>

          <div>
            <label class="admin-field-label">Weight</label>
            <select
              class="admin-field-input !py-1 text-xs cursor-pointer"
              [ngModel]="activeTypo.fontWeight || ''"
              (ngModelChange)="updateActiveTypoField('fontWeight', $event)"
            >
              <option value="">Default Weight</option>
              <option value="300">300 Light</option>
              <option value="400">400 Regular</option>
              <option value="500">500 Medium</option>
              <option value="600">600 SemiBold</option>
              <option value="700">700 Bold</option>
              <option value="800">800 ExtraBold</option>
            </select>
          </div>
        </div>

        <!-- Text Colors -->
        <div>
          <label class="admin-field-label">Text Color</label>
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

        <!-- Text Alignment -->
        <div>
          <label class="admin-field-label">Alignment</label>
          <div class="grid grid-cols-4 gap-1">
            @for (align of [{ label: 'Left', val: 'left', icon: '⇤' }, { label: 'Center', val: 'center', icon: '↔' }, { label: 'Right', val: 'right', icon: '⇥' }, { label: 'Justify', val: 'justify', icon: '⇿' }]; track align.val) {
              <button
                type="button"
                class="admin-opt-btn"
                [class.active]="(activeTypo.textAlign || 'left') === align.val"
                (click)="updateActiveTypoField('textAlign', align.val)"
              >
                {{ align.icon }}
              </button>
            }
          </div>
        </div>

        <!-- Quick Style & Transform Pills -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="admin-opt-btn !w-7 !h-7 !p-0 font-bold"
              [class.active]="activeTypo.fontWeight === '700'"
              (click)="toggleBold()"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              class="admin-opt-btn !w-7 !h-7 !p-0 italic font-serif"
              [class.active]="activeTypo.fontStyle === 'italic'"
              (click)="toggleItalic()"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              class="admin-opt-btn !w-7 !h-7 !p-0 font-bold"
              [class.active]="activeTypo.textTransform === 'uppercase'"
              (click)="toggleUppercase()"
              title="Uppercase"
            >
              AA
            </button>
          </div>

          <div class="flex items-center gap-1">
            <select
              class="admin-field-input !py-1 !px-1.5 text-3xs cursor-pointer"
              [ngModel]="activeTypo.lineHeight || ''"
              (ngModelChange)="updateActiveTypoField('lineHeight', $event)"
              title="Line Height (Leading)"
            >
              <option value="">Leading: Default</option>
              <option value="1.15">1.15 Tight</option>
              <option value="1.5">1.5 Normal</option>
              <option value="1.75">1.75 Relaxed</option>
              <option value="2.0">2.0 Loose</option>
            </select>
          </div>
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

          <div class="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
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
                    (click)="categoryToDelete = null"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-2xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer"
                    [disabled]="deletingCategory"
                    (click)="executeDeleteCategory()"
                  >
                    {{ deletingCategory ? 'Deleting...' : 'Confirm Delete' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(document:dragend)': 'onDragEnd()',
  },
})
export class AdminPostEdit implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  busy = signal(false);
  saved = signal(false);
  error = signal('');
  hasChanges = false;

  // --- Undo / Redo History ---
  private undoStack: Array<{
    blocks: EditorBlock[];
    model: Partial<Post>;
    showTitle: boolean;
    showExcerpt: boolean;
    selectedTarget: 'post' | 'title' | 'excerpt' | { blockId: string };
  }> = [];
  private redoStack: Array<{
    blocks: EditorBlock[];
    model: Partial<Post>;
    showTitle: boolean;
    showExcerpt: boolean;
    selectedTarget: 'post' | 'title' | 'excerpt' | { blockId: string };
  }> = [];
  private isApplyingHistory = false;
  private historyDebounceTimer: any = null;

  readonly undoCount = signal(0);
  readonly redoCount = signal(0);
  readonly canUndo = computed(() => this.undoCount() > 0);
  readonly canRedo = computed(() => this.redoCount() > 0);

  recordSnapshot() {
    if (this.isApplyingHistory) return;
    try {
      const snap = {
        blocks: JSON.parse(JSON.stringify(this.blocks)),
        model: JSON.parse(JSON.stringify(this.model)),
        showTitle: this.showTitle,
        showExcerpt: this.showExcerpt,
        selectedTarget: typeof this.selectedTarget === 'object' ? { ...this.selectedTarget } : this.selectedTarget,
      };
      if (this.undoStack.length > 0) {
        const last = this.undoStack[this.undoStack.length - 1];
        if (
          JSON.stringify(last.blocks) === JSON.stringify(snap.blocks) &&
          JSON.stringify(last.model) === JSON.stringify(snap.model) &&
          last.showTitle === snap.showTitle &&
          last.showExcerpt === snap.showExcerpt
        ) {
          return;
        }
      }
      this.undoStack.push(snap);
      if (this.undoStack.length > 60) {
        this.undoStack.shift();
      }
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
      const currentSnap = {
        blocks: JSON.parse(JSON.stringify(this.blocks)),
        model: JSON.parse(JSON.stringify(this.model)),
        showTitle: this.showTitle,
        showExcerpt: this.showExcerpt,
        selectedTarget: typeof this.selectedTarget === 'object' ? { ...this.selectedTarget } : this.selectedTarget,
      };

      let prevSnap = this.undoStack.pop()!;
      if (
        this.undoStack.length > 0 &&
        JSON.stringify(prevSnap.blocks) === JSON.stringify(currentSnap.blocks) &&
        JSON.stringify(prevSnap.model) === JSON.stringify(currentSnap.model) &&
        prevSnap.showTitle === currentSnap.showTitle &&
        prevSnap.showExcerpt === currentSnap.showExcerpt
      ) {
        prevSnap = this.undoStack.pop()!;
      }

      this.redoStack.push(currentSnap);

      this.blocks = JSON.parse(JSON.stringify(prevSnap.blocks));
      this.model = JSON.parse(JSON.stringify(prevSnap.model));
      this.showTitle = prevSnap.showTitle;
      this.showExcerpt = prevSnap.showExcerpt;
      this.selectedTarget = prevSnap.selectedTarget;

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
      const currentSnap = {
        blocks: JSON.parse(JSON.stringify(this.blocks)),
        model: JSON.parse(JSON.stringify(this.model)),
        showTitle: this.showTitle,
        showExcerpt: this.showExcerpt,
        selectedTarget: typeof this.selectedTarget === 'object' ? { ...this.selectedTarget } : this.selectedTarget,
      };

      let nextSnap = this.redoStack.pop()!;
      if (
        this.redoStack.length > 0 &&
        JSON.stringify(nextSnap.blocks) === JSON.stringify(currentSnap.blocks) &&
        JSON.stringify(nextSnap.model) === JSON.stringify(currentSnap.model) &&
        nextSnap.showTitle === currentSnap.showTitle &&
        nextSnap.showExcerpt === currentSnap.showExcerpt
      ) {
        nextSnap = this.redoStack.pop()!;
      }

      this.undoStack.push(currentSnap);

      this.blocks = JSON.parse(JSON.stringify(nextSnap.blocks));
      this.model = JSON.parse(JSON.stringify(nextSnap.model));
      this.showTitle = nextSnap.showTitle;
      this.showExcerpt = nextSnap.showExcerpt;
      this.selectedTarget = nextSnap.selectedTarget;

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

    // Ctrl+S / Cmd+S -> Save
    if (key === 's') {
      e.preventDefault();
      this.publishOrSave();
      return;
    }

    // Ctrl+Z / Cmd+Z (or with Shift)
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }

    // Ctrl+Y / Cmd+Y -> Redo
    if (key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
  }

  onCtrlS(event: Event) {
    event.preventDefault();
    this.publishOrSave();
  }

  // Collapsible Metadata Card Toggle
  metadataCollapsed = signal(false);

  // Contextual Selection Target: 'post' | 'title' | 'excerpt' | { blockId: string }
  selectedTarget: 'post' | 'title' | 'excerpt' | { blockId: string } = 'post';

  get selectedBlockId(): string | null {
    if (typeof this.selectedTarget === 'object' && this.selectedTarget !== null && 'blockId' in this.selectedTarget) {
      return this.selectedTarget.blockId;
    }
    return null;
  }

  // Media picker modal state
  mediaPickerOpen = signal(false);
  mediaTarget: 'cover' | { blockId: string; field: 'image' | 'video' } | null = null;
  mediaAssets = signal<Asset[]>([]);
  mediaFilter = signal<'all' | 'images' | 'videos'>('all');
  mediaSearchQuery = '';
  modalUploading = signal(false);

  // Drag-and-drop state
  readonly isDraggingActive = signal(false);
  draggedPaletteType: EditorBlockType | null = null;
  draggedBlockId: string | null = null;
  dragOverId: string | null = null;
  dragOverSlot: 'before' | 'append' | 'slot' | null = null;
  readonly hoverDropBlockId = signal<string | null>(null);
  readonly hoverDropBlockPos = signal<'before' | 'after' | null>(null);
  outlineDragOverId: string | null = null;

  // Popover state
  activeInsertPopoverId: string | null = null;
  activeSlotPopoverKey: string | null = null;

  fontFamilies = [
    { name: 'Default (Theme Font)', value: '' },
    { name: 'Fraunces (Editorial Display)', value: "'Fraunces', Georgia, serif" },
    { name: 'Cormorant Garamond (Classic Serif)', value: "'Cormorant Garamond', Georgia, serif" },
    { name: 'Inter (Modern Sans)', value: "'Inter', sans-serif" },
    { name: 'Space Mono (Technical Mono)', value: "'Space Mono', monospace" },
    { name: 'Cinzel (Atelier Roman)', value: "'Cinzel', Georgia, serif" },
    { name: 'Syne (Contemporary Geometric)', value: "'Syne', sans-serif" },
    { name: 'Anton (Condensed Poster)', value: "'Anton', sans-serif" },
  ];

  colorPalette = [
    { name: 'Charcoal Ink', hex: '#0f172a' },
    { name: 'Bordeaux Crimson', hex: '#701423' },
    { name: 'Sommelier Gold', hex: '#c9a227' },
    { name: 'Vine Green', hex: '#52643b' },
    { name: 'Terracotta', hex: '#c84b31' },
    { name: 'Warm Stone', hex: '#78716c' },
    { name: 'Slate Gray', hex: '#64748b' },
    { name: 'Amber Gold', hex: '#d97706' },
  ];

  model: Partial<Post> = {
    title: '',
    slug: '',
    post_type: 'story',
    category: 'Cellar Stories',
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

  showTitle = true;
  showExcerpt = true;

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  // --- Recursive Block Lookup & Manipulation ---
  findBlockById(id: string, list: EditorBlock[] = this.blocks): EditorBlock | null {
    for (const b of list) {
      if (b.id === id) return b;
      if (b.children?.length) {
        const found = this.findBlockById(id, b.children);
        if (found) return found;
      }
      if (b.columns?.length) {
        for (const col of b.columns) {
          const found = this.findBlockById(id, col);
          if (found) return found;
        }
      }
    }
    return null;
  }

  findBlockParentAndIndex(id: string, list: EditorBlock[] = this.blocks): { parentArray: EditorBlock[]; index: number } | null {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        return { parentArray: list, index: i };
      }
      if (list[i].children?.length) {
        const res = this.findBlockParentAndIndex(id, list[i].children!);
        if (res) return res;
      }
      if (list[i].columns?.length) {
        for (const col of list[i].columns!) {
          const res = this.findBlockParentAndIndex(id, col);
          if (res) return res;
        }
      }
    }
    return null;
  }

  get currentSelectedBlock(): EditorBlock | null {
    const id = this.selectedBlockId;
    return id ? this.findBlockById(id) : null;
  }

  // Selection state helpers
  selectTarget(target: 'post' | 'title' | 'excerpt' | { blockId: string }, event?: Event) {
    if (event) event.stopPropagation();
    this.recordSnapshot();
    this.selectedTarget = target;
    this.closeAllPopovers();
  }

  selectBlockById(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.recordSnapshot();
    this.selectedTarget = { blockId: id };
    this.closeAllPopovers();
  }

  deselectTarget(event?: Event) {
    if (event) event.stopPropagation();
    this.selectedTarget = 'post';
    this.closeAllPopovers();
  }

  isTitleSelected(): boolean {
    return this.selectedTarget === 'title';
  }

  isExcerptSelected(): boolean {
    return this.selectedTarget === 'excerpt';
  }

  removeTitle() {
    this.recordSnapshot();
    this.showTitle = false;
    this.model.title = '';
    this.hasChanges = true;
    this.deselectTarget();
  }

  restoreTitle() {
    this.recordSnapshot();
    this.showTitle = true;
    this.hasChanges = true;
    this.selectTarget('title');
  }

  removeExcerpt() {
    this.recordSnapshot();
    this.showExcerpt = false;
    this.model.excerpt = '';
    this.hasChanges = true;
    this.deselectTarget();
  }

  restoreExcerpt() {
    this.recordSnapshot();
    this.showExcerpt = true;
    this.hasChanges = true;
    this.selectTarget('excerpt');
  }

  removeBlockById(id: string) {
    this.recordSnapshot();
    const loc = this.findBlockParentAndIndex(id);
    if (loc) {
      loc.parentArray.splice(loc.index, 1);
      this.deselectTarget();
      this.hasChanges = true;
    }
  }

  duplicateBlockById(id: string, event?: Event) {
    if (event) event.stopPropagation();
    const loc = this.findBlockParentAndIndex(id);
    if (!loc) return;
    this.recordSnapshot();
    const orig = loc.parentArray[loc.index];
    const copy: EditorBlock = JSON.parse(JSON.stringify(orig));
    copy.id = this.genId();
    this.reassignIds(copy);
    loc.parentArray.splice(loc.index + 1, 0, copy);
    this.selectBlockById(copy.id);
    this.hasChanges = true;
  }

  private reassignIds(b: EditorBlock) {
    b.id = this.genId();
    if (b.children?.length) {
      b.children.forEach((c) => this.reassignIds(c));
    }
    if (b.columns?.length) {
      b.columns.forEach((col) => col.forEach((c) => this.reassignIds(c)));
    }
  }

  getSelectedBadgeLabel(): string {
    if (this.selectedTarget === 'title') return 'Article Title';
    if (this.selectedTarget === 'excerpt') return 'Subtitle / Teaser';
    const b = this.currentSelectedBlock;
    if (!b) return 'Element';
    switch (b.type) {
      case 'container': return 'Container';
      case 'columns_2': return '2 Columns';
      case 'columns_3': return '3 Columns';
      case 'heading': return `Heading (${(b.headingLevel || 'H2').toUpperCase()})`;
      case 'paragraph': return 'Paragraph Text';
      case 'image': return 'Image';
      case 'video': return 'Video';
      case 'quote': return 'Sommelier Quote';
      case 'wine_card': return 'Wine Card';
      case 'pairing_box': return 'Pairing Box';
      case 'event_box': return 'Event Box';
      case 'divider': return 'Divider';
    }
  }

  // Settings initializers
  ensureImageSettings(block: EditorBlock): BlockImageSettings {
    if (!block.imageSettings) {
      block.imageSettings = {
        objectFit: 'cover',
        aspectRatio: 'auto',
        maxWidth: 'full',
        maxHeight: '384px',
        borderRadius: '2xl',
        shadow: 'none',
        borderStyle: 'subtle',
      };
    }
    return block.imageSettings;
  }

  ensureQuoteSettings(block: EditorBlock): BlockQuoteSettings {
    if (!block.quoteSettings) {
      block.quoteSettings = { accentColor: '#701423', bgStyle: 'slate' };
    }
    return block.quoteSettings;
  }

  ensureContainerSettings(block: EditorBlock): BlockContainerSettings {
    if (!block.containerSettings) {
      block.containerSettings = { padding: 'standard' };
    }
    return block.containerSettings;
  }

  ensureColumnsSettings(block: EditorBlock): BlockColumnsSettings {
    if (!block.columnsSettings) {
      block.columnsSettings = { ratio: '50-50', gap: 'standard', alignItems: 'start' };
    }
    return block.columnsSettings;
  }

  // Layout helper classes
  getContainerClasses(block: EditorBlock): string {
    const s = block.containerSettings || {};
    const classes = ['w-full min-w-0 max-w-full'];
    if (s.padding === 'compact') classes.push('space-y-2');
    else if (s.padding === 'spacious') classes.push('space-y-6');
    else classes.push('space-y-4');
    return classes.join(' ');
  }

  getColumns2Classes(block: EditorBlock): string {
    const ratio = block.columnsSettings?.ratio || '50-50';
    if (ratio === '60-40') return 'grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start min-w-0 max-w-full [&>*:first-child]:md:col-span-7 [&>*:last-child]:md:col-span-5';
    if (ratio === '40-60') return 'grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start min-w-0 max-w-full [&>*:first-child]:md:col-span-5 [&>*:last-child]:md:col-span-7';
    return 'grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start min-w-0 max-w-full';
  }

  getImageContainerClass(block: EditorBlock): string {
    const s = block.imageSettings || {};
    const classes = ['relative', 'group/img', 'overflow-hidden'];

    if (s.borderRadius === 'none') classes.push('rounded-none');
    else if (s.borderRadius === 'sm') classes.push('rounded-md');
    else if (s.borderRadius === 'md') classes.push('rounded-lg');
    else if (s.borderRadius === '2xl') classes.push('rounded-2xl');
    else if (s.borderRadius === 'full') classes.push('rounded-full');
    else classes.push('rounded-xl');

    if (s.borderStyle === 'sand') classes.push('border border-[#e8ded0]');
    else if (s.borderStyle === 'crimson') classes.push('border-2 border-[#701423]');
    else if (s.borderStyle === 'none') classes.push('border-0');
    else classes.push('border border-slate-200/80');

    if (s.shadow === 'xs') classes.push('shadow-xs');
    else if (s.shadow === 'md') classes.push('shadow-md');
    else if (s.shadow === 'lg') classes.push('shadow-lg');
    else if (s.shadow === 'xl') classes.push('shadow-xl');

    if (s.maxWidth === 'sm') classes.push('max-w-xs mx-auto');
    else if (s.maxWidth === 'md') classes.push('max-w-md mx-auto');
    else if (s.maxWidth === 'lg') classes.push('max-w-2xl mx-auto');
    else if (s.maxWidth === 'center') classes.push('max-w-3xl mx-auto');
    else classes.push('w-full');

    classes.push('bg-slate-100');
    return classes.join(' ');
  }

  getImageStyle(block: EditorBlock): Record<string, string> {
    const s = block.imageSettings || {};
    const styles: Record<string, string> = {};

    styles['object-fit'] = s.objectFit || 'cover';

    if (s.aspectRatio && s.aspectRatio !== 'auto') {
      styles['aspect-ratio'] = s.aspectRatio;
    }

    if (s.maxHeight && s.maxHeight !== 'none' && s.maxHeight !== 'auto') {
      styles['max-height'] = s.maxHeight;
    } else {
      styles['max-height'] = '384px';
    }

    return styles;
  }

  // --- Category Manager State ---
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

  // --- Popovers & Insert Execution ---
  toggleInsertPopover(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.activeInsertPopoverId = this.activeInsertPopoverId === id ? null : id;
    this.activeSlotPopoverKey = null;
  }

  toggleSlotInsert(blockId: string, slot: string, event?: Event) {
    if (event) event.stopPropagation();
    const key = blockId + '_' + slot;
    this.activeSlotPopoverKey = this.activeSlotPopoverKey === key ? null : key;
    this.activeInsertPopoverId = null;
  }

  closeAllPopovers() {
    this.activeInsertPopoverId = null;
    this.activeSlotPopoverKey = null;
  }

  executeInsert(targetId: string, insertPos: string, type: EditorBlockType) {
    this.recordSnapshot();
    const newBlock = this.createNewBlock(type);

    if (insertPos === 'append' || targetId === 'bottom') {
      this.blocks.push(newBlock);
    } else if (insertPos === 'before') {
      const loc = this.findBlockParentAndIndex(targetId);
      if (loc) loc.parentArray.splice(loc.index, 0, newBlock);
      else this.blocks.unshift(newBlock);
    } else if (insertPos === 'container_child') {
      const container = this.findBlockById(targetId);
      if (container) {
        if (!container.children) container.children = [];
        container.children.push(newBlock);
      }
    } else if (insertPos.startsWith('col_')) {
      const colIdx = parseInt(insertPos.replace('col_', '').replace('_child', ''), 10) || 0;
      const colBlock = this.findBlockById(targetId);
      if (colBlock && colBlock.columns && colBlock.columns[colIdx]) {
        colBlock.columns[colIdx].push(newBlock);
      }
    }

    this.selectBlockById(newBlock.id);
    this.hasChanges = true;
    this.closeAllPopovers();
    setTimeout(() => this.scrollToBlock(newBlock.id), 50);
  }

  // --- Typography Inspector Helpers ---
  get activeTypo(): BlockTypography {
    if (this.selectedTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      return meta.titleTypography || {};
    }
    if (this.selectedTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      return meta.excerptTypography || {};
    }
    const b = this.currentSelectedBlock;
    return b?.typography || {};
  }

  updateActiveTypoField(field: keyof BlockTypography, value: string) {
    this.recordSnapshot();
    if (this.selectedTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      meta.titleTypography = { ...(meta.titleTypography || {}), [field]: value || undefined };
      this.model.meta_data = meta;
    } else if (this.selectedTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      meta.excerptTypography = { ...(meta.excerptTypography || {}), [field]: value || undefined };
      this.model.meta_data = meta;
    } else {
      const b = this.currentSelectedBlock;
      if (b) {
        b.typography = { ...(b.typography || {}), [field]: value || undefined };
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
    this.recordSnapshot();
    if (this.selectedTarget === 'title') {
      const meta = (this.model.meta_data || {}) as any;
      delete meta.titleTypography;
    } else if (this.selectedTarget === 'excerpt') {
      const meta = (this.model.meta_data || {}) as any;
      delete meta.excerptTypography;
    } else {
      const b = this.currentSelectedBlock;
      if (b) delete b.typography;
    }
    this.hasChanges = true;
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
    this.recordSnapshot();
    block.headingLevel = block.headingLevel === 'h3' ? 'h2' : 'h3';
    this.hasChanges = true;
  }

  scrollToBlock(blockId: string) {
    const el = document.getElementById('block-' + blockId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getBlockOutlineTitle(block: EditorBlock): string {
    switch (block.type) {
      case 'container': return 'Container';
      case 'columns_2': return '2 Columns';
      case 'columns_3': return '3 Columns';
      case 'heading': return block.headingText || 'Heading';
      case 'paragraph': return block.paragraphText?.substring(0, 22) || 'Paragraph';
      case 'image': return block.imageCaption || 'Image';
      case 'video': return block.videoCaption || 'Video';
      case 'quote': return block.quoteAuthor || 'Quote';
      case 'wine_card': return block.wineName || 'Wine Tasting';
      case 'pairing_box': return block.dishName || 'Pairing';
      case 'event_box': return block.eventTitle || 'Event';
      case 'divider': return 'Divider';
    }
  }

  getBlockIcon(type: EditorBlockType): string {
    switch (type) {
      case 'container': return '□';
      case 'columns_2': return '▥';
      case 'columns_3': return '▤';
      case 'heading': return 'H';
      case 'paragraph': return '¶';
      case 'image': return 'IMG';
      case 'video': return 'VID';
      case 'quote': return '“';
      case 'wine_card': return '🍷';
      case 'pairing_box': return '🍽';
      case 'event_box': return '🎟';
      case 'divider': return '—';
    }
  }

  createNewBlock(type: EditorBlockType): EditorBlock {
    const newBlock: EditorBlock = {
      id: this.genId(),
      type,
    };

    switch (type) {
      case 'container':
        newBlock.containerSettings = { padding: 'standard' };
        newBlock.children = [];
        break;
      case 'columns_2':
        newBlock.columnsSettings = { ratio: '50-50', gap: 'standard' };
        newBlock.columns = [[], []];
        break;
      case 'columns_3':
        newBlock.columnsSettings = { gap: 'standard' };
        newBlock.columns = [[], [], []];
        break;
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
        newBlock.imageSettings = { objectFit: 'cover', aspectRatio: 'auto', maxWidth: 'full', maxHeight: '384px', borderRadius: '2xl' };
        break;
      case 'video':
        newBlock.videoUrl = '';
        newBlock.videoCaption = '';
        break;
      case 'quote':
        newBlock.quoteText = '';
        newBlock.quoteAuthor = '';
        newBlock.quoteSettings = { accentColor: '#701423' };
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

    return newBlock;
  }

  addBlock(type: EditorBlockType) {
    this.recordSnapshot();
    const newBlock = this.createNewBlock(type);
    this.blocks.push(newBlock);
    this.selectBlockById(newBlock.id);
    this.hasChanges = true;
    setTimeout(() => this.scrollToBlock(newBlock.id), 50);
  }

  // --- Drag and Drop Handlers ---
  onPaletteDragStart(type: EditorBlockType, e: DragEvent) {
    this.draggedPaletteType = type;
    this.draggedBlockId = null;
    this.isDraggingActive.set(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'palette', type }));
    }
  }

  onBlockDragStart(blockId: string, e: DragEvent) {
    e.stopPropagation();
    this.draggedBlockId = blockId;
    this.draggedPaletteType = null;
    this.isDraggingActive.set(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', blockId }));
    }
  }

  onDragEnd() {
    this.draggedPaletteType = null;
    this.draggedBlockId = null;
    this.isDraggingActive.set(false);
    this.dragOverId = null;
    this.dragOverSlot = null;
    this.hoverDropBlockId.set(null);
    this.hoverDropBlockPos.set(null);
    this.outlineDragOverId = null;
    document.querySelectorAll('.layout-slot-box.drag-over').forEach((el) => el.classList.remove('drag-over'));
  }

  onBlockHoverDragOver(targetBlockId: string, e: DragEvent) {
    if (!this.isDraggingActive()) return;
    if (this.draggedBlockId === targetBlockId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.draggedPaletteType ? 'copy' : 'move';
    }

    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    const pos: 'before' | 'after' = isTopHalf ? 'before' : 'after';

    this.hoverDropBlockId.set(targetBlockId);
    this.hoverDropBlockPos.set(pos);
  }

  onBlockHoverDragLeave(targetBlockId: string, e: DragEvent) {
    if (this.hoverDropBlockId() === targetBlockId) {
      this.hoverDropBlockId.set(null);
      this.hoverDropBlockPos.set(null);
    }
  }

  onBlockHoverDrop(targetBlockId: string, e: DragEvent) {
    if (!this.isDraggingActive()) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = this.hoverDropBlockPos() || 'before';

    if (this.draggedPaletteType) {
      this.executeInsert(targetBlockId, pos, this.draggedPaletteType);
    } else if (this.draggedBlockId && this.draggedBlockId !== targetBlockId) {
      this.moveBlockRelative(this.draggedBlockId, targetBlockId, pos);
    }

    this.onDragEnd();
  }

  moveBlockRelative(sourceId: string, targetId: string, pos: 'before' | 'after') {
    const sourceLoc = this.findBlockParentAndIndex(sourceId);
    const targetLoc = this.findBlockParentAndIndex(targetId);
    if (!sourceLoc || !targetLoc) return;

    this.recordSnapshot();
    const item = sourceLoc.parentArray.splice(sourceLoc.index, 1)[0];
    let targetIndex = targetLoc.parentArray.findIndex((b) => b.id === targetId);
    if (targetIndex === -1) {
      targetLoc.parentArray.push(item);
    } else {
      if (pos === 'after') targetIndex++;
      targetLoc.parentArray.splice(targetIndex, 0, item);
    }
    this.selectBlockById(item.id);
    this.hasChanges = true;
  }

  onCanvasDragOver(e: DragEvent, id: string, slot: 'before' | 'append' | 'slot') {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.draggedPaletteType ? 'copy' : 'move';
    }
    this.dragOverId = id;
    this.dragOverSlot = slot;
  }

  onCanvasDragLeave() {
    this.dragOverId = null;
    this.dragOverSlot = null;
  }

  onCanvasDrop(e: DragEvent, targetId: string, slot: 'before' | 'append' | 'slot') {
    e.preventDefault();
    if (this.draggedPaletteType) {
      this.executeInsert(targetId, slot === 'append' ? 'append' : 'before', this.draggedPaletteType);
    } else if (this.draggedBlockId && this.draggedBlockId !== targetId) {
      const sourceLoc = this.findBlockParentAndIndex(this.draggedBlockId);
      if (sourceLoc) {
        this.recordSnapshot();
        const item = sourceLoc.parentArray.splice(sourceLoc.index, 1)[0];
        if (slot === 'append' || targetId === 'bottom') {
          this.blocks.push(item);
        } else {
          const destLoc = this.findBlockParentAndIndex(targetId);
          if (destLoc) {
            destLoc.parentArray.splice(destLoc.index, 0, item);
          } else {
            this.blocks.push(item);
          }
        }
        this.selectBlockById(item.id);
        this.hasChanges = true;
      }
    }
    this.onDragEnd();
  }

  onSlotDragOver(e: DragEvent, blockId: string, slotName: string) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.add('drag-over');
  }

  onSlotDragLeave() {
    document.querySelectorAll('.layout-slot-box.drag-over').forEach((el) => el.classList.remove('drag-over'));
  }

  onSlotDrop(e: DragEvent, blockId: string, slotName: string) {
    e.preventDefault();
    e.stopPropagation();
    this.onSlotDragLeave();
    if (this.draggedPaletteType) {
      this.executeInsert(blockId, slotName === 'container' ? 'container_child' : slotName + '_child', this.draggedPaletteType);
    } else if (this.draggedBlockId && this.draggedBlockId !== blockId) {
      const sourceLoc = this.findBlockParentAndIndex(this.draggedBlockId);
      if (sourceLoc) {
        this.recordSnapshot();
        const item = sourceLoc.parentArray.splice(sourceLoc.index, 1)[0];
        if (slotName === 'container') {
          const c = this.findBlockById(blockId);
          if (c) {
            if (!c.children) c.children = [];
            c.children.push(item);
          }
        } else if (slotName.startsWith('col_')) {
          const colIdx = parseInt(slotName.replace('col_', ''), 10) || 0;
          const colBlock = this.findBlockById(blockId);
          if (colBlock && colBlock.columns && colBlock.columns[colIdx]) {
            colBlock.columns[colIdx].push(item);
          }
        }
        this.selectBlockById(item.id);
        this.hasChanges = true;
      }
    }
    this.onDragEnd();
  }

  // --- Outline Drag and Drop ---
  onOutlineDragStart(blockId: string, e: DragEvent) {
    this.draggedBlockId = blockId;
    this.isDraggingActive.set(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', blockId);
    }
  }

  onOutlineDragOver(blockId: string, e: DragEvent) {
    e.preventDefault();
    this.outlineDragOverId = blockId;
  }

  onOutlineDragLeave() {
    this.outlineDragOverId = null;
  }

  onOutlineDrop(targetBlockId: string, e: DragEvent) {
    e.preventDefault();
    if (this.draggedBlockId && this.draggedBlockId !== targetBlockId) {
      const srcLoc = this.findBlockParentAndIndex(this.draggedBlockId);
      const dstLoc = this.findBlockParentAndIndex(targetBlockId);
      if (srcLoc && dstLoc) {
        this.recordSnapshot();
        const item = srcLoc.parentArray.splice(srcLoc.index, 1)[0];
        dstLoc.parentArray.splice(dstLoc.index, 0, item);
        this.hasChanges = true;
        this.selectBlockById(item.id);
      }
    }
    this.onDragEnd();
  }

  readonly availableFolders = signal<Folder[]>([]);
  readonly availableProducts = signal<Product[]>([]);

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
    this.loadProducts();

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

  loadProducts() {
    this.api.listProducts().subscribe({
      next: (prods) => this.availableProducts.set(prods || []),
      error: () => {},
    });
  }

  linkWineCardProduct(block: EditorBlock, productId: any) {
    this.recordSnapshot();
    if (!productId || productId === 'null') {
      block.productId = null;
      block.productSlug = null;
      block.productPrice = null;
      this.hasChanges = true;
      return;
    }
    const pid = Number(productId);
    const prod = this.availableProducts().find((p) => p.id === pid);
    if (!prod) return;

    block.productId = prod.id;
    block.productSlug = prod.slug;
    block.productPrice = prod.price;

    if (!block.wineName || block.wineName.trim() === '') {
      block.wineName = prod.name;
    }
    if (!block.vintage && prod.vintage) {
      block.vintage = prod.vintage;
    }
    if (!block.region && prod.region) {
      block.region = typeof prod.region === 'string' ? prod.region : (prod.region.el || prod.region.en || '');
    }
    if (!block.grape && prod.varietal) {
      block.grape = typeof prod.varietal === 'string' ? prod.varietal : (prod.varietal.el || prod.varietal.en || '');
    }
    if (!block.imageUrl && prod.cover_image) {
      block.imageUrl = prod.cover_image;
    }
    if (!block.tastingNotes && prod.tasting_note) {
      block.tastingNotes = typeof prod.tasting_note === 'string' ? prod.tasting_note : (prod.tasting_note.el || prod.tasting_note.en || '');
    }
    this.hasChanges = true;
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

  openMediaPicker(target: 'cover' | { blockId: string; field: 'image' | 'video' }) {
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
      const block = this.findBlockById(this.mediaTarget.blockId);
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
        case 'container':
          if (block.children?.length) {
            parts.push(this.serializeBlocksToMarkdown(block.children));
          }
          break;
        case 'columns_2':
        case 'columns_3':
          if (block.columns?.length) {
            for (const col of block.columns) {
              if (col.length) parts.push(this.serializeBlocksToMarkdown(col));
            }
          }
          break;
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
