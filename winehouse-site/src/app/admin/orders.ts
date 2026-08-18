import { DatePipe } from '@angular/common';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, Order } from './api';
import { AdminConfirm } from './confirm-dialog';

@Component({
  selector: 'wh-admin-orders',
  imports: [DatePipe, FormsModule],
  template: `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p class="text-xs text-slate-500 mt-0.5">Track incoming orders, customer details, dispatch status, and payments.</p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="loadOrders()"
          class="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>↻ Refresh</span>
        </button>
      </div>
    </div>

    <!-- Search & Status Filter Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <input
        class="admin-search"
        placeholder="Search orders by number, name, email…"
        [(ngModel)]="searchQuery"
      />
      <div class="admin-tabs overflow-x-auto">
        @for (tab of statusTabs; track tab.key) {
          <button
            type="button"
            class="admin-tab"
            [class.active]="activeStatus() === tab.key"
            (click)="activeStatus.set(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    </div>

    <!-- Orders Table -->
    @if (loading()) {
      <div class="admin-card text-center py-12 text-slate-400 text-xs font-medium">
        Loading orders…
      </div>
    } @else if (filteredOrders().length === 0) {
      <div class="admin-card admin-empty-state text-center py-12">
        <p class="text-slate-500 text-xs">No orders found matching your search.</p>
      </div>
    } @else {
      <div class="admin-card !p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <!-- Order Number -->
                  <td>
                    <button
                      type="button"
                      (click)="inspectOrder(order)"
                      class="font-semibold text-slate-900 hover:text-wine-700 hover:underline text-xs"
                    >
                      {{ order.order_number }}
                    </button>
                  </td>

                  <!-- Date -->
                  <td class="text-xs text-slate-500">
                    {{ order.created_at | date: 'short' }}
                  </td>

                  <!-- Customer -->
                  <td>
                    <div class="font-medium text-slate-900 text-xs">{{ order.customer_name }}</div>
                    <div class="text-[11px] text-slate-500">{{ order.customer_email }}</div>
                  </td>

                  <!-- Items Summary -->
                  <td>
                    <div class="text-xs text-slate-700 max-w-xs space-y-0.5">
                      @if (order.items && order.items.length > 0) {
                        @for (item of order.items; track item.id) {
                          <div class="truncate text-[11px]">
                            <span class="font-semibold text-slate-900">{{ item.quantity }}x</span>
                            {{ item.product_name }}
                            @if (item.vintage) {
                              <span class="text-slate-400">({{ item.vintage }})</span>
                            }
                          </div>
                        }
                      } @else {
                        <span class="text-slate-400 italic text-[11px]">Standard order</span>
                      }
                    </div>
                  </td>

                  <!-- Total -->
                  <td>
                    <span class="font-semibold text-slate-900 text-xs">
                      € {{ order.total.toFixed(2) }}
                    </span>
                  </td>

                  <!-- Status Pill -->
                  <td>
                    <span
                      class="px-2 py-0.5 rounded text-[11px] font-medium"
                      [class.bg-amber-50]="order.status === 'pending'"
                      [class.text-amber-700]="order.status === 'pending'"
                      [class.bg-blue-50]="order.status === 'confirmed'"
                      [class.text-blue-700]="order.status === 'confirmed'"
                      [class.bg-purple-50]="order.status === 'allocated'"
                      [class.text-purple-700]="order.status === 'allocated'"
                      [class.bg-emerald-50]="order.status === 'shipped'"
                      [class.text-emerald-700]="order.status === 'shipped'"
                      [class.bg-slate-100]="order.status === 'cancelled'"
                      [class.text-slate-600]="order.status === 'cancelled'"
                    >
                      {{ order.status }}
                    </span>
                  </td>

                  <!-- Payment Status -->
                  <td>
                    <span class="text-[11px] text-slate-600">
                      {{ order.payment_status === 'pending_bank' ? 'Bank Transfer' : order.payment_status }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="text-right">
                    <button
                      type="button"
                      (click)="inspectOrder(order)"
                      class="btn btn-secondary btn-xs cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Clean Order Inspector Modal -->
    @if (activeOrder()) {
      <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="text-sm font-bold text-slate-900">
                Order {{ activeOrder()?.order_number }}
              </h3>
              <p class="text-[11px] text-slate-500">{{ activeOrder()?.created_at | date: 'medium' }}</p>
            </div>

            <button
              type="button"
              (click)="closeInspector()"
              class="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            
            <!-- Customer & Address Symmetrical Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <label class="admin-field-label !mb-1">Customer Information</label>
                <p class="font-semibold text-slate-900 text-xs">{{ activeOrder()?.customer_name }}</p>
                <p class="text-slate-600 text-xs">{{ activeOrder()?.customer_email }}</p>
                @if (activeOrder()?.customer_phone) {
                  <p class="text-slate-500 text-xs">{{ activeOrder()?.customer_phone }}</p>
                }
              </div>

              <div>
                <label class="admin-field-label !mb-1">Delivery Address</label>
                @if (activeOrder()?.shipping_address; as addr) {
                  <p class="text-slate-800 text-xs">{{ addr.street }}</p>
                  <p class="text-slate-800 text-xs">{{ addr.postal_code }} {{ addr.city }}</p>
                  <p class="text-slate-600 font-medium text-xs">{{ addr.country }}</p>
                } @else {
                  <p class="text-slate-400 italic text-xs">Direct cellar collection</p>
                }
              </div>
            </div>

            <!-- Items Table -->
            <div class="border border-slate-200 rounded-lg overflow-hidden">
              <table class="w-full text-left">
                <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th class="p-2.5">Product</th>
                    <th class="p-2.5 text-center">Qty</th>
                    <th class="p-2.5 text-right">Price</th>
                    <th class="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  @for (item of activeOrder()?.items; track item.id) {
                    <tr>
                      <td class="p-2.5">
                        <span class="font-medium text-slate-900">{{ item.product_name }}</span>
                        @if (item.vintage) {
                          <span class="text-slate-400 ml-1">({{ item.vintage }})</span>
                        }
                      </td>
                      <td class="p-2.5 text-center font-medium text-slate-700">{{ item.quantity }}</td>
                      <td class="p-2.5 text-right text-slate-600">€ {{ item.price.toFixed(2) }}</td>
                      <td class="p-2.5 text-right font-semibold text-slate-900">€ {{ item.subtotal.toFixed(2) }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot class="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colspan="3" class="p-2.5 font-semibold text-right text-slate-700">Total:</td>
                    <td class="p-2.5 font-bold text-right text-slate-900 text-xs">€ {{ activeOrder()?.total?.toFixed(2) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Notes -->
            @if (activeOrder()?.notes) {
              <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <label class="admin-field-label !text-amber-800 !mb-1">Customer / Special Notes</label>
                <p class="text-xs">{{ activeOrder()?.notes }}</p>
              </div>
            }

            <!-- Status Controls: 100% Unified Field Labels and Selects -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label class="admin-field-label">Order Status</label>
                <select [(ngModel)]="statusUpdate" class="admin-field-input">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="allocated">Allocated</option>
                  <option value="shipped">Shipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label class="admin-field-label">Payment Status</label>
                <select [(ngModel)]="paymentStatusUpdate" class="admin-field-input">
                  <option value="pending_bank">Pending Bank Transfer</option>
                  <option value="paid">Paid / Settled</option>
                  <option value="waived">Waived / Complimentary</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                (click)="deleteOrder(activeOrder()!)"
                class="text-red-600 hover:text-red-800 text-xs font-medium cursor-pointer"
              >
                Delete Order
              </button>

              <div class="flex items-center gap-2">
                <button type="button" (click)="closeInspector()" class="btn btn-secondary btn-sm">
                  Close
                </button>
                <button type="button" (click)="saveStatusChanges()" class="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    }
  `,
})
export class AdminOrders implements OnInit {
  private api = inject(AdminApi);
  private confirmDialog = inject(AdminConfirm);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly activeOrder = signal<Order | null>(null);

