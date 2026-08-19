import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../core/site-settings.service';
import { I18nService, I18nText } from '../core/i18n.service';
import { SITE } from '../core/site-config';
import { WhLogo } from '../shared/brand-logo';
import { WhSocialIcon } from '../shared/social-icon';

@Component({
  selector: 'wh-footer',
  imports: [RouterLink, WhLogo, WhSocialIcon],
  templateUrl: './site-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);

  readonly siteConfig = SITE;

  get site() {
    return this.settingsService.settings();
  }

  readonly isEl = computed(() => this.i18n.currentLang() === 'el');
  readonly year = new Date().getFullYear();

  t(val: I18nText): string {
    return this.i18n.t(val);
  }
}

