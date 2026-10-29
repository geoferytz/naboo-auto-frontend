import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DEFAULT_HERO_SLIDES, HeroSlide } from '../../core/site-content';

const AUTOPLAY_MS = 6000;

/**
 * Homepage hero carousel: autoplaying slides with arrows, dots, touch swipe and
 * keyboard navigation. Pauses on hover/focus and honours prefers-reduced-motion.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './hero-slider.html',
  styleUrl: './hero-slider.css',
})
export class HeroSlider {
  readonly slides = input<HeroSlide[]>(DEFAULT_HERO_SLIDES);

  protected readonly current = signal(0);
  protected readonly paused = signal(false);
  protected readonly imageFailed = new Set<number>();

  private readonly reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private touchX = 0;

  constructor() {
    if (!this.reduceMotion) {
      const timer = setInterval(() => {
        if (!this.paused() && !document.hidden) this.go(1);
      }, AUTOPLAY_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected go(delta: number): void {
    const n = this.slides().length;
    if (n > 0) {
      this.current.update((i) => (i + delta + n) % n);
    }
  }

  protected jump(i: number): void {
    if (i < this.slides().length) {
      this.current.set(i);
    }
  }

  protected touchStart(e: TouchEvent): void {
    this.touchX = e.touches[0]?.clientX ?? 0;
  }

  protected touchEnd(e: TouchEvent): void {
    const dx = (e.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
    if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
  }
}