  searchQuery = '';
  readonly activeStatus = signal<string>('ALL');
  readonly statusTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'allocated', label: 'Allocated' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  statusUpdate = 'pending';
  paymentStatusUpdate = 'pending_bank';

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.api.listOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  readonly filteredOrders = computed(() => {
    const list = this.orders();
    const query = this.searchQuery.trim().toLowerCase();
    const st = this.activeStatus();

    return list.filter((o) => {
      const matchStatus = st === 'ALL' || o.status === st;
      const matchSearch =
        !query ||
        o.order_number.toLowerCase().includes(query) ||
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_email.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  });

  inspectOrder(order: Order): void {
    this.activeOrder.set(order);
    this.statusUpdate = order.status;
    this.paymentStatusUpdate = order.payment_status;
  }

  closeInspector(): void {
    this.activeOrder.set(null);
  }

  saveStatusChanges(): void {
    const order = this.activeOrder();
    if (!order) return;

    this.api
      .updateOrderStatus(order.id, {
        status: this.statusUpdate,
        payment_status: this.paymentStatusUpdate,
      })
      .subscribe({
        next: (updated) => {
          this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
          this.activeOrder.set(updated);
          this.closeInspector();
        },
      });
  }

  async deleteOrder(order: Order): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: `Delete Order ${order.order_number}?`,
      message: `Are you sure you want to delete order ${order.order_number} for customer ${order.customer_name}?`,
      confirmLabel: 'Delete Order',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (confirmed) {
      this.api.deleteOrder(order.id).subscribe({
        next: () => {
          this.orders.update((list) => list.filter((p) => p.id !== order.id));
          this.closeInspector();
        },
      });
    }
  }
}
