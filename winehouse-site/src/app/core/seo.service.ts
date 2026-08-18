import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { SITE } from './site-config';
import { Product } from '../admin/api';
import { I18nService } from './i18n.service';
import { resolveMediaUrl } from './media.utils';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleService = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private i18n = inject(I18nService);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Set page title formatted with site brand.
   */
  setTitle(pageTitle?: string): void {
    if (!pageTitle || pageTitle === SITE.name) {
      this.titleService.setTitle(`${SITE.name} — ${SITE.tagline}`);
    } else {
      this.titleService.setTitle(`${pageTitle} — ${SITE.name}`);
    }
  }

  /**
   * Set complete meta tags for standard search engines, OpenGraph & Twitter cards.
   */
  setMeta(config: SeoConfig): void {
    const title = config.title
      ? `${config.title} — ${SITE.name}`
      : `${SITE.name} — ${SITE.tagline}`;
    const desc =
      config.description ||
      SITE.description ||
      'Curated artisanal wines, ancestral terroir bottles, stories and cellar tastings.';
    const img = config.image ? resolveMediaUrl(config.image) : this.getDefaultOgImage();
    const url = config.url || this.getCurrentUrl();
    const type = config.type || 'website';

    this.setTitle(config.title);

    // Standard Meta
    this.meta.updateTag({ name: 'description', content: desc });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }

    // OpenGraph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: img });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.name });
    this.meta.updateTag({
      property: 'og:locale',
      content: this.i18n.currentLang() === 'el' ? 'el_GR' : 'en_US',
    });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
    this.meta.updateTag({ name: 'twitter:image', content: img });

    // Canonical link
    this.setCanonicalUrl(url);
  }

  /**
   * Injects or updates canonical URL link in document head.
   */
  setCanonicalUrl(url: string): void {
    try {
      let link: HTMLLinkElement | null = this.doc.querySelector("link[rel='canonical']");
      if (!link) {
        link = this.doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        this.doc.head.appendChild(link);
      }
      link.setAttribute('href', url);
    } catch {
      // safe fallback
    }
  }

  /**
   * Generates and injects schema.org/Product structured data for rich Google snippets.
   */
  setProductStructuredData(product: Product, pageUrl?: string): void {
    const url = pageUrl || this.getCurrentUrl();
    const img = product.cover_image
      ? resolveMediaUrl(product.cover_image)
      : this.getDefaultOgImage();
    const desc = this.i18n.t(product.tasting_note) || `${product.name} vintage ${product.vintage || ''}`;
    const varietal = this.i18n.t(product.varietal);
    const region = this.i18n.t(product.region);

    const images: string[] = [img];
    if (Array.isArray(product.gallery)) {
      product.gallery.forEach((g) => {
        if (g) images.push(resolveMediaUrl(g));
      });
    }

    const schema: Record<string, any> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: `${product.name} ${product.vintage ? product.vintage : ''}`.trim(),
      image: images.filter(Boolean),
      description: desc,
      sku: `WH-${product.id}`,
      mpn: product.slug || `bottle-${product.id}`,
      brand: {
        '@type': 'Brand',
        name: SITE.name,
      },
      category: product.category || 'Wine',
      offers: {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'EUR',
        price: Number(product.price).toFixed(2),
        priceValidUntil: '2027-12-31',
        availability:
          product.stock_quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: SITE.name,
        },
      },
    };

    if (product.vintage) {
      schema['productionDate'] = product.vintage;
    }

    if (region || varietal) {
      schema['additionalProperty'] = [];
      if (region) {
        schema['additionalProperty'].push({
          '@type': 'PropertyValue',
          name: 'Region / Terroir',
          value: region,
        });
      }
      if (varietal) {
        schema['additionalProperty'].push({
          '@type': 'PropertyValue',
          name: 'Grape Varietal',
          value: varietal,
        });
      }
      if (product.alcohol) {
        schema['additionalProperty'].push({
          '@type': 'PropertyValue',
          name: 'Alcohol by Volume',
          value: product.alcohol,
        });
      }
    }

    this.setStructuredData(schema, 'product-schema-jsonld');
  }

  /**
   * Injects BreadcrumbList structured data into head for rich search breadcrumbs.
   */
  setBreadcrumbStructuredData(items: Array<{ name: string; url: string }>): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    this.setStructuredData(schema, 'breadcrumb-schema-jsonld');
  }

  /**
   * Sets Organization / Winery structured data on general pages.
   */
  setOrganizationStructuredData(): void {
    const origin = this.getSiteOrigin();
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Winery',
      name: SITE.name,
      url: origin,
      logo: `${origin}/logo_default.png`,
      description: SITE.description,
      sameAs: [
        'https://instagram.com',
        'https://facebook.com',
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: SITE.contact.address.city,
        postalCode: SITE.contact.address.postalCode,
        streetAddress: SITE.contact.address.street,
        addressCountry: 'GR',
      },
      telephone: SITE.contact.phone,
      email: SITE.contact.email,
    };

    this.setStructuredData(schema, 'organization-schema-jsonld');
  }

  /**
   * Embeds or updates a JSON-LD script block in document head.
   */
  setStructuredData(data: object, scriptId: string): void {
    try {
      let script = this.doc.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = this.doc.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        this.doc.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    } catch {
      // safe fallback
    }
  }

  /**
   * Removes a specific structured data block.
   */
  removeStructuredData(scriptId: string): void {
    try {
      const script = this.doc.getElementById(scriptId);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    } catch {
      // safe fallback
    }
  }

  getSiteOrigin(): string {
    if (this.isBrowser && typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://thewinehouse.gr';
  }

  private getCurrentUrl(): string {
    if (this.isBrowser && typeof window !== 'undefined' && window.location.href) {
      return window.location.href;
    }
    return 'https://thewinehouse.gr';
  }

  private getDefaultOgImage(): string {
    return `${this.getSiteOrigin()}/hero_cellar.png`;
  }
}
