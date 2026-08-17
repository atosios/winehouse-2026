import { Component, Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminConfirm {
  readonly visible = signal(false);
  readonly options = signal<ConfirmOptions>({
    title: '',
    message: '',
  });

  private _resolve: ((value: boolean) => void) | null = null;

  open(options: ConfirmOptions): Promise<boolean> {
    this.options.set({
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      danger: false,
      ...options,
    });
    this.visible.set(true);
    return new Promise<boolean>((resolve) => {
      this._resolve = resolve;
    });
  }

  /** @internal — called by the dialog component */
  _respond(value: boolean) {
    this.visible.set(false);
    this._resolve?.(value);
    this._resolve = null;
  }
}

@Component({
  selector: 'wh-confirm-dialog',
  standalone: true,
  template: `
    @if (svc.visible()) {
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200"
        (click)="svc._respond(false)"
      >
        <div
          class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 sm:p-7 overflow-hidden transition-all transform duration-200"
          (click)="$event.stopPropagation()"
        >
          <!-- Top badge + title + message -->
          <div class="flex items-start gap-4">
            @if (svc.options().danger) {
              <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
            } @else {
              <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-xs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            }

            <div class="flex-1 min-w-0 pt-0.5">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {{ svc.options().title }}
              </h3>
              <p class="text-xs sm:text-sm text-slate-500 leading-relaxed mt-1.5 whitespace-pre-line">
                {{ svc.options().message }}
              </p>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] rounded-xl transition-all cursor-pointer select-none"
              (click)="svc._respond(false)"
            >
              {{ svc.options().cancelLabel || 'Cancel' }}
            </button>
            <button
              type="button"
              class="px-4 py-2.5 text-xs font-semibold text-white shadow-sm active:scale-[0.98] rounded-xl transition-all cursor-pointer select-none flex items-center gap-1.5"
              [class]="svc.options().danger ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-slate-900 hover:bg-slate-800'"
              (click)="svc._respond(true)"
            >
              @if (svc.options().danger) {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              }
              <span>{{ svc.options().confirmLabel || 'Confirm' }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  constructor(public svc: AdminConfirm) {}
}
