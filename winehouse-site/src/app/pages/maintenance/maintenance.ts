import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhLogo } from '../../shared/brand-logo';
import { resolveMediaUrl } from '../../core/media.utils';

/** Fullscreen "under maintenance" holding page (covers header/footer too). */
@Component({
  selector: 'wh-maintenance',
  imports: [WhLogo, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[100] bg-[#0f0e0d] text-[#f4efe8] flex flex-col items-center justify-between p-6 sm:p-10 overflow-y-auto">
      
      <!-- Top Bar: Logo & Tag -->
      <div class="w-full max-w-5xl flex items-center justify-between border-b border-white/15 pb-4">
        <wh-logo variant="white" [size]="44" />
        <span class="tape-sticker bg-white text-black text-[10px]">
          {{ t(page().badge) }}
        </span>
      </div>

      <!-- Center: Video & Editorial Note -->
      <div class="w-full max-w-3xl my-8 flex flex-col items-center text-center gap-6">
        
        <div class="space-y-2">
          <span class="font-mono text-2xs uppercase tracking-widest text-[var(--color-terracotta)] font-bold block">
            {{ t(page().tag) }}
          </span>
          <h1 class="font-big text-4xl sm:text-6xl uppercase tracking-tight text-[#f4efe8]">
            {{ t(page().headline) }}
          </h1>
          <p class="font-mono text-xs uppercase tracking-wider text-white/70 max-w-md mx-auto leading-relaxed">
            {{ t(page().subtext) }}
          </p>
        </div>

        <!-- Video Box with Editorial Frame -->
        <div class="relative w-full border-[1.5px] border-white/20 bg-black/40 overflow-hidden shadow-2xl">
          <video
            class="w-full max-h-[380px] object-cover object-center filter contrast-105"
            [src]="mediaUrl(page().video_url || 'maintenance.mp4')"
            autoplay
            loop
            muted
            playsinline
            disablepictureinpicture
            [attr.aria-label]="site.name + ' — under maintenance'"
          ></video>
          <div class="absolute bottom-3 left-3">
            <span class="px-2 py-0.5 bg-black/80 text-white font-mono text-[9px] uppercase tracking-widest border border-white/20">
              {{ t(page().video_badge) }}
            </span>
          </div>
        </div>

        <div class="pt-2">
          <a
            [href]="'mailto:' + site.contact.email"
            class="font-mono text-xs uppercase font-bold tracking-wider text-white/80 hover:text-white transition-colors border-b border-white/30 hover:border-white pb-1"
          >
            {{ t(page().inquiry_prefix) }} {{ site.contact.email }}
          </a>
        </div>

      </div>

      <!-- Bottom Bar: Notice & Admin Link -->
      <div class="w-full max-w-5xl flex items-center justify-between border-t border-white/15 pt-4 text-white/50 font-mono text-[10px] uppercase">
        <span>© {{ site.legalName }}</span>
        <a
          routerLink="/admin/login"
          class="tracking-widest text-white/40 hover:text-white transition-colors"
        >
          [ADMIN LOGIN]
        </a>
      </div>

    </div>
  `,
})
export class Maintenance {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);

  readonly page = computed(() => this.settingsService.maintenancePage());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }
}
