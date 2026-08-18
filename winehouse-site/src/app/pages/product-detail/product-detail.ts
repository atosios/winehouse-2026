import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminApi, Product, StoreCategory } from '../../admin/api';
import { CartService, CartItemProduct } from '../../core/cart.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { SiteSettingsService } from '../../core/site-settings.service';
import { SeoService } from '../../core/seo.service';
import { resolveMediaUrl } from '../../core/media.utils';
import { WhReveal } from '../../shared/reveal';
import { SITE } from '../../core/site-config';

@Component({
  selector: 'wh-product-detail',
  imports: [RouterLink, WhReveal],
  templateUrl: './product-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private api = inject(AdminApi);
  private i18n = inject(I18nService);
  private settingsService = inject(SiteSettingsService);
  private seo = inject(SeoService);
  readonly cart = inject(CartService);

  private sub?: Subscription;

  readonly product = signal<Product | null>(null);
  readonly relatedProducts = signal<Product[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Gallery state
  readonly activeImage = signal<string>('');

  // Purchase quantity
  readonly qty = signal<number>(1);

  // Accordion active tab
  readonly activeTab = signal<'notes' | 'specs' | 'sommelier' | 'shipping'>('notes');

  // Copied link toast notification
  readonly copiedToast = signal<boolean>(false);

  readonly storeConfig = computed(() => this.settingsService.storeConfig());
  readonly shopSettings = computed(() => this.settingsService.shop());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string | null | undefined): string {
    if (!val) return '';
    return this.i18n.t(val as I18nText);
  }

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const slugOrId = params.get('slug') || params.get('id');
      if (slugOrId) {
        this.loadProduct(slugOrId);
      } else {
        this.error.set('Product not specified.');
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.removeStructuredData('product-schema-jsonld');
    this.seo.removeStructuredData('breadcrumb-schema-jsonld');
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/shop']);
    }
  }

  private loadProduct(slugOrId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.qty.set(1);

    // Fetch product details
    this.api.getPublicProduct(slugOrId).subscribe({
      next: (prod) => {
        if (!prod) {
          this.error.set('Bottle not found.');
          this.loading.set(false);
          return;
        }

        this.product.set(prod);
        this.activeImage.set(this.getPrimaryImage(prod));
        this.loading.set(false);

        // Apply dynamic SEO metadata & Structured Data
        this.applySeo(prod);

        // Load related bottles from catalog
        this.loadRelatedProducts(prod);
      },
      error: () => {
        // Fallback: try fetching all public products to find by slug or numeric ID
        this.api.getPublicProducts().subscribe({
          next: (list) => {
            const found = list.find(
              (p) => String(p.slug) === slugOrId || String(p.id) === slugOrId,
            );
            if (found) {
              this.product.set(found);
              this.activeImage.set(this.getPrimaryImage(found));
              this.loading.set(false);
              this.applySeo(found);
              this.loadRelatedProducts(found, list);
            } else {
              this.error.set('Bottle not found in our cellar ledger.');
              this.loading.set(false);
            }
          },
          error: () => {
            this.error.set('Unable to load bottle details.');
            this.loading.set(false);
          },
        });
      },
    });
  }

  private applySeo(prod: Product): void {
    const vintageStr = prod.vintage ? ` ${prod.vintage}` : '';
    const fullTitle = `${prod.name}${vintageStr}`;
    const varietal = this.t(prod.varietal);
    const region = this.t(prod.region);
    const tastingNotes = this.t(prod.tasting_note);

    const description =
      tastingNotes ||
      `${fullTitle} — ${varietal ? varietal + ' · ' : ''}${region ? region + ' · ' : ''}Curated by ${SITE.name}.`;

    const productUrl = `${this.seo.getSiteOrigin()}/shop/${prod.slug || prod.id}`;
    const coverImg = prod.cover_image
      ? resolveMediaUrl(prod.cover_image)
      : '';

    // 1. Meta Tags (Title, Description, OpenGraph, Twitter, Canonical)
    this.seo.setMeta({
      title: fullTitle,
      description: description,
      keywords: `${prod.name}, ${prod.vintage || ''}, ${varietal}, ${region}, wine, greek wine, sommelier, cellar`,
      image: coverImg,
      url: productUrl,
      type: 'product',
    });

    // 2. Schema.org Product Structured Data
    this.seo.setProductStructuredData(prod, productUrl);

    // 3. Schema.org Breadcrumbs
    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: 'e-Shop', url: `${this.seo.getSiteOrigin()}/shop` },
      { name: fullTitle, url: productUrl },
    ]);
  }

  private loadRelatedProducts(current: Product, fullList?: Product[]): void {
    if (fullList && fullList.length > 0) {
      const others = fullList.filter((p) => p.id !== current.id);
      this.relatedProducts.set(others.slice(0, 4));
      return;
    }

    this.api.getPublicProducts().subscribe({
      next: (list) => {
        const others = (list || []).filter((p) => p.id !== current.id);
        this.relatedProducts.set(others.slice(0, 4));
      },
    });
  }

  getPrimaryImage(prod: Product): string {
    return prod.cover_image ? resolveMediaUrl(prod.cover_image) : '';
  }

  getAllImages(): string[] {
    const prod = this.product();
    if (!prod) return [];
    const images: string[] = [];
    if (prod.cover_image) {
      images.push(resolveMediaUrl(prod.cover_image));
    }
    if (Array.isArray(prod.gallery)) {
      prod.gallery.forEach((g) => {
        if (g) {
          const resolved = resolveMediaUrl(g);
          if (!images.includes(resolved)) {
            images.push(resolved);
          }
        }
      });
    }
    return images;
  }

  setActiveImage(img: string): void {
    this.activeImage.set(img);
  }

  setQty(delta: number): void {
    const current = this.qty();
    const updated = Math.max(1, current + delta);
    this.qty.set(updated);
  }

  toCartItemProduct(prod: Product): CartItemProduct {
    return {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      vintage: prod.vintage,
      region: prod.region,
      varietal: prod.varietal,
      category: prod.category,
      price: this.cart.formatPrice(prod.price),
      status_label: prod.status_label,
      status_bg: prod.status_bg,
      tasting_note: prod.tasting_note,
      cover_image: prod.cover_image,
      gallery: Array.isArray(prod.gallery) ? prod.gallery : [],
      alcohol: prod.alcohol,
      soil: prod.soil,
      stock_quantity: prod.stock_quantity,
      is_allocated: prod.is_allocated,
    };
  }

  isOutOfStock(prod?: Product | null): boolean {
    if (!prod) return true;
    return prod.stock_quantity !== undefined && prod.stock_quantity <= 0;
  }

  isLowStock(prod?: Product | null): boolean {
    if (!prod) return false;
    const threshold = this.storeConfig().low_stock_threshold || 5;
    return prod.stock_quantity > 0 && prod.stock_quantity <= threshold;
  }

  hasExtraSpecs(prod?: Product | null): boolean {
    if (!prod) return false;
    return Boolean(prod.vintage || prod.alcohol || this.t(prod.soil) || this.t(prod.region));
  }

  addToBasket(): void {
    const prod = this.product();
    if (!prod) return;
    const cartProduct = this.toCartItemProduct(prod);
    this.cart.addItem(cartProduct, this.qty(), true);
  }

  addRelatedToBasket(prod: Product, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const cartProduct = this.toCartItemProduct(prod);
    this.cart.addItem(cartProduct, 1, true);
  }

  buyNow(): void {
    const prod = this.product();
    if (!prod) return;
    const cartProduct = this.toCartItemProduct(prod);
    this.cart.addItem(cartProduct, this.qty(), false);
    this.cart.openCheckout();
  }

  getItemQtyInCart(): number {
    const prod = this.product();
    if (!prod) return 0;
    const item = this.cart.items().find((i) => String(i.id) === String(prod.id));
    return item ? item.quantity : 0;
  }

  shareOnWhatsApp(): void {
    const prod = this.product();
    if (!prod || typeof window === 'undefined') return;
    const url = window.location.href;
    const text = encodeURIComponent(`Explore "${prod.name} ${prod.vintage || ''}" at The Winehouse: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  shareOnViber(): void {
    const prod = this.product();
    if (!prod || typeof window === 'undefined') return;
    const url = window.location.href;
    const text = encodeURIComponent(`Explore "${prod.name} ${prod.vintage || ''}" at The Winehouse: ${url}`);
    window.open(`viber://forward?text=${text}`, '_blank');
  }

  shareOnFacebook(): void {
    if (typeof window === 'undefined') return;
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  shareOnTwitter(): void {
    const prod = this.product();
    if (!prod || typeof window === 'undefined') return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Curated bottle: ${prod.name} ${prod.vintage || ''} via @TheWinehouse`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  }

  copyProductLink(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showCopiedToast();
      });
    } else {
      this.showCopiedToast();
    }
  }

  private showCopiedToast(): void {
    this.copiedToast.set(true);
    setTimeout(() => this.copiedToast.set(false), 3000);
  }
}
