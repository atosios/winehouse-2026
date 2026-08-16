import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from './auth';

@Component({
  selector: 'wh-admin-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#0d0e12] px-4 font-sans relative overflow-hidden">
      <!-- Subtle Ambient Glow -->
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#701423]/15 rounded-full blur-3xl pointer-events-none"></div>

      <form
        class="w-full max-w-sm p-8 bg-[#16171f] border border-white/10 rounded-2xl shadow-2xl space-y-5 relative z-10"
        (ngSubmit)="submit()"
      >
        <div class="text-center space-y-2 mb-6">
          <img src="/logo_white_mark.png" alt="The Winehouse" class="h-12 mx-auto drop-shadow-md" />
          <h1 class="text-xl font-bold tracking-tight text-white">The Winehouse</h1>
          <p class="text-xs text-slate-400">Sign in to Admin Dashboard</p>
        </div>

        <div>
          <label class="admin-field-label !text-slate-300" for="email">Email</label>
          <input
            id="email"
            class="admin-field-input !bg-[#101117] !border-white/10 !text-white focus:!border-white/40 focus:!ring-white/10"
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            autocomplete="username"
            placeholder="admin@thewinehouse.gr"
          />
        </div>

        <div>
          <label class="admin-field-label !text-slate-300" for="password">Password</label>
          <input
            id="password"
            class="admin-field-input !bg-[#101117] !border-white/10 !text-white focus:!border-white/40 focus:!ring-white/10"
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
            placeholder="••••••••••••"
          />
        </div>

        @if (error()) {
          <div class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
            {{ error() }}
          </div>
        }

        <button class="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-white hover:bg-slate-100 active:scale-[0.98] shadow-md transition-all cursor-pointer" type="submit" [disabled]="busy()">
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
