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

  resetContactForm() {
    this.formSubmitted.set(false);
    this.contactError.set(null);
    this.contactData = {
      name: '',
      email: '',
      phone: '',
      projectType: 'Private Tasting',
      message: '',
    };
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  submitContact() {
    if (!this.contactData.name?.trim() || !this.contactData.email?.trim() || !this.contactData.message?.trim()) {
      return;
    }

    this.submittingContact.set(true);
    this.contactError.set(null);

    this.api
      .submitContactMessage({
        name: this.contactData.name.trim(),
        email: this.contactData.email.trim(),
        phone: this.contactData.phone?.trim() || undefined,
        subject: this.contactData.projectType,
        project_type: this.contactData.projectType,
        message: this.contactData.message.trim(),
      })
      .subscribe({
        next: () => {
          this.submittingContact.set(false);
          this.formSubmitted.set(true);
        },
        error: (err) => {
          console.error('Contact message submission error:', err);
          this.submittingContact.set(false);
          this.contactError.set(
            err?.error?.message || 'We could not dispatch your message. Please check your details and try again.'
          );
        },
      });
  }
}


