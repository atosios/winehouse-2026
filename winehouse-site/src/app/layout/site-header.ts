import { ChangeDetectionStrategy, Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SiteSettingsService } from '../core/site-settings.service';
import { I18nService } from '../core/i18n.service';
import { CartService } from '../core/cart.service';
import { WhLogo } from '../shared/brand-logo';
import { WhSocialIcon } from '../shared/social-icon';

@Component({
  selector: 'wh-header',
  imports: [RouterLink, RouterLinkActive, WhLogo, WhSocialIcon],
  templateUrl: './site-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader implements OnInit {
  private settingsService = inject(SiteSettingsService);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly cart = inject(CartService);

  get site() {
    return this.settingsService.settings();
  }
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);
  readonly isDarkSection = signal(false);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.checkScroll();
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
        setTimeout(() => this.checkScroll(), 100);
      });
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.checkScroll();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.scrolled.set(window.scrollY > 20);

    const headerHeight = 70;

    // 1. If we are on the homepage over the hero video (before the light card arrives at header)
    const editorialCanvas = document.querySelector('#editorial-canvas');
    if (editorialCanvas) {
      const canvasRect = editorialCanvas.getBoundingClientRect();
      if (canvasRect.top > headerHeight) {
        this.isDarkSection.set(true); // White text over the dark video/headline
        return;
      }
    }

    // 2. Check if any dark section (e.g. section 02 Manifesto or section 08 Footer) is under the header
    const darkSections = document.querySelectorAll('[data-dark-section]');
    let overDark = false;

    for (let i = 0; i < darkSections.length; i++) {
      const rect = darkSections[i].getBoundingClientRect();
      if (rect.top <= headerHeight && rect.bottom >= 20) {
        overDark = true;
        break;
      }
    }

    this.isDarkSection.set(overDark);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
