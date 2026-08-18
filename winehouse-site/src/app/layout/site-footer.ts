import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../core/site-settings.service';
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
  get site() {
    return this.settingsService.settings();
  }
  readonly year = new Date().getFullYear();
}
