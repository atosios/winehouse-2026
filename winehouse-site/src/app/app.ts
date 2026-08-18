import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SiteHeader } from './layout/site-header';
import { WhCartDrawer } from './shared/cart-drawer';
import { WhCheckoutModal } from './shared/checkout-modal';
import { SiteSettingsService } from './core/site-settings.service';
import { AdminAuth } from './admin/auth';
import { Maintenance } from './pages/maintenance/maintenance';
import { SeoService } from './core/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, WhCartDrawer, WhCheckoutModal, Maintenance],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private router = inject(Router);
  private settings = inject(SiteSettingsService);
  private auth = inject(AdminAuth);
  private seo = inject(SeoService);

  constructor() {
    effect(() => {
      const s = this.settings.settings();
      this.seo.syncGlobalSeo(s.seo_config, s);
    });
  }

  ngOnInit(): void {
    this.settings.load().subscribe();
  }

  /** The admin dashboard brings its own layout. */
  isAdmin = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: typeof location !== 'undefined' ? location.pathname.startsWith('/admin') : false },
  );

  showMaintenance = computed(() => {
    return this.settings.isMaintenanceMode() && !this.auth.isLoggedIn && !this.isAdmin();
  });
}
