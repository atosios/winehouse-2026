import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, Location, NgStyle, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminApi, Post } from '../../admin/api';
import { I18nService, I18nText } from '../../core/i18n.service';
import { SiteSettingsService } from '../../core/site-settings.service';
import { SeoService } from '../../core/seo.service';
import { resolveMediaUrl } from '../../core/media.utils';
import { SITE } from '../../core/site-config';

export interface PostBlockTypography {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: string;
  lineHeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface PostBlockImageSettings {
  objectFit?: 'cover' | 'contain' | 'auto';
  aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1' | '3/2' | '9/16';
  maxWidth?: 'full' | 'lg' | 'md' | 'sm' | 'center';
  maxHeight?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shadow?: 'none' | 'xs' | 'md' | 'lg' | 'xl';
  borderStyle?: 'none' | 'subtle' | 'sand' | 'crimson';
  altText?: string;
}

export interface PostBlockContainerSettings {
  bgStyle?: 'transparent' | 'white' | 'sand' | 'slate' | 'gold';
  padding?: 'compact' | 'standard' | 'spacious';
  borderRadius?: 'none' | 'md' | 'xl' | '2xl';
  borderStyle?: 'none' | 'subtle' | 'sand' | 'crimson';
}

export interface PostBlockColumnsSettings {
  ratio?: '50-50' | '60-40' | '40-60';
  gap?: 'compact' | 'standard' | 'spacious';
  alignItems?: 'start' | 'center' | 'stretch';
}

export interface PostBlock {
  id: string;
  type:
    | 'heading'
    | 'paragraph'
    | 'image'
    | 'video'
    | 'quote'
    | 'wine_card'
    | 'pairing_box'
    | 'event_box'
    | 'divider'
    | 'container'
    | 'columns_2'
    | 'columns_3';
  typography?: PostBlockTypography;
  imageSettings?: PostBlockImageSettings;
  containerSettings?: PostBlockContainerSettings;
  columnsSettings?: PostBlockColumnsSettings;
  children?: PostBlock[];
  columns?: PostBlock[][];
  headingText?: string;
  headingLevel?: 'h2' | 'h3';
  paragraphText?: string;
  imageUrl?: string;
  imageCaption?: string;
  videoUrl?: string;
  videoCaption?: string;
  quoteText?: string;
  quoteAuthor?: string;
  // Wine Card & Shop Linking
  productId?: number | null;
  productSlug?: string | null;
  productPrice?: number | null;
  wineName?: string;
  winery?: string;
  vintage?: string;
  region?: string;
  grape?: string;
  tastingNotes?: string;
  sommelierRating?: string;
  dishName?: string;
  matchedWine?: string;
  pairingNotes?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  rsvpLink?: string;
}

@Component({
  selector: 'wh-post-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, NgStyle, NgTemplateOutlet],
  templateUrl: './post-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private api = inject(AdminApi);
  readonly i18n = inject(I18nService);
  private settingsService = inject(SiteSettingsService);
  private seo = inject(SeoService);

  private sub?: Subscription;

  readonly post = signal<Post | null>(null);
  readonly relatedPosts = signal<Post[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly copiedToast = signal<boolean>(false);

  readonly blocks = computed<PostBlock[]>(() => {
    const p = this.post();
    if (!p) return [];

    const metaBlocks = p.meta_data && (p.meta_data as any).blocks;
    if (Array.isArray(metaBlocks) && metaBlocks.length > 0) {
      return metaBlocks as PostBlock[];
    }

    if (p.body) {
      return this.parseMarkdownToBlocks(p.body);
    }

    return [];
  });

  readonly readingTimeMinutes = computed<number>(() => {
    const blks = this.blocks();
    let words = 0;
    for (const b of blks) {
      if (b.paragraphText) words += b.paragraphText.split(/\s+/).length;
      if (b.headingText) words += b.headingText.split(/\s+/).length;
      if (b.quoteText) words += b.quoteText.split(/\s+/).length;
    }
    const mins = Math.ceil(words / 180);
    return mins > 0 ? mins : 2;
  });

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string | null | undefined): string {
    if (!val) return '';
    return this.i18n.t(val as I18nText);
  }

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || params.get('id');
      const isPreview = this.route.snapshot.queryParamMap.has('preview');
      if (slug) {
        this.loadPost(slug, isPreview);
      } else {
        this.error.set('Story or dispatch not specified.');
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.removeStructuredData('article-schema-jsonld');
    this.seo.removeStructuredData('breadcrumb-schema-jsonld');
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  copyLink(): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedToast.set(true);
      setTimeout(() => this.copiedToast.set(false), 2400);
    });
  }

