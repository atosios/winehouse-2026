import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { CartService, CartItemProduct } from '../../core/cart.service';
import { WhReveal } from '../../shared/reveal';
import { AdminApi, Product, StoreCategory } from '../../admin/api';

@Component({
  selector: 'wh-shop',
  imports: [RouterLink, WhReveal],
  templateUrl: './shop.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shop implements OnInit {
  private settingsService = inject(SiteSettingsService);
  private api = inject(AdminApi);
  private i18n = inject(I18nService);
  readonly cart = inject(CartService);

  readonly dynamicProducts = signal<Product[]>([]);
  readonly productsLoaded = signal<boolean>(false);
  readonly activeCategory = signal<string>('ALL');

  // Interactive gallery switcher for individual bottle cards
  readonly activeCardImage = signal<Record<string | number, string>>({});
  
  // Detailed modal inspector for viewing all bottle gallery photos
  readonly selectedBottle = signal<CartItemProduct | null>(null);
  readonly modalActiveImage = signal<string>('');

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
    this.api.getPublicProducts().subscribe({
      next: (products) => {
        this.dynamicProducts.set(products || []);
        this.productsLoaded.set(true);
      },
      error: () => {
        this.productsLoaded.set(true);
      },
    });
  }

  readonly categories = computed<StoreCategory[]>(() => {
    const cats = this.storeConfig().categories;
    if (cats && cats.length > 0) {
      return cats.filter((c) => c.enabled !== false);
    }
    return [
      { key: 'ALL', label: { en: 'ALL BOTTLES', el: 'ΟΛΕΣ ΟΙ ΦΙΑΛΕΣ' }, enabled: true },
      { key: 'VOLCANIC', label: { en: 'VOLCANIC SOIL', el: 'ΗΦΑΙΣΤΕΙΑΚΟ ΕΔΑΦΟΣ' }, enabled: true },
      { key: 'NATURAL', label: { en: 'NATURAL & WILD', el: 'ΦΥΣΙΚΑ & ΑΓΡΙΑ' }, enabled: true },
      { key: 'RESERVE', label: { en: 'CELLAR RESERVE', el: 'ΠΑΛΑΙΩΣΗ & RESERVE' }, enabled: true },
      { key: 'INDIGENOUS', label: { en: 'ANCIENT INDIGENOUS', el: 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ' }, enabled: true },
    ];
  });

  /**
   * Bottle list: uses dynamic products configured in Admin Products.
   */
  readonly allBottles = computed<CartItemProduct[]>(() => {
    const dyn = this.dynamicProducts();
    return dyn.map((p) => ({
      id: p.id,
      name: p.name,
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

  readonly filteredItems = computed<CartItemProduct[]>(() => {
    const cat = this.activeCategory();
    const bottles = this.allBottles();
    if (cat === 'ALL') {
      return bottles;
    }
    return bottles.filter((item) => item.category === cat);
  });

  setCategory(key: string): void {
    this.activeCategory.set(key);
  }

  getCardImage(bottle: CartItemProduct): string {
    const custom = this.activeCardImage()[bottle.id];
    if (custom) return custom;
    return bottle.cover_image || bottle.img || 'cellar_ritual.jpg';
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
    if (main) list.push(main);
    if (bottle.gallery && Array.isArray(bottle.gallery)) {
      bottle.gallery.forEach((g) => {
        if (g && !list.includes(g)) {
          list.push(g);
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
    this.selectedBottle.set(bottle);
    this.modalActiveImage.set(bottle.cover_image || bottle.img || 'cellar_ritual.jpg');
  }

  closeBottleModal(): void {
    this.selectedBottle.set(null);
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
}
