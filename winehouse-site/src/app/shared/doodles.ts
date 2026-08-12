import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Small hand-drawn ink doodles for filling space around sections.
 *   <wh-doodle kind="corkscrew" class="absolute top-4 left-4 w-16 text-primary" />
 */
@Component({
  selector: 'wh-doodle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2.6"
         stroke-linecap="round" stroke-linejoin="round" class="h-auto w-full">
      @switch (kind()) {
        @case ('corkscrew') {
          <path d="M30 6 Q 38 8 36 15 Q 34 21 27 19 Q 22 17 24 12" />
          <path d="M29 19 Q 26 26 30 30 Q 34 34 31 40 Q 28 46 32 50" />
          <path d="M18 10 Q 24 4 30 6" />
        }
        @case ('grapes') {
          <circle cx="24" cy="26" r="6" /><circle cx="37" cy="26" r="6" />
          <circle cx="18" cy="37" r="6" /><circle cx="30" cy="37" r="6" /><circle cx="42" cy="37" r="6" />
          <circle cx="24" cy="48" r="6" /><circle cx="36" cy="48" r="6" />
          <path d="M30 20 Q 29 12 35 8" />
          <path d="M35 8 Q 42 4 47 9 Q 43 15 35 8 Z" />
        }
        @case ('swirl') {
          <path d="M8 40 Q 18 20 30 30 Q 42 40 52 22" />
          <path d="M46 20 L 52 22 L 50 28" />
        }
        @case ('cork') {
          <rect x="20" y="14" width="20" height="34" rx="6" transform="rotate(12 30 30)" />
          <path d="M25 22 Q 30 24 35 22" transform="rotate(12 30 30)" />
          <path d="M25 38 Q 30 40 35 38" transform="rotate(12 30 30)" />
        }
        @case ('sparkle') {
          <path d="M30 10 L 30 24 M30 36 L 30 50 M10 30 L 24 30 M36 30 L 50 30" />
          <path d="M18 18 L 25 25 M35 35 L 42 42 M42 18 L 35 25 M25 35 L 18 42" stroke-width="2" />
        }
        @case ('glass') {
          <path d="M18 8 Q 17 22 23 27 Q 27 30 30 30 Q 33 30 37 27 Q 43 22 42 8 Q 30 11 18 8 Z" />
          <path d="M20 14 Q 30 17 40 14 Q 39 22 33 25 Q 30 26.5 27 25 Q 21 22 20 14 Z"
                fill="currentColor" stroke="none" />
          <path d="M30 30 L 30 46" />
          <path d="M21 50 Q 30 47 39 50" />
        }
        @case ('bottle') {
          <path d="M26 6 L 26 16 Q 19 21 19 29 L 19 48 Q 19 52 23 52 L 37 52 Q 41 52 41 48 L 41 29 Q 41 21 34 16 L 34 6 Z" />
          <path d="M23 33 Q 30 35 37 33" stroke-width="1.8" />
        }
        @case ('music') {
          <path d="M22 44 Q 22 40 26 40 Q 30 40 30 44 Q 30 48 26 48 Q 22 48 22 44 Z" fill="currentColor" stroke="none" />
          <path d="M30 44 L 30 16 Q 38 14 44 20" />
          <path d="M40 38 Q 40 34 44 34 Q 48 34 48 38 Q 48 42 44 42 Q 40 42 40 38 Z" fill="currentColor" stroke="none" />
          <path d="M48 38 L 48 22" />
        }
      }
    </svg>
  `,
})
export class WhDoodle {
  readonly kind = input.required<
    'corkscrew' | 'grapes' | 'swirl' | 'cork' | 'sparkle' | 'glass' | 'bottle' | 'music'
  >();
}
