import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { I18nService, I18nText } from '../core/i18n.service';
import { resolveMediaUrl } from '../core/media.utils';

@Component({
  selector: 'wh-cart-drawer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cart.isDrawerOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        (click)="cart.closeDrawer()"
      ></div>

      <!-- Drawer Panel -->
      <aside
        class="fixed top-0 right-0 bottom-0 z-[130] w-full max-w-md bg-[var(--color-paper-light)] text-[var(--color-foreground)] border-l-[1.5px] border-[var(--color-foreground)] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Basket"
      >
        <!-- Top Bar Header -->
        <div class="p-6 border-b-[1.5px] border-[var(--color-foreground)] bg-white/40 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="font-big text-2xl uppercase tracking-tight text-[var(--color-foreground)]">Basket</h3>
            <span class="px-2 py-0.5 rounded bg-[var(--color-foreground)] text-white font-mono text-2xs font-bold uppercase tracking-wider">
              {{ cart.totalCount() }} {{ cart.totalCount() === 1 ? 'Item' : 'Items' }}
            </span>
          </div>

          <button
            type="button"
            (click)="cart.closeDrawer()"
            class="p-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)] font-mono text-lg font-bold transition-colors cursor-pointer"
            aria-label="Close basket"
          >
            ✕
          </button>
        </div>

        <!-- Middle Content: Item List -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          @if (cart.items().length > 0) {
            @for (item of cart.items(); track item.id) {
              <div class="p-4 border-[1.5px] border-[var(--color-foreground)] bg-white/80 shadow-[2px_2px_0px_0px_var(--color-foreground)] flex items-start gap-4">
                <!-- Thumbnail -->
                <div class="w-16 h-20 bg-slate-100 border border-[var(--color-foreground)]/20 overflow-hidden shrink-0">
                  <img
                    [src]="mediaUrl(item.product.cover_image || item.product.img || 'cellar_ritual.jpg')"
                    [alt]="item.product.name"
                    class="w-full h-full object-cover"
                  />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline justify-between gap-1 mb-1">
                    <h4 class="font-big text-xl uppercase tracking-tight text-[var(--color-foreground)] truncate">
                      {{ item.product.name }}
                    </h4>
                    <span class="font-mono text-xs font-bold text-[var(--color-primary)] shrink-0">
                      {{ cart.formatPrice(item.subtotal) }}
                    </span>
                  </div>

                  <div class="font-mono text-[10px] uppercase text-[var(--color-foreground)]/70 flex items-center gap-2 mb-2">
                    @if (item.product.vintage) {
                      <span class="px-1.5 py-0.5 bg-[var(--color-foreground)] text-white font-bold">
                        {{ item.product.vintage }}
                      </span>
                    }
                    @if (item.product.varietal) {
                      <span class="truncate">{{ t(item.product.varietal) }}</span>
                    }
                  </div>

                  <!-- Quantity Controls & Remove -->
                  <div class="flex items-center justify-between pt-1 border-t border-[var(--color-foreground)]/10">
                    <div class="flex items-center border border-[var(--color-foreground)] bg-[var(--color-paper-light)]">
                      <button
                        type="button"
                        (click)="cart.updateQuantity(item.id, -1)"
                        class="px-2 py-0.5 font-mono text-xs font-bold hover:bg-[var(--color-foreground)] hover:text-white transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        –
                      </button>
                      <span class="px-3 py-0.5 font-mono text-xs font-bold text-[var(--color-foreground)]">
                        {{ item.quantity }}
                      </span>
                      <button
                        type="button"
                        (click)="cart.updateQuantity(item.id, 1)"
                        class="px-2 py-0.5 font-mono text-xs font-bold hover:bg-[var(--color-foreground)] hover:text-white transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      (click)="cart.removeItem(item.id)"
                      class="font-mono text-2xs uppercase text-[var(--color-foreground)]/50 hover:text-red-600 transition-colors cursor-pointer underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            }
          } @else {
            <div class="py-20 text-center space-y-3">
              <p class="font-mono text-xs uppercase font-bold tracking-wider text-[var(--color-foreground)]">
                Your basket is empty
              </p>
              <p class="font-sans text-xs text-[var(--color-foreground)]/60 max-w-xs mx-auto">
                Explore our wines and selections in the online store.
              </p>
              <div class="pt-2">
                <a
                  routerLink="/shop"
                  (click)="cart.closeDrawer()"
                  class="btn btn-primary font-mono text-xs uppercase font-bold"
                >
                  Explore Store →
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Bottom Summary & Checkout Trigger -->
        @if (cart.items().length > 0) {
          <div class="p-6 border-t-[1.5px] border-[var(--color-foreground)] bg-white space-y-4">
            
            <div class="space-y-2 font-mono text-xs">
              <div class="flex items-center justify-between text-[var(--color-foreground)]/70">
                <span class="uppercase">Subtotal</span>
                <span>{{ cart.formattedSubtotal() }}</span>
              </div>
              <div class="flex items-center justify-between text-base font-bold text-[var(--color-foreground)] pt-2 border-t border-[var(--color-foreground)]/15">
                <span class="uppercase">Total</span>
                <span class="text-[var(--color-primary)] font-mono text-lg">{{ cart.formattedSubtotal() }}</span>
              </div>
            </div>

            <button
              type="button"
              (click)="cart.openCheckout()"
              class="w-full py-3.5 px-6 bg-[var(--color-foreground)] hover:bg-[var(--color-primary)] text-[var(--color-paper-light)] border-[1.5px] border-[var(--color-foreground)] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-between shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
            >
              <span>Checkout</span>
              <span>→</span>
            </button>

            <div class="text-center pt-1">
              <button
                type="button"
                (click)="cart.clear()"
                class="font-mono text-2xs uppercase text-[var(--color-foreground)]/50 hover:text-red-600 transition-colors cursor-pointer"
              >
                Clear Basket
              </button>
            </div>

          </div>
        }
      </aside>
    }
  `,
})
export class WhCartDrawer {
  cart = inject(CartService);
  private i18n = inject(I18nService);

  t(val?: I18nText | string | null): string {
    if (!val) return '';
    return this.i18n.t(val as I18nText);
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.cart.isDrawerOpen()) {
      this.cart.closeDrawer();
    }
  }
}
