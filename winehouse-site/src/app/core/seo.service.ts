import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { SITE } from './site-config';
import { Product, SeoConfigSettings, SiteSettings } from '../admin/api';
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
  noindex?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleService = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private i18n = inject(I18nService);

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private injectedTrackers = new Set<string>();

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

    // Robots directive
    if (config.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    }

    // OpenGraph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: img });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.name });
    
    const isGreek = this.i18n.currentLang() === 'el';
    this.meta.updateTag({
      property: 'og:locale',
      content: isGreek ? 'el_GR' : 'en_US',
    });
    this.meta.updateTag({
      property: 'og:locale:alternate',
      content: isGreek ? 'en_US' : 'el_GR',
    });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
    this.meta.updateTag({ name: 'twitter:image', content: img });

    // Canonical & Hreflang links
    this.setCanonicalUrl(url);
    this.setHreflangLinks(url);
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
   * Injects or updates multilingual hreflang links in document head.
   */
  setHreflangLinks(url: string): void {
    try {
      const langs = [
        { lang: 'en', href: url },
        { lang: 'el', href: url },
        { lang: 'x-default', href: url },
      ];

      langs.forEach(({ lang, href }) => {
        let link: HTMLLinkElement | null = this.doc.querySelector(`link[rel='alternate'][hreflang='${lang}']`);
        if (!link) {
          link = this.doc.createElement('link');
          link.setAttribute('rel', 'alternate');
          link.setAttribute('hreflang', lang);
          this.doc.head.appendChild(link);
        }
        link.setAttribute('href', href);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Applies global webmaster verification tokens, indexing rules, and tracking analytics scripts.
   */
  syncGlobalSeo(seoConfig?: SeoConfigSettings, siteSettings?: SiteSettings): void {
    if (!seoConfig) return;

    // 1. Search Engine Verification Meta Tags
    if (seoConfig.google_verification) {
      this.meta.updateTag({ name: 'google-site-verification', content: seoConfig.google_verification.trim() });
    }
    if (seoConfig.bing_verification) {
      this.meta.updateTag({ name: 'msvalidate.01', content: seoConfig.bing_verification.trim() });
    }
    if (seoConfig.pinterest_verification) {
      this.meta.updateTag({ name: 'p:domain_verify', content: seoConfig.pinterest_verification.trim() });
    }
    if (seoConfig.yandex_verification) {
      this.meta.updateTag({ name: 'yandex-verification', content: seoConfig.yandex_verification.trim() });
    }

    // 2. Global Indexing directive
    if (seoConfig.indexing_enabled === false) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    }

    // 3. Analytics & Tag Manager (Client Browser only)
    if (this.isBrowser) {
      this.injectAnalyticsScripts(seoConfig);
    }
  }

  /**
   * Safely injects Google Analytics 4, Google Tag Manager, and Meta Pixel scripts.
   */
  private injectAnalyticsScripts(seoConfig: SeoConfigSettings): void {
    try {
      // Google Analytics 4 (GA4)
      if (seoConfig.google_analytics_id && !this.injectedTrackers.has('ga4')) {
        const gaId = seoConfig.google_analytics_id.trim();
        if (gaId.startsWith('G-')) {
          const scriptTag = this.doc.createElement('script');
          scriptTag.async = true;
          scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          this.doc.head.appendChild(scriptTag);

          const inlineScript = this.doc.createElement('script');
          inlineScript.textContent = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `;
          this.doc.head.appendChild(inlineScript);
          this.injectedTrackers.add('ga4');
        }
      }

      // Google Tag Manager (GTM)
      if (seoConfig.google_tag_manager_id && !this.injectedTrackers.has('gtm')) {
        const gtmId = seoConfig.google_tag_manager_id.trim();
        if (gtmId.startsWith('GTM-')) {
          const gtmScript = this.doc.createElement('script');
          gtmScript.textContent = `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `;
          this.doc.head.appendChild(gtmScript);
          this.injectedTrackers.add('gtm');
        }
      }

      // Meta Pixel (Facebook)
      if (seoConfig.meta_pixel_id && !this.injectedTrackers.has('pixel')) {
        const pixelId = seoConfig.meta_pixel_id.trim();
        if (pixelId) {
          const pixelScript = this.doc.createElement('script');
          pixelScript.textContent = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `;
          this.doc.head.appendChild(pixelScript);
          this.injectedTrackers.add('pixel');
        }
      }
    } catch {
      // Safe fallback
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

    if (region || varietal || product.alcohol) {
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
   * Generates and injects ItemList / OfferCatalog schema for collection pages (e-Shop).
   */
  setCatalogStructuredData(products: Product[], categoryName?: string, pageUrl?: string): void {
    const origin = this.getSiteOrigin();
    const url = pageUrl || `${origin}/shop`;
    
    const items = products.slice(0, 30).map((prod, index) => {
      const slug = prod.slug || prod.id;
      const itemUrl = `${origin}/shop/${slug}`;
      const img = prod.cover_image ? resolveMediaUrl(prod.cover_image) : this.getDefaultOgImage();

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: `${prod.name} ${prod.vintage ? prod.vintage : ''}`.trim(),
          image: img,
          url: itemUrl,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: Number(prod.price).toFixed(2),
            availability: prod.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        },
      };
    });

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: categoryName ? `${categoryName} — ${SITE.name} Wine Catalog` : `${SITE.name} Wine Catalog`,
      url: url,
      numberOfItems: items.length,
      itemListElement: items,
    };

    this.setStructuredData(schema, 'catalog-schema-jsonld');
  }

  /**
   * Generates and injects FAQPage structured data for rich accordion expandable Google results.
   */
  setFaqStructuredData(faqs: FaqItem[]): void {
    if (!faqs || faqs.length === 0) {
      this.removeStructuredData('faq-schema-jsonld');
      return;
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };

    this.setStructuredData(schema, 'faq-schema-jsonld');
  }

  /**
   * Generates and injects Article / BlogPosting schema for cellar stories.
   */
  setArticleStructuredData(post: {
    title: string;
    slug: string;
    excerpt?: string;
    body?: string;
    cover_image?: string;
    created_at?: string;
    updated_at?: string;
    author_name?: string;
  }): void {
    const origin = this.getSiteOrigin();
    const url = `${origin}/stories/${post.slug}`;
    const img = post.cover_image ? resolveMediaUrl(post.cover_image) : this.getDefaultOgImage();

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || post.title,
      image: [img],
      datePublished: post.created_at || new Date().toISOString(),
      dateModified: post.updated_at || post.created_at || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: post.author_name || SITE.name,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE.name,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/logo_default.png`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
    };

    this.setStructuredData(schema, 'article-schema-jsonld');
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
   * Sets enriched Winery / LocalBusiness structured data on general pages.
   */
  setOrganizationStructuredData(): void {
    const origin = this.getSiteOrigin();
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Winery',
      name: SITE.name,
      url: origin,
      logo: `${origin}/logo_default.png`,
      image: `${origin}/hero_cellar.png`,
      description: SITE.description,
      priceRange: '€€€',
      currenciesAccepted: 'EUR',
      paymentAccepted: 'Cash, Credit Card, Bank Transfer',
      sameAs: [
        'https://instagram.com/thewinehouse',
        'https://facebook.com/thewinehouse',
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: SITE.contact.address.city || 'Athens',
        postalCode: SITE.contact.address.postalCode || '10557',
        streetAddress: SITE.contact.address.street || 'Independent Wine Atelier',
        addressCountry: 'GR',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '37.9753',
        longitude: '23.7261',
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '12:00',
          closes: '22:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday'],
          opens: '11:00',
          closes: '23:00',
        },
      ],
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
