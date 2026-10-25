import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

interface HeroSlide {
  image: string;
  alt: string;
  label: string;
  headline: string;
  /** Trailing part of the headline rendered in the red accent colour. */
  accent?: string;
  description: string;
  primary: { label: string; link: string; queryParams?: Record<string, string> };
  secondary: { label: string; link: string; queryParams?: Record<string, string> };
  /** Trust items shown under the CTAs, e.g. 'Quality vehicles'. */
  badges?: { icon: string; text: string }[];
  /** Optional vehicle card pinned to the bottom-right of the slide. */
  caption?: { title: string; specs: string[]; link?: string };
  /** 'split' anchors the image to the right half, fading into the dark text side. */
  layout?: 'full' | 'split';
}

const AUTOPLAY_MS = 6000;

/**
 * Homepage hero carousel: autoplaying slides with arrows, dots, touch swipe and
 * keyboard navigation. Pauses on hover/focus and honours prefers-reduced-motion.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section
      class="slider"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
      tabindex="0"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
      (keydown.arrowLeft)="go(-1)"
      (keydown.arrowRight)="go(1)"
      (touchstart)="touchStart($event)"
      (touchend)="touchEnd($event)"
    >
      @for (s of slides; track s.headline; let i = $index) {
        <div class="slide" [class.active]="i === current()" [attr.aria-hidden]="i !== current()">
          <img class="bg" [class.split]="s.layout === 'split'" [src]="s.image" [alt]="i === current() ? s.alt : ''" (error)="imageFailed.add(i)" [class.failed]="imageFailed.has(i)" [attr.fetchpriority]="i === 0 ? 'high' : null" />
          <div class="overlay" aria-hidden="true"></div>
          <div class="container content">
            <span class="eyebrow">{{ s.label }}</span>
            <h1>{{ s.headline }} @if (s.accent) {<span class="accent">{{ s.accent }}</span>}</h1>
            <p class="lead">{{ s.description }}</p>
            <div class="actions">
              <a mat-flat-button class="btn-lg primary" [routerLink]="s.primary.link" [queryParams]="s.primary.queryParams">{{ s.primary.label }}</a>
              <a mat-stroked-button class="btn-lg secondary" [routerLink]="s.secondary.link" [queryParams]="s.secondary.queryParams">{{ s.secondary.label }}</a>
            </div>
            @if (s.badges?.length) {
              <ul class="badges">
                @for (b of s.badges; track b.text) {
                  <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ b.icon }}</mat-icon>{{ b.text }}</li>
                }
              </ul>
            }
          </div>
          @if (s.caption; as c) {
            @if (c.link) {
              <a class="caption" [routerLink]="c.link">
                <strong>{{ c.title }}</strong>
                <span>{{ c.specs.join('  ·  ') }}</span>
              </a>
            } @else {
              <div class="caption">
                <strong>{{ c.title }}</strong>
                <span>{{ c.specs.join('  ·  ') }}</span>
              </div>
            }
          }
        </div>
      }

      <button mat-icon-button type="button" class="arrow prev" aria-label="Previous slide" (click)="go(-1)">
        <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      </button>
      <button mat-icon-button type="button" class="arrow next" aria-label="Next slide" (click)="go(1)">
        <mat-icon fontSet="material-symbols-outlined">arrow_forward</mat-icon>
      </button>

      <div class="dots" role="tablist" aria-label="Slides">
        @for (s of slides; track s.headline; let i = $index) {
          <button
            type="button"
            role="tab"
            class="dot"
            [class.active]="i === current()"
            [attr.aria-selected]="i === current()"
            [attr.aria-label]="'Slide ' + (i + 1) + ': ' + s.label"
            (click)="jump(i)"
          ></button>
        }
      </div>
    </section>
  `,
  styles: `
    .slider { position: relative; height: clamp(430px, 82vh, 780px); background: var(--naboo-black);
      color: var(--naboo-white); overflow: hidden; outline: none; }
    .slider:focus-visible { box-shadow: inset 0 0 0 2px var(--naboo-red); }
    .slide { position: absolute; inset: 0; opacity: 0; visibility: hidden; transition: opacity .7s ease, visibility .7s; }
    .slide.active { opacity: 1; visibility: visible; z-index: 1; }
    .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
    .bg.split { left: auto; right: 0; width: 62%; object-position: center;
      -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 32%);
      mask-image: linear-gradient(90deg, transparent 0%, black 32%); }
    .bg.failed { display: none; }
    .overlay { position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(10,11,14,.88) 0%, rgba(10,11,14,.62) 42%, rgba(10,11,14,.18) 72%, rgba(10,11,14,.05) 100%); }
    .content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column;
      justify-content: center; padding-bottom: var(--space-7); }
    .content > * { max-width: 40rem; }
    .slide.active .content { animation: rise .6s ease .15s backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(18px); } }
    .eyebrow { color: var(--naboo-red); font-size: .8rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    h1 { font-size: clamp(1.9rem, 5vw, 3.6rem); line-height: 1.08; margin: var(--space-3) 0; font-weight: 800; }
    .accent { color: var(--naboo-red); }
    .lead { color: #d5d9de; font-size: clamp(.95rem, 1.6vw, 1.15rem); max-width: 34rem; margin: 0 0 var(--space-5); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
    .badges { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin: var(--space-5) 0 0;
      padding: 0; list-style: none; font-size: .85rem; font-weight: 600; color: #e3e6ea; }
    .badges li { display: inline-flex; align-items: center; gap: var(--space-2); }
    .badges mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--naboo-white); }
    .caption { position: absolute; right: max(var(--space-5), calc((100vw - var(--container)) / 2 + var(--space-6)));
      bottom: var(--space-6); z-index: 3;
      display: none; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-4);
      border-left: 3px solid var(--naboo-red);
      color: var(--naboo-white); text-decoration: none; font-size: .8rem; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
    .caption strong { font-size: .9rem; }
    .caption span { color: #c4c8ce; }
    @media (min-width: 960px) { .caption { display: flex; } }
    .primary { background: var(--naboo-red) !important; color: var(--naboo-white) !important; }
    .primary:hover { background: var(--naboo-red-dark) !important; }
    .secondary { border-color: rgba(255,255,255,.55) !important; color: var(--naboo-white) !important; }
    .secondary:hover { background: rgba(255,255,255,.12) !important; }
    .arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 3; color: var(--naboo-white);
      background: rgba(16,17,20,.45); border: 1px solid rgba(255,255,255,.25); border-radius: 50%;
      transition: background .2s, transform .2s; }
    .arrow:hover { background: var(--naboo-red); transform: translateY(-50%) scale(1.06); }
    .prev { left: var(--space-4); }
    .next { right: var(--space-4); }
    .dots { position: absolute; z-index: 3; bottom: var(--space-4); left: 0; right: 0; display: flex;
      justify-content: center; gap: var(--space-2); }
    .dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,.7); padding: 0;
      background: transparent; cursor: pointer; transition: background .2s, transform .2s; }
    .dot:hover { transform: scale(1.25); }
    .dot.active { background: var(--naboo-red); border-color: var(--naboo-red); }
    @media (max-width: 720px) {
      .slider { height: 78svh; min-height: 460px; }
      .overlay { background: linear-gradient(180deg, rgba(10,11,14,.35) 0%, rgba(10,11,14,.8) 78%); }
      .bg.split { left: 0; width: 100%;
        -webkit-mask-image: linear-gradient(180deg, black 50%, transparent 92%);
        mask-image: linear-gradient(180deg, black 50%, transparent 92%); }
      .content { justify-content: flex-end; padding-bottom: 72px; }
      .actions { flex-direction: column; align-items: stretch; }
      .arrow { top: auto; bottom: var(--space-4); transform: none; }
      .arrow:hover { transform: none; }
      .dots { bottom: var(--space-5); }
    }
    @media (prefers-reduced-motion: reduce) {
      .slide { transition: none; }
      .slide.active .content { animation: none; }
    }
  `,
})
export class HeroSlider {
  protected readonly slides: HeroSlide[] = [
    {
      image: 'assets/images/automotive/hero-prado.jpeg',
      alt: 'A black Toyota Land Cruiser Prado parked on a hilltop at sunset',
      label: 'Naboo Automotive · Tanzania',
      headline: 'Find Your',
      accent: ' Perfect Drive.',
      description:
        'Discover quality vehicles selected for performance, comfort, and style. Find your next car with Naboo Automotive.',
      primary: { label: 'Explore cars', link: '/cars-for-sale' },
      secondary: { label: 'Contact our team', link: '/contact', queryParams: { subject: 'Vehicle enquiry' } },
      badges: [
        { icon: 'verified', text: 'Quality Vehicles' },
        { icon: 'handyman', text: 'Professional Service' },
        { icon: 'check_circle', text: 'Trusted & Transparent' },
      ],
      caption: { title: 'Toyota Land Cruiser Prado TX-L', specs: ['2020', 'Diesel', 'Automatic'] },
      layout: 'split',
    },
    {
      image: 'assets/images/automotive/hero-rentals.jpeg',
      alt: 'A Toyota SUV driving along a scenic road at sunset',
      label: 'Drive your way',
      headline: 'The Right Car for',
      accent: ' Every Journey.',
      description:
        'Enjoy convenient vehicle rentals for business, travel, special occasions, and everyday mobility.',
      primary: { label: 'Explore rentals', link: '/rentals' },
      secondary: { label: 'Book a vehicle', link: '/rentals' },
    },
    {
      image: 'assets/images/automotive/hero-workshop.jpeg',
      alt: 'A technician servicing a silver sports car in a modern workshop',
      label: 'Expert automotive care',
      headline: 'More Than',
      accent: ' Just a Drive.',
      description:
        'Professional repairs, servicing, restoration, customization, and vehicle care from one trusted automotive destination.',
      primary: { label: 'Our services', link: '/services' },
      secondary: { label: 'Book a service', link: '/contact', queryParams: { subject: 'Service booking' } },
    },
    {
      image: 'assets/images/automotive/hero-customization.jpeg',
      alt: 'A freshly detailed black luxury car with dramatic red lighting',
      label: 'Make it yours',
      headline: 'Your Vision.',
      accent: ' Your Vehicle.',
      description:
        'Personalize your vehicle with quality accessories, color changes, detailing, and restoration services.',
      primary: { label: 'Explore customization', link: '/services' },
      secondary: { label: 'Shop accessories', link: '/accessories' },
    },
  ];

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
    this.current.update((i) => (i + delta + this.slides.length) % this.slides.length);
  }

  protected jump(i: number): void {
    this.current.set(i);
  }

  protected touchStart(e: TouchEvent): void {
    this.touchX = e.touches[0]?.clientX ?? 0;
  }

  protected touchEnd(e: TouchEvent): void {
    const dx = (e.changedTouches[0]?.clientX ?? this.touchX) - this.touchX;
    if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
  }
}
