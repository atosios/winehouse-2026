import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { SeoService } from '../../core/seo.service';
import { SiteSettingsService } from '../../core/site-settings.service';
import { WhReveal } from '../../shared/reveal';
import { LEGAL_METADATA, LEGAL_SECTIONS, LegalSection } from './legal-content';

@Component({
  selector: 'wh-legal',
  standalone: true,
  imports: [CommonModule, RouterLink, WhReveal],
  templateUrl: './legal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage implements OnInit {
  private i18n = inject(I18nService);
  private seo = inject(SeoService);
  private settingsService = inject(SiteSettingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scroller = inject(ViewportScroller);

  readonly sections = LEGAL_SECTIONS;
  readonly metadata = LEGAL_METADATA;
  readonly activeFilter = signal<string>('all');

  readonly currentLang = computed(() => this.i18n.currentLang());

  get site() {
    return this.settingsService.settings();
  }

  t(item?: { en?: string; el?: string } | string | null): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    const lang = this.currentLang();
    if (lang === 'el' && item.el) return item.el;
    return item.en || '';
  }

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path || '';

    if (path === 'privacy') {
      this.activeFilter.set('privacy-cookies');
    } else if (path === 'terms') {
      this.activeFilter.set('terms-age');
    }

    this.route.fragment.subscribe((frag) => {
      if (frag && this.sections.some((s) => s.id === frag)) {
        this.activeFilter.set(frag);
        setTimeout(() => {
          this.scroller.scrollToAnchor(frag);
        }, 100);
      }
    });

    this.updateSeoMeta();
  }

  setFilter(filterId: string): void {
    this.activeFilter.set(filterId);
    if (filterId !== 'all') {
      setTimeout(() => {
        this.scroller.scrollToAnchor(filterId);
      }, 50);
    }
  }

  scrollToSection(sectionId: string): void {
    this.activeFilter.set('all');
    setTimeout(() => {
      this.scroller.scrollToAnchor(sectionId);
    }, 50);
  }

  private updateSeoMeta(): void {
    const isEl = this.currentLang() === 'el';
    const title = isEl
      ? 'Όροι Χρήσης, Ασφάλεια Συναλλαγών & Πολιτική Απορρήτου | The Winehouse'
      : 'Terms of Service, Wine Policies & Privacy Hub | The Winehouse';
    const description = isEl
      ? 'Επίσημοι όροι χρήσης, όριο ηλικίας 18+, προστασία θραύσης φιαλών, δικαίωμα υπαναχώρησης 14 ημερών, πολιτική απορρήτου GDPR και στοιχεία επικοινωνίας The Winehouse.'
      : 'Official terms of sale, 18+ age restrictions, glass bottle breakage insurance, 14-day statutory return rights, GDPR privacy, and company registration credentials.';

    this.seo.setMeta({
      title,
      description,
      keywords:
        'wine terms of sale, 18+ alcohol policy, bottle breakage warranty, 14 day return right, winehouse gdpr privacy, company credentials',
      type: 'website',
    });

    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: isEl ? 'Όροι & Πολιτικές' : 'Legal & Policies', url: `${this.seo.getSiteOrigin()}/terms` },
    ]);
  }
}
