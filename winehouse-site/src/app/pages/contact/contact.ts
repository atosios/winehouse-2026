import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';

@Component({
  selector: 'wh-contact',
  imports: [FormsModule, WhReveal],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);

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
    const subject = encodeURIComponent(`[${this.projectType}] Ingestion from ${this.name || 'Website'}`);
    const body = encodeURIComponent(
      `Subject: ${this.projectType}\nName: ${this.name}\nEmail: ${this.email}\nPhone: ${this.phone}\n\nMessage:\n${this.message}`
    );
    window.location.href = `mailto:${this.site.contact.email}?subject=${subject}&body=${body}`;
    this.sent.set(true);
  }
}
