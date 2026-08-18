import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { CartService, CartItemProduct } from '../../core/cart.service';
import { WhReveal } from '../../shared/reveal';
import { AdminApi, Product, StoreCategory } from '../../admin/api';
import { resolveMediaUrl } from '../../core/media.utils';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'wh-shop',
  imports: [RouterLink, WhReveal],
  templateUrl: './shop.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shop implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private settingsService = inject(SiteSettingsService);
  private api = inject(AdminApi);
  private i18n = inject(I18nService);
  private seo = inject(SeoService);
  readonly cart = inject(CartService);

  private querySub?: Subscription;

  readonly dynamicProducts = signal<Product[]>([]);
  readonly productsLoaded = signal<boolean>(false);
  readonly activeCategory = signal<string>('ALL');

  // Search & Filtering
  readonly searchQuery = signal<string>('');
  readonly selectedSort = signal<string>('default');
  readonly gridLayout = signal<'3-col' | '4-col'>('3-col');

  // Interactive gallery switcher for individual bottle cards
  readonly activeCardImage = signal<Record<string | number, string>>({});

  // Detailed modal inspector
  readonly selectedBottle = signal<CartItemProduct | null>(null);
  readonly modalActiveImage = signal<string>('');
  readonly modalQty = signal<number>(1);

  readonly page = computed(() => this.settingsService.shop());
  readonly storeConfig = computed(() => this.settingsService.storeConfig());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string | null | undefined): string {
    if (!val) return '';
    return this.i18n.t(val as I18nText);
  }

  ngOnInit(): void {
    const seoConf = this.settingsService.seoConfig();
    const shopSeo = seoConf.page_seo?.shop;
    const title = shopSeo?.title ? this.t(shopSeo.title) : 'e-Shop & Cellar Reserves';
    const desc = shopSeo?.description
      ? this.t(shopSeo.description)
      : 'Explore curated artisanal, volcanic, and ancestral Greek wines. Limited allocations direct from private cellar ledgers.';

    this.seo.setMeta({
      title,
      description: desc,
      keywords: seoConf.meta_keywords || 'wine shop, greek wine, volcanic wine, natural wine, buy wine, the winehouse',
      image: seoConf.og_image,
      type: 'website',
    });
    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: 'e-Shop', url: `${this.seo.getSiteOrigin()}/shop` },
    ]);
    this.seo.setFaqStructuredData([
      {
        question: 'How are wines shipped and preserved during transit?',
        answer: 'All bottles are dispatched in specialized climate-controlled, shock-absorbent packaging to maintain exact cellar temperature from our atelier to your door.',
      },
      {
        question: 'Can I purchase rare or older vintages in small quantities?',
        answer: 'Yes, our allocations ledger allows direct purchase of single bottles and curated verticals from independent growers.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept direct bank transfers with IBAN confirmations as well as major credit and debit cards.',
      },
    ]);

    // Restore filters from URL Query Params so back navigation keeps state
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const cat = params.get('category');
      const search = params.get('search');
      const sort = params.get('sort');
      if (cat) {
        this.activeCategory.set(cat);
      }
      if (search !== null && search !== undefined) {
        this.searchQuery.set(search);
      }
      if (sort) {
        this.selectedSort.set(sort);
      }
    });

    this.api.getPublicProducts().subscribe({
      next: (products) => {
        this.dynamicProducts.set(products || []);
        this.productsLoaded.set(true);
        if (products && products.length > 0) {
          this.seo.setCatalogStructuredData(products);
        }
      },
      error: () => {
        this.productsLoaded.set(true);
      },
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  private updateUrlParams(): void {
    const category = this.activeCategory();
    const search = this.searchQuery().trim();
    const sort = this.selectedSort();

    const queryParams: Record<string, string | null> = {
      category: category && category !== 'ALL' ? category : null,
      search: search ? search : null,
      sort: sort && sort !== 'default' ? sort : null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  readonly categories = computed<StoreCategory[]>(() => {
    const rawCats = this.storeConfig().categories;
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
    const hasAll = cats.some((c) => c.key?.toUpperCase() === 'ALL');
    if (!hasAll) {
      return [
        { key: 'ALL', label: { en: 'ALL BOTTLES', el: 'ΟΛΕΣ ΟΙ ΦΙΑΛΕΣ' }, enabled: true },
        ...cats,
      ];
    }
    return cats;
  });

  /**
   * Bottle list: uses dynamic products configured in Admin Products.
   */
  readonly allBottles = computed<CartItemProduct[]>(() => {
    const dyn = this.dynamicProducts();
    return dyn.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      vintage: p.vintage,
      region: p.region,
      varietal: p.varietal,
      category: p.category,
      price: this.cart.formatPrice(p.price),
      status_label: p.status_label,
      status_bg: p.status_bg,
      tasting_note: p.tasting_note,
      cover_image: p.cover_image,
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      alcohol: p.alcohol,
      soil: p.soil,
      stock_quantity: p.stock_quantity,
      is_allocated: p.is_allocated,
    }));
  });

  /**
   * Numeric price lookup for reliable numerical sorting
   */
  readonly rawPriceMap = computed<Record<string | number, number>>(() => {
    const map: Record<string | number, number> = {};
    for (const p of this.dynamicProducts()) {
      map[p.id] = Number(p.price) || 0;
    }
    return map;
  });

  /**
   * Count of bottles per category key for displaying live count chips
   */
  readonly categoryCounts = computed<Record<string, number>>(() => {
    const bottles = this.allBottles();
    const map: Record<string, number> = { ALL: bottles.length };
    bottles.forEach((b) => {
      const c = (b.category || '').trim().toUpperCase();
      if (c) {
        map[c] = (map[c] || 0) + 1;
      }
    });
    return map;
  });

  /**
   * Filtered & sorted products based on category, search query, and sort mode
   */
  readonly filteredItems = computed<CartItemProduct[]>(() => {
    const cat = (this.activeCategory() || 'ALL').trim().toUpperCase();
    const query = this.searchQuery().trim().toLowerCase();
    const sort = this.selectedSort();
    let list = this.allBottles();

    // 1. Category Filter
    if (cat !== 'ALL') {
      list = list.filter((item) => (item.category || '').trim().toUpperCase() === cat);
    }

    // 2. Text Search
    if (query) {
      list = list.filter((b) => {
        const name = (b.name || '').toLowerCase();
        const vintage = (b.vintage || '').toLowerCase();
        const varietal = this.t(b.varietal).toLowerCase();
        const region = this.t(b.region).toLowerCase();
        const soil = this.t(b.soil).toLowerCase();
        const note = this.t(b.tasting_note).toLowerCase();
        return (
          name.includes(query) ||
          vintage.includes(query) ||
          varietal.includes(query) ||
          region.includes(query) ||
          soil.includes(query) ||
          note.includes(query)
        );
      });
    }

    // 3. Sorting
    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => (this.rawPriceMap()[a.id] ?? 0) - (this.rawPriceMap()[b.id] ?? 0));
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => (this.rawPriceMap()[b.id] ?? 0) - (this.rawPriceMap()[a.id] ?? 0));
    } else if (sort === 'vintage-desc') {
      list = [...list].sort((a, b) => (parseInt(b.vintage || '0', 10) || 0) - (parseInt(a.vintage || '0', 10) || 0));
    } else if (sort === 'name-asc') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  });

  setCategory(key: string): void {
    this.activeCategory.set(key);
    this.updateUrlParams();
  }

  setSearchQuery(event: Event): void {
    const val = (event.target as HTMLInputElement)?.value ?? '';
    this.searchQuery.set(val);
    this.updateUrlParams();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateUrlParams();
  }

  setSort(event: Event): void {
    const val = (event.target as HTMLSelectElement)?.value ?? 'default';
    this.selectedSort.set(val);
    this.updateUrlParams();
  }

  setGridLayout(layout: '3-col' | '4-col'): void {
    this.gridLayout.set(layout);
  }

  clearAllFilters(): void {
    this.activeCategory.set('ALL');
    this.searchQuery.set('');
    this.selectedSort.set('default');
    this.updateUrlParams();
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  hasStatusLabel(label?: I18nText | string | null): boolean {
    if (!label) return false;
    const text = this.t(label);
    return !!text && text.trim().length > 0;
  }

  getCardImage(bottle: CartItemProduct): string {
    const custom = this.activeCardImage()[bottle.id];
    if (custom) return resolveMediaUrl(custom);
    return resolveMediaUrl(bottle.cover_image || bottle.img || '');
  }

  setCardImage(bottleId: number | string, imgUrl: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.activeCardImage.update((map) => ({
      ...map,
      [bottleId]: imgUrl,
    }));
  }

  getAllBottleImages(bottle: CartItemProduct): string[] {
    const list: string[] = [];
    const main = bottle.cover_image || bottle.img;
    if (main) list.push(resolveMediaUrl(main));
    if (bottle.gallery && Array.isArray(bottle.gallery)) {
      bottle.gallery.forEach((g) => {
        if (g) {
          const resolved = resolveMediaUrl(g);
          if (!list.includes(resolved)) {
            list.push(resolved);
          }
        }
      });
    }
    return list;
  }

  openBottleModal(bottle: CartItemProduct, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.modalQty.set(1);
    this.selectedBottle.set(bottle);
    this.modalActiveImage.set(resolveMediaUrl(bottle.cover_image || bottle.img || ''));
  }

  closeBottleModal(): void {
    this.selectedBottle.set(null);
  }

  setModalQty(delta: number): void {
    const current = this.modalQty();
    const updated = Math.max(1, current + delta);
    this.modalQty.set(updated);
  }

  addModalBottleToBasket(bottle: CartItemProduct): void {
    const qty = this.modalQty() || 1;
    this.cart.addItem(bottle, qty, true);
    this.closeBottleModal();
  }

  getItemQtyInCart(bottleId: number | string): number {
    const item = this.cart.items().find((i) => String(i.id) === String(bottleId));
    return item ? item.quantity : 0;
  }

  addToBasket(bottle: CartItemProduct, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.cart.addItem(bottle, 1, true);
  }

  updateCardQuantity(bottle: CartItemProduct, delta: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const item = this.cart.items().find((i) => String(i.id) === String(bottle.id));
    if (item) {
      this.cart.updateQuantity(item.id, delta);
    } else if (delta > 0) {
      this.cart.addItem(bottle, delta, false);
    }
  }
}
