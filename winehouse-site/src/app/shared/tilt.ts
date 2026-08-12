import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Pointer-tracking 3D tilt. Add with the `tilt-3d` class:
 *   <article class="tilt-3d" whTilt></article>
 */
@Directive({
  selector: '[whTilt]',
  host: {
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'reset()',
  },
})
export class WhTilt {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Max rotation in degrees. */
  readonly tiltMax = input(7);

  onMove(ev: PointerEvent): void {
    if (this.reducedMotion || ev.pointerType === 'touch') return;
    const node = this.el.nativeElement;
    const r = node.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width - 0.5;
    const py = (ev.clientY - r.top) / r.height - 0.5;
    const max = this.tiltMax();
    node.style.transform =
      `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(1.02)`;
  }

  reset(): void {
    this.el.nativeElement.style.transform = '';
  }
}
