import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SITE } from '../../core/site-config';
import { Flourish } from '../../shared/flourish';

@Component({
  selector: 'wh-contact',
  imports: [FormsModule, Flourish],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  readonly site = SITE;

  name = '';
  email = '';
  message = '';
  readonly sent = signal(false);

  /** Opens the visitor's mail app pre-filled (no backend needed yet). */
  send(): void {
    const subject = encodeURIComponent(`Message from ${this.name || 'the website'}`);
    const body = encodeURIComponent(`${this.message}\n\n— ${this.name} (${this.email})`);
    window.location.href = `mailto:${this.site.contact.email}?subject=${subject}&body=${body}`;
    this.sent.set(true);
  }
}
