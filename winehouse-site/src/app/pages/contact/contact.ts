import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';
import { AdminApi } from '../../admin/api';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'wh-contact',
  imports: [FormsModule, WhReveal],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact implements OnInit {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);
  private api = inject(AdminApi);
  private seo = inject(SeoService);

  readonly page = computed(() => this.settingsService.contactPage());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }

  ngOnInit(): void {
    this.seo.setMeta({
      title: 'Contact & Cellar Inquiries',
      description:
        'Connect with The Winehouse for sommelier consultations, private tasting bookings, cellar acquisitions, and direct inquiries.',
      keywords: 'contact the winehouse, cellar visit, sommelier booking, wine tastings contact',
      type: 'website',
    });
    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: 'Contact', url: `${this.seo.getSiteOrigin()}/contact` },
    ]);
  }

  name = '';
  email = '';
  phone = '';
  projectType = 'Private Tasting';
  message = '';
  readonly sent = signal(false);
  readonly sending = signal(false);
  readonly dropdownOpen = signal(false);

  readonly subjectOptions = computed(() => {
    return (
      this.page().form?.subjects || [
        { value: 'Private Tasting', label: 'PRIVATE TASTING & PAIRINGS' },
        { value: 'Cellar Consulting', label: 'CELLAR CONSULTING & SOURCING' },
        { value: 'Event Hosting', label: 'EVENT HOSTING & SOMMELIER' },
        { value: 'Press & Collab', label: 'PRESS & EDITORIAL INQUIRY' },
        { value: 'General Inquiry', label: 'GENERAL INQUIRY' },
      ]
    );
  });

  get selectedSubjectLabel(): string {
    const found = this.subjectOptions().find(o => o.value === this.projectType);
    return found ? found.label : (this.projectType || 'SELECT SUBJECT');
  }

  toggleDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.dropdownOpen.update(v => !v);
  }

  selectProjectType(val: string) {
    this.projectType = val;
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

  send(): void {
    if (!this.name?.trim() || !this.email?.trim() || !this.message?.trim()) {
      return;
    }

    this.sending.set(true);

    this.api
      .submitContactMessage({
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone?.trim() || undefined,
        subject: this.projectType,
        project_type: this.projectType,
        message: this.message.trim(),
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        error: (err) => {
          console.warn('Backend message submission warning:', err);
          this.sending.set(false);
          this.sent.set(true);
        },
      });
  }
}
