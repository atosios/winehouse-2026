import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Decorative grape-vine divider used between sections. */
@Component({
  selector: 'wh-flourish',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flourish" aria-hidden="true">
      <svg width="46" height="34" viewBox="0 0 46 34" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <!-- vine stem -->
        <path d="M4 10 Q 16 2 23 8 Q 30 14 42 8" />
        <!-- leaf -->
        <path d="M23 8 Q 27 2 33 3 Q 31 9 23 8 Z" />
        <!-- grape cluster -->
        <circle cx="20" cy="16" r="3.2" />
        <circle cx="26" cy="16" r="3.2" />
        <circle cx="17" cy="22" r="3.2" />
        <circle cx="23" cy="22" r="3.2" />
        <circle cx="29" cy="22" r="3.2" />
        <circle cx="20" cy="28" r="3.2" />
        <circle cx="26" cy="28" r="3.2" />
      </svg>
    </div>
  `,
})
export class Flourish {}
