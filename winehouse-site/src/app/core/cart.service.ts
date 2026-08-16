import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { I18nText } from './i18n.service';
import { Order } from '../admin/api';
import { SiteSettingsService } from './site-settings.service';

export interface CartItemProduct {
  id: number | string;
  name: string;
  vintage?: string;
  region?: I18nText;
  varietal?: I18nText;
  price: number | string;
  cover_image?: string | null;
  img?: string;
  gallery?: string[];
  category?: string;
  stock_quantity?: number;
  alcohol?: string;
  soil?: I18nText;
  status_label?: I18nText;
  status_bg?: string;
  tasting_note?: I18nText;
  is_allocated?: boolean;
}

export interface CartItem {
  id: number | string;
  product: CartItemProduct;
  quantity: number;
  price: number;
  subtotal: number;
}

const STORAGE_KEY = 'wh_cellar_cart_v1';

@Injectable({ providedIn: 'root' })
export class CartService {
  private settingsService = inject(SiteSettingsService);

  readonly items = signal<CartItem[]>([]);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isCheckoutOpen = signal<boolean>(false);
  readonly placedOrder = signal<Order | null>(null);

  readonly totalCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    return this.items().reduce((acc, item) => acc + item.price * item.quantity, 0);
  });

  formatPrice(amount: number): string {
    const cfg = this.settingsService.storeConfig();
    const sym = cfg.currency_symbol || '€';
    const formatted = amount.toFixed(2);
    return cfg.currency_position === 'after' ? `${formatted} ${sym}` : `${sym} ${formatted}`;
  }

  readonly formattedSubtotal = computed(() => {
    return this.formatPrice(this.subtotal());
  });

  constructor() {
    this.loadFromStorage();

    // Automatically persist cart changes to localStorage
    effect(() => {
      const items = this.items();
      this.saveToStorage(items);
    });
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.items.set(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to recover cellar basket session:', e);
    }
  }

  private saveToStorage(items: CartItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cellar basket session:', e);
    }
  }

  /**
   * Parse numeric price from number or string (e.g. "€ 48.00" -> 48.0)
   */
  private parsePrice(raw: number | string): number {
    if (typeof raw === 'number') return raw;
    const cleaned = String(raw).replace(/[^0-9.]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  /**
   * Add a bottle to the basket. Opens drawer and updates quantities.
   */
  addItem(product: CartItemProduct, quantity = 1, openDrawer = true): void {
    const numPrice = this.parsePrice(product.price);
    const pId = product.id;

    this.items.update((current) => {
      const existingIdx = current.findIndex((i) => String(i.id) === String(pId));
      if (existingIdx > -1) {
        const updated = [...current];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + quantity;
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.price,
        };
        return updated;
      }

      return [
        ...current,
        {
          id: pId,
          product: { ...product },
          quantity,
          price: numPrice,
          subtotal: quantity * numPrice,
        },
      ];
    });

    if (openDrawer) {
      this.isDrawerOpen.set(true);
    }
  }

  /**
   * Update quantity by delta (+1 or -1). Removes item if quantity reaches 0.
   */
  updateQuantity(productId: number | string, delta: number): void {
    this.items.update((current) => {
      const idx = current.findIndex((i) => String(i.id) === String(productId));
      if (idx === -1) return current;

      const item = current[idx];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return current.filter((i) => String(i.id) !== String(productId));
      }

      const updated = [...current];
      updated[idx] = {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.price,
      };
      return updated;
    });
  }

  /**
   * Remove item from cart.
   */
  removeItem(productId: number | string): void {
    this.items.update((current) => current.filter((i) => String(i.id) !== String(productId)));
  }

  /**
   * Clear all items in cart.
   */
  clear(): void {
    this.items.set([]);
  }

  /* Drawer and Checkout Modals */
  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }

  openCheckout(): void {
    this.isDrawerOpen.set(false);
    this.isCheckoutOpen.set(true);
  }

  closeCheckout(): void {
    this.isCheckoutOpen.set(false);
  }
}
