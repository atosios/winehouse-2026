import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'wh-about',
  imports: [RouterLink, WhReveal],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About implements OnInit {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);
  private seo = inject(SeoService);

  readonly page = computed(() => this.settingsService.about());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }

  ngOnInit(): void {
    this.seo.setMeta({
      title: 'About Our Cellar & Philosophy',
      description:
        'Discover the heritage, sommelier curation philosophy, and ancestral terroir benchmarks of The Winehouse.',
      keywords: 'about the winehouse, cellar story, sommelier philosophy, artisanal wine curation',
      type: 'website',
    });
    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: 'About Us', url: `${this.seo.getSiteOrigin()}/about` },
    ]);
  }
}