  getShareUrl(platform: 'twitter' | 'facebook' | 'whatsapp' | 'email'): string {
    if (typeof window === 'undefined') return '#';
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.post()?.title || SITE.name);

    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${title}%20${url}`;
      case 'email':
        return `mailto:?subject=${title}&body=${url}`;
    }
  }

  getCustomStyle(target: 'title' | 'excerpt'): Record<string, string> {
    const p = this.post();
    if (!p) return {};
    const meta = (p.meta_data || {}) as any;
    const typo = target === 'title' ? meta.titleTypography : meta.excerptTypography;
    return this.getTypographyStyle(typo);
  }

  getTypographyStyle(typo?: PostBlockTypography): Record<string, string> {
    if (!typo) return {};
    const styles: Record<string, string> = {};
    if (typo.fontFamily) styles['font-family'] = typo.fontFamily;
    if (typo.fontSize) styles['font-size'] = typo.fontSize;
    if (typo.fontWeight) styles['font-weight'] = typo.fontWeight;
    if (typo.color) styles['color'] = typo.color;
    if (typo.textTransform && typo.textTransform !== 'none') styles['text-transform'] = typo.textTransform;
    if (typo.fontStyle && typo.fontStyle !== 'normal') styles['font-style'] = typo.fontStyle;
    if (typo.letterSpacing) styles['letter-spacing'] = typo.letterSpacing;
    if (typo.lineHeight) styles['line-height'] = typo.lineHeight;
    if (typo.textAlign) styles['text-align'] = typo.textAlign;
    return styles;
  }

  getImageContainerClass(block: PostBlock): string {
    const s = block.imageSettings || {};
    const classes = ['relative', 'overflow-hidden'];

    if (s.borderRadius === 'none') classes.push('rounded-none');
    else if (s.borderRadius === 'sm') classes.push('rounded-md');
    else if (s.borderRadius === 'md') classes.push('rounded-lg');
    else if (s.borderRadius === '2xl') classes.push('rounded-2xl');
    else if (s.borderRadius === 'full') classes.push('rounded-full');
    else classes.push('rounded-xl');

    if (s.borderStyle === 'sand') classes.push('border border-[#e8ded0]');
    else if (s.borderStyle === 'crimson') classes.push('border-2 border-[#701423]');
    else if (s.borderStyle === 'none') classes.push('border-0');
    else classes.push('border border-slate-200/80');

    if (s.shadow === 'xs') classes.push('shadow-xs');
    else if (s.shadow === 'md') classes.push('shadow-md');
    else if (s.shadow === 'lg') classes.push('shadow-lg');
    else if (s.shadow === 'xl') classes.push('shadow-xl');

    if (s.maxWidth === 'sm') classes.push('max-w-xs mx-auto');
    else if (s.maxWidth === 'md') classes.push('max-w-md mx-auto');
    else if (s.maxWidth === 'lg') classes.push('max-w-2xl mx-auto');
    else if (s.maxWidth === 'center') classes.push('max-w-3xl mx-auto');
    else classes.push('w-full');

    classes.push('bg-slate-100');
    return classes.join(' ');
  }

  getImageStyle(block: PostBlock): Record<string, string> {
    const s = block.imageSettings || {};
    const styles: Record<string, string> = {};

    styles['object-fit'] = s.objectFit || 'cover';

    if (s.aspectRatio && s.aspectRatio !== 'auto') {
      styles['aspect-ratio'] = s.aspectRatio;
    }

    if (s.maxHeight && s.maxHeight !== 'none' && s.maxHeight !== 'auto') {
      styles['max-height'] = s.maxHeight;
    } else {
      styles['max-height'] = '384px';
    }

    return styles;
  }

  getContainerClasses(block: PostBlock): string {
    const s = block.containerSettings || {};
    const classes = ['w-full', 'my-4'];
    if (s.padding === 'compact') classes.push('space-y-2');
    else if (s.padding === 'spacious') classes.push('space-y-6');
    else classes.push('space-y-4');
    return classes.join(' ');
  }

  getColumns2Classes(block: PostBlock): string {
    const ratio = block.columnsSettings?.ratio || '50-50';
    if (ratio === '60-40') return 'grid grid-cols-1 md:grid-cols-12 gap-4 items-start [&>*:first-child]:md:col-span-7 [&>*:last-child]:md:col-span-5';
    if (ratio === '40-60') return 'grid grid-cols-1 md:grid-cols-12 gap-4 items-start [&>*:first-child]:md:col-span-5 [&>*:last-child]:md:col-span-7';
    return 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start';
  }

  private loadPost(slug: string, isPreview: boolean): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getPublicPost(slug, isPreview).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        this.updateSeo(post);
        this.loadRelatedPosts(post);
      },
      error: () => {
        this.error.set('The requested article, cellar dispatch, or masterclass notes could not be found.');
        this.loading.set(false);
      },
    });
  }

  private loadRelatedPosts(current: Post): void {
    this.api.getPublicPosts().subscribe({
      next: (all) => {
        const filtered = (all || [])
          .filter((p) => p.id !== current.id && p.slug !== current.slug)
          .slice(0, 3);
        this.relatedPosts.set(filtered);
      },
    });
  }

  private updateSeo(post: Post): void {
    const pageTitle = `${post.title} — ${SITE.name} Journal`;
    const description =
      post.excerpt ||
      `Read ${post.title} on The Winehouse Journal. Curated cellar notes, seasonal dispatches & sommelier essays.`;
    const image = post.cover_image ? this.mediaUrl(post.cover_image) : undefined;
    const url = typeof window !== 'undefined' ? window.location.href : `https://winehouse.gr/posts/${post.slug}`;

