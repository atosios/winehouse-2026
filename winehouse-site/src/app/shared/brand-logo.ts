import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SITE } from '../core/site-config';

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
  /** default = red full logo | mark = red bottle only | white = full on dark | white-mark | rotated */
  readonly variant = input<'default' | 'mark' | 'white' | 'white-mark' | 'rotated'>('default');
  readonly size = input(44);

  readonly src = computed(() => {
    switch (this.variant()) {
      case 'mark': return 'logo_default_mark.png';
      case 'white': return 'logo_white.png';
      case 'white-mark': return 'logo_white_mark.png';
      case 'rotated': return 'logo_default_rotated.png';
      default: return 'logo_default.png';
    }
  });

  readonly alt = computed(() => SITE.name);
}
