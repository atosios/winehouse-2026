import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Folder, FolderType } from './api';
import { AdminConfirm } from './confirm-dialog';

export interface FolderColorOption {
  key: string;
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
}

export const FOLDER_COLORS: FolderColorOption[] = [
  { key: 'amber', name: 'Amber', bgClass: 'bg-amber-500/15', textClass: 'text-amber-700', borderClass: 'border-amber-300', badgeBg: 'bg-amber-100 text-amber-800' },
  { key: 'wine', name: 'Wine', bgClass: 'bg-wine-600/15', textClass: 'text-wine-800', borderClass: 'border-wine-300', badgeBg: 'bg-wine-50 text-wine-900' },
  { key: 'emerald', name: 'Emerald', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-700', borderClass: 'border-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-800' },
  { key: 'blue', name: 'Blue', bgClass: 'bg-blue-500/15', textClass: 'text-blue-700', borderClass: 'border-blue-300', badgeBg: 'bg-blue-100 text-blue-800' },
  { key: 'indigo', name: 'Indigo', bgClass: 'bg-indigo-500/15', textClass: 'text-indigo-700', borderClass: 'border-indigo-300', badgeBg: 'bg-indigo-100 text-indigo-800' },
  { key: 'purple', name: 'Purple', bgClass: 'bg-purple-500/15', textClass: 'text-purple-700', borderClass: 'border-purple-300', badgeBg: 'bg-purple-100 text-purple-800' },
  { key: 'rose', name: 'Rose', bgClass: 'bg-rose-500/15', textClass: 'text-rose-700', borderClass: 'border-rose-300', badgeBg: 'bg-rose-100 text-rose-800' },
  { key: 'slate', name: 'Slate', bgClass: 'bg-slate-500/15', textClass: 'text-slate-700', borderClass: 'border-slate-300', badgeBg: 'bg-slate-100 text-slate-700' },
];

@Component({
  selector: 'wh-folder-sidebar',
  imports: [FormsModule],
  template: `
    <div class="wh-folder-sidebar flex flex-col bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
      <!-- Header with title and + New Folder action -->
      <div class="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-slate-100">
        <div class="flex items-center gap-1.5 min-w-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-slate-500 shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono truncate">
            {{ title }}
          </span>
        </div>

        <button
          type="button"
          (click)="openCreateModal()"
          class="btn btn-secondary btn-xs !py-1 !px-2 flex items-center gap-1 text-2xs cursor-pointer hover:border-wine-600 hover:text-wine-800 transition-colors"
          title="Create a new folder"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Folder</span>
        </button>
      </div>

      <!-- Navigation List: All, Unorganized, and Custom Folders -->
      <div class="space-y-1">
        <!-- 1. All Items (Root + all folders) -->
        <button
          type="button"
          (click)="selectFolder('all')"
          (dragover)="onDragOver($event, 'all')"
          (dragleave)="dragTarget.set(null)"
          (drop)="onDrop($event, 'all')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left group"
          [class.bg-slate-900]="selectedFolderId === 'all'"
          [class.text-white]="selectedFolderId === 'all'"
          [class.hover:bg-slate-100]="selectedFolderId !== 'all'"
          [class.text-slate-700]="selectedFolderId !== 'all'"
          [class.ring-2]="dragTarget() === 'all'"
          [class.ring-wine-500]="dragTarget() === 'all'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0 opacity-70">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
            <span class="truncate">All Items</span>
          </div>
          @if (totalCount !== undefined) {
            <span
              class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0"
              [class.bg-white/20]="selectedFolderId === 'all'"
              [class.text-white]="selectedFolderId === 'all'"
              [class.bg-slate-100]="selectedFolderId !== 'all'"
              [class.text-slate-500]="selectedFolderId !== 'all'"
            >
              {{ totalCount }}
            </span>
          }
        </button>

        <!-- 2. Unorganized / Root items (items without a folder) -->
        <button
          type="button"
          (click)="selectFolder('root')"
          (dragover)="onDragOver($event, 'root')"
          (dragleave)="dragTarget.set(null)"
          (drop)="onDrop($event, 'root')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left group"
          [class.bg-slate-900]="selectedFolderId === 'root'"
          [class.text-white]="selectedFolderId === 'root'"
          [class.hover:bg-slate-100]="selectedFolderId !== 'root'"
          [class.text-slate-700]="selectedFolderId !== 'root'"
          [class.ring-2]="dragTarget() === 'root'"
          [class.ring-wine-500]="dragTarget() === 'root'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0 opacity-70">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span class="truncate">Unorganized</span>
          </div>
          @if (unorganizedCount !== undefined) {
            <span
              class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0"
              [class.bg-white/20]="selectedFolderId === 'root'"
              [class.text-white]="selectedFolderId === 'root'"
              [class.bg-slate-100]="selectedFolderId !== 'root'"
              [class.text-slate-500]="selectedFolderId !== 'root'"
            >
              {{ unorganizedCount }}
            </span>
          }
        </button>

        @if (folders().length > 0) {
          <div class="pt-1.5 pb-0.5 border-t border-slate-100 mt-1">
            <span class="text-[10px] font-mono uppercase font-bold text-slate-400 px-2 tracking-wider">Folders</span>
          </div>
        }

        <!-- 3. Custom User Folders -->
        @for (f of folders(); track f.id) {
          <div
            (dragover)="onDragOver($event, f.id)"
            (dragleave)="dragTarget.set(null)"
            (drop)="onDrop($event, f.id)"
            class="group/item relative flex items-center justify-between rounded-xl transition-all select-none"
            [class.bg-slate-900]="selectedFolderId === f.id"
            [class.text-white]="selectedFolderId === f.id"
            [class.hover:bg-slate-100]="selectedFolderId !== f.id"
            [class.text-slate-700]="selectedFolderId !== f.id"
            [class.ring-2]="dragTarget() === f.id"
            [class.ring-wine-500]="dragTarget() === f.id"
          >
            <button
              type="button"
              (click)="selectFolder(f.id)"
              class="flex-1 flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer text-left min-w-0"
            >
              <!-- Folder Vector Icon with Color Swatch -->
              <span
                class="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                [class]="getColorBadgeClass(f.color)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </span>

              <span class="truncate font-medium">{{ f.name }}</span>
            </button>

            <!-- Actions: Count + Dropdown/Edit Trigger -->
            <div class="flex items-center gap-1 pr-1.5 shrink-0">
              <span
                class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full"
                [class.bg-white/20]="selectedFolderId === f.id"
                [class.text-white]="selectedFolderId === f.id"
                [class.bg-slate-100]="selectedFolderId !== f.id"
                [class.text-slate-500]="selectedFolderId !== f.id"
              >
                {{ f.items_count ?? 0 }}
              </span>

              <button
                type="button"
                (click)="openEditModal(f, $event)"
                class="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 transition-opacity cursor-pointer text-xs"
                [class.hover:bg-white/20]="selectedFolderId === f.id"
                [class.hover:text-white]="selectedFolderId === f.id"
                title="Edit folder settings"
              >
                ⚙
              </button>
            </div>
          </div>
        }

        @if (folders().length === 0) {
          <div class="py-3 px-2 text-center text-slate-400 text-2xs font-mono border border-dashed border-slate-200 rounded-xl mt-1">
            No folders created yet.<br />
            <button type="button" (click)="openCreateModal()" class="text-wine-700 font-bold underline mt-0.5 cursor-pointer">
              + Create first folder
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Create / Edit Folder Modal -->
    @if (modalOpen()) {
      <div
        class="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        (click)="closeModal()"
      >
        <div
          class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-wine-700">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{{ editingFolder() ? 'Edit Folder' : 'Create New Folder' }}</span>
            </h3>
            <button type="button" (click)="closeModal()" class="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1">✕</button>
          </div>

          <!-- Folder Name Field -->
          <div>
            <label class="admin-field-label">Folder Name</label>
            <input
              class="admin-field-input text-xs font-medium"
              placeholder="e.g. Bottle Photography, Legal, 2026 Vintage…"
              [(ngModel)]="folderName"
              (keydown.enter)="saveFolder()"
              autofocus
            />
          </div>

          <!-- Color Accent Picker -->
          <div>
            <label class="admin-field-label">Color Badge</label>
            <div class="grid grid-cols-4 gap-1.5">
              @for (c of colorOptions; track c.key) {
                <button
                  type="button"
                  (click)="selectedColor.set(c.key)"
                  class="flex items-center gap-1.5 p-1.5 rounded-lg border text-2xs font-mono font-medium transition-all cursor-pointer"
                  [class.border-slate-900]="selectedColor() === c.key"
                  [class.ring-2]="selectedColor() === c.key"
                  [class.ring-slate-900/20]="selectedColor() === c.key"
                  [class.border-slate-200]="selectedColor() !== c.key"
                  [class]="c.bgClass"
                >
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [class]="c.badgeBg"></span>
                  <span class="truncate" [class]="c.textClass">{{ c.name }}</span>
                </button>
              }
            </div>
          </div>

          @if (errorMessage()) {
            <p class="text-xs text-red-600 font-semibold">{{ errorMessage() }}</p>
          }

          <!-- Modal Actions -->
          <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            @if (editingFolder()) {
              <button
                type="button"
                (click)="deleteFolder(editingFolder()!)"
                class="btn btn-secondary btn-xs !text-red-600 hover:!bg-red-50 cursor-pointer"
              >
                Delete Folder
              </button>
            } @else {
              <div></div>
            }

            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-secondary btn-xs cursor-pointer" (click)="closeModal()">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary btn-xs cursor-pointer"
                (click)="saveFolder()"
                [disabled]="!folderName.trim() || saving()"
              >
                {{ saving() ? 'Saving…' : (editingFolder() ? 'Save Changes' : 'Create Folder') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class WhFolderSidebar implements OnInit {
  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);

  @Input() type: FolderType = 'asset';
  @Input() selectedFolderId: number | 'all' | 'root' = 'all';
  @Input() totalCount?: number;
  @Input() unorganizedCount?: number;
  @Input() title: string = 'Folders';

  @Output() folderChange = new EventEmitter<number | 'all' | 'root'>();
  @Output() foldersUpdated = new EventEmitter<Folder[]>();
  @Output() itemDroppedOnFolder = new EventEmitter<{ folderId: number | null; event: DragEvent }>();

  readonly folders = signal<Folder[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly modalOpen = signal(false);
  readonly editingFolder = signal<Folder | null>(null);
  readonly errorMessage = signal('');
  readonly dragTarget = signal<number | 'all' | 'root' | null>(null);

  folderName: string = '';
  readonly selectedColor = signal<string>('amber');
  readonly colorOptions = FOLDER_COLORS;

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.loading.set(true);
    this.api.listFolders(this.type).subscribe({
      next: (res) => {
        this.folders.set(res);
        this.foldersUpdated.emit(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  selectFolder(id: number | 'all' | 'root'): void {
    this.selectedFolderId = id;
    this.folderChange.emit(id);
  }

  getColorBadgeClass(colorKey?: string | null): string {
    const found = FOLDER_COLORS.find((c) => c.key === colorKey) || FOLDER_COLORS[0];
    return found.badgeBg;
  }

  openCreateModal(): void {
    this.editingFolder.set(null);
    this.folderName = '';
    this.selectedColor.set('amber');
    this.errorMessage.set('');
    this.modalOpen.set(true);
  }

  openEditModal(folder: Folder, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingFolder.set(folder);
    this.folderName = folder.name;
    this.selectedColor.set(folder.color || 'amber');
    this.errorMessage.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingFolder.set(null);
    this.folderName = '';
  }

  saveFolder(): void {
    const name = this.folderName.trim();
    if (!name) return;

    this.saving.set(true);
    this.errorMessage.set('');

    const editing = this.editingFolder();
    if (editing) {
      this.api.updateFolder(editing.id, { name, color: this.selectedColor() }).subscribe({
        next: (updated) => {
          this.folders.update((list) => list.map((f) => (f.id === updated.id ? updated : f)));
          this.foldersUpdated.emit(this.folders());
          this.saving.set(false);
          this.closeModal();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Could not update folder.');
        },
      });
    } else {
      this.api.createFolder({ name, type: this.type, color: this.selectedColor() }).subscribe({
        next: (created) => {
          this.folders.update((list) => [...list, created]);
          this.foldersUpdated.emit(this.folders());
          this.saving.set(false);
          this.closeModal();
          this.selectFolder(created.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Could not create folder.');
        },
      });
    }
  }

  async deleteFolder(folder: Folder): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Delete Folder',
      message: `Are you sure you want to delete folder "${folder.name}"? Items inside will be safely kept and moved to Unorganized.`,
      confirmLabel: 'Delete Folder',
      danger: true,
    });
    if (!ok) return;

    this.api.deleteFolder(folder.id).subscribe({
      next: () => {
        this.folders.update((list) => list.filter((f) => f.id !== folder.id));
        this.foldersUpdated.emit(this.folders());
        this.closeModal();
        if (this.selectedFolderId === folder.id) {
          this.selectFolder('all');
        }
      },
    });
  }

  onDragOver(event: DragEvent, target: number | 'all' | 'root'): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragTarget.set(target);
  }

  onDrop(event: DragEvent, target: number | 'all' | 'root'): void {
    event.preventDefault();
    this.dragTarget.set(null);
    const folderId = target === 'all' || target === 'root' ? null : target;
    this.itemDroppedOnFolder.emit({ folderId, event });
  }
}
