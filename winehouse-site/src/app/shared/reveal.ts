import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Adds the `in-view` class once the element scrolls into the viewport,
 * triggering the CSS reveal/draw animations. Usage:
 *   <div class="reveal" whReveal></div>
 *   <div class="reveal" whReveal [revealDelay]="150"></div>
 */
@Directive({ selector: '[whReveal]' })
export class WhReveal implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  /** Delay in ms before the reveal transition starts. */
  readonly revealDelay = input(0);

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (this.revealDelay()) {
      node.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);
    }
    if (!('IntersectionObserver' in window)) {
      node.classList.add('in-view');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('in-view');
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
