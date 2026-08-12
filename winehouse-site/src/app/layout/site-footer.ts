import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '../core/site-config';
import { WhLogo } from '../shared/brand-logo';

@Component({
  selector: 'wh-footer',
  imports: [RouterLink, WhLogo],
  templateUrl: './site-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly site = SITE;
  readonly year = new Date().getFullYear();
}
