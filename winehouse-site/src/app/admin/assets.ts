import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Asset } from './api';
import { AdminConfirm } from './confirm-dialog';
import { resolveMediaUrl } from '../core/media.utils';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'wh-admin-assets',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Media Library</h1>
        @if (!loading()) {
          <p class="text-xs text-slate-500 mt-0.5">
            {{ assets().length }} file{{ assets().length !== 1 ? 's' : '' }} stored · Total {{ totalSize }}
          </p>
        }
      </div>

      <!-- Segmented View Toggle & Selection Helpers -->
      <div class="flex items-center gap-2.5">
        @if (filteredAssets().length > 0) {
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer select-none flex items-center gap-1.5"
            (click)="toggleSelectAll()"
          >
            <input
              type="checkbox"
              [checked]="isAllSelected()"
              class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 pointer-events-none"
            />
            <span>{{ isAllSelected() ? 'Deselect All' : 'Select All' }}</span>
          </button>
        }

        <div class="admin-tabs">
          <button type="button" class="admin-tab" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')" title="Grid View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
          <button type="button" class="admin-tab" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')" title="List View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Apple-style AirDrop / iCloud Dropzone (Constrained, Never Stretched Full Width) -->
    <div class="max-w-2xl mx-auto w-full mb-6">
      <div
        class="admin-dropzone"
        [class.dragover]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging.set(false)"
        (drop)="onDrop($event)"
      >
        <div class="admin-dropzone-icon mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p class="text-sm font-semibold text-slate-800 mb-1">
          {{ uploading() ? 'Uploading media…' : 'Drag videos, images or files here, or browse' }}
        </p>
        <p class="text-xs text-slate-400">Supports MP4, WEBM, MOV, JPG, PNG, WEBP, GIF, SVG, PDF up to 64 MB</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.mp4,.webm,.mov,.ogg,.m4v,.avif,.heic,.heif"
          multiple
          (change)="uploadFromInput($event)"
          [disabled]="uploading()"
        />
      </div>
    </div>

    <!-- Search & Type Filter Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <input class="admin-search" placeholder="Filter media by filename…" [(ngModel)]="searchQuery" />
      <div class="admin-tabs">
        <button type="button" class="admin-tab" [class.active]="filterType() === 'all'" (click)="filterType.set('all')">All Media</button>
        <button type="button" class="admin-tab" [class.active]="filterType() === 'images'" (click)="filterType.set('images')">Images</button>
        <button type="button" class="admin-tab" [class.active]="filterType() === 'videos'" (click)="filterType.set('videos')">Videos</button>
      </div>
    </div>

    @if (error()) {
      <div class="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
        <span>{{ error() }}</span>
        <button type="button" (click)="error.set('')" class="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">✕</button>
      </div>
    }

    @if (loading()) {
      <div class="admin-card text-center py-12 text-slate-400 text-sm">
        Loading media files…
      </div>
    } @else if (filteredAssets().length === 0) {
      <div class="admin-card admin-empty-state">
        <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <p>
          @if (searchQuery) {
            No files match your search term.
          } @else {
            No files uploaded yet. Drag and drop above to add imagery or videos.
          }
        </p>
      </div>
    } @else {
      <!-- Grid View (Apple Photos / Square Friendly Style) -->
      @if (viewMode() === 'grid') {
        <ul class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          @for (asset of filteredAssets(); track asset.id) {
            <li
              class="admin-card !p-3 flex flex-col gap-2.5 group transition-all relative"
              [class.ring-2]="isSelected(asset.id)"
              [class.ring-wine-600]="isSelected(asset.id)"
              [class.ring-offset-2]="isSelected(asset.id)"
              [class.bg-wine-50/20]="isSelected(asset.id)"
              [class.hover:border-slate-300]="!isSelected(asset.id)"
            >
              <!-- Multi-selection Checkbox Overlay -->
              <div
                class="absolute top-4.5 left-4.5 z-20 transition-all duration-150 cursor-pointer"
                (click)="toggleSelect(asset.id, $event)"
              >
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-xs border"
                  [class.bg-wine-600]="isSelected(asset.id)"
                  [class.border-wine-600]="isSelected(asset.id)"
                  [class.text-white]="isSelected(asset.id)"
                  [class.bg-white/90]="!isSelected(asset.id)"
                  [class.border-slate-300]="!isSelected(asset.id)"
                  [class.opacity-0]="!isSelected(asset.id) && selectedCount() === 0"
                  [class.group-hover:opacity-100]="true"
                >
                  @if (isSelected(asset.id)) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  }
                </div>
              </div>

              @if (isImage(asset)) {
                <div class="cursor-pointer overflow-hidden rounded-lg bg-slate-100 relative aspect-square" (click)="openLightbox(asset)">
                  <img [src]="mediaUrl(asset.url || asset.path)" [alt]="asset.name" class="h-full w-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
              } @else if (isVideo(asset)) {
                <div class="cursor-pointer overflow-hidden rounded-lg bg-slate-900 relative aspect-square flex items-center justify-center group/vid" (click)="openLightbox(asset)">
                  <video [src]="mediaUrl(asset.url || asset.path)" class="h-full w-full object-cover rounded-lg opacity-80" muted preload="metadata"></video>
                  <div class="absolute w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg transition-transform group-hover/vid:scale-110">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-black/75 text-white">Video</span>
                </div>
              } @else {
                <div class="aspect-square w-full rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-1 text-slate-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  <span class="text-2xs font-mono uppercase">{{ asset.mime_type?.split('/')?.[1] || 'FILE' }}</span>
                </div>
              }

              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-900 truncate" [title]="asset.name">{{ asset.name }}</p>
                <p class="text-2xs text-slate-400 mt-0.5">{{ formatSize(asset.size) }}</p>
              </div>

              <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  class="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  (click)="copy(asset)"
                >
                  {{ copiedId() === asset.id ? 'Copied ✓' : 'Copy Link' }}
                </button>
                <button
                  type="button"
                  class="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  (click)="remove(asset)"
                >
                  Delete
                </button>
              </div>
            </li>
          }
        </ul>
      }

      <!-- List View -->
      @if (viewMode() === 'list') {
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
                    title="Select all"
                  />
                </th>
                <th>File Preview & Name</th>
                <th class="hidden sm:table-cell">MIME Type</th>
                <th class="hidden sm:table-cell">File Size</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (asset of filteredAssets(); track asset.id) {
                <tr [class.bg-wine-50/30]="isSelected(asset.id)">
                  <td class="w-10 text-center" (click)="$event.stopPropagation()">
                    <input
                      type="checkbox"
                      [checked]="isSelected(asset.id)"
                      (change)="toggleSelect(asset.id, $event)"
                      class="rounded border-slate-300 text-wine-600 focus:ring-wine-500 cursor-pointer"
                    />
                  </td>
                  <td>
                    <div class="flex items-center gap-3">
                      @if (isImage(asset)) {
                        <img [src]="mediaUrl(asset.url || asset.path)" [alt]="asset.name" class="w-9 h-9 rounded-lg object-cover cursor-pointer border border-slate-200" (click)="openLightbox(asset)" />
                      } @else if (isVideo(asset)) {
                        <div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs cursor-pointer" (click)="openLightbox(asset)">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      } @else {
                        <span class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></span>
                      }
                      <span class="text-xs font-semibold text-slate-900 truncate max-w-xs">{{ asset.name }}</span>
                    </div>
                  </td>
                  <td class="hidden sm:table-cell">
                    <span class="text-xs text-slate-500 font-mono">{{ asset.mime_type || '—' }}</span>
                  </td>
                  <td class="hidden sm:table-cell">
                    <span class="text-xs text-slate-500">{{ formatSize(asset.size) }}</span>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button type="button" class="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer" (click)="copy(asset)">
                        {{ copiedId() === asset.id ? 'Copied ✓' : 'Copy Link' }}
                      </button>
                      <button type="button" class="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" (click)="remove(asset)">
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
    }

    <!-- Floating Batch Actions Bar (Apple Frosted Dock Style) -->
    @if (selectedCount() > 0) {
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white transition-all animate-slideUp">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-full bg-wine-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs">
            {{ selectedCount() }}
          </span>
          <span class="text-xs font-medium text-slate-200">
            {{ selectedCount() === 1 ? '1 item' : selectedCount() + ' items' }} selected
            <span class="text-slate-400">({{ selectedSize() }})</span>
          </span>
        </div>

        <div class="h-4 w-px bg-white/20"></div>

        <button
          type="button"
          class="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer select-none"
          (click)="deselectAll()"
        >
          Deselect All
        </button>

        <button
          type="button"
          class="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer select-none"
          (click)="removeSelected()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Delete Selected ({{ selectedCount() }})</span>
        </button>
      </div>
    }

    <!-- Apple-style Lightbox Modal (Images & Playable Videos) -->
    @if (lightboxAsset()) {
      <div class="admin-lightbox" (click)="lightboxAsset.set(null)">
        <div class="relative max-w-4xl max-h-[85vh] p-2" (click)="$event.stopPropagation()">
          @if (isImage(lightboxAsset()!)) {
            <img [src]="mediaUrl(lightboxAsset()!.url || lightboxAsset()!.path)" [alt]="lightboxAsset()!.name" class="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain mx-auto" />
          } @else if (isVideo(lightboxAsset()!)) {
            <video [src]="mediaUrl(lightboxAsset()!.url || lightboxAsset()!.path)" class="max-w-full max-h-[80vh] rounded-2xl shadow-2xl mx-auto" controls autoplay></video>
          }
          <div class="text-center mt-3 text-white text-xs font-medium bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full inline-block">
            {{ lightboxAsset()!.name }} · {{ formatSize(lightboxAsset()!.size) }}
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminAssets implements OnInit {
  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);

  assets = signal<Asset[]>([]);
  loading = signal(true);
  uploading = signal(false);
  copiedId = signal<number | null>(null);
  error = signal('');
  searchQuery = '';
  filterType = signal<'all' | 'images' | 'videos'>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  isDragging = signal(false);
  lightboxAsset = signal<Asset | null>(null);
  selectedIds = signal<Set<number>>(new Set());

  filteredAssets = computed(() => {
    let list = this.assets();
    const type = this.filterType();

    if (type === 'images') list = list.filter((a) => this.isImage(a));
    else if (type === 'videos') list = list.filter((a) => this.isVideo(a));

    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((a) => a.name.toLowerCase().includes(q));
  });

  get totalSize(): string {
    const bytes = this.assets().reduce((sum, a) => sum + (a.size || 0), 0);
    return this.formatSize(bytes);
  }

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly isAllSelected = computed(() => {
    const list = this.filteredAssets();
    if (list.length === 0) return false;
    const set = this.selectedIds();
    return list.every((a) => set.has(a.id));
  });

  readonly selectedSize = computed(() => {
    const set = this.selectedIds();
    const bytes = this.assets()
      .filter((a) => set.has(a.id))
      .reduce((sum, a) => sum + (a.size || 0), 0);
    return this.formatSize(bytes);
  });

  ngOnInit() {
    this.api.listAssets().subscribe((assets) => {
      this.assets.set(assets);
      this.loading.set(false);
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
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
      const allIds = new Set(this.filteredAssets().map((a) => a.id));
      this.selectedIds.set(allIds);
    }
  }

  deselectAll(): void {
    this.selectedIds.set(new Set());
  }

  isImage(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('image/');
  }

  isVideo(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(asset.name);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  openLightbox(asset: Asset) {
    this.lightboxAsset.set(asset);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const files = e.dataTransfer?.files;
    if (files) this.uploadFiles(Array.from(files));
  }

  uploadFromInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) this.uploadFiles(Array.from(files));
    input.value = '';
  }

  private uploadFiles(files: File[]) {
    if (!files.length) return;
    this.uploading.set(true);
    this.error.set('');
    let completed = 0;

    for (const file of files) {
      this.api.uploadAsset(file).subscribe({
        next: (asset) => {
          this.assets.update((list) => [asset, ...list]);
          completed++;
          if (completed === files.length) this.uploading.set(false);
        },
        error: (err) => {
          completed++;
          this.error.set(err.error?.message ?? `Upload failed for "${file.name}".`);
          if (completed === files.length) this.uploading.set(false);
        },
      });
    }
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  copy(asset: Asset) {
    const url = this.mediaUrl(asset.url || asset.path);
    navigator.clipboard.writeText(url).then(() => {
      this.copiedId.set(asset.id);
      setTimeout(() => this.copiedId.set(null), 1500);
    });
  }

  async remove(asset: Asset) {
    const ok = await this.confirm.open({
      title: 'Delete media file',
      message: `Are you sure you want to delete "${asset.name}"? Any post or page referencing this URL will no longer be able to display it.`,
      confirmLabel: 'Delete File',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteAsset(asset.id).subscribe(() => {
      this.assets.update((list) => list.filter((a) => a.id !== asset.id));
      if (this.selectedIds().has(asset.id)) {
        const next = new Set(this.selectedIds());
        next.delete(asset.id);
        this.selectedIds.set(next);
      }
    });
  }

  async removeSelected() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    const ok = await this.confirm.open({
      title: `Delete ${ids.length} media file${ids.length !== 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete these ${ids.length} selected files? Any post, product, or page referencing these media files will no longer display them.`,
      confirmLabel: `Delete ${ids.length} File${ids.length !== 1 ? 's' : ''}`,
      danger: true,
    });
    if (!ok) return;

    this.api.bulkDeleteAssets(ids).pipe(
      catchError(() => {
        // Fallback to individual deletions in parallel
        return forkJoin(ids.map((id) => this.api.deleteAsset(id).pipe(catchError(() => of(null)))));
      })
    ).subscribe({
      next: () => {
        const set = new Set(ids);
        this.assets.update((list) => list.filter((a) => !set.has(a.id)));
        this.deselectAll();
      },
      error: () => {
        this.error.set('Failed to delete some media files. Please refresh and try again.');
      },
    });
  }
}
