import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';

@Component({
  selector: 'wh-about',
  imports: [RouterLink, WhReveal],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);

  readonly page = computed(() => this.settingsService.about());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }
}
