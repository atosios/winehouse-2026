import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Product, Asset } from './api';
import { WhI18nInput } from './i18n-input';
import { I18nText } from '../core/i18n.service';
import { SiteSettingsService } from '../core/site-settings.service';

@Component({
  selector: 'wh-admin-products',
  imports: [FormsModule, WhI18nInput],
  template: `
    <!-- Top Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage vintage allocations, bottle pricing, cellar varietals, and multi-image galleries.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          (click)="openCreateModal()"
          class="btn btn-primary self-start sm:self-auto cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add Product</span>
        </button>
      </div>
    </div>

    <!-- Category Tabs & Search Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <!-- Category Segmented Filters -->
      <div class="admin-tabs overflow-x-auto">
        <button
          type="button"
          (click)="activeCategory.set('ALL')"
          class="admin-tab whitespace-nowrap"
          [class.active]="activeCategory() === 'ALL'"
        >
          All ({{ products().length }})
        </button>
        @for (cat of categoryOptions(); track cat.key) {
          @if (cat.key !== 'ALL') {
            <button
              type="button"
              (click)="activeCategory.set(cat.key)"
              class="admin-tab whitespace-nowrap"
              [class.active]="activeCategory() === cat.key"
            >
              {{ cat.key }}
            </button>
          }
        }
      </div>

      <!-- Search Input -->
      <input
        type="text"
        [(ngModel)]="searchQuery"
        placeholder="Search products…"
        class="admin-search"
      />
    </div>

    <!-- Products Table / Empty State -->
    @if (loading()) {
      <div class="admin-card p-12 text-center text-xs text-slate-400">
        Loading cellar products…
      </div>
    } @else if (filteredProducts().length === 0) {
      <div class="admin-card p-12 text-center space-y-3">
        <p class="text-xs text-slate-500">No products found matching the criteria.</p>
        <button type="button" (click)="openCreateModal()" class="btn btn-secondary btn-sm">
          + Create Product
        </button>
      </div>
    } @else {
      <div class="admin-card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="w-12">Cover</th>
                <th>Product &amp; Vintage</th>
                <th>Category</th>
                <th>Region &amp; Varietal</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredProducts(); track item.id) {
                <tr>
                  <!-- Thumbnail & Gallery Indicator -->
                  <td>
                    <div class="relative w-10 h-12 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0">
                      <img
                        [src]="item.cover_image || 'cellar_ritual.jpg'"
                        [alt]="item.name"
                        class="w-full h-full object-cover"
                      />
                      @if (item.gallery && item.gallery.length > 0) {
                        <span class="absolute bottom-0 right-0 bg-slate-900/80 text-white font-mono text-[9px] px-1 rounded-tl" title="{{ item.gallery.length }} additional images">
                          +{{ item.gallery.length }}
                        </span>
                      }
                    </div>
                  </td>

                  <!-- Name & Vintage -->
                  <td>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-900">{{ item.name }}</span>
                      <span class="text-[11px] text-slate-500 font-mono">{{ item.vintage || 'NV' }}</span>
                    </div>
                  </td>

                  <!-- Category -->
                  <td>
                    <span class="admin-badge admin-badge-tag">
                      {{ item.category }}
                    </span>
                  </td>

                  <!-- Region & Varietal -->
                  <td>
                    <div class="flex flex-col max-w-[200px] truncate">
                      <span class="text-xs text-slate-700 truncate">{{ getI18nVal(item.region) || '—' }}</span>
                      <span class="text-[11px] text-slate-400 truncate">{{ getI18nVal(item.varietal) || '—' }}</span>
                    </div>
                  </td>

                  <!-- Price -->
                  <td>
                    <span class="text-xs font-semibold text-slate-900">
                      {{ currencySymbol() }} {{ item.price.toFixed(2) }}
                    </span>
                  </td>

                  <!-- Stock -->
                  <td>
                    <div class="flex items-center gap-1.5">
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        [class.bg-emerald-500]="item.stock_quantity > 5"
                        [class.bg-amber-500]="item.stock_quantity <= 5 && item.stock_quantity > 0"
                        [class.bg-red-500]="item.stock_quantity === 0"
                      ></span>
                      <span class="text-xs text-slate-600">
                        {{ item.stock_quantity }}
                      </span>
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td>
                    @if (item.published) {
                      <span class="admin-badge admin-badge-live">
                        <span class="admin-badge-dot"></span>
                        Active
                      </span>
                    } @else {
                      <span class="admin-badge admin-badge-draft">
                        <span class="admin-badge-dot"></span>
                        Draft
                      </span>
                    }
                  </td>

                  <!-- Actions -->
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(item)"
                        class="btn btn-secondary btn-xs cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteProduct(item)"
                        class="btn btn-secondary btn-xs !text-red-600 hover:!bg-red-50 cursor-pointer"
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
      </div>
    }

    <!-- Single Uniform Modal -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-sm font-bold text-slate-900">
                {{ editingProduct()?.id ? 'Edit Product' : 'Add Product' }}
              </h3>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- Language Toggler -->
              <div class="inline-flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-md text-xs font-medium">
                <button
                  type="button"
                  (click)="editingLang.set('en')"
                  class="px-2 py-0.5 rounded transition-colors cursor-pointer"
                  [class.bg-white]="editingLang() === 'en'"
                  [class.shadow-xs]="editingLang() === 'en'"
                  [class.text-slate-900]="editingLang() === 'en'"
                  [class.text-slate-500]="editingLang() !== 'en'"
                >
                  🇬🇧 EN
                </button>
                <button
                  type="button"
                  (click)="editingLang.set('el')"
                  class="px-2 py-0.5 rounded transition-colors cursor-pointer"
                  [class.bg-white]="editingLang() === 'el'"
                  [class.shadow-xs]="editingLang() === 'el'"
                  [class.text-slate-900]="editingLang() === 'el'"
                  [class.text-slate-500]="editingLang() !== 'el'"
                >
                  🇬🇷 GR
                </button>
              </div>

              <button
                type="button"
                (click)="closeModal()"
                class="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Error Feedback Alert -->
          @if (errorMessage()) {
            <div class="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
              <span>⚠ {{ errorMessage() }}</span>
              <button type="button" (click)="errorMessage.set('')" class="text-red-500 hover:text-red-800 text-xs font-bold">✕</button>
            </div>
          }

          <!-- Modal Body Form -->
          <form (ngSubmit)="saveProduct()" class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            
            <!-- Row 1: Name & Vintage -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="admin-field-label">Product Name *</label>
                <input
                  type="text"
                  name="productName"
                  [(ngModel)]="formProduct.name"
                  required
                  placeholder="e.g. RITUÁL"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">Vintage</label>
                <input
                  type="text"
                  name="productVintage"
                  [(ngModel)]="formProduct.vintage"
                  placeholder="2024"
                  class="admin-field-input"
                />
              </div>
            </div>

            <!-- Row 2: Category, Price, Stock -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="admin-field-label">Category</label>
                <select name="productCategory" [(ngModel)]="formProduct.category" class="admin-field-input">
                  @for (cat of categoryOptions(); track cat.key) {
                    <option [value]="cat.key">{{ cat.key }} ({{ getI18nVal(cat.label) }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="admin-field-label">Price ({{ currencySymbol() }}) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="productPrice"
                  [(ngModel)]="formProduct.price"
                  required
                  placeholder="45.00"
                  class="admin-field-input"
                />
              </div>

              <div>
                <label class="admin-field-label">Stock Quantity</label>
                <input
                  type="number"
                  name="productStock"
                  [(ngModel)]="formProduct.stock_quantity"
                  placeholder="50"
                  class="admin-field-input"
                />
              </div>
            </div>

            <!-- Row 3: Origin & Varietal (Bilingual) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <wh-i18n-input label="Region / Origin" [(value)]="formProduct.region" [globalLang]="editingLang()" />
              <wh-i18n-input label="Grape Varietal" [(value)]="formProduct.varietal" [globalLang]="editingLang()" />
            </div>

            <!-- Row 4: Soil & Alcohol -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <wh-i18n-input label="Soil Composition" [(value)]="formProduct.soil" [globalLang]="editingLang()" />
              </div>
              <div>
                <label class="admin-field-label">Alcohol (ABV)</label>
                <input
                  type="text"
                  name="productAlcohol"
                  [(ngModel)]="formProduct.alcohol"
                  placeholder="13.5%"
                  class="admin-field-input"
                />
              </div>
            </div>

            <!-- Row 5: Status Badge Label -->
            <div>
              <wh-i18n-input label="Status Badge Label" [(value)]="formProduct.status_label" [globalLang]="editingLang()" />
            </div>

            <!-- Row 6: Tasting Notes / Description -->
            <div>
              <wh-i18n-input
                label="Description &amp; Tasting Notes"
                [(value)]="formProduct.tasting_note"
                [isTextarea]="true"
                [rows]="3"
                [globalLang]="editingLang()"
              />
            </div>

            <!-- Row 7: Unified Product Photos & Gallery (Single Multi-Upload Dropzone + Click to Set Main) -->
            <div class="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="admin-field-label !mb-0 font-bold text-slate-900">Product Photos</label>
                  <span class="text-2xs text-slate-500">Upload multiple photos at once. Click any photo to set it as the main cover.</span>
                </div>
                @if (uploadedImages().length > 0) {
                  <span class="text-xs font-mono font-semibold text-slate-500">
                    {{ uploadedImages().length }} photo{{ uploadedImages().length === 1 ? '' : 's' }}
                  </span>
                }
              </div>

              <!-- Uploaded Photos Grid (Each image appears once; main is highlighted) -->
              @if (uploadedImages().length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  @for (img of uploadedImages(); track img; let i = $index) {
                    <div
                      (click)="setMainImage(img)"
                      class="relative group rounded-lg border-2 overflow-hidden shadow-2xs aspect-square cursor-pointer transition-all bg-white"
                      [class.border-emerald-500]="mainCoverImage() === img"
                      [class.ring-2]="mainCoverImage() === img"
                      [class.ring-emerald-500/30]="mainCoverImage() === img"
                      [class.border-slate-200]="mainCoverImage() !== img"
                      [class.hover:border-slate-400]="mainCoverImage() !== img"
                    >
                      <img [src]="img" class="w-full h-full object-cover" [alt]="'Product photo ' + (i + 1)" />

                      <!-- Main Cover Badge -->
                      @if (mainCoverImage() === img) {
                        <div class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 pointer-events-none">
                          <span>★</span> Main Cover
                        </div>
                      } @else {
                        <div class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white/90 font-mono text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to make Main
                        </div>
                      }

                      <!-- Delete Action Button -->
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); removeImage(img)"
                        class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center text-[10px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- Upload Drag & Drop Box (Supports Multiple Files at once) -->
              <div
                class="p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 bg-white"
                [class.border-wine-500]="isDragging()"
                [class.bg-wine-50/20]="isDragging()"
                [class.border-slate-300]="!isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
              >
                <!-- Hidden Native Multi-File Input -->
                <input
                  #multiFileInput
                  type="file"
                  multiple
                  accept="image/*"
                  (change)="onFilesSelected($event)"
                  class="hidden"
                />

                <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>

                @if (uploadingCount() > 0) {
                  <div class="flex items-center gap-2 text-xs font-semibold text-wine-600">
                    <span class="animate-spin text-sm">⏳</span>
                    <span>Uploading {{ uploadingCount() }} image(s)…</span>
                  </div>
                } @else {
                  <div>
                    <p class="text-xs font-semibold text-slate-800">
                      Drag &amp; drop multiple images here, or choose from options
                    </p>
                    <p class="text-2xs text-slate-400 mt-0.5">JPG, PNG, WEBP up to 10MB each</p>
                  </div>

                  <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      (click)="multiFileInput.click()"
                      class="btn btn-secondary btn-xs cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span>Upload Multiple Files</span>
                    </button>
                    <button
                      type="button"
                      (click)="openAssetLibraryModal()"
                      class="btn btn-secondary btn-xs cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span>Pick from Media Library</span>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Row 8: Visibility Toggle & Actions -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="productPublished"
                  [(ngModel)]="formProduct.published"
                  class="rounded border-slate-300 text-wine-600 focus:ring-wine-500"
                />
                <span>Show in e-Shop</span>
              </label>

              <div class="flex items-center gap-2">
                <button type="button" (click)="closeModal()" class="btn btn-secondary btn-sm cursor-pointer">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving() || uploadingCount() > 0" class="btn btn-primary btn-sm cursor-pointer">
                  {{ saving() ? 'Saving…' : (editingProduct()?.id ? 'Update Product' : 'Create Product') }}
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>
    }

    <!-- Asset Library Multi-Picker Modal -->
    @if (isAssetModalOpen()) {
      <div class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Select Media Library Photos</h3>
              <p class="text-2xs text-slate-500">Click photos to select multiple, then click Add Selected.</p>
            </div>
            <button
              type="button"
              (click)="closeAssetLibraryModal()"
              class="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div class="p-5 max-h-[60vh] overflow-y-auto">
            @if (loadingAssets()) {
              <div class="py-12 text-center text-xs text-slate-400">Loading library assets…</div>
            } @else if (availableAssets().length === 0) {
              <div class="py-12 text-center text-xs text-slate-500">No media assets found in library.</div>
            } @else {
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                @for (asset of availableAssets(); track asset.id) {
                  <div
                    (click)="toggleAssetSelection(asset.url)"
                    class="relative group rounded-lg border-2 overflow-hidden aspect-square cursor-pointer transition-all bg-slate-100"
                    [class.border-wine-600]="isAssetSelected(asset.url)"
                    [class.ring-2]="isAssetSelected(asset.url)"
                    [class.ring-wine-600/30]="isAssetSelected(asset.url)"
                    [class.border-slate-200]="!isAssetSelected(asset.url)"
                  >
                    <img [src]="asset.url" [alt]="asset.name" class="w-full h-full object-cover" />
                    
                    <!-- Selection Indicator -->
                    @if (isAssetSelected(asset.url)) {
                      <div class="absolute top-1 right-1 w-5 h-5 rounded-full bg-wine-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        ✓
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span class="text-xs font-mono text-slate-500">
              {{ selectedAssetUrls().length }} photo(s) selected
            </span>
            <div class="flex items-center gap-2">
              <button type="button" (click)="closeAssetLibraryModal()" class="btn btn-secondary btn-xs cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                [disabled]="selectedAssetUrls().length === 0"
                (click)="addSelectedAssetsToProduct()"
                class="btn btn-primary btn-xs cursor-pointer"
              >
                Add Selected ({{ selectedAssetUrls().length }})
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class AdminProducts implements OnInit {
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isModalOpen = signal(false);
  readonly errorMessage = signal('');
  readonly editingProduct = signal<Product | null>(null);
  readonly editingLang = signal<'en' | 'el'>('en');

  // Unified image collection & selected main cover photo
  readonly uploadedImages = signal<string[]>([]);
  readonly mainCoverImage = signal<string>('');
  readonly isDragging = signal(false);
  readonly uploadingCount = signal(0);

  // Asset Library Picker
  readonly isAssetModalOpen = signal(false);
  readonly loadingAssets = signal(false);
  readonly availableAssets = signal<Asset[]>([]);
  readonly selectedAssetUrls = signal<string[]>([]);

  searchQuery = '';
  readonly activeCategory = signal<string>('ALL');

  readonly categoryOptions = computed(() => {
    const cats = this.settingsService.storeConfig().categories;
    return cats && cats.length ? cats : [
      { key: 'ALL', label: { en: 'ALL BOTTLES', el: 'ΟΛΕΣ ΟΙ ΦΙΑΛΕΣ' }, enabled: true },
      { key: 'VOLCANIC', label: { en: 'VOLCANIC SOIL', el: 'ΗΦΑΙΣΤΕΙΑΚΟ ΕΔΑΦΟΣ' }, enabled: true },
      { key: 'NATURAL', label: { en: 'NATURAL & WILD', el: 'ΦΥΣΙΚΑ & ΑΓΡΙΑ' }, enabled: true },
      { key: 'RESERVE', label: { en: 'CELLAR RESERVE', el: 'ΠΑΛΑΙΩΣΗ & RESERVE' }, enabled: true },
      { key: 'INDIGENOUS', label: { en: 'ANCIENT INDIGENOUS', el: 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ' }, enabled: true },
    ];
  });

  readonly categoryTabs = computed(() => {
    return this.categoryOptions().map((c) => c.key);
  });

  readonly currencySymbol = computed(() => {
    return this.settingsService.storeConfig().currency_symbol || '€';
  });

  formProduct: Partial<Product> = this.getEmptyProduct();

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.api.listProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getI18nVal(val?: I18nText | string | null): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.en || val.el || '';
  }

  private cloneI18n(val?: I18nText | string | null): I18nText {
    if (!val) return { en: '', el: '' };
    if (typeof val === 'string') return { en: val, el: '' };
    return { en: val.en || '', el: val.el || '' };
  }

  readonly filteredProducts = computed(() => {
    const list = this.products();
    const query = this.searchQuery.trim().toLowerCase();
    const cat = this.activeCategory();

    return list.filter((p) => {
      const matchCat = cat === 'ALL' || p.category === cat;
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.vintage && p.vintage.toLowerCase().includes(query)) ||
        this.getI18nVal(p.varietal).toLowerCase().includes(query) ||
        this.getI18nVal(p.region).toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  });

  private getEmptyProduct(): Partial<Product> {
    return {
      name: '',
      vintage: new Date().getFullYear().toString(),
      category: 'VOLCANIC',
      price: 45.0,
      compare_at_price: null,
      stock_quantity: 50,
      is_allocated: true,
      status_label: { en: 'LIMITED ALLOCATION', el: 'ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ' },
      status_bg: 'bg-[#922e1b]',
      region: { en: '', el: '' },
      varietal: { en: '', el: '' },
      soil: { en: '', el: '' },
      alcohol: '13.5%',
      tasting_note: { en: '', el: '' },
      cover_image: '',
      gallery: [],
      published: true,
      sort_order: 0,
    };
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.errorMessage.set('');
    this.uploadedImages.set([]);
    this.mainCoverImage.set('');
    this.formProduct = this.getEmptyProduct();
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.errorMessage.set('');

    const allImages: string[] = [];
    if (product.cover_image) allImages.push(product.cover_image);
    if (product.gallery && Array.isArray(product.gallery)) {
      product.gallery.forEach((g) => {
        if (g && !allImages.includes(g)) {
          allImages.push(g);
        }
      });
    }

    this.uploadedImages.set(allImages);
    this.mainCoverImage.set(product.cover_image || allImages[0] || '');

    this.formProduct = {
      ...product,
      gallery: Array.isArray(product.gallery) ? [...product.gallery] : [],
      region: this.cloneI18n(product.region),
      varietal: this.cloneI18n(product.varietal),
      status_label: this.cloneI18n(product.status_label),
      soil: this.cloneI18n(product.soil),
      tasting_note: this.cloneI18n(product.tasting_note),
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set('');
    this.editingProduct.set(null);
  }

  // --- Multi-File Upload & Drag/Drop Handlers ---
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  onFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private uploadFiles(files: File[]): void {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    this.uploadingCount.set(imageFiles.length);

    imageFiles.forEach((file) => {
      this.api.uploadAsset(file).subscribe({
        next: (asset) => {
          const url = asset.url || asset.path;
          this.uploadedImages.update((list) => {
            if (!list.includes(url)) {
              return [...list, url];
            }
            return list;
          });

          if (!this.mainCoverImage() || this.uploadedImages().length === 1) {
            this.mainCoverImage.set(url);
          }

          this.uploadingCount.update((c) => Math.max(0, c - 1));
        },
        error: () => {
          this.uploadingCount.update((c) => Math.max(0, c - 1));
        },
      });
    });
  }

  setMainImage(imageUrl: string): void {
    this.mainCoverImage.set(imageUrl);
  }

  removeImage(imageUrl: string): void {
    this.uploadedImages.update((list) => list.filter((img) => img !== imageUrl));
    if (this.mainCoverImage() === imageUrl) {
      const remaining = this.uploadedImages();
      this.mainCoverImage.set(remaining.length > 0 ? remaining[0] : '');
    }
  }

  // --- Asset Library Modal Handlers ---
  openAssetLibraryModal(): void {
    this.selectedAssetUrls.set([]);
    this.isAssetModalOpen.set(true);
    this.loadingAssets.set(true);
    this.api.listAssets().subscribe({
      next: (assets) => {
        this.availableAssets.set(assets.filter((a) => !a.mime_type || a.mime_type.startsWith('image/')));
        this.loadingAssets.set(false);
      },
      error: () => {
        this.loadingAssets.set(false);
      },
    });
  }

  closeAssetLibraryModal(): void {
    this.isAssetModalOpen.set(false);
  }

  toggleAssetSelection(url: string): void {
    this.selectedAssetUrls.update((current) => {
      if (current.includes(url)) {
        return current.filter((u) => u !== url);
      }
      return [...current, url];
    });
  }

  isAssetSelected(url: string): boolean {
    return this.selectedAssetUrls().includes(url);
  }

  addSelectedAssetsToProduct(): void {
    const urls = this.selectedAssetUrls();
    urls.forEach((url) => {
      this.uploadedImages.update((list) => {
        if (!list.includes(url)) {
          return [...list, url];
        }
        return list;
      });

      if (!this.mainCoverImage() || this.uploadedImages().length === 1) {
        this.mainCoverImage.set(url);
      }
    });

    this.closeAssetLibraryModal();
  }

  saveProduct(): void {
    this.errorMessage.set('');
    if (!this.formProduct.name?.trim()) {
      this.errorMessage.set('Please enter a product name.');
      return;
    }

    const allImages = this.uploadedImages();
    const mainImg = this.mainCoverImage() || (allImages.length > 0 ? allImages[0] : '');
    const galleryImgs = allImages.filter((img) => img !== mainImg);

    const payload: Partial<Product> = {
      ...this.formProduct,
      name: this.formProduct.name.trim(),
      cover_image: mainImg,
      gallery: galleryImgs,
      price: typeof this.formProduct.price === 'string' ? parseFloat(this.formProduct.price) || 0 : (this.formProduct.price ?? 0),
      stock_quantity: typeof this.formProduct.stock_quantity === 'string' ? parseInt(this.formProduct.stock_quantity, 10) || 0 : (this.formProduct.stock_quantity ?? 50),
      category: this.formProduct.category || 'VOLCANIC',
    };

    this.saving.set(true);
    const existing = this.editingProduct();

    if (existing?.id) {
      this.api.updateProduct(existing.id, payload).subscribe({
        next: (updated) => {
          this.products.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
          this.saving.set(false);
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating product:', err);
          const msg = err?.error?.message || err?.error?.error || 'Failed to update product. Please check required fields.';
          this.errorMessage.set(msg);
          this.saving.set(false);
        },
      });
    } else {
      this.api.createProduct(payload).subscribe({
        next: (created) => {
          this.products.update((list) => [created, ...list]);
          this.saving.set(false);
          this.closeModal();
        },
        error: (err) => {
          console.error('Error creating product:', err);
          const msg = err?.error?.message || err?.error?.error || 'Failed to create product. Please check required fields.';
          this.errorMessage.set(msg);
          this.saving.set(false);
        },
      });
    }
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to remove ${product.name}?`)) {
      this.api.deleteProduct(product.id).subscribe({
        next: () => {
          this.products.update((list) => list.filter((p) => p.id !== product.id));
        },
      });
    }
  }
}