    this.seo.setMeta({
      title: pageTitle,
      description,
      image,
      url,
      type: 'article',
    });

    this.seo.setArticleStructuredData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || undefined,
      body: post.body || undefined,
      cover_image: post.cover_image || undefined,
      created_at: post.created_at || undefined,
      updated_at: post.updated_at || undefined,
      author_name: post.author_name || undefined,
    });
  }

  private parseMarkdownToBlocks(md: string): PostBlock[] {
    const lines = md.split('\n');
    const result: PostBlock[] = [];
    let currentPara = '';

    const flushPara = () => {
      if (currentPara.trim()) {
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'paragraph',
          paragraphText: currentPara.trim(),
        });
        currentPara = '';
      }
    };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        flushPara();
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'heading',
          headingLevel: 'h2',
          headingText: line.substring(3).trim(),
        });
      } else if (line.startsWith('### ')) {
        flushPara();
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'heading',
          headingLevel: 'h3',
          headingText: line.substring(4).trim(),
        });
      } else if (line.startsWith('> ')) {
        flushPara();
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'quote',
          quoteText: line.substring(2).trim(),
        });
      } else if (line.trim() === '---') {
        flushPara();
        result.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'divider',
        });
      } else {
        currentPara += (currentPara ? '\n' : '') + line;
      }
    }
    flushPara();
    return result;
  }
}
