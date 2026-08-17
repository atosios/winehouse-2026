import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Asset } from './api';
import { resolveMediaUrl } from '../core/media.utils';

@Component({
  selector: 'wh-media-picker',
  imports: [FormsModule],
  template: `
    <div class="wh-media-picker-wrap max-w-md">
      @if (label) {
        <label class="admin-field-label flex items-center justify-between">
          <span>{{ label }}</span>
          @if (value) {
            <span class="text-2xs font-normal text-slate-400 font-mono truncate max-w-[180px]" [title]="value">
              {{ formatFilename(value) }}
            </span>
          }
        </label>
      }

      <!-- Current Selection / Square-Friendly Preview Card (Never full width) -->
      @if (value) {
        <div class="relative group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs max-w-sm">
          <!-- Live Preview -->
          <div class="relative w-full overflow-hidden flex items-center justify-center bg-slate-950" [class]="previewHeight">
            @if (isVideo(value)) {
              <video
                [src]="resolveUrl(value)"
                class="w-full h-full object-contain"
                controls
                playsinline
                preload="metadata"
              ></video>
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-2xs font-mono font-bold uppercase tracking-wider border border-white/20 pointer-events-none">
                Video
              </span>
            } @else {
              <img
                [src]="resolveUrl(value)"
                [alt]="label || 'Selected media'"
                class="w-full h-full object-cover"
                (error)="onImgError($event)"
              />
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-2xs font-mono font-bold uppercase tracking-wider border border-white/20 pointer-events-none">
                Image
              </span>
            }
          </div>

          <!-- Bottom Action Strip -->
          <div class="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-slate-800 truncate font-mono">{{ formatFilename(value) }}</p>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                class="btn btn-secondary btn-xs !py-1"
                (click)="openModal()"
                title="Change or select another media file"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Replace</span>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-xs !text-red-500 hover:!bg-red-50 !py-1"
                (click)="clear()"
                title="Remove selection"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      } @else {
        <!-- Empty State Drop/Select Area (Compact, constrained width) -->
        <div
          class="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer group max-w-sm"
          (click)="openModal()"
        >
          <div class="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
            @if (accept === 'video') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            }
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-800">
              Select or upload {{ accept === 'video' ? 'video' : accept === 'image' ? 'image' : 'media' }}
            </p>
            <p class="text-2xs text-slate-400 mt-0.5">
              {{ accept === 'video' ? 'MP4, WEBM, MOV' : accept === 'image' ? 'JPG, PNG, WEBP, GIF' : 'Images or videos up to 50 MB' }}
            </p>
          </div>

          <div class="flex items-center gap-1.5" (click)="$event.stopPropagation()">
            <button
              type="button"
              class="btn btn-secondary btn-xs !py-1"
              (click)="openModal()"
            >
              📁 Browse
            </button>
            <label class="btn btn-primary btn-xs cursor-pointer !py-1">
              <span>⬆ Upload</span>
              <input
                type="file"
                class="hidden"
                [accept]="fileAcceptFilter"
                (change)="onDirectUpload($event)"
              />
            </label>
          </div>
        </div>
      }

      @if (helpText) {
        <p class="text-2xs text-slate-400 mt-1.5">{{ helpText }}</p>
      }
    </div>

    <!-- ============================================================ MEDIA SELECTOR MODAL -->
    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn" (click)="closeModal()">
        <div
          class="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slideUp"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Select {{ accept === 'video' ? 'Video' : accept === 'image' ? 'Image' : 'Media' }}
              </h3>
              <p class="text-xs text-slate-500">Pick from existing uploaded media or upload a new file from your computer.</p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors"
                (click)="closeModal()"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Modal Tabs & Controls -->
          <div class="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div class="flex items-center gap-2">
              <div class="admin-tabs !mb-0">
                <button
                  type="button"
                  class="admin-tab"
                  [class.active]="activeTab() === 'library'"
                  (click)="activeTab.set('library')"
                >
                  📁 Media Library ({{ filteredAssets().length }})
                </button>
                <button
                  type="button"
                  class="admin-tab"
                  [class.active]="activeTab() === 'upload'"
                  (click)="activeTab.set('upload')"
                >
                  ⬆ Upload New
                </button>
                <button
                  type="button"
                  class="admin-tab"
                  [class.active]="activeTab() === 'url'"
                  (click)="activeTab.set('url')"
                >
                  🔗 Direct Name / URL
                </button>
              </div>
            </div>

            @if (activeTab() === 'library') {
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  placeholder="Search files…"
                  class="admin-field-input !py-1 text-xs max-w-xs"
                />
              </div>
            }
          </div>

          <!-- Modal Body Content -->
          <div class="flex-1 overflow-y-auto p-5 min-h-[350px]">
            <!-- TAB 1: MEDIA LIBRARY -->
            @if (activeTab() === 'library') {
              @if (loading()) {
                <div class="py-20 text-center text-slate-400 text-sm">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-wine-600 mb-3"></div>
                  <p>Loading media files…</p>
                </div>
              } @else if (filteredAssets().length === 0) {
                <div class="py-16 text-center text-slate-400">
                  <div class="text-3xl mb-2">🖼️</div>
                  <p class="text-sm font-semibold text-slate-700">No matching media found</p>
                  <p class="text-xs text-slate-400 mt-1">Upload a file or switch tabs to add content.</p>
                  <button type="button" class="btn btn-primary btn-xs mt-4" (click)="activeTab.set('upload')">
                    + Upload New File
                  </button>
                </div>
              } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  @for (asset of filteredAssets(); track asset.id) {
                    <div
                      class="group relative rounded-xl border border-slate-200 overflow-hidden hover:border-wine-600 hover:shadow-md transition-all cursor-pointer bg-slate-900 flex flex-col justify-between"
                      [class.ring-2]="isSelected(asset)"
                      [class.ring-wine-600]="isSelected(asset)"
                      (click)="selectAsset(asset)"
                    >
                      <!-- Thumbnail Area -->
                      <div class="aspect-square relative flex items-center justify-center overflow-hidden bg-black/40">
                        @if (isImageAsset(asset)) {
                          <img
                            [src]="resolveUrl(asset.url || asset.path)"
                            [alt]="asset.name"
                            class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                          />
                        } @else if (isVideoAsset(asset)) {
                          <div class="w-full h-full flex flex-col items-center justify-center text-white bg-slate-950 p-2 text-center">
                            <span class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg mb-1 group-hover:bg-wine-600 transition-colors">
                              ▶
                            </span>
                            <span class="text-2xs font-mono uppercase text-slate-400 font-semibold">Video</span>
                          </div>
                        } @else {
                          <div class="text-center p-3 text-slate-400">
                            <span class="text-2xl block mb-1">📄</span>
                            <span class="text-2xs uppercase font-mono font-bold">{{ asset.name.split('.').pop() }}</span>
                          </div>
                        }

                        @if (isSelected(asset)) {
                          <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-wine-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                            ✓
                          </div>
                        }
                      </div>

                      <!-- Footer Caption -->
                      <div class="p-2 bg-white border-t border-slate-100 flex flex-col gap-0.5">
                        <p class="text-xs font-semibold text-slate-800 truncate font-mono" [title]="asset.name">
                          {{ asset.name }}
                        </p>
                        <p class="text-2xs text-slate-400 font-mono">
                          {{ formatSize(asset.size) }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              }
            }

            <!-- TAB 2: UPLOAD NEW -->
            @if (activeTab() === 'upload') {
              <div class="py-6 max-w-xl mx-auto">
                <div
                  class="p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-wine-600 bg-slate-50 hover:bg-slate-100/60 transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer relative"
                  [class.opacity-50]="uploading()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="isDragging.set(false)"
                  (drop)="onDrop($event)"
                >
                  <div class="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl text-wine-700">
                    {{ uploading() ? '⏳' : '⬆️' }}
                  </div>

                  <div>
                    <h4 class="text-sm font-bold text-slate-900">
                      {{ uploading() ? 'Uploading media file…' : 'Drag & drop your file here' }}
                    </h4>
                    <p class="text-xs text-slate-500 mt-1">
                      Supports high-resolution images (JPG, PNG, WEBP) &amp; video formats (MP4, WEBM, MOV) up to 50 MB
                    </p>
                  </div>

                  @if (uploadError()) {
                    <div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                      {{ uploadError() }}
                    </div>
                  }

                  <label class="btn btn-primary btn-sm cursor-pointer mt-2">
                    <span>{{ uploading() ? 'Uploading…' : 'Browse Computer' }}</span>
                    <input
                      type="file"
                      class="hidden"
                      [accept]="fileAcceptFilter"
                      [disabled]="uploading()"
                      (change)="onModalUpload($event)"
                    />
                  </label>
                </div>
              </div>
            }

            <!-- TAB 3: DIRECT URL / NAME -->
            @if (activeTab() === 'url') {
              <div class="py-6 max-w-xl mx-auto space-y-4">
                <div>
                  <label class="admin-field-label">Custom File Name or Full URL</label>
                  <input
                    type="text"
                    [(ngModel)]="manualUrl"
                    placeholder="e.g. hero_video.mp4 or https://..."
                    class="admin-field-input font-mono text-xs"
                  />
                  <span class="text-2xs text-slate-400 block mt-1">
                    Enter a relative file in the public folder (e.g. <code class="bg-slate-100 px-1 py-0.5 rounded">hero_video.mp4</code>, <code class="bg-slate-100 px-1 py-0.5 rounded">editorial_intro.jpg</code>) or full external URL.
                  </span>
                </div>

                <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()">Cancel</button>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="!manualUrl.trim()"
                    (click)="applyManualUrl()"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span class="text-2xs text-slate-400 font-mono">
              @if (value) {
                Selected: <span class="font-bold text-slate-700">{{ formatFilename(value) }}</span>
              } @else {
                No media selected
              }
            </span>

            <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class WhMediaPicker implements OnInit {
  private api = inject(AdminApi);

  @Input() value: string | undefined = '';
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input() label: string = '';
  @Input() accept: 'image' | 'video' | 'all' = 'all';
  @Input() helpText?: string;
  @Input() previewHeight: string = 'h-36';

  modalOpen = signal(false);
  activeTab = signal<'library' | 'upload' | 'url'>('library');
  assets = signal<Asset[]>([]);
  loading = signal(false);
  uploading = signal(false);
  uploadError = signal('');
  searchQuery = '';
  manualUrl = '';
  isDragging = signal(false);

  get fileAcceptFilter(): string {
    if (this.accept === 'video') return '.mp4,.webm,.mov,.ogg,.m4v';
    if (this.accept === 'image') return '.jpg,.jpeg,.png,.webp,.gif,.svg';
    return '.jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.mp4,.webm,.mov,.ogg,.m4v';
  }

  filteredAssets = computed(() => {
    let list = this.assets();
    if (this.accept === 'video') {
      list = list.filter((a) => this.isVideoAsset(a));
    } else if (this.accept === 'image') {
      list = list.filter((a) => this.isImageAsset(a));
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((a) => a.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    // Pre-fetch assets silently if empty
  }

  openModal(): void {
    this.modalOpen.set(true);
    this.activeTab.set('library');
    this.manualUrl = this.value || '';
    this.uploadError.set('');
    this.loadAssets();
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  loadAssets(): void {
    this.loading.set(true);
    this.api.listAssets().subscribe({
      next: (data) => {
        this.assets.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  selectAsset(asset: Asset): void {
    const selected = asset.url || asset.name;
    this.value = selected;
    this.valueChange.emit(selected);
    this.closeModal();
  }

  isSelected(asset: Asset): boolean {
    if (!this.value) return false;
    return this.value === asset.name || this.value === asset.url || this.value.includes(asset.name);
  }

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
  }

  applyManualUrl(): void {
    if (this.manualUrl.trim()) {
      this.value = this.manualUrl.trim();
      this.valueChange.emit(this.value);
      this.closeModal();
    }
  }

  onDirectUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.uploadSingleFile(files[0]);
    }
    input.value = '';
  }

  onModalUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.uploadSingleFile(files[0]);
    }
    input.value = '';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadSingleFile(files[0]);
    }
  }

  private uploadSingleFile(file: File): void {
    this.uploading.set(true);
    this.uploadError.set('');

    this.api.uploadAsset(file).subscribe({
      next: (asset) => {
        this.uploading.set(false);
        this.assets.update((list) => [asset, ...list]);
        const selected = asset.url || asset.name;
        this.value = selected;
        this.valueChange.emit(selected);
        this.closeModal();
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message || `Upload failed for "${file.name}".`);
      },
    });
  }

  /* Format & URL Helpers */
  resolveUrl(val: string): string {
    return resolveMediaUrl(val);
  }

  formatFilename(val: string): string {
    if (!val) return '';
    const parts = val.split('/');
    return parts[parts.length - 1];
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isImageAsset(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(asset.name);
  }

  isVideoAsset(asset: Asset): boolean {
    return !!asset.mime_type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(asset.name);
  }

  isVideo(val: string): boolean {
    if (!val) return false;
    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(val);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
