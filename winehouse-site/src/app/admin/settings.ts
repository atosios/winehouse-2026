import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from './api';

@Component({
  selector: 'wh-admin-settings',
  imports: [FormsModule],
  template: `
    <h1 class="font-display text-3xl mb-6">Settings</h1>

    <form class="space-y-5 max-w-md paper p-6" (ngSubmit)="save()">
      <h2 class="font-display text-xl">Change password</h2>

      <div>
        <label class="field-label" for="current">Current password</label>
        <input id="current" class="field-input" type="password" name="current" [(ngModel)]="current" required autocomplete="current-password" />
      </div>

      <div>
        <label class="field-label" for="new">New password <span class="opacity-60">(at least 10 characters)</span></label>
        <input id="new" class="field-input" type="password" name="new" [(ngModel)]="password" required minlength="10" autocomplete="new-password" />
      </div>

      <div>
        <label class="field-label" for="confirm">Repeat new password</label>
        <input id="confirm" class="field-input" type="password" name="confirm" [(ngModel)]="confirmation" required autocomplete="new-password" />
      </div>

      @if (error()) {
        <p class="text-sm text-red-700">{{ error() }}</p>
      }
      @if (saved()) {
        <p class="text-sm text-green-700">Password changed ✓</p>
      }

      <button class="btn btn-primary" type="submit" [disabled]="busy()">
        {{ busy() ? 'Saving…' : 'Change password' }}
      </button>
    </form>
  `,
})
export class AdminSettings {
  private api = inject(AdminApi);

  current = '';
  password = '';
  confirmation = '';
  busy = signal(false);
  saved = signal(false);
  error = signal('');

  save() {
    if (this.password !== this.confirmation) {
      this.error.set('The two new passwords do not match.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);
    this.api
      .updatePassword({
        current_password: this.current,
        password: this.password,
        password_confirmation: this.confirmation,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.set(true);
          this.current = this.password = this.confirmation = '';
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err.error?.message ?? 'Could not change the password.');
        },
      });
  }
}
