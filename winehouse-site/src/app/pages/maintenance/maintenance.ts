import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '../../core/site-config';
import { WhLogo } from '../../shared/brand-logo';

/** Fullscreen "under maintenance" holding page (covers header/footer too). */
@Component({
  selector: 'wh-maintenance',
  imports: [WhLogo, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="paper fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden px-6">
      <div class="wine-stain h-56 w-56 -top-16 -left-16 float-slower"></div>
      <div class="wine-stain h-72 w-72 -bottom-24 -right-20 float-slow"></div>

      <wh-logo variant="default" [size]="64" class="relative" />

      <video
        class="relative w-full max-w-3xl rounded-lg shadow-elevated"
        src="maintenance.mp4"
        autoplay
        loop
        muted
        playsinline
        disablepictureinpicture
        [attr.aria-label]="site.name + ' — under maintenance'"
      ></video>

      <p class="hand-note relative text-2xl text-muted">see you soon — chin chin!</p>

      <a routerLink="/admin/login"
         class="absolute bottom-3 right-4 text-2xs tracking-widest text-subtle/60 transition-colors hover:text-muted">
        admin
      </a>
    </div>
  `,
})
export class Maintenance {
  readonly site = SITE;
}
