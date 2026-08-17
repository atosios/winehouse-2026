import { ChangeDetectionStrategy, Component, HostListener, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CartService } from '../core/cart.service';
import { AdminApi, Order } from '../admin/api';
import { I18nService, I18nText } from '../core/i18n.service';
import { SiteSettingsService } from '../core/site-settings.service';

@Component({
  selector: 'wh-checkout-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cart.isCheckoutOpen()) {
      <!-- Modal Backdrop -->
      <div
        class="fixed inset-0 z-[140] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        (click)="closeOnBackdrop($event)"
      >
        <!-- Modal Card Container -->
        <div
          class="relative w-full max-w-2xl bg-[var(--color-paper-light)] text-[var(--color-foreground)] border-[1.5px] border-[var(--color-foreground)] shadow-[8px_8px_0px_0px_var(--color-foreground)] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
        >
          <!-- Top Bar -->
          <div class="p-6 border-b-[1.5px] border-[var(--color-foreground)] bg-white/50 flex items-center justify-between">
            <h3 class="font-big text-2xl uppercase tracking-tight text-[var(--color-foreground)]">Checkout</h3>

            <button
              type="button"
              (click)="cart.closeCheckout()"
              class="text-[var(--color-foreground)] hover:text-[var(--color-primary)] font-mono text-lg font-bold transition-colors cursor-pointer"
              aria-label="Close checkout"
            >
              ✕
            </button>
          </div>

          <!-- Body: Form or Receipt Confirmation -->
          <div class="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
            @if (!placedOrder()) {
              <!-- Step 1: Customer Details & Order Review Form -->
              <form (ngSubmit)="submitOrder()" class="space-y-6">
                
                <!-- Order Items Mini Preview -->
                <div class="p-4 border-[1.5px] border-[var(--color-foreground)] bg-white space-y-3">
                  <span class="font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--color-foreground)]/60 block">
                    Order Summary ({{ cart.totalCount() }} {{ cart.totalCount() === 1 ? 'item' : 'items' }})
                  </span>

                  <div class="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                    @for (item of cart.items(); track item.id) {
                      <div class="py-2 flex items-center justify-between font-mono text-xs">
                        <div class="flex items-center gap-2 truncate pr-2">
                          <span class="font-bold text-[var(--color-primary)]">{{ item.quantity }}x</span>
                          <span class="font-bold uppercase text-[var(--color-foreground)] truncate">{{ item.product.name }}</span>
                          @if (item.product.vintage) {
                            <span class="text-[10px] text-slate-500">({{ item.product.vintage }})</span>
                          }
                        </div>
                        <span class="font-bold text-[var(--color-foreground)] shrink-0">{{ cart.formatPrice(item.subtotal) }}</span>
                      </div>
                    }
                  </div>

                  <div class="pt-2 border-t border-[var(--color-foreground)]/15 space-y-1.5 font-mono text-xs">
                    <div class="flex items-center justify-between text-[var(--color-foreground)]/70">
                      <span>Subtotal</span>
                      <span>{{ cart.formattedSubtotal() }}</span>
                    </div>
                    <div class="flex items-center justify-between text-[var(--color-foreground)]/70">
                      <span>Shipping</span>
                      <div class="text-right flex items-baseline gap-1.5 flex-wrap justify-end">
                        <span [class.text-green-700]="cart.shippingFee() === 0" [class.font-bold]="cart.shippingFee() === 0">{{ cart.shippingFeeFormatted() }}</span>
                        @if (cart.amountUntilFreeShipping() > 0) {
                          <span class="text-[10px] text-[var(--color-foreground)]/60 font-normal">
                            (add {{ cart.freeShippingRemainingFormatted() }} for free delivery)
                          </span>
                        }
                      </div>
                    </div>
                    <div class="flex items-center justify-between pt-1.5 border-t border-[var(--color-foreground)]/10 font-bold text-sm">
                      <span>Total</span>
                      <span class="text-[var(--color-primary)] text-base">{{ cart.formattedGrandTotal() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Customer Details Form -->
                <div class="space-y-4">
                  <span class="font-mono text-xs uppercase font-bold tracking-wider text-[var(--color-primary)] block">
                    1. Contact Information
                  </span>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        [(ngModel)]="customerName"
                        required
                        placeholder="ALEXANDER BOND"
                        class="editorial-input font-mono text-xs uppercase"
                      />
                    </div>

                    <div>
                      <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        [(ngModel)]="customerEmail"
                        required
                        placeholder="HELLO@DOMAIN.COM"
                        class="editorial-input font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      [(ngModel)]="customerPhone"
                      required
                      placeholder="+30 690 000 0000"
                      class="editorial-input font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <!-- Shipping Address -->
                <div class="space-y-4 pt-2 border-t border-[var(--color-foreground)]/10">
                  <span class="font-mono text-xs uppercase font-bold tracking-wider text-[var(--color-primary)] block">
                    2. Delivery Address
                  </span>

                  <div>
                    <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                      Street Address &amp; Number *
                    </label>
                    <input
                      type="text"
                      name="street"
                      [(ngModel)]="street"
                      required
                      placeholder="14 VASILISSIS SOFIAS AVE"
                      class="editorial-input font-mono text-xs uppercase"
                    />
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        [(ngModel)]="city"
                        required
                        placeholder="ATHENS"
                        class="editorial-input font-mono text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        [(ngModel)]="postalCode"
                        required
                        placeholder="106 74"
                        class="editorial-input font-mono text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        name="country"
                        [(ngModel)]="country"
                        required
                        placeholder="GREECE"
                        class="editorial-input font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                <!-- Order Notes -->
                <div class="space-y-2 pt-2 border-t border-[var(--color-foreground)]/10">
                  <label class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-foreground)]/70 font-semibold block">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    [(ngModel)]="notes"
                    rows="2"
                    placeholder="DELIVERY INSTRUCTIONS, GIFT NOTE..."
                    class="editorial-input resize-none font-mono text-xs uppercase"
                  ></textarea>
                </div>

                <!-- Error Message -->
                @if (error()) {
                  <div class="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-mono font-bold">
                    ⚠ {{ error() }}
                  </div>
                }

                <!-- Action Button -->
                <div class="pt-4 border-t-[1.5px] border-[var(--color-foreground)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div class="text-left font-mono text-[11px] text-[var(--color-foreground)]/70">
                    <span>Payment via Direct Bank Wire Transfer upon order confirmation.</span>
                  </div>

                  <button
                    type="submit"
                    [disabled]="submitting() || cart.items().length === 0"
                    class="btn btn-primary font-mono text-xs uppercase tracking-wider font-bold py-3.5 px-6 shrink-0 w-full sm:w-auto cursor-pointer"
                  >
                    <span>{{ submitting() ? 'Processing…' : 'Complete Order →' }}</span>
                  </button>
                </div>

              </form>
            } @else {
              <!-- Step 2: Order Placed Success Receipt -->
              <div class="p-8 border-[1.5px] border-[var(--color-foreground)] bg-white text-center space-y-6 shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                
                <div class="space-y-2">
                  <h3 class="font-big text-4xl uppercase tracking-tight text-[var(--color-foreground)]">
                    Order Confirmed
                  </h3>
                  <p class="font-mono text-sm uppercase font-bold text-[var(--color-primary)]">
                    Reference: {{ placedOrder()?.order_number }}
                  </p>
                </div>

                <div class="p-4 bg-[var(--color-paper-light)] border border-[var(--color-foreground)]/20 font-mono text-xs text-left space-y-2">
                  <div class="flex justify-between border-b border-[var(--color-foreground)]/10 pb-1">
                    <span class="text-slate-500 uppercase">Customer:</span>
                    <span class="font-bold">{{ placedOrder()?.customer_name }}</span>
                  </div>
                  <div class="flex justify-between border-b border-[var(--color-foreground)]/10 pb-1">
                    <span class="text-slate-500 uppercase">Email Confirmation:</span>
                    <span class="font-bold">{{ placedOrder()?.customer_email }}</span>
                  </div>
                  <div class="flex justify-between border-b border-[var(--color-foreground)]/10 pb-1">
                    <span class="text-slate-500 uppercase">Subtotal:</span>
                    <span class="font-bold">{{ cart.formatPrice(placedOrder()?.subtotal || 0) }}</span>
                  </div>
                  @if (placedOrder()?.shipping_cost) {
                    <div class="flex justify-between border-b border-[var(--color-foreground)]/10 pb-1">
                      <span class="text-slate-500 uppercase">Shipping:</span>
                      <span class="font-bold">{{ cart.formatPrice(placedOrder()?.shipping_cost || 0) }}</span>
                    </div>
                  }
                  <div class="flex justify-between border-b border-[var(--color-foreground)]/10 pb-1">
                    <span class="text-slate-500 uppercase">Total Amount:</span>
                    <span class="font-bold text-[var(--color-primary)]">{{ cart.formatPrice(placedOrder()?.total || 0) }}</span>
                  </div>
                  <div class="flex justify-between pt-1">
                    <span class="text-slate-500 uppercase">Payment Method:</span>
                    <span class="font-bold text-slate-800">Bank Wire Transfer</span>
                  </div>
                </div>

                @if (storeConfig().bank_iban) {
                  <div class="p-4 border border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-left font-mono text-xs space-y-1.5">
                    <p class="font-bold text-[var(--color-primary)] uppercase text-2xs tracking-wider mb-1">
                      Direct Wire Transfer Instructions:
                    </p>
                    @if (storeConfig().bank_name) {
                      <div class="flex justify-between">
                        <span class="text-slate-500">Bank:</span>
                        <span class="font-bold">{{ storeConfig().bank_name }}</span>
                      </div>
                    }
                    <div class="flex justify-between">
                      <span class="text-slate-500">IBAN:</span>
                      <span class="font-bold text-slate-900">{{ storeConfig().bank_iban }}</span>
                    </div>
                    @if (storeConfig().bank_bic) {
                      <div class="flex justify-between">
                        <span class="text-slate-500">BIC / SWIFT:</span>
                        <span class="font-bold">{{ storeConfig().bank_bic }}</span>
                      </div>
                    }
                    @if (storeConfig().bank_beneficiary) {
                      <div class="flex justify-between">
                        <span class="text-slate-500">Beneficiary:</span>
                        <span class="font-bold">{{ storeConfig().bank_beneficiary }}</span>
                      </div>
                    }
                    <div class="flex justify-between pt-1 border-t border-[var(--color-primary)]/10">
                      <span class="text-slate-500">Payment Reference:</span>
                      <span class="font-bold text-[var(--color-primary)]">{{ placedOrder()?.order_number }}</span>
                    </div>
                  </div>
                }

                <p class="font-sans text-xs text-[var(--color-foreground)]/80 leading-relaxed max-w-md mx-auto">
                  Thank you for your order. We have sent a confirmation email with your order summary and payment instructions.
                </p>

                <div class="pt-4 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    (click)="dismissOrderReceipt()"
                    class="btn btn-primary font-mono text-xs uppercase font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>

              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class WhCheckoutModal {
  cart = inject(CartService);
  private api = inject(AdminApi);
  private i18n = inject(I18nService);
  private settingsService = inject(SiteSettingsService);

  readonly storeConfig = computed(() => this.settingsService.storeConfig());

  customerName = '';
  customerEmail = '';
  customerPhone = '';
  street = '';
  city = 'Athens';
  postalCode = '';
  country = 'Greece';
  notes = '';

  readonly submitting = signal(false);
  readonly error = signal('');
  readonly placedOrder = signal<Order | null>(null);

  t(val?: I18nText | string | null): string {
    if (!val) return '';
    return this.i18n.t(val as I18nText);
  }

  closeOnBackdrop(e: MouseEvent): void {
    this.cart.closeCheckout();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.cart.isCheckoutOpen()) {
      this.cart.closeCheckout();
    }
  }

  submitOrder(): void {
    if (!this.customerName.trim() || !this.customerEmail.trim() || !this.customerPhone.trim() || !this.street.trim()) {
      this.error.set('Please complete all required fields (*)');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const itemsPayload = this.cart.items().map((item) => ({
      product_id: typeof item.product.id === 'number' ? item.product.id : null,
      product_name: item.product.name,
      vintage: item.product.vintage || null,
      price: item.price,
      quantity: item.quantity,
    }));

    const orderData = {
      customer_name: this.customerName.trim(),
      customer_email: this.customerEmail.trim(),
      customer_phone: this.customerPhone.trim(),
      shipping_address: {
        street: this.street.trim(),
        city: this.city.trim(),
        postal_code: this.postalCode.trim(),
        country: this.country.trim(),
      },
      notes: this.notes.trim(),
      items: itemsPayload,
    };

    this.api.submitPublicOrder(orderData).subscribe({
      next: (order) => {
        this.placedOrder.set(order);
        this.cart.clear();
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message || 'Could not place order. Please check your connection and try again.');
      },
    });
  }

  dismissOrderReceipt(): void {
    this.placedOrder.set(null);
    this.cart.closeCheckout();
  }
}
