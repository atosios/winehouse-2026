import { Component, inject, signal } from '@angular/core';
import { AdminApi, Asset } from './api';

@Component({
  selector: 'wh-admin-assets',
  template: `
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-3xl">Files & images</h1>
      <label class="btn btn-primary cursor-pointer">
        {{ uploading() ? 'Uploading…' : '+ Upload' }}
        <input
          type="file"
          class="hidden"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf"
          (change)="upload($event)"
          [disabled]="uploading()"
        />
      </label>
    </div>

    <p class="text-sm opacity-70 mb-6">
      Upload images here, then click “Copy link” and paste it wherever an image address is asked for.
      Max size 10 MB. Allowed: JPG, PNG, WEBP, GIF, SVG, PDF.
    </p>

    @if (error()) {
      <p class="text-sm text-red-700 mb-4">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="opacity-70">Loading…</p>
    } @else if (assets().length === 0) {
      <p class="opacity-70">Nothing uploaded yet.</p>
    } @else {
      <ul class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        @for (asset of assets(); track asset.id) {
          <li class="paper p-3 flex flex-col gap-2">
            @if (asset.mime_type?.startsWith('image/')) {
              <img [src]="asset.url" [alt]="asset.name" class="h-28 w-full object-cover rounded" loading="lazy" />
            } @else {
              <div class="h-28 w-full rounded bg-black/5 flex items-center justify-center text-3xl">📄</div>
            }
            <p class="text-xs truncate" [title]="asset.name">{{ asset.name }}</p>
            <div class="flex items-center justify-between text-xs">
              <button type="button" class="text-primary hover:underline" (click)="copy(asset)">
                {{ copiedId() === asset.id ? 'Copied ✓' : 'Copy link' }}
              </button>
              <button type="button" class="text-red-700 hover:underline" (click)="remove(asset)">
                Delete
              </button>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminAssets {
  private api = inject(AdminApi);

  assets = signal<Asset[]>([]);
  loading = signal(true);
  uploading = signal(false);
  copiedId = signal<number | null>(null);
  error = signal('');

  ngOnInit() {
    this.api.listAssets().subscribe((assets) => {
      this.assets.set(assets);
      this.loading.set(false);
    });
  }

  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    this.api.uploadAsset(file).subscribe({
      next: (asset) => {
        this.assets.update((list) => [asset, ...list]);
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.message ?? 'Upload failed. Please try again.');
        input.value = '';
      },
    });
  }

  copy(asset: Asset) {
    navigator.clipboard.writeText(asset.url).then(() => {
      this.copiedId.set(asset.id);
      setTimeout(() => this.copiedId.set(null), 1500);
    });
  }

  remove(asset: Asset) {
    if (!confirm(`Delete “${asset.name}”? Anywhere it is used it will stop showing.`)) return;
    this.api.deleteAsset(asset.id).subscribe(() => {
      this.assets.update((list) => list.filter((a) => a.id !== asset.id));
    });
  }
}
