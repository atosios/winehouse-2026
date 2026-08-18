import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Product, Asset, GrapeVarietyItem } from './api';
import { WhI18nInput } from './i18n-input';
import { AdminConfirm } from './confirm-dialog';
import { I18nService, I18nText } from '../core/i18n.service';
import { SiteSettingsService } from '../core/site-settings.service';
import { resolveMediaUrl } from '../core/media.utils';

@Component({
  selector: 'wh-admin-products',
  imports: [FormsModule, WhI18nInput],
  template: `
    <!-- Top Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage vintage allocations, bottle pricing, cellar varietals, and bulk CSV imports.</p>
      </div>

      <div class="flex items-center flex-wrap gap-2">
        <!-- Download Template CSV Button -->
        <button
          type="button"
          (click)="downloadCsvTemplate()"
          class="btn btn-secondary text-xs cursor-pointer flex items-center gap-1.5"
          title="Download template CSV with expected headers and sample rows"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Template CSV</span>
        </button>

        <!-- Import CSV Button -->
        <button
          type="button"
          (click)="openCsvImportModal()"
          class="btn btn-secondary text-xs cursor-pointer flex items-center gap-1.5"
          title="Upload CSV to import multiple products at once"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Import CSV</span>
        </button>

        <!-- Add Single Product Button -->
        <button
          type="button"
          (click)="openCreateModal()"
          class="btn btn-primary text-xs cursor-pointer flex items-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
                        [src]="mediaUrl(item.cover_image || 'cellar_ritual.jpg')"
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

    <!-- Single Uniform Modal: 2-Column Live Site Layout -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{{ editingProduct()?.id ? 'Edit Product' : 'Add Product' }}</span>
                @if (formProduct.name) {
                  <span class="text-xs font-mono text-slate-500 font-normal">/ {{ formProduct.name }}</span>
                }
              </h3>
              <p class="text-2xs text-slate-500 mt-0.5">Live store layout: showcase imagery on the left, commercial &amp; terroir dossier on the right.</p>
            </div>

            <div class="flex items-center gap-3">
              <!-- Minimalist Editorial Language Switcher (Homepage Style) -->
              <div
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-mono font-bold tracking-widest uppercase transition-all duration-300 border border-slate-200/80 bg-white shadow-2xs select-none text-slate-700"
              >
                <button
                  type="button"
                  (click)="i18n.setLang('en')"
                  class="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                  [class.opacity-100]="i18n.currentLang() === 'en'"
                  [class.opacity-35]="i18n.currentLang() !== 'en'"
                  title="English"
                >
                  EN
                </button>
                <span class="opacity-25 text-[10px] font-normal">/</span>
                <button
                  type="button"
                  (click)="i18n.setLang('el')"
                  class="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                  [class.opacity-100]="i18n.currentLang() === 'el'"
                  [class.opacity-35]="i18n.currentLang() !== 'el'"
                  title="Ελληνικά"
                >
                  GR
                </button>
              </div>

              <button
                type="button"
                (click)="closeModal()"
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Error Feedback Alert -->
          @if (errorMessage()) {
            <div class="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
              <span>{{ errorMessage() }}</span>
              <button type="button" (click)="errorMessage.set('')" class="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">✕</button>
            </div>
          }

          <!-- Modal Body: 2-Column Split (Media on Left, Dossier Inputs on Right) -->
          <form (ngSubmit)="saveProduct()" class="p-6 max-h-[78vh] overflow-y-auto">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              <!-- ======================================================== -->
              <!-- LEFT COLUMN: Product Photos & Gallery (Square / 4:5 Frame) -->
              <!-- ======================================================== -->
              <div class="lg:col-span-5 flex flex-col gap-4">
                
                <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3.5">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="admin-field-label !mb-0 font-bold text-slate-900 flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>Product Media</span>
                      </span>
                      <span class="text-2xs text-slate-500">Square &amp; bottle showcase photos</span>
                    </div>
                    @if (uploadedImages().length > 0) {
                      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {{ uploadedImages().length }} photo{{ uploadedImages().length === 1 ? '' : 's' }}
                      </span>
                    }
                  </div>

                  <!-- Primary Photo Frame (Square Aspect Ratio — Never full width) -->
                  <div class="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-white aspect-square flex items-center justify-center shadow-xs group">
                    @if (mainCoverImage()) {
                      <img
                        [src]="mediaUrl(mainCoverImage())"
                        class="w-full h-full object-cover"
                        [alt]="formProduct.name || 'Product photo'"
                      />

                      <!-- Overlay Badges (Matching Live Site) -->
                      <div class="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
                        <span class="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs">
                          Main Cover
                        </span>
                        @if (formProduct.vintage) {
                          <span class="px-2 py-0.5 rounded bg-slate-900/85 text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs">
                            VINTAGE {{ formProduct.vintage }}
                          </span>
                        }
                      </div>

                      @if (formProduct.alcohol) {
                        <div class="absolute bottom-2 right-2 pointer-events-none">
                          <span class="px-2 py-0.5 rounded bg-white/95 text-slate-900 border border-slate-200 font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs">
                            {{ formProduct.alcohol }} ABV
                          </span>
                        </div>
                      }

                      <!-- Hover Change Overlay: Single Button -->
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          (click)="openAssetLibraryModal()"
                          class="btn btn-secondary btn-xs !bg-white/95 !text-slate-800 shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span>Manage Photos / Upload</span>
                        </button>
                      </div>
                    } @else {
                      <!-- Empty State Square Dropzone: Clicking opens unified modal -->
                      <div
                        class="w-full h-full flex flex-col items-center justify-center text-center p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                        (click)="openAssetLibraryModal()"
                      >
                        <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <p class="text-xs font-bold text-slate-800">No Photo Selected</p>
                        <p class="text-2xs text-slate-400 mt-0.5">Click to choose from library or upload</p>
                      </div>
                    }
                  </div>

                  <!-- Gallery Thumbnails Strip (Click to switch main cover) -->
                  @if (uploadedImages().length > 0) {
                    <div class="space-y-1.5 pt-1">
                      <span class="text-2xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Gallery Collection (Click thumbnail to set as main)
                      </span>
                      <div class="grid grid-cols-4 gap-2">
                        @for (img of uploadedImages(); track img; let i = $index) {
                          <div
                            (click)="setMainImage(img)"
                            class="relative group rounded-lg border-2 overflow-hidden aspect-square cursor-pointer transition-all bg-white"
                            [class.border-emerald-500]="mainCoverImage() === img"
                            [class.ring-2]="mainCoverImage() === img"
                            [class.ring-emerald-500/30]="mainCoverImage() === img"
                            [class.border-slate-200]="mainCoverImage() !== img"
                            [class.hover:border-slate-400]="mainCoverImage() !== img"
                          >
                            <img [src]="mediaUrl(img)" class="w-full h-full object-cover" [alt]="'Photo ' + (i + 1)" />

                            @if (mainCoverImage() === img) {
                              <div class="absolute bottom-0 inset-x-0 bg-emerald-600 text-white font-mono text-[8px] font-bold text-center py-0.5">
                                MAIN
                              </div>
                            }

                            <!-- Delete Thumbnail Button -->
                            <button
                              type="button"
                              (click)="$event.stopPropagation(); removeImage(img)"
                              class="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/85 hover:bg-red-600 text-white flex items-center justify-center text-[9px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Single Unified Action Button to choose from library or upload -->
                  <div class="pt-1">
                    <button
                      type="button"
                      (click)="openAssetLibraryModal()"
                      class="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span>Choose from Library or Upload Photos</span>
                    </button>
                  </div>

                </div>

              </div>

              <!-- ======================================================== -->
              <!-- RIGHT COLUMN: Technical Product Dossier & Live Form Inputs -->
              <!-- ======================================================== -->
              <div class="lg:col-span-7 space-y-4">
                
                <!-- Section 1: Identity & Pricing -->
                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span class="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">01 / Identity &amp; Pricing</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div class="sm:col-span-2">
                      <label class="admin-field-label">Product Name *</label>
                      <input
                        type="text"
                        name="productName"
                        [(ngModel)]="formProduct.name"
                        (ngModelChange)="onIdentityChange()"
                        required
                        placeholder="e.g. RITUÁL"
                        class="admin-field-input !text-sm !font-bold"
                      />
                    </div>

                    <div>
                      <label class="admin-field-label">Vintage</label>
                      <input
                        type="text"
                        name="productVintage"
                        [(ngModel)]="formProduct.vintage"
                        (ngModelChange)="onIdentityChange()"
                        placeholder="2024 / NV"
                        class="admin-field-input font-mono"
                      />
                    </div>
                  </div>

                  <!-- Category, Price, Stock Quantity -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div>
                      <label class="admin-field-label">Category</label>
                      <select
                        name="productCategory"
                        [(ngModel)]="formProduct.category"
                        (ngModelChange)="onIdentityChange()"
                        class="admin-field-input font-semibold text-slate-800"
                      >
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
                        class="admin-field-input font-mono !font-bold text-wine-800"
                      />
                    </div>

                    <div>
                      <label class="admin-field-label">Stock Quantity</label>
                      <input
                        type="number"
                        name="productStock"
                        [(ngModel)]="formProduct.stock_quantity"
                        placeholder="50"
                        class="admin-field-input font-mono"
                      />
                    </div>
                  </div>

                  <!-- URL Slug (Auto-generated from Name + Category + Vintage & Editable) -->
                  <div class="pt-1.5 border-t border-slate-200/60 mt-2">
                    <div class="flex items-center justify-between mb-1.5">
                      <label class="admin-field-label !mb-0 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        <span>URL Slug / Permalink</span>
                        @if (!isSlugCustomized()) {
                          <span class="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            AUTO-SYNCED
                          </span>
                        } @else {
                          <span class="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            CUSTOM
                          </span>
                        }
                      </label>
                      <button
                        type="button"
                        (click)="regenerateSlug()"
                        class="text-[11px] font-mono text-slate-500 hover:text-wine-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Reset & auto-generate slug from Name, Category, and Vintage"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        <span>Auto-generate</span>
                      </button>
                    </div>

                    <div class="relative flex items-center">
                      <span class="absolute left-3 font-mono text-xs text-slate-400 select-none pointer-events-none">
                        /shop/
                      </span>
                      <input
                        type="text"
                        name="productSlug"
                        [(ngModel)]="formProduct.slug"
                        (input)="onSlugManualEdit()"
                        (blur)="onSlugBlur()"
                        placeholder="ritual-volcanic-2024"
                        class="admin-field-input !pl-16 font-mono text-xs !font-semibold text-slate-800"
                      />
                    </div>
                    <p class="text-2xs text-slate-400 mt-1 font-mono">
                      Dedicated product page route: <span class="text-slate-700 font-medium">/shop/{{ formProduct.slug || 'bottle-slug' }}</span>
                    </p>
                  </div>
                </div>

                <!-- Section 2: Terroir & Technical Specifications -->
                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span class="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">02 / Terroir &amp; Specifications</span>
                  </div>

                  <!-- Region / Origin (Bilingual) -->
                  <div>
                    <wh-i18n-input label="Region / Origin" [(value)]="formProduct.region" [globalLang]="editingLang()" helperText="e.g. Pyrgos, Santorini PDO" />
                  </div>

                  <!-- Grape Varieties & Blend Composition (List with Add & Percentage) -->
                  <div class="space-y-2.5 pt-2 border-t border-slate-200/60">
                    <div class="flex items-center justify-between">
                      <div>
                        <label class="admin-field-label !mb-0">Grape Varieties &amp; Blend</label>
                        <span class="text-2xs text-slate-500">Add grape varieties with optional percentages (e.g. 70% Assyrtiko, 30% Athiri).</span>
                      </div>
                      <button
                        type="button"
                        (click)="addVariety()"
                        class="btn btn-secondary btn-xs flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>Add Variety</span>
                      </button>
                    </div>

                    @if (formVarieties().length === 0) {
                      <div class="p-3 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No grape varieties added yet. Click <button type="button" (click)="addVariety()" class="text-wine-700 underline font-semibold cursor-pointer">Add Variety</button> to define the blend.
                      </div>
                    } @else {
                      <div class="space-y-2">
                        @for (item of formVarieties(); track $index) {
                          <div class="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                            <span class="text-2xs font-mono font-bold text-slate-400 px-1">#{{ $index + 1 }}</span>

                            <div class="flex-1 min-w-0">
                              <wh-i18n-input
                                [(value)]="item.variety"
                                [globalLang]="editingLang()"
                                placeholder="e.g. Assyrtiko / Xinomavro"
                                (valueChange)="onVarietyChange()"
                              />
                            </div>

                            <div class="w-24 shrink-0 relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                [(ngModel)]="item.percentage"
                                (ngModelChange)="onVarietyChange()"
                                placeholder="%"
                                class="admin-field-input !py-1.5 !pr-6 text-center font-bold font-mono text-xs"
                                title="Optional blend percentage"
                              />
                              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">%</span>
                            </div>

                            <button
                              type="button"
                              (click)="removeVariety($index)"
                              class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
                              title="Remove this variety"
                            >
                              ✕
                            </button>
                          </div>
                        }
                      </div>

                      <!-- Live Preview & Total Percentage Status -->
                      <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-2xs font-mono text-slate-500">
                        <div class="flex items-center gap-1.5 truncate">
                          <span class="font-bold text-slate-600">Sync Preview:</span>
                          <span class="text-slate-800 font-medium truncate">{{ getI18nVal(formProduct.varietal) || '—' }}</span>
                        </div>

                        @if (totalPercentage() > 0) {
                          <div class="flex items-center gap-1">
                            <span class="text-slate-400">Total:</span>
                            <span
                              class="font-bold px-1.5 py-0.5 rounded"
                              [class.bg-emerald-50]="totalPercentage() === 100"
                              [class.text-emerald-700]="totalPercentage() === 100"
                              [class.bg-amber-50]="totalPercentage() !== 100"
                              [class.text-amber-700]="totalPercentage() !== 100"
                            >
                              {{ totalPercentage() }}%
                            </span>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <!-- Soil & Alcohol -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div class="sm:col-span-2">
                      <wh-i18n-input label="Soil Composition" [(value)]="formProduct.soil" [globalLang]="editingLang()" helperText="e.g. Volcanic ash, pumice &amp; lava" />
                    </div>
                    <div>
                      <label class="admin-field-label">Alcohol (ABV)</label>
                      <input
                        type="text"
                        name="productAlcohol"
                        [(ngModel)]="formProduct.alcohol"
                        placeholder="13.5%"
                        class="admin-field-input font-mono"
                      />
                    </div>
                  </div>
                </div>

                <!-- Section 3: Status Pill & Tasting Notes -->
                <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span class="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">03 / Status &amp; Description</span>
                  </div>

                  <!-- Status Badge Label -->
                  <div>
                    <wh-i18n-input label="Status Tape / Sticker Label" [(value)]="formProduct.status_label" [globalLang]="editingLang()" helperText="e.g. LIMITED ALLOCATION / SINGLE VINEYARD" />
                  </div>

                  <!-- Tasting Notes / Description -->
                  <div>
                    <wh-i18n-input
                      label="Description &amp; Sommelier Tasting Notes"
                      [(value)]="formProduct.tasting_note"
                      [isTextarea]="true"
                      [rows]="3"
                      [globalLang]="editingLang()"
                      helperText="Sensory notes (minerality, acidity, citrus, volcanic finish)"
                    />
                  </div>
                </div>

                <!-- Footer / Actions Bar -->
                <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="productPublished"
                      [(ngModel)]="formProduct.published"
                      class="rounded border-slate-300 text-wine-600 focus:ring-wine-500"
                    />
                    <span>Show in Live e-Shop</span>
                  </label>

                  <div class="flex items-center gap-2.5">
                    <button type="button" (click)="closeModal()" class="btn btn-secondary btn-sm cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" [disabled]="saving() || uploadingCount() > 0" class="btn btn-primary btn-sm cursor-pointer shadow-sm">
                      {{ saving() ? 'Saving…' : (editingProduct()?.id ? 'Update Product' : 'Create Product') }}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </form>

        </div>
      </div>
    }

    <!-- Asset Library & Upload Multi-Picker Modal -->
    @if (isAssetModalOpen()) {
      <div class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Product Photos</h3>
              <p class="text-2xs text-slate-500">Pick from existing library photos or upload new images from your device.</p>
            </div>
            <button
              type="button"
              (click)="closeAssetLibraryModal()"
              class="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Modal Tabs -->
          <div class="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div class="admin-tabs !mb-0">
              <button
                type="button"
                class="admin-tab flex items-center gap-1.5 cursor-pointer text-xs"
                [class.active]="assetModalTab() === 'library'"
                (click)="assetModalTab.set('library')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Media Library ({{ availableAssets().length }})</span>
              </button>
              <button
                type="button"
                class="admin-tab flex items-center gap-1.5 cursor-pointer text-xs"
                [class.active]="assetModalTab() === 'upload'"
                (click)="assetModalTab.set('upload')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>Upload New</span>
              </button>
            </div>

            @if (assetModalTab() === 'library') {
              <div class="text-2xs text-slate-400 font-mono">
                {{ selectedAssetUrls().length }} selected
              </div>
            }
          </div>

          <!-- Modal Body -->
          <div class="p-5 max-h-[55vh] overflow-y-auto min-h-[260px]">
            @if (assetModalTab() === 'library') {
              @if (loadingAssets()) {
                <div class="py-16 text-center text-xs text-slate-400">
                  <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-wine-600 mb-2"></div>
                  <p>Loading library assets…</p>
                </div>
              } @else if (availableAssets().length === 0) {
                <div class="py-16 text-center text-xs text-slate-500">
                  <p class="font-semibold text-slate-700">No media assets found in library</p>
                  <button type="button" (click)="assetModalTab.set('upload')" class="btn btn-primary btn-xs mt-3 cursor-pointer">
                    + Upload Photos
                  </button>
                </div>
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
                      <img [src]="mediaUrl(asset.url || asset.path)" [alt]="asset.name" class="w-full h-full object-cover" />
                      
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
            }

            @if (assetModalTab() === 'upload') {
              <div class="py-4 max-w-md mx-auto">
                <div
                  class="p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-wine-600 bg-slate-50 hover:bg-slate-100/60 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer"
                  (click)="modalUploadInput.click()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onDrop($event)"
                >
                  <input
                    #modalUploadInput
                    type="file"
                    multiple
                    accept="image/*"
                    (change)="onFilesSelected($event)"
                    class="hidden"
                  />

                  <div class="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </div>

                  <div>
                    <h4 class="text-xs font-bold text-slate-900">
                      {{ uploadingCount() > 0 ? 'Uploading photo(s)…' : 'Drag & drop photos or click to browse' }}
                    </h4>
                    <p class="text-2xs text-slate-400 mt-0.5">
                      Supports JPG, PNG, WEBP. Uploaded photos are added directly to this product.
                    </p>
                  </div>

                  @if (uploadingCount() > 0) {
                    <div class="inline-flex items-center gap-1.5 text-xs text-wine-600 font-semibold font-mono">
                      <span class="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-wine-300 border-t-wine-600"></span>
                      <span>Uploading {{ uploadingCount() }} item(s)…</span>
                    </div>
                  } @else {
                    <button type="button" class="btn btn-primary btn-xs mt-1 pointer-events-none">
                      Browse Files
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span class="text-xs font-mono text-slate-500">
              @if (assetModalTab() === 'library') {
                {{ selectedAssetUrls().length }} photo(s) selected
              } @else {
                {{ uploadedImages().length }} total product photo(s)
              }
            </span>
            <div class="flex items-center gap-2">
              <button type="button" (click)="closeAssetLibraryModal()" class="btn btn-secondary btn-xs cursor-pointer">
                {{ assetModalTab() === 'upload' ? 'Done' : 'Cancel' }}
              </button>
              @if (assetModalTab() === 'library') {
                <button
                  type="button"
                  [disabled]="selectedAssetUrls().length === 0"
                  (click)="addSelectedAssetsToProduct()"
                  class="btn btn-primary btn-xs cursor-pointer"
                >
                  Add Selected ({{ selectedAssetUrls().length }})
                </button>
              }
            </div>
          </div>

        </div>
      </div>
    }

    <!-- CSV Bulk Import Modal -->
    @if (isCsvModalOpen()) {
      <div class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Bulk Import Products from CSV</span>
              </h3>
              <p class="text-2xs text-slate-500 mt-0.5">Upload a CSV file to create or import multiple wine products simultaneously.</p>
            </div>

            <button
              type="button"
              (click)="closeCsvImportModal()"
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            <!-- Template Helper Banner -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-slate-800 block">Need the CSV column headers?</span>
                <p class="text-2xs text-slate-500">Download our sample template containing the exact headers and real example products.</p>
              </div>
              <button
                type="button"
                (click)="downloadCsvTemplate()"
                class="btn btn-secondary btn-xs shrink-0 self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Download Template CSV</span>
              </button>
            </div>

            <!-- Error Feedback -->
            @if (csvError()) {
              <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
                <span>{{ csvError() }}</span>
                <button type="button" (click)="csvError.set('')" class="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">✕</button>
              </div>
            }

            <!-- Success Feedback -->
            @if (csvSuccessMessage()) {
              <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-emerald-600 font-bold">✓</span>
                  <span>{{ csvSuccessMessage() }}</span>
                </div>
              </div>
            }

            <!-- Dropzone Area -->
            @if (!csvFile()) {
              <div
                class="p-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                [class.border-wine-500]="isCsvDragging()"
                [class.bg-wine-50/20]="isCsvDragging()"
                (click)="csvFileInput.click()"
                (dragover)="onCsvDragOver($event)"
                (dragleave)="onCsvDragLeave($event)"
                (drop)="onCsvDrop($event)"
              >
                <input
                  #csvFileInput
                  type="file"
                  accept=".csv,text/csv"
                  (change)="onCsvFileSelected($event)"
                  class="hidden"
                />
                
                <div class="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:border-wine-300 transition-all mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>

                <p class="text-xs font-bold text-slate-800">Select or drop your CSV file here</p>
                <p class="text-2xs text-slate-400 mt-1">Supports UTF-8 CSV with comma (,) or semicolon (;) separators</p>
              </div>
            } @else {
              <!-- Selected File & Preview Box -->
              <div class="space-y-3">
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-wine-100 text-wine-800 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      CSV
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-slate-800 truncate">{{ csvFile()?.name }}</p>
                      <p class="text-2xs text-slate-400 font-mono">{{ formatFileSize(csvFile()?.size || 0) }} • {{ csvPreviewRows().length }} rows detected</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    (click)="clearCsvFile()"
                    class="btn btn-secondary btn-xs !text-red-600 hover:!bg-red-50 cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                <!-- Live Preview Table -->
                @if (csvPreviewRows().length > 0) {
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-2xs font-mono font-bold uppercase tracking-wider text-slate-600">
                        Preview (First {{ Math.min(5, csvPreviewRows().length) }} of {{ csvPreviewRows().length }} items)
                      </span>
                    </div>

                    <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div class="overflow-x-auto max-h-48">
                        <table class="w-full text-left text-xs border-collapse">
                          <thead class="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200 sticky top-0">
                            <tr>
                              <th class="p-2">#</th>
                              <th class="p-2">Name</th>
                              <th class="p-2">Vintage</th>
                              <th class="p-2">Category</th>
                              <th class="p-2">Price</th>
                              <th class="p-2">Stock</th>
                              <th class="p-2">Varietal</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100 text-slate-800 text-2xs">
                            @for (row of csvPreviewRows().slice(0, 5); track $index) {
                              <tr class="hover:bg-slate-50/80">
                                <td class="p-2 font-mono text-slate-400">{{ $index + 1 }}</td>
                                <td class="p-2 font-bold">{{ row.name || '—' }}</td>
                                <td class="p-2 font-mono text-slate-600">{{ row.vintage || 'NV' }}</td>
                                <td class="p-2 font-mono">{{ row.category || 'VOLCANIC' }}</td>
                                <td class="p-2 font-mono font-bold text-wine-800">{{ currencySymbol() }} {{ row.price || '0.00' }}</td>
                                <td class="p-2 font-mono">{{ row.stock_quantity || '50' }}</td>
                                <td class="p-2 text-slate-600 truncate max-w-[140px]">{{ row.varietal_en || row.varietal || '—' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span class="text-2xs font-mono text-slate-500">
              @if (csvPreviewRows().length > 0) {
                {{ csvPreviewRows().length }} product(s) ready to import
              }
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="closeCsvImportModal()"
                class="btn btn-secondary btn-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                [disabled]="!csvFile() || csvPreviewRows().length === 0 || csvImporting()"
                (click)="submitCsvImport()"
                class="btn btn-primary btn-xs cursor-pointer shadow-sm"
              >
                @if (csvImporting()) {
                  <span>Importing…</span>
                } @else {
                  <span>Import {{ csvPreviewRows().length }} Products →</span>
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class AdminProducts implements OnInit {
  protected readonly Math = Math;
  private api = inject(AdminApi);
  private confirmDialog = inject(AdminConfirm);
  private settingsService = inject(SiteSettingsService);
  readonly i18n = inject(I18nService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isModalOpen = signal(false);
  readonly errorMessage = signal('');
  readonly editingProduct = signal<Product | null>(null);
  readonly editingLang = this.i18n.currentLang;

  // Unified image collection & selected main cover photo
  readonly uploadedImages = signal<string[]>([]);
  readonly mainCoverImage = signal<string>('');
  readonly isDragging = signal(false);
  readonly uploadingCount = signal(0);

  // Asset Library Picker
  readonly isAssetModalOpen = signal(false);
  readonly assetModalTab = signal<'library' | 'upload'>('library');
  readonly loadingAssets = signal(false);
  readonly availableAssets = signal<Asset[]>([]);
  readonly selectedAssetUrls = signal<string[]>([]);

  // CSV Bulk Import
  readonly isCsvModalOpen = signal(false);
  readonly csvFile = signal<File | null>(null);
  readonly csvPreviewRows = signal<any[]>([]);
  readonly csvParsing = signal(false);
  readonly csvImporting = signal(false);
  readonly csvError = signal('');
  readonly csvSuccessMessage = signal('');
  readonly isCsvDragging = signal(false);

  searchQuery = '';
  readonly activeCategory = signal<string>('ALL');

  readonly categoryOptions = computed(() => {
    const rawCats = this.settingsService.storeConfig().categories;
    const cats = Array.isArray(rawCats) ? rawCats.filter((c) => c && c.enabled !== false) : [];
    if (cats.length === 0) {
      return [
        { key: 'ALL', label: { en: 'ALL BOTTLES', el: 'ΟΛΕΣ ΟΙ ΦΙΑΛΕΣ' }, enabled: true },
        { key: 'VOLCANIC', label: { en: 'VOLCANIC SOIL', el: 'ΗΦΑΙΣΤΕΙΑΚΟ ΕΔΑΦΟΣ' }, enabled: true },
        { key: 'NATURAL', label: { en: 'NATURAL & WILD', el: 'ΦΥΣΙΚΑ & ΑΓΡΙΑ' }, enabled: true },
        { key: 'RESERVE', label: { en: 'CELLAR RESERVE', el: 'ΠΑΛΑΙΩΣΗ & RESERVE' }, enabled: true },
        { key: 'INDIGENOUS', label: { en: 'ANCIENT INDIGENOUS', el: 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ' }, enabled: true },
      ];
    }
    return cats;
  });

  readonly categoryTabs = computed(() => {
    const opts = this.categoryOptions();
    const hasAll = opts.some((c) => c.key?.toUpperCase() === 'ALL');
    const tabs = opts.map((c) => c.key);
    return hasAll ? tabs : ['ALL', ...tabs];
  });

  readonly currencySymbol = computed(() => {
    return this.settingsService.storeConfig().currency_symbol || '€';
  });

  formProduct: Partial<Product> = this.getEmptyProduct();

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

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
    return this.i18n.t(val);
  }

  private cloneI18n(val?: I18nText | string | null): { en: string; el: string } {
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

  readonly isSlugCustomized = signal(false);

  slugify(text: string): string {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  computeDefaultSlug(name?: string, category?: string, vintage?: string): string {
    const parts = [name, category, vintage].filter((v) => v && v.toString().trim().length > 0);
    return this.slugify(parts.join('-'));
  }

  onIdentityChange(): void {
    if (!this.isSlugCustomized()) {
      this.formProduct.slug = this.computeDefaultSlug(
        this.formProduct.name,
        this.formProduct.category,
        this.formProduct.vintage
      );
    }
  }

  onSlugManualEdit(): void {
    this.isSlugCustomized.set(true);
  }

  onSlugBlur(): void {
    if (this.formProduct.slug?.trim()) {
      this.formProduct.slug = this.slugify(this.formProduct.slug);
    } else {
      this.regenerateSlug();
    }
  }

  regenerateSlug(): void {
    this.isSlugCustomized.set(false);
    this.formProduct.slug = this.computeDefaultSlug(
      this.formProduct.name,
      this.formProduct.category,
      this.formProduct.vintage
    );
  }

  readonly formVarieties = signal<Array<{ variety: { en: string; el: string }; percentage: number | null }>>([]);

  readonly totalPercentage = computed(() => {
    return this.formVarieties().reduce((sum, item) => {
      const val = typeof item.percentage === 'string' ? parseFloat(item.percentage) : item.percentage;
      return sum + (val != null && !isNaN(val) ? val : 0);
    }, 0);
  });

  parseVarietiesFromI18n(val?: I18nText | null): Array<{ variety: { en: string; el: string }; percentage: number | null }> {
    if (!val) return [];
    const normalized = this.cloneI18n(val);
    const enStr = (normalized.en || '').trim();
    const elStr = (normalized.el || '').trim();
    if (!enStr && !elStr) return [];

    const splitItems = (str: string) =>
      str.split(/[,&/]/).map((s) => s.trim()).filter(Boolean);

    const enParts = splitItems(enStr);
    const elParts = splitItems(elStr);

    const parseItem = (str: string) => {
      const match1 = str.match(/^(\d+(?:\.\d+)?)\s*%\s*(.+)$/);
      if (match1) {
        return { pct: parseFloat(match1[1]), name: match1[2].trim() };
      }
      const match2 = str.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*%$/);
      if (match2) {
        return { pct: parseFloat(match2[2]), name: match2[1].trim() };
      }
      return { pct: null, name: str };
    };

    const count = Math.max(enParts.length, elParts.length);
    if (count === 0) return [];

    const result: Array<{ variety: { en: string; el: string }; percentage: number | null }> = [];
    for (let i = 0; i < count; i++) {
      const pEn = enParts[i] ? parseItem(enParts[i]) : null;
      const pEl = elParts[i] ? parseItem(elParts[i]) : null;

      result.push({
        variety: {
          en: pEn?.name || pEl?.name || '',
          el: pEl?.name || pEn?.name || '',
        },
        percentage: pEn?.pct ?? pEl?.pct ?? null,
      });
    }
    return result;
  }

  addVariety(nameEn = '', nameEl = '', percentage: number | null = null): void {
    this.formVarieties.update((list) => [
      ...list,
      {
        variety: { en: nameEn, el: nameEl },
        percentage,
      },
    ]);
    this.syncVarietalFromVarieties();
  }

  removeVariety(index: number): void {
    this.formVarieties.update((list) => list.filter((_, i) => i !== index));
    this.syncVarietalFromVarieties();
  }

  onVarietyChange(): void {
    this.syncVarietalFromVarieties();
  }

  syncVarietalFromVarieties(): void {
    const list = this.formVarieties();
    if (list.length === 0) {
      this.formProduct.varietal = { en: '', el: '' };
      return;
    }

    const enParts: string[] = [];
    const elParts: string[] = [];

    list.forEach((item) => {
      const pct = item.percentage != null && !isNaN(Number(item.percentage)) && Number(item.percentage) > 0
        ? `${item.percentage}% `
        : '';
      const nameEn = (item.variety.en || item.variety.el || '').trim();
      const nameEl = (item.variety.el || item.variety.en || '').trim();

      if (nameEn) enParts.push(`${pct}${nameEn}`);
      if (nameEl) elParts.push(`${pct}${nameEl}`);
    });

    this.formProduct.varietal = {
      en: enParts.join(', '),
      el: elParts.join(', '),
    };
  }

  private getEmptyProduct(): Partial<Product> {
    const defaultVintage = new Date().getFullYear().toString();
    const defaultCategory = 'VOLCANIC';
    return {
      name: '',
      slug: '',
      vintage: defaultVintage,
      category: defaultCategory,
      price: 45.0,
      compare_at_price: null,
      stock_quantity: 50,
      is_allocated: true,
      status_label: { en: '', el: '' },
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
    this.isSlugCustomized.set(false);
    this.formProduct = this.getEmptyProduct();
    this.formVarieties.set([{ variety: { en: '', el: '' }, percentage: null }]);
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.errorMessage.set('');

    const defaultSlug = this.computeDefaultSlug(product.name, product.category, product.vintage);
    // If slug matches computed default or was empty, keep auto-sync; otherwise mark as custom
    this.isSlugCustomized.set(!!product.slug && product.slug !== defaultSlug);

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

    let varieties = this.parseVarietiesFromI18n(product.varietal);
    if (varieties.length === 0) {
      varieties = [{ variety: { en: '', el: '' }, percentage: null }];
    }
    this.formVarieties.set(varieties);

    this.formProduct = {
      ...product,
      slug: product.slug || defaultSlug,
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
    this.assetModalTab.set('library');
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
    this.syncVarietalFromVarieties();
    this.errorMessage.set('');
    if (!this.formProduct.name?.trim()) {
      this.errorMessage.set('Please enter a product name.');
      return;
    }

    const allImages = this.uploadedImages();
    const mainImg = this.mainCoverImage() || (allImages.length > 0 ? allImages[0] : '');
    const galleryImgs = allImages.filter((img) => img !== mainImg);

    const rawSlug = this.formProduct.slug?.trim()
      ? this.slugify(this.formProduct.slug)
      : this.computeDefaultSlug(this.formProduct.name, this.formProduct.category, this.formProduct.vintage);

    const payload: Partial<Product> = {
      ...this.formProduct,
      varieties: this.formVarieties().map((v) => ({
        variety: this.cloneI18n(v.variety),
        percentage: v.percentage != null && !isNaN(Number(v.percentage)) ? Number(v.percentage) : null,
      })),
      name: this.formProduct.name.trim(),
      slug: rawSlug,
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

  async deleteProduct(product: Product): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: `Delete Product ${product.name}?`,
      message: `Are you sure you want to permanently remove "${product.name}" from the cellar catalog?`,
      confirmLabel: 'Delete Product',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (confirmed) {
      this.api.deleteProduct(product.id).subscribe({
        next: () => {
          this.products.update((list) => list.filter((p) => p.id !== product.id));
        },
      });
    }
  }

  // =========================================================================
  // CSV Import & Template Handlers
  // =========================================================================

  openCsvImportModal(): void {
    this.csvError.set('');
    this.csvSuccessMessage.set('');
    this.csvFile.set(null);
    this.csvPreviewRows.set([]);
    this.isCsvModalOpen.set(true);
  }

  closeCsvImportModal(): void {
    this.isCsvModalOpen.set(false);
    this.csvError.set('');
    this.csvSuccessMessage.set('');
    this.csvFile.set(null);
    this.csvPreviewRows.set([]);
  }

  downloadCsvTemplate(): void {
    // Attempt backend download first; if fails or offline, generate immediately in browser
    this.api.downloadProductCsvTemplate().subscribe({
      next: (blob) => {
        this.triggerFileDownload(blob, 'products_import_template.csv');
      },
      error: () => {
        // Client-side fallback with UTF-8 BOM
        const headers = 'name,vintage,category,price,compare_at_price,stock_quantity,alcohol,region_en,region_el,varietal_en,varietal_el,soil_en,soil_el,status_label_en,status_label_el,status_bg,tasting_note_en,tasting_note_el,cover_image,gallery,is_allocated,published\n';
        const row1 = '"RITUÁL","2024","VOLCANIC","45.00","55.00","50","13.5%","Pyrgos, Santorini PDO","Πύργος, Σαντορίνη ΠΟΠ","100% Assyrtiko","100% Ασύρτικο","Volcanic ash, pumice & basalt","Ηφαιστειακή τέφρα, κίσσηρη & βασάλτης","LIMITED ALLOCATION","ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ","bg-[#922e1b]","Flint smoke, crushed sea salt, lemon blossom","Καπνός πυρόλιθου, θαλασσινό αλάτι, άνθη λεμονιάς","cellar_ritual.jpg","bottle1.jpg;bottle2.jpg","1","1"\n';
        const row2 = '"TERRA SILENTIA","2021","RESERVE","68.00","","24","14.0%","Nemea PDO","Νεμέα ΠΟΠ","100% Agiorgitiko","100% Αγιωργίτικο","Limestone & gravel slopes","Ασβεστολιθικές πλαγιές με χαλίκι","CELLAR RESERVE","ΠΑΛΑΙΩΣΗ RESERVE","bg-[#551019]","Black cherry, cedarwood, wild thyme","Μαύρο κεράσι, κέδρος, άγριο θυμάρι","terra_silentia.jpg","","1","1"\n';
        
        const blob = new Blob(['\uFEFF' + headers + row1 + row2], { type: 'text/csv;charset=utf-8;' });
        this.triggerFileDownload(blob, 'products_import_template.csv');
      },
    });
  }

  private triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  onCsvDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isCsvDragging.set(true);
  }

  onCsvDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isCsvDragging.set(false);
  }

  onCsvDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isCsvDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) {
        this.handleCsvFile(file);
      } else {
        this.csvError.set('Please select a valid .csv file.');
      }
    }
  }

  onCsvFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleCsvFile(input.files[0]);
      input.value = '';
    }
  }

  clearCsvFile(): void {
    this.csvFile.set(null);
    this.csvPreviewRows.set([]);
    this.csvError.set('');
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private handleCsvFile(file: File): void {
    this.csvError.set('');
    this.csvSuccessMessage.set('');
    this.csvFile.set(file);
    this.csvParsing.set(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = this.parseCsvText(text);
        if (rows.length === 0) {
          this.csvError.set('The selected CSV file does not contain any data rows.');
          this.csvPreviewRows.set([]);
        } else {
          this.csvPreviewRows.set(rows);
        }
      } catch (err) {
        console.error('Error parsing CSV client preview:', err);
        this.csvError.set('Could not parse CSV file. Please make sure it is valid UTF-8 formatted CSV.');
      } finally {
        this.csvParsing.set(false);
      }
    };
    reader.onerror = () => {
      this.csvError.set('Failed to read file from disk.');
      this.csvParsing.set(false);
    };
    reader.readAsText(file);
  }

  private parseCsvText(text: string): any[] {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    if (!cleanText) return [];

    const lines = cleanText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
    const nameIdx = headers.indexOf('name');
    if (nameIdx === -1) {
      throw new Error('Missing required "name" header column in CSV.');
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cells = parseLine(rawLine);
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] ?? '';
      });

      if (rowObj['name']) {
        rows.push(rowObj);
      }
    }

    return rows;
  }

  submitCsvImport(): void {
    const file = this.csvFile();
    if (!file) return;

    this.csvError.set('');
    this.csvSuccessMessage.set('');
    this.csvImporting.set(true);

    this.api.importProductsCsv(file).subscribe({
      next: (res) => {
        this.csvImporting.set(false);
        const count = res.count ?? this.csvPreviewRows().length;
        this.csvSuccessMessage.set(`Successfully imported ${count} product${count === 1 ? '' : 's'}!`);
        this.loadProducts();

        // If there were any non-fatal row errors, display them
        if (res.errors && res.errors.length > 0) {
          this.csvError.set('Note: ' + res.errors.join(', '));
        }

        // Reset file after successful import
        setTimeout(() => {
          this.csvFile.set(null);
          this.csvPreviewRows.set([]);
        }, 1500);
      },
      error: (err) => {
        this.csvImporting.set(false);
        console.error('CSV import error:', err);
        const msg = err?.error?.error || err?.error?.message || 'Failed to import CSV. Please check column headers and data format.';
        this.csvError.set(msg);
      },
    });
  }
}

