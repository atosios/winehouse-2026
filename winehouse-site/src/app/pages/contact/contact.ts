import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  readonly page = computed(() => this.settingsService.contactPage());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }

  name = '';
  email = '';
  phone = '';
  projectType = 'Private Tasting';
  message = '';
  readonly sent = signal(false);
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);
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

  ngOnInit(): void {
    const seoConf = this.settingsService.seoConfig();
    const contactSeo = seoConf.page_seo?.contact;
    const title = contactSeo?.title ? this.t(contactSeo.title) : 'Contact & Cellar Inquiries';
    const desc = contactSeo?.description
      ? this.t(contactSeo.description)
      : 'Connect with The Winehouse for sommelier consultations, private tasting bookings, cellar acquisitions, and direct inquiries.';

    this.seo.setMeta({
      title,
      description: desc,
      keywords: seoConf.meta_keywords || 'contact the winehouse, cellar visit, sommelier booking, wine tastings contact',
      image: seoConf.og_image,
      type: 'website',
    });
    this.seo.setBreadcrumbStructuredData([
      { name: 'Home', url: this.seo.getSiteOrigin() },
      { name: 'Contact', url: `${this.seo.getSiteOrigin()}/contact` },
    ]);
    this.seo.setFaqStructuredData([
      {
        question: 'How do I book a private sommelier tasting flight?',
        answer: 'You can submit an inquiry through our contact form selecting "Private Tasting" or email us directly at hello@thewinehouse.gr.',
      },
      {
        question: 'Do you offer private cellar consultation and bespoke bottle sourcing?',
        answer: 'Yes, our head sommelier curates home cellars, private collections, and hospitality wine lists worldwide.',
      },
      {
        question: 'What are your visiting hours for walk-in tastings?',
        answer: 'Our Athens cellar atelier is open Tuesday through Friday from 12:00 to 22:00 and Saturday from 11:00 to 23:00.',
      },
    ]);

    // Handle incoming query params (e.g. from shop concierge or bottle out-of-stock allocation inquiry)
    this.route.queryParams.subscribe((params) => {
      if (params['subject']) {
        const found = this.subjectOptions().find(
          (o) => o.value.toLowerCase() === params['subject'].toLowerCase()
        );
        if (found) {
          this.projectType = found.value;
        } else {
          this.projectType = params['subject'];
        }
      }
      if (params['inquiry']) {
        this.message = params['inquiry'];
      } else if (params['bottle']) {
        this.message = `Inquiry regarding vintage allocation for: ${params['bottle']}`;
      }
    });
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

  resetForm(): void {
    this.sent.set(false);
    this.sendError.set(null);
    this.name = '';
    this.email = '';
    this.phone = '';
    this.projectType = 'Private Tasting';
    this.message = '';
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
    this.sendError.set(null);

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
          console.error('Contact form submission error:', err);
          this.sending.set(false);
          this.sendError.set(
            err?.error?.message || 'We could not dispatch your message. Please check your connection and try again.'
          );
        },
      });
  }
}

