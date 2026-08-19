import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../admin/api';
import { SiteSettingsService } from '../../core/site-settings.service';
import { WhLogo } from '../../shared/brand-logo';

@Component({
  selector: 'wh-newsletter-unsubscribe',
  imports: [RouterLink, FormsModule, WhLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[var(--color-paper-light)] text-[var(--color-foreground)] flex flex-col justify-between p-6 sm:p-12">
      
      <!-- Top Brand Bar -->
      <header class="flex items-center justify-between max-w-2xl w-full mx-auto pb-8 border-b-[1.5px] border-[var(--color-foreground)]">
        <a routerLink="/" class="flex items-center gap-3 group cursor-pointer">
          <wh-logo variant="dark-badge" [size]="36" class="group-hover:scale-105 transition-transform" />
          <div class="flex flex-col">
            <span class="font-big text-xl tracking-tight uppercase leading-none text-[var(--color-foreground)]">The Winehouse</span>
            <span class="font-mono text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold">Cellar Dispatches</span>
          </div>
        </a>

        <a routerLink="/" class="font-mono text-xs uppercase font-bold tracking-wider hover:text-[var(--color-primary)] transition-colors">
          ← Return to Atelier
        </a>
      </header>

      <!-- Main Action Card -->
      <main class="max-w-xl w-full mx-auto my-12">
        <div class="p-8 sm:p-10 border-[1.5px] border-[var(--color-foreground)] bg-white shadow-[8px_8px_0px_0px_var(--color-foreground)] space-y-6">
          
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <span class="tape-sticker bg-[var(--color-foreground)] text-white">EU GDPR CONSENT WITHDRAWAL</span>
            <span class="font-mono text-xs text-slate-400 font-bold">Registry Update</span>
          </div>

          @if (loading()) {
            <div class="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <span class="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></span>
              <p class="font-mono text-xs uppercase tracking-wider text-slate-600 font-bold">
                Processing your unsubscription request…
              </p>
            </div>
          } @else if (unsubscribed()) {
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              
              <h1 class="font-big text-3xl sm:text-4xl uppercase tracking-tight text-[var(--color-foreground)]">
                Unsubscribed Successfully
              </h1>

              <p class="font-mono text-xs leading-relaxed text-slate-600">
                @if (unsubscribedEmail()) {
                  The email address <strong class="text-slate-900">{{ unsubscribedEmail() }}</strong> has been removed from our marketing and newsletter dispatches list.
                } @else {
                  Your address has been removed from our marketing and newsletter dispatches list.
                }
              </p>

              <div class="p-4 bg-[var(--color-paper-light)] border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1 rounded-sm">
                <div class="font-bold uppercase text-[var(--color-foreground)]">What happens next:</div>
                <p>You will no longer receive promotional dispatches or parcel allocation alerts. Note that transactional emails for active orders placed on our store will continue to be delivered.</p>
              </div>

              <!-- Re-subscribe Option -->
              <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <a routerLink="/shop" class="btn btn-primary font-mono text-xs uppercase font-bold py-2.5 px-6 w-full sm:w-auto text-center">
                  Explore Bottlings Vault →
                </a>

                <button
                  type="button"
                  (click)="resubscribe()"
                  [disabled]="resubscribing()"
                  class="font-mono text-xs uppercase text-[var(--color-primary)] hover:underline font-bold cursor-pointer disabled:opacity-50"
                >
                  {{ resubscribing() ? 'Re-subscribing…' : 'Unsubscribed by accident? Re-join list' }}
                </button>
              </div>
            </div>
          } @else if (resubscribed()) {
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center text-xl font-bold">
                🍷
              </div>
              
              <h1 class="font-big text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
                Welcome Back
              </h1>

              <p class="font-mono text-xs leading-relaxed text-slate-600">
                Your subscription has been successfully reactivated. You will continue to receive private parcel releases and sommelier tasting invitations.
              </p>

              <div class="pt-4">
                <a routerLink="/" class="btn btn-primary font-mono text-xs uppercase font-bold py-2.5 px-6 inline-block">
                  Return to Homepage →
                </a>
              </div>
            </div>
          } @else {
            <!-- Manual Email Input Form if no token in query params -->
            <form (ngSubmit)="submitManualUnsubscribe()" class="space-y-4">
              <h1 class="font-big text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
                Manage Newsletter Preferences
              </h1>

              <p class="font-mono text-xs leading-relaxed text-slate-600">
                Enter your email address below to immediately withdraw your consent and unsubscribe from all Winehouse newsletters.
              </p>

              @if (errorMessage()) {
                <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold">
                  ⚠ {{ errorMessage() }}
                </div>
              }

              <div>
                <label class="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="manualEmail"
                  [(ngModel)]="manualEmail"
                  required
                  placeholder="HELLO@DOMAIN.COM"
                  class="editorial-input font-mono text-xs uppercase"
                />
              </div>

              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="!manualEmail || loading()"
                  class="btn btn-primary font-mono text-xs uppercase font-bold py-3 px-6 w-full cursor-pointer disabled:opacity-50"
                >
                  <span>{{ loading() ? 'Unsubscribing…' : 'Confirm Unsubscribe →' }}</span>
                </button>
              </div>
            </form>
          }

        </div>
      </main>

      <!-- Minimal Footer -->
      <footer class="max-w-2xl w-full mx-auto pt-6 border-t-[1.5px] border-[var(--color-foreground)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-wider text-[var(--color-foreground)]/60">
        <span>The Winehouse Independent Atelier &bull; Privacy Protection</span>
        <a routerLink="/about" class="hover:text-[var(--color-foreground)] underline">Privacy Policy</a>
      </footer>

    </div>
  `,
})
export class NewsletterUnsubscribe implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AdminApi);
  private settingsService = inject(SiteSettingsService);

  readonly loading = signal(false);
  readonly unsubscribed = signal(false);
  readonly resubscribed = signal(false);
  readonly resubscribing = signal(false);
  readonly unsubscribedEmail = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  manualEmail = '';
  private token: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || null;
      const email = params['email'] || null;

      if (this.token && this.token !== 'TEST_TOKEN_PREVIEW') {
        this.executeUnsubscribe({ token: this.token });
      } else if (email) {
        this.manualEmail = email;
        this.executeUnsubscribe({ email });
      } else if (this.token === 'TEST_TOKEN_PREVIEW') {
        // Preview mode for admin test emails
        this.unsubscribedEmail.set('preview-recipient@domain.com');
        this.unsubscribed.set(true);
      }
    });
  }

  private executeUnsubscribe(params: { token?: string; email?: string }): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.unsubscribeNewsletter(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.unsubscribed.set(true);
        if (res.email) {
          this.unsubscribedEmail.set(res.email);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Could not verify unsubscription link. You can enter your email manually below.'
        );
      },
    });
  }

  submitManualUnsubscribe(): void {
    if (!this.manualEmail.trim()) return;
    this.executeUnsubscribe({ email: this.manualEmail.trim() });
  }

  resubscribe(): void {
    const email = this.unsubscribedEmail() || this.manualEmail;
    if (!email) return;

    this.resubscribing.set(true);
    this.api
      .subscribeNewsletter({
        email,
        consent: true,
        source: 'resubscribed_page',
        consent_text: 'Re-activated subscription via unsubscribe management page under EU GDPR.',
      })
      .subscribe({
        next: () => {
          this.resubscribing.set(false);
          this.unsubscribed.set(false);
          this.resubscribed.set(true);
        },
        error: () => {
          this.resubscribing.set(false);
        },
      });
  }
}
