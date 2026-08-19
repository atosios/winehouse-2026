import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText, isExternalUrl } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';
import { WhLogo } from '../../shared/brand-logo';
import { WhSocialIcon } from '../../shared/social-icon';
import { resolveMediaUrl } from '../../core/media.utils';
import { AdminApi } from '../../admin/api';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'wh-home',
  imports: [RouterLink, FormsModule, WhReveal, WhLogo, WhSocialIcon],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit, AfterViewInit {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);
  private api = inject(AdminApi);
  private seo = inject(SeoService);

  readonly hp = computed(() => this.settingsService.homepage());
  readonly videoReady = signal(false);

  ngOnInit(): void {
    const seoConf = this.settingsService.seoConfig();
    const homeSeo = seoConf.page_seo?.home;
    const title = homeSeo?.title ? this.t(homeSeo.title) : '';
    const desc = homeSeo?.description
      ? this.t(homeSeo.description)
      : 'The Winehouse — Curated artisanal wines, rare volcanic bottles, tastings, cellar consulting and private tours.';

    this.seo.setMeta({
      title,
      description: desc,
      keywords: seoConf.meta_keywords || 'wine cellar, artisanal wine, greek wine, sommelier, wine tasting, volcanic wine',
      image: seoConf.og_image,
      type: 'website',
    });
    this.seo.setOrganizationStructuredData(this.settingsService.settings());
  }

  readonly heroFallbackImage = computed(() => {
    const hero = this.hp().hero;
    return hero.fallback_image_url || '';
  });

  mediaUrl(url: string | null | undefined): string {
    return resolveMediaUrl(url);
  }

  t(val: I18nText): string {
    return this.i18n.t(val);
  }

  isExternal(url?: string | null): boolean {
    return isExternalUrl(url);
  }

  getLogoImg(logo: any): string {
    if (logo && typeof logo === 'object' && 'image_url' in logo && logo.image_url) {
      return resolveMediaUrl(logo.image_url);
    }
    return '';
  }

  getLogoName(logo: any): string {
    if (logo && typeof logo === 'object' && 'name' in logo) {
      return this.t(logo.name);
    }
    return this.t(logo);
  }

  get site() {
    return this.settingsService.settings();
  }

  @ViewChild('heroVideo') private heroVideoRef!: ElementRef<HTMLVideoElement>;

  readonly activeQuoteIndex = signal(0);
  readonly formSubmitted = signal(false);
  readonly submittingContact = signal(false);
  readonly contactError = signal<string | null>(null);
  readonly dropdownOpen = signal(false);

  readonly subjectOptions = [
    { value: 'Private Tasting', label: 'PRIVATE TASTING' },
    { value: 'Cellar Consulting', label: 'CELLAR CONSULTING & SOURCING' },
    { value: 'Event Hosting', label: 'EVENT HOSTING & PAIRING' },
    { value: 'General Inquiry', label: 'GENERAL INQUIRY' },
  ];

  get selectedSubjectLabel(): string {
    const found = this.subjectOptions.find(o => o.value === this.contactData.projectType);
    return found ? found.label : (this.contactData.projectType || 'SELECT SUBJECT');
  }

  contactData = {
    name: '',
    email: '',
    phone: '',
    projectType: 'Private Tasting',
    message: '',
  };

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    const video = this.heroVideoRef?.nativeElement;
    if (video && typeof video.play === 'function') {
      video.muted = true;
      if (video.readyState >= 2) {
        this.videoReady.set(true);
      }
      video.play().then(() => {
        this.videoReady.set(true);
      }).catch(() => {});
    }
  }

  onVideoLoaded(): void {
    this.videoReady.set(true);
  }

  onVideoPlaying(): void {
    this.videoReady.set(true);
  }

  setQuoteIndex(index: number) {
    this.activeQuoteIndex.set(index);
  }

  toggleDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.dropdownOpen.update(v => !v);
  }

  selectProjectType(val: string) {
    this.contactData.projectType = val;
    this.dropdownOpen.set(false);
  }

  newsletterData = {
    name: '',
    email: '',
    consent: false,
  };
  readonly newsletterSubmitted = signal(false);
  readonly submittingNewsletter = signal(false);
  readonly newsletterError = signal<string | null>(null);
  readonly newsletterSuccessMsg = signal<string>('');

  submitNewsletter(): void {
    if (!this.newsletterData.email?.trim()) {
      this.newsletterError.set('Please enter a valid email address.');
      return;
    }
    if (!this.newsletterData.consent) {
      this.newsletterError.set('Please confirm your consent to receive newsletter communications.');
      return;
    }

    this.submittingNewsletter.set(true);
    this.newsletterError.set(null);

    this.api
      .subscribeNewsletter({
        email: this.newsletterData.email.trim(),
        name: this.newsletterData.name.trim() || undefined,
        consent: true,
        source: 'homepage',
        consent_text: 'I agree to receive curated newsletters and cellar dispatches from The Winehouse under EU GDPR regulations.',
      })
      .subscribe({
        next: (res) => {
          this.submittingNewsletter.set(false);
          this.newsletterSubmitted.set(true);
          this.newsletterSuccessMsg.set(res.message || 'Thank you for subscribing to The Winehouse Cellar Dispatches.');
        },
        error: (err) => {
          console.error('Newsletter subscription error:', err);
          this.submittingNewsletter.set(false);
          this.newsletterError.set(
            err?.error?.message || 'We could not complete your subscription. Please check your email and try again.'
          );
        },
      });
  }

  resetNewsletterForm(): void {
    this.newsletterSubmitted.set(false);
    this.newsletterError.set(null);
    this.newsletterData = {
      name: '',
      email: '',
      consent: false,
    };
  }

  getNewsletterBtnText(): string {
    const raw = this.t(this.hp().contact.button_text);
    if (!raw || raw.trim().toLowerCase() === 'send message' || raw.trim().toLowerCase() === 'send message →') {
      return this.i18n.currentLang() === 'el' ? 'ΕΓΓΡΑΦΗ ΣΤΟ NEWSLETTER' : 'SUBSCRIBE TO NEWSLETTER';
    }
    return raw;
  }
}



