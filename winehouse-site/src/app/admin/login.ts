import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from './auth';

@Component({
  selector: 'wh-admin-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        class="paper w-full max-w-sm p-8 space-y-5"
        (ngSubmit)="submit()"
      >
        <div class="text-center space-y-1">
          <img src="/logo_default_mark.png" alt="" class="h-14 mx-auto" />
          <h1 class="font-display text-2xl">Admin login</h1>
          <p class="text-sm opacity-70">The Winehouse dashboard</p>
        </div>

        <div>
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            class="field-input"
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            autocomplete="username"
          />
        </div>

        <div>
          <label class="field-label" for="password">Password</label>
          <input
            id="password"
            class="field-input"
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
          />
        </div>

        @if (error()) {
          <p class="text-sm text-red-700">{{ error() }}</p>
        }

        <button class="btn btn-primary w-full" type="submit" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
})
export class AdminLogin {
  private auth = inject(AdminAuth);
  private router = inject(Router);

  email = '';
  password = '';
  busy = signal(false);
  error = signal('');

  submit() {
    if (!this.email || !this.password) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (err) => {
        this.busy.set(false);
        this.error.set(
          err.status === 422
            ? 'Wrong email or password.'
            : 'Could not reach the server. Please try again.',
        );
      },
    });
  }
}
