import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SiteSettingsService } from '../core/site-settings.service';

/** Brand logo. Files live in `public/` — replace them to rebrand. */
@Component({
  selector: 'wh-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="src()"
      [style.height.px]="size()"
      [alt]="alt()"
      class="block w-auto select-none"
      draggable="false"
    />
  `,
})
export class WhLogo {
  private settingsService = inject(SiteSettingsService);

  /** default = red full logo | mark = red bottle only | white = full on dark | white-mark | rotated | dark-badge | white-badge */
  readonly variant = input<'default' | 'mark' | 'white' | 'white-mark' | 'rotated' | 'dark-badge' | 'white-badge'>('default');
  readonly size = input(44);

  readonly src = computed(() => {
    switch (this.variant()) {
      case 'mark': return 'logo_default_mark.png';
      case 'white': return 'logo_white.png';
      case 'white-mark': return 'logo_white_mark.png';
      case 'rotated': return 'logo_default_rotated.png';
      case 'dark-badge': return 'logo_badge_dark.png';
      case 'white-badge': return 'logo_badge.png';
      default: return 'logo_default.png';
    }
  });

  readonly alt = computed(() => this.settingsService.name());
}
