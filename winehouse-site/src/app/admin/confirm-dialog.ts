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
      <div class="admin-dialog-backdrop" (click)="svc._respond(false)">
        <div class="admin-dialog" (click)="$event.stopPropagation()">
          <h2>{{ svc.options().title }}</h2>
          <p>{{ svc.options().message }}</p>
          <div class="admin-dialog-actions">
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              (click)="svc._respond(false)"
            >
              {{ svc.options().cancelLabel }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              [class]="svc.options().danger ? 'btn-danger' : 'btn-primary'"
              (click)="svc._respond(true)"
            >
              {{ svc.options().confirmLabel }}
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
