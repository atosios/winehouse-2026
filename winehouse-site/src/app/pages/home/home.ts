import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, computed, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText, isExternalUrl } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';
import { resolveMediaUrl } from '../../core/media.utils';
import { AdminApi } from '../../admin/api';

@Component({
  selector: 'wh-home',
  imports: [RouterLink, FormsModule, WhReveal],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements AfterViewInit {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);
  private api = inject(AdminApi);

  readonly hp = computed(() => this.settingsService.homepage());
  readonly videoReady = signal(false);

  readonly heroFallbackImage = computed(() => {
    const hero = this.hp().hero;
    return hero.fallback_image_url || hero.video_alt_url || '';
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
    projectType: 'Private Tasting',
    message: '',
  };

  ngAfterViewInit(): void {
    const video = this.heroVideoRef?.nativeElement;
    if (video) {
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

    this.api
      .submitContactMessage({
        name: this.contactData.name.trim(),
        email: this.contactData.email.trim(),
        subject: this.contactData.projectType,
        project_type: this.contactData.projectType,
        message: this.contactData.message.trim(),
      })
      .subscribe({
        next: () => {
          this.formSubmitted.set(true);
        },
        error: (err) => {
          console.warn('Backend message submission warning:', err);
          this.formSubmitted.set(true);
        },
      });
  }
}

