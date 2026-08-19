import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SocialIconDef {
  key: string;
  name: string;
  viewBox?: string;
  fill?: 'currentColor' | 'none';
  stroke?: 'currentColor' | 'none';
  strokeWidth?: string;
  rawSvg: string;
}

export const SOCIAL_ICON_LIBRARY: SocialIconDef[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    rawSvg: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.171-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    rawSvg: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  },
  {
    key: 'spotify',
    name: 'Spotify',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    rawSvg: '<circle cx="12" cy="12" r="10"/><path d="M7 9.5c3-1 7-.8 10 1"/><path d="M8 12.5c2.5-.8 5.8-.6 8.3.9"/><path d="M8.5 15.5c2-.5 4.5-.4 6.5.8"/>',
  },
  {
    key: 'substack',
    name: 'Substack',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M22.5 4H1.5V1h21v3zm0 5H1.5V6h21v3zm0 5.4L12 21 1.5 14.4V11h21v3.4z"/>',
  },
  {
    key: 'vivino',
    name: 'Vivino / Wine',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    rawSvg: '<path d="M6 3v5a6 6 0 0 0 5 5.91V20H8v2h8v-2h-3v-6.09A6 6 0 0 0 18 8V3H6zm10 5a4 4 0 0 1-8 0V5h8v3z"/>',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    rawSvg: '<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>',
  },
  {
    key: 'globe',
    name: 'Website / Link',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    rawSvg: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  },
];

/**
 * Resolve an icon key from icon identifier or auto-detect based on label and url.
 */
export function resolveSocialIconKey(icon?: string | null, label?: string | null, url?: string | null): string {
  if (icon && icon.trim()) {
    const found = SOCIAL_ICON_LIBRARY.find((item) => item.key.toLowerCase() === icon.trim().toLowerCase());
    if (found) return found.key;
  }

  const text = `${label || ''} ${url || ''}`.toLowerCase();
  if (text.includes('instagram') || text.includes('instagr.am')) return 'instagram';
  if (text.includes('facebook') || text.includes('fb.com') || text.includes('fb.me')) return 'facebook';
  if (text.includes('tiktok')) return 'tiktok';
  if (text.includes('twitter') || text.includes('x.com') || text.includes('twitter.com') || label?.toLowerCase() === 'x') return 'x';
  if (text.includes('youtube') || text.includes('youtu.be')) return 'youtube';
  if (text.includes('pinterest') || text.includes('pin.it')) return 'pinterest';
  if (text.includes('linkedin')) return 'linkedin';
  if (text.includes('spotify')) return 'spotify';
  if (text.includes('substack')) return 'substack';
  if (text.includes('vivino')) return 'vivino';
  if (text.includes('whatsapp') || text.includes('wa.me')) return 'whatsapp';

  return 'globe';
}

@Component({
  selector: 'wh-social-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="wh-social-icon-inner inline-flex items-center justify-center leading-none select-none pointer-events-none"
      [class]="class"
      [innerHTML]="safeSvg()"
    ></span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      vertical-align: middle;
    }
    :host ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class WhSocialIcon {
  private sanitizer = inject(DomSanitizer);

  @Input() name?: string | null;
  @Input() label?: string | null;
  @Input() url?: string | null;
  @Input() size: number | string = 16;
  @Input() class = 'w-4 h-4';

  readonly iconDef = computed<SocialIconDef>(() => {
    const key = resolveSocialIconKey(this.name, this.label, this.url);
    return SOCIAL_ICON_LIBRARY.find((item) => item.key === key) || SOCIAL_ICON_LIBRARY[SOCIAL_ICON_LIBRARY.length - 1];
  });

  readonly safeSvg = computed<SafeHtml>(() => {
    const def = this.iconDef();
    const sizeAttr = this.size ? `width="${this.size}" height="${this.size}"` : '';
    const strokeAttr = def.stroke === 'currentColor' ? 'stroke="currentColor"' : 'stroke="none"';
    const fillAttr = def.fill === 'currentColor' ? 'fill="currentColor"' : 'fill="none"';
    const strokeWidthAttr = def.strokeWidth ? `stroke-width="${def.strokeWidth}"` : '';

    const svg = `<svg viewBox="${def.viewBox || '0 0 24 24'}" ${fillAttr} ${strokeAttr} ${strokeWidthAttr} stroke-linecap="round" stroke-linejoin="round" ${sizeAttr}>${def.rawSvg}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });
}
