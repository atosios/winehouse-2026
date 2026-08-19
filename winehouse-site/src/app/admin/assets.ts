import { Component, inject, signal, computed, OnInit, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Asset, Folder } from './api';
import { AdminConfirm } from './confirm-dialog';
import { resolveMediaUrl } from '../core/media.utils';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WhFolderSidebar, FOLDER_COLORS } from './folder-sidebar';

@Component({
  selector: 'wh-admin-assets',
  imports: [FormsModule, WhFolderSidebar],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Media Library</h1>
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
        @if (!loading()) {
          <p class="text-xs text-slate-500 mt-0.5">
            {{ filteredAssets().length }} file{{ filteredAssets().length !== 1 ? 's' : '' }} shown ({{ assets().length }} total) · {{ totalSize }}
          </p>
        }
      </div>

      <!-- Segmented View Toggle -->
      <div class="flex items-center gap-2.5">
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

    <!-- Toast Notification for Hotkey Feedback (e.g. Copied Links / Uploads) -->
    @if (copiedToast(); as msg) {
      <div class="fixed top-6 right-6 z-[99999] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
        <span>{{ msg }}</span>
      </div>
    }

    <!-- Main Workspace Layout: Left Folders Sidebar + Right Asset View -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <!-- Left Folder Navigation Sidebar -->
      <div class="md:col-span-4 lg:col-span-3 sticky top-6 z-30">
        <wh-folder-sidebar
          #folderSidebar
          type="asset"
          title="Media Folders"
          [selectedFolderId]="selectedFolderId()"
          [totalCount]="assets().length"
          [unorganizedCount]="unorganizedCount()"
          (folderChange)="onFolderChange($event)"
          (foldersUpdated)="onFoldersUpdated($event)"
          (itemDroppedOnFolder)="onDropOnFolder($event)"
        />
      </div>

      <!-- Right Main Content Area -->
      <div class="md:col-span-8 lg:col-span-9 flex flex-col gap-5">
        <!-- Search & Type Filter Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input class="admin-search flex-1" placeholder="Filter media by filename…" [(ngModel)]="searchQuery" />
          <div class="admin-tabs">
            <button type="button" class="admin-tab" [class.active]="filterType() === 'all'" (click)="filterType.set('all')">All Media</button>
            <button type="button" class="admin-tab" [class.active]="filterType() === 'images'" (click)="filterType.set('images')">Images</button>
            <button type="button" class="admin-tab" [class.active]="filterType() === 'videos'" (click)="filterType.set('videos')">Videos</button>
          </div>
        </div>

        @if (error()) {
          <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <span>{{ error() }}</span>
            <button type="button" (click)="error.set('')" class="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">✕</button>
          </div>
        }

        @if (loading()) {
          <div class="admin-card text-center py-12 text-slate-400 text-sm">
            Loading media library…
          </div>
        } @else {
          <!-- Grid View (Apple Photos / Square Friendly Style) -->
          @if (viewMode() === 'grid') {
            <ul class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <!-- 1. ALWAYS FIRST PLACEHOLDER / UPLOAD CARD (Exact same card size & structure) -->
              <li
                class="admin-card !p-3 flex flex-col gap-2.5 group transition-all relative cursor-pointer border-2 border-dashed border-slate-300 hover:border-wine-600 bg-slate-50/80 hover:bg-wine-50/30 select-none shadow-2xs"
                [class.border-wine-600]="isDragging()"
                [class.bg-wine-50]="isDragging()"
                [class.ring-2]="isDragging()"
                [class.ring-wine-500/20]="isDragging()"
                (click)="fileInputGrid.click()"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragging.set(false)"
                (drop)="onDrop($event)"
              >
                <input
                  #fileInputGrid
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.mp4,.webm,.mov,.ogg,.m4v,.avif,.heic,.heif"
                  multiple
                  class="hidden"
                  (change)="uploadFromInput($event)"
                  [disabled]="uploading()"
                />

                <!-- Top Preview-sized Box matching aspect-square of actual cards -->
                <div class="aspect-square w-full rounded-lg bg-white border border-slate-200/80 group-hover:border-wine-300 group-hover:bg-wine-50/40 flex flex-col items-center justify-center transition-all p-3">
                  @if (uploading()) {
                    <div class="w-10 h-10 rounded-full border-3 border-wine-200 border-t-wine-600 animate-spin mb-1.5"></div>
                    <span class="text-xs font-bold text-slate-800 font-mono">Uploading…</span>
                  } @else {
                    <div class="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-white border border-slate-200/80 group-hover:border-wine-200 text-slate-400 group-hover:text-wine-700 flex items-center justify-center transition-all shadow-2xs mb-2 group-hover:scale-110">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <span class="text-xs font-bold text-slate-800 group-hover:text-wine-800 transition-colors">
                      + Add Media
                    </span>
                    <span class="text-3xs text-slate-400 group-hover:text-slate-600 transition-colors mt-0.5 text-center">
                      Drop or click to browse
                    </span>
                  }
                </div>

                <!-- Text metadata matching title & size of actual card -->
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-slate-700 group-hover:text-wine-900 truncate">
                    @if (activeFolder()) {
                      Target: {{ activeFolder()?.name }}
                    } @else {
                      Quick Upload
                    }
                  </p>
                  <p class="text-2xs text-slate-400 mt-0.5">Images, Videos, Files</p>
                </div>

                <!-- Bottom Action matching bottom bar of actual cards -->
                <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-auto text-2xs text-slate-500 font-medium">
                  <span class="inline-flex items-center gap-1 group-hover:text-wine-700 text-2xs">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="12" y2="12"/></svg>
                    Browse files
                  </span>
                  <span class="text-3xs font-mono text-slate-400 group-hover:text-wine-600 uppercase font-semibold">Dropzone</span>
                </div>
              </li>

              <!-- 2. EXISTING ASSET CARDS -->
              @for (asset of filteredAssets(); track asset.id) {
                <li
                  class="admin-card !p-3 flex flex-col gap-2.5 group transition-all relative cursor-pointer select-none"
                  [class.ring-2]="isSelected(asset.id)"
                  [class.ring-wine-600]="isSelected(asset.id)"
                  [class.ring-offset-2]="isSelected(asset.id)"
                  [class.bg-wine-50/20]="isSelected(asset.id)"
                  [class.hover:border-slate-300]="!isSelected(asset.id)"
                  draggable="true"
                  (click)="handleItemClick(asset, $event, $index)"
                  (dragstart)="onAssetDragStart($event, asset)"
                >
                  <!-- Multi-selection Checkbox Overlay -->
                  <div
                    class="absolute top-4.5 left-4.5 z-20 transition-all duration-150 cursor-pointer"
                    (click)="$event.stopPropagation(); toggleSelect(asset.id, $event)"
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

                  <!-- Folder Pill Badge (Top Right) -->
                  @if (asset.folder) {
                    <div class="absolute top-4.5 right-4.5 z-20 pointer-events-none">
                      <span
                        class="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider backdrop-blur-md shadow-xs"
                        [class]="getFolderBadgeClass(asset.folder.color)"
                      >
                        {{ asset.folder.name }}
                      </span>
                    </div>
                  }

                  @if (isImage(asset)) {
                    <div
                      class="cursor-pointer overflow-hidden rounded-lg bg-slate-100 relative aspect-square group/thumb"
                      (dblclick)="$event.stopPropagation(); openLightbox(asset)"
                    >
                      <img [src]="mediaUrl(asset.url || asset.path)" [alt]="asset.name" class="h-full w-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); openLightbox(asset)"
                        class="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all shadow-md cursor-pointer"
                        title="Open lightbox preview"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  } @else if (isVideo(asset)) {
                    <div class="cursor-pointer overflow-hidden rounded-lg bg-slate-900 relative aspect-square flex items-center justify-center group/vid" (click)="$event.stopPropagation(); openLightbox(asset)">
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

                  <!-- Item Actions -->
                  <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-auto" (click)="$event.stopPropagation()">
                    <div class="relative group/folder">
                      <button
                        type="button"
                        class="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        title="Move to folder"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span>Move</span>
                      </button>

                      <!-- Quick Move Dropdown with bridge wrapper (no gap) -->
                      <div class="hidden group-hover/folder:block absolute bottom-full left-0 pb-1.5 z-30 min-w-[160px]">
                        <div class="bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 space-y-0.5 text-xs">
                          <button
                            type="button"
                            (click)="moveSingleAsset(asset, null)"
                            class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                          >
                            <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Unorganized</span>
                          </button>
                          @for (f of availableFolders(); track f.id) {
                            <button
                              type="button"
                              (click)="moveSingleAsset(asset, f.id)"
                              class="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-slate-700 cursor-pointer"
                              [class.font-bold]="asset.folder_id === f.id"
                            >
                              <span class="w-2 h-2 rounded-full" [class]="getFolderDotClass(f.color)"></span>
                              <span class="truncate">{{ f.name }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        (click)="copy(asset)"
                        title="Copy URL"
                      >
                        @if (copiedId() === asset.id) {
                          <span class="text-emerald-600 text-3xs font-bold">✓</span>
                        } @else {
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        }
                      </button>
                      <button
                        type="button"
                        class="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        (click)="remove(asset)"
                        title="Delete asset"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>

            @if (filteredAssets().length === 0 && searchQuery) {
              <div class="admin-card text-center py-6 text-slate-400 text-xs mt-2">
                No files match search term "{{ searchQuery }}" in this view.
              </div>
            }
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
                        title="Select all (Ctrl+A)"
                      />
                    </th>
                    <th>File</th>
                    <th class="hidden sm:table-cell">Folder</th>
                    <th class="hidden sm:table-cell">Type</th>
                    <th class="hidden sm:table-cell">Size</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- 1. ALWAYS-FIRST UPLOAD PLACEHOLDER ROW (LIST VIEW) -->
                  <tr
                    class="group bg-slate-50/60 hover:bg-wine-50/40 border-b border-dashed border-slate-300 transition-colors cursor-pointer"
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="isDragging.set(false)"
                    (drop)="onDrop($event)"
                  >
                    <input
                      #fileInput
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.mp4,.webm,.mov,.ogg,.m4v,.avif,.heic,.heif"
                      multiple
                      class="hidden"
                      (change)="uploadFromInput($event)"
                      [disabled]="uploading()"
                    />
                    <td class="text-center py-3 text-slate-400 group-hover:text-wine-600">
                      <div class="w-5 h-5 rounded-md border-2 border-dashed border-slate-300 group-hover:border-wine-500 flex items-center justify-center mx-auto text-xs font-bold text-slate-400 group-hover:text-wine-600">
                        +
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 group-hover:text-wine-800">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-wine-600 shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span>Upload or drop new files here…</span>
                        @if (uploading()) {
                          <span class="ml-2 text-2xs font-mono text-wine-600 animate-pulse">Uploading…</span>
                        }
                        @if (activeFolder()) {
                          <span class="ml-auto text-2xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600 group-hover:bg-wine-100 group-hover:text-wine-800">
                            → {{ activeFolder()?.name }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="hidden sm:table-cell text-2xs text-slate-400 font-mono">
                      {{ activeFolder() ? activeFolder()?.name : 'Root' }}
                    </td>
                    <td class="hidden sm:table-cell text-2xs text-slate-400 font-mono">All formats</td>
                    <td class="hidden sm:table-cell text-2xs text-slate-400 font-mono">Any size</td>
                    <td class="text-right">
                      <button type="button" class="btn btn-primary btn-xs pointer-events-none">
                        Browse Files
                      </button>
                    </td>
                  </tr>

                  <!-- 2. EXISTING ASSET ROWS -->
                  @for (asset of filteredAssets(); track asset.id) {
                    <tr
                      [class.bg-wine-50/30]="isSelected(asset.id)"
                      class="cursor-pointer select-none"
                      draggable="true"
                      (click)="handleItemClick(asset, $event, $index)"
                      (dragstart)="onAssetDragStart($event, asset)"
                    >
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
                            <img [src]="mediaUrl(asset.url || asset.path)" [alt]="asset.name" class="w-9 h-9 rounded-lg object-cover cursor-pointer border border-slate-200" (click)="$event.stopPropagation(); openLightbox(asset)" />
                          } @else if (isVideo(asset)) {
                            <div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs cursor-pointer" (click)="$event.stopPropagation(); openLightbox(asset)">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>
                          } @else {
                            <span class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></span>
                          }
                          <span class="text-xs font-semibold text-slate-900 truncate max-w-xs">{{ asset.name }}</span>
                        </div>
                      </td>
                      <td class="hidden sm:table-cell">
                        @if (asset.folder) {
                          <span class="px-2 py-0.5 rounded-full text-2xs font-bold" [class]="getFolderBadgeClass(asset.folder.color)">
                            {{ asset.folder.name }}
                          </span>
                        } @else {
                          <span class="text-2xs text-slate-400 font-mono">Unorganized</span>
                        }
                      </td>
                      <td class="hidden sm:table-cell">
                        <span class="text-xs text-slate-500 font-mono">{{ asset.mime_type || '—' }}</span>
                      </td>
                      <td class="hidden sm:table-cell">
                        <span class="text-xs text-slate-500">{{ formatSize(asset.size) }}</span>
                      </td>
                      <td class="text-right" (click)="$event.stopPropagation()">
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
      </div>
    </div>

    <!-- Floating Batch Actions Bar (Apple Frosted Dock Style with Bulk Move & Hotkey hints) -->
    @if (selectedCount() > 0) {
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center flex-wrap gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white transition-all animate-slideUp">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-wine-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow-xs">
            {{ selectedCount() }}
          </span>
          <span class="text-xs font-medium text-slate-200 whitespace-nowrap">
            {{ selectedCount() === 1 ? '1 item' : selectedCount() + ' items' }}
            <span class="text-slate-400">({{ selectedSize() }})</span>
          </span>
        </div>

        <div class="h-4 w-px bg-white/20"></div>

        <!-- Copy URLs -->
        <button
          type="button"
          (click)="copySelectedUrls()"
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
          (click)="removeSelected()"
          title="Delete selected files (Delete / Backspace)"
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

    <!-- Lightbox Preview Modal -->
    @if (lightboxAsset()) {
      <div class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" (click)="closeLightbox()">
        <div class="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span class="text-white text-xs font-medium truncate">{{ lightboxAsset()?.name }}</span>
            <button type="button" class="text-white/70 hover:text-white text-sm px-2 py-1 rounded" (click)="closeLightbox()">✕</button>
          </div>
          <div class="p-4 flex items-center justify-center bg-black/40 overflow-hidden">
            @if (isImage(lightboxAsset()!)) {
              <img [src]="mediaUrl(lightboxAsset()!.url || lightboxAsset()!.path)" [alt]="lightboxAsset()!.name" class="max-h-[70vh] max-w-full object-contain rounded-lg" />
            } @else if (isVideo(lightboxAsset()!)) {
              <video [src]="mediaUrl(lightboxAsset()!.url || lightboxAsset()!.path)" controls class="max-h-[70vh] max-w-full rounded-lg"></video>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminAssets implements OnInit {
  @ViewChild('folderSidebar') folderSidebarComponent?: WhFolderSidebar;

  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);

  readonly assets = signal<Asset[]>([]);
  readonly availableFolders = signal<Folder[]>([]);
  readonly selectedFolderId = signal<number | 'all' | 'root'>('all');
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly copiedId = signal<number | null>(null);
  readonly copiedToast = signal<string | null>(null);
  readonly error = signal('');
  readonly showBulkMove = signal(false);
  searchQuery = '';
  readonly filterType = signal<'all' | 'images' | 'videos'>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly isDragging = signal(false);
  readonly lightboxAsset = signal<Asset | null>(null);
  readonly selectedIds = signal<Set<number>>(new Set());
  lastSelectedIndex: number | null = null;

  readonly activeFolder = computed(() => {
    const sel = this.selectedFolderId();
    if (typeof sel === 'number') {
      return this.availableFolders().find((f) => f.id === sel) || null;
    }
    return null;
  });

  readonly unorganizedCount = computed(() => {
    return this.assets().filter((a) => !a.folder_id).length;
  });

  readonly filteredAssets = computed(() => {
    let list = this.assets();
    const selFolder = this.selectedFolderId();

    if (selFolder === 'root') {
      list = list.filter((a) => !a.folder_id);
    } else if (typeof selFolder === 'number') {
      list = list.filter((a) => a.folder_id === selFolder);
    }

    const type = this.filterType();
    if (type === 'images') list = list.filter((a) => this.isImage(a));
    else if (type === 'videos') list = list.filter((a) => this.isVideo(a));

    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((a) => a.name.toLowerCase().includes(q));
  });

  get totalSize(): string {
    const bytes = this.filteredAssets().reduce((sum, a) => sum + (a.size || 0), 0);
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
    this.refreshAssets();
  }

  refreshAssets(): void {
    this.loading.set(true);
    this.api.listAssets().subscribe({
      next: (assets) => {
        this.assets.set(assets);
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

  handleItemClick(asset: Asset, event: MouseEvent, index: number): void {
    if (event.shiftKey && this.lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(this.lastSelectedIndex, index);
      const end = Math.max(this.lastSelectedIndex, index);
      const list = this.filteredAssets();
      const current = new Set(this.selectedIds());
      for (let i = start; i <= end; i++) {
        if (list[i]) current.add(list[i].id);
      }
      this.selectedIds.set(current);
    } else if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.toggleSelect(asset.id);
      this.lastSelectedIndex = index;
    } else {
      // Toggle selection on regular click
      this.toggleSelect(asset.id);
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
      const allIds = new Set(this.filteredAssets().map((a) => a.id));
      this.selectedIds.set(allIds);
    }
  }

  deselectAll(): void {
    this.selectedIds.set(new Set());
    this.lastSelectedIndex = null;
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

    const targetFolderId = typeof this.selectedFolderId() === 'number' ? (this.selectedFolderId() as number) : null;

    for (const file of files) {
      this.api.uploadAsset(file, targetFolderId).subscribe({
        next: (asset) => {
          this.assets.update((list) => [asset, ...list]);
          completed++;
          if (completed === files.length) {
            this.uploading.set(false);
            this.folderSidebarComponent?.loadFolders();
            this.showToast(`Uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`);
          }
        },
        error: (err) => {
          completed++;
          this.error.set(err.error?.message ?? `Upload failed for "${file.name}".`);
          if (completed === files.length) this.uploading.set(false);
        },
      });
    }
  }

  moveSingleAsset(asset: Asset, folderId: number | null): void {
    this.api.updateAsset(asset.id, { folder_id: folderId }).subscribe({
      next: (updated) => {
        this.assets.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.folderSidebarComponent?.loadFolders();
      },
    });
  }

  bulkMoveSelected(folderId: number | null): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.api.bulkMoveItems('asset', ids, folderId).subscribe({
      next: () => {
        const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
        this.assets.update((list) =>
          list.map((a) => (ids.includes(a.id) ? { ...a, folder_id: folderId, folder: folderObj } : a))
        );
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
        this.showToast(`Moved ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
      },
    });
  }

  onAssetDragStart(event: DragEvent, asset: Asset): void {
    if (event.dataTransfer) {
      const selected = this.selectedIds().has(asset.id) ? Array.from(this.selectedIds()) : [asset.id];
      event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'asset', ids: selected }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDropOnFolder({ folderId, event }: { folderId: number | null; event: DragEvent }): void {
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type === 'asset' && Array.isArray(data.ids)) {
        this.api.bulkMoveItems('asset', data.ids, folderId).subscribe({
          next: () => {
            const folderObj = folderId ? this.availableFolders().find((f) => f.id === folderId) || null : null;
            this.assets.update((list) =>
              list.map((a) => (data.ids.includes(a.id) ? { ...a, folder_id: folderId, folder: folderObj } : a))
            );
            this.deselectAll();
            this.folderSidebarComponent?.loadFolders();
            this.showToast(`Moved ${data.ids.length} item${data.ids.length !== 1 ? 's' : ''}`);
          },
        });
      }
    } catch {}
  }

  closeLightbox(): void {
    this.lightboxAsset.set(null);
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  copy(asset: Asset) {
    const url = this.mediaUrl(asset.url || asset.path);
    navigator.clipboard.writeText(url).then(() => {
      this.copiedId.set(asset.id);
      this.showToast(`Copied link for "${asset.name}"`);
      setTimeout(() => this.copiedId.set(null), 1500);
    });
  }

  copySelectedUrls(): void {
    const selected = this.assets().filter((a) => this.selectedIds().has(a.id));
    if (selected.length === 0) return;
    const text = selected.map((a) => this.mediaUrl(a.url || a.path)).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`Copied ${selected.length} link${selected.length !== 1 ? 's' : ''} to clipboard`);
    });
  }

  showToast(message: string): void {
    this.copiedToast.set(message);
    setTimeout(() => this.copiedToast.set(null), 2200);
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
        this.copySelectedUrls();
      }
      return;
    }

    // Delete / Backspace: Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedCount() > 0 && !this.lightboxAsset()) {
        e.preventDefault();
        this.removeSelected();
      }
      return;
    }

    // Escape: Deselect / close lightbox
    if (e.key === 'Escape') {
      if (this.lightboxAsset()) {
        this.lightboxAsset.set(null);
      } else if (this.selectedCount() > 0) {
        this.deselectAll();
      }
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    if (this.isTypingInInput(e.target)) return;
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      this.uploadFiles(Array.from(files));
      this.showToast(`Uploading ${files.length} pasted file${files.length !== 1 ? 's' : ''}…`);
    }
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
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
      this.folderSidebarComponent?.loadFolders();
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
        return forkJoin(ids.map((id) => this.api.deleteAsset(id).pipe(catchError(() => of(null)))));
      })
    ).subscribe({
      next: () => {
        const set = new Set(ids);
        this.assets.update((list) => list.filter((a) => !set.has(a.id)));
        this.deselectAll();
        this.folderSidebarComponent?.loadFolders();
      },
    });
  }
}
