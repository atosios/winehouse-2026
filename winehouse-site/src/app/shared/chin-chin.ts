import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Hand-drawn "chin chin" toast — two clinking wine glasses, thick ink strokes. */
@Component({
  selector: 'wh-chin-chin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 420 320"
      fill="none"
      stroke="currentColor"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-auto w-full"
      role="img"
      aria-label="Two wine glasses clinking — chin chin!"
    >
      <!-- clink sparkle -->
      <g stroke-width="4.5">
        <line x1="210" y1="52" x2="210" y2="24" />
        <line x1="182" y1="62" x2="164" y2="42" />
        <line x1="238" y1="62" x2="256" y2="42" />
        <line x1="172" y1="86" x2="148" y2="78" />
        <line x1="248" y1="86" x2="272" y2="78" />
      </g>

      <!-- left glass -->
      <g transform="translate(148 150) rotate(-20)">
        <path d="M-38 -42 Q -40 -38 -37 -6 Q -34 24 -12 33 Q 0 37 12 33 Q 34 24 37 -6 Q 40 -38 38 -42 Q 0 -35 -38 -42 Z" />
        <path d="M-33 -22 Q -32 14 -10 23 Q 0 26 10 23 Q 32 14 33 -22 Q 0 -14 -33 -22 Z"
              fill="currentColor" stroke="none" />
        <path d="M0 37 Q -2 62 0 84" />
        <path d="M-24 90 Q 0 83 24 90" />
      </g>

      <!-- right glass -->
      <g transform="translate(272 150) rotate(20)">
        <path d="M-38 -42 Q -40 -38 -37 -6 Q -34 24 -12 33 Q 0 37 12 33 Q 34 24 37 -6 Q 40 -38 38 -42 Q 0 -35 -38 -42 Z" />
        <path d="M-33 -22 Q -32 14 -10 23 Q 0 26 10 23 Q 32 14 33 -22 Q 0 -14 -33 -22 Z"
              fill="currentColor" stroke="none" />
        <path d="M0 37 Q 2 62 0 84" />
        <path d="M-24 90 Q 0 83 24 90" />
      </g>

      <!-- flying droplets -->
      <g fill="currentColor" stroke="none">
        <circle cx="140" cy="40" r="5" />
        <circle cx="284" cy="34" r="4" />
        <circle cx="206" cy="10" r="4.5" />
        <circle cx="110" cy="96" r="3.5" />
        <circle cx="312" cy="92" r="3.5" />
      </g>

      <!-- ground shadow squiggle -->
      <path d="M120 300 Q 160 292 210 298 Q 262 304 302 296" stroke-width="4" opacity="0.35" />
    </svg>
  `,
})
export class WhChinChin {}
