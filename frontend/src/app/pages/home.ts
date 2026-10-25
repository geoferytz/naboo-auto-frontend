import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { whatsappLink } from '../core/business';
import { Page, VehicleCard } from '../core/models';
import { VEHICLES } from '../core/queries';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { HeroSlider } from '../shared/hero-slider';
import { LoadState } from '../shared/load-state';
import { VehicleCardComponent } from '../shared/vehicle-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, VehicleCardComponent, LoadState, HeroSlider],
  template: `
    <app-hero-slider />

    <section class="section" aria-labelledby="what-we-do">
      <div class="container">
        <span class="eyebrow">What we do</span>
        <h2 id="what-we-do">Your Complete Automotive Solution</h2>
        <div class="grid pillars">
          @for (p of pillars; track p.title) {
            <a
              class="card pillar"
              [routerLink]="p.link ?? null"
              [queryParams]="p.query ?? null"
              [attr.href]="p.wa ?? null"
              [attr.target]="p.wa ? '_blank' : null"
              [attr.rel]="p.wa ? 'noopener' : null"
            >
              <img class="shot" [src]="p.image" [alt]="p.imageAlt" loading="lazy" decoding="async" />
              <span class="pill-icon" aria-hidden="true"><mat-icon fontSet="material-symbols-outlined">{{ p.icon }}</mat-icon></span>
              <h3>{{ p.title }}</h3>
              <p>{{ p.text }}</p>
              <span class="more">{{ p.cta }} →</span>
            </a>
          }
        </div>
      </div>
    </section>

    <section class="section section--dark" aria-labelledby="latest">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Cars for sale</span>
            <h2 id="latest">Latest Vehicles</h2>
          </div>
          <a class="view-all" routerLink="/cars-for-sale">View All Cars →</a>
        </div>
        @if (vehicles.hasValue() && vehicles.value().items.length) {
          <div class="grid">
            @for (v of vehicles.value().items; track v.id) {
              <app-vehicle-card [vehicle]="v" />
            }
          </div>
        } @else {
          <app-load-state
            [state]="vehicles.isLoading() ? 'loading' : vehicles.error() ? 'error' : 'empty'"
            emptyText="New vehicles are being prepared for listing. Contact us if you are looking for something specific."
            (retry)="vehicles.reload()"
          >
            <a mat-flat-button routerLink="/contact" [queryParams]="{ subject: 'Vehicle request' }">Tell us what you need</a>
          </app-load-state>
        }
      </div>
    </section>

    <section class="section advantage" aria-labelledby="advantage">
      <div class="container adv-grid">
        <div>
          <span class="eyebrow">Why choose us</span>
          <h2 id="advantage">The Naboo Advantage</h2>
          <p>We are committed to making your car buying journey simple, transparent and enjoyable.</p>
        </div>
        <ul class="adv-list">
          @for (a of advantages; track a.title) {
            <li>
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ a.icon }}</mat-icon>
              <h3>{{ a.title }}</h3>
              <p>{{ a.text }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <section class="cta-band" aria-labelledby="cta-band">
      <div class="container cta-inner">
        <div>
          <h2 id="cta-band">Ready to Find Your Perfect Car?</h2>
          <p>Get in touch with our team today and let's get you on the road.</p>
        </div>
        @if (wa; as link) {
          <a mat-flat-button class="btn-lg wa" [href]="link" target="_blank" rel="noopener">
            <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">chat</mat-icon> Chat on WhatsApp
          </a>
        } @else {
          <a mat-flat-button class="btn-lg wa" routerLink="/contact" [queryParams]="{ subject: 'Vehicle enquiry' }">
            Contact our team
          </a>
        }
      </div>
    </section>

    <section class="section" aria-labelledby="promise">
      <div class="container">
        <span class="eyebrow">How we work</span>
        <h2 id="promise">Transparent from first enquiry to collection</h2>
        <ul class="promise">
          @for (s of steps; track s.title; let i = $index) {
            <li>
              <span class="num" aria-hidden="true">{{ i + 1 }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .pillars { margin-top: var(--space-5); }
    .pillar { position: relative; padding: 0 0 var(--space-4); text-decoration: none; color: inherit;
      display: flex; flex-direction: column; overflow: hidden; transition: box-shadow .2s, transform .2s; }
    .pillar:hover { box-shadow: var(--shadow-raised); transform: translateY(-2px); }
    .shot { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
    .pill-icon { width: 44px; height: 44px; border-radius: 50%; margin: -22px 0 0 var(--space-4);
      background: var(--naboo-white); color: var(--naboo-red); display: flex; align-items: center; justify-content: center;
      box-shadow: var(--shadow-raised); }
    .pill-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .pillar h3 { margin: var(--space-4) var(--space-4) 0; font-size: 1.05rem; }
    .pillar p { color: var(--naboo-text-muted); flex: 1; margin: 0 var(--space-4); }
    .more { font-weight: 600; color: var(--naboo-red); margin: var(--space-3) var(--space-4) 0; }
    .section--dark { background: #14161a; color: var(--naboo-white); }
    .section-head { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: end; justify-content: space-between;
      margin-bottom: var(--space-5); }
    .section-head h2 { margin: 0; }
    .view-all { color: var(--naboo-red); font-weight: 600; text-decoration: none; }
    .view-all:hover { text-decoration: underline; }
    .advantage { background: var(--naboo-black); color: var(--naboo-white); }
    .adv-grid { display: grid; gap: var(--space-6); }
    .adv-grid > div > p { color: #aab0b8; max-width: 30rem; }
    .adv-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-5);
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .adv-list mat-icon { color: var(--naboo-red); font-size: 30px; width: 30px; height: 30px; margin-bottom: var(--space-2); }
    .adv-list h3 { font-size: 1rem; margin-bottom: var(--space-1); }
    .adv-list p { color: #aab0b8; font-size: .875rem; margin: 0; }
    @media (min-width: 960px) { .adv-grid { grid-template-columns: 1fr 2fr; align-items: center; } }
    .cta-band { background: linear-gradient(90deg, var(--naboo-red-dark), var(--naboo-red) 60%, #ff5a4d);
      color: var(--naboo-white); }
    .cta-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-4); padding-block: var(--space-5); }
    .cta-inner h2 { margin: 0; font-size: clamp(1.3rem, 2.6vw, 1.8rem); }
    .cta-inner p { margin: var(--space-1) 0 0; opacity: .92; }
    .wa { background: var(--naboo-white) !important; color: var(--naboo-black) !important; }
    .wa mat-icon { color: #1faa53; }
    .promise { list-style: none; margin: var(--space-5) 0 0; padding: 0; display: grid; gap: var(--space-5);
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .promise li { display: flex; flex-direction: column; }
    .num { width: 30px; height: 30px; border-radius: 50%; background: var(--naboo-red); color: var(--naboo-white);
      font-weight: 800; display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3); }
    .promise h3 { font-size: 1rem; margin-bottom: var(--space-1); }
    .promise p { color: var(--naboo-text-muted); margin: 0; font-size: .9rem; }
  `,
})
export class Home {
  private readonly api = inject(Api);
  protected readonly wa = whatsappLink("Hi Naboo Automotive — I'd like to find my perfect car.");

  protected readonly pillars: {
    icon: string;
    image: string;
    imageAlt: string;
    title: string;
    text: string;
    link?: string;
    query?: Record<string, string>;
    wa?: string | null;
    cta: string;
  }[] = [
    { icon: 'directions_car', image: 'assets/images/automotive/pillar-sales.jpeg', imageAlt: 'A row of vehicles for sale at the Naboo yard', title: 'Cars for sale', text: 'Inspected new and used vehicles with clear prices and specifications.', link: '/cars-for-sale', cta: 'Browse vehicles' },
    { icon: 'build', image: 'assets/images/automotive/pillar-repairs.jpeg', imageAlt: 'A technician working on a car engine', title: 'Repairs & maintenance', text: 'Servicing, diagnostics, brakes, suspension and electrical work.', link: '/services', cta: 'View services' },
    { icon: 'format_paint', image: 'assets/images/automotive/pillar-painting.jpeg', imageAlt: 'A freshly painted red car in the spray booth', title: 'Painting & restoration', text: 'Resprays, colour changes, bodywork and complete restorations.', link: '/services', cta: 'View services' },
    { icon: 'request_quote', image: 'assets/images/automotive/pillar-quote.jpeg', imageAlt: 'An itemised quotation sheet', title: 'Request a quotation', text: 'Tell us about your vehicle and the work you need — we will reply with a quote.', link: '/contact', query: { subject: 'Quotation request' }, cta: 'Get a quote' },
    { icon: 'forum', image: 'assets/images/automotive/hero-cars.jpeg', imageAlt: 'A premium sedan under showroom lighting', title: 'Expert Consultation', text: 'Get personalized advice from our automotive experts. We help you make informed decisions about buying, and selling your vehicle.', wa: whatsappLink('Hi Naboo Automotive — I would like expert advice about a vehicle.'), cta: 'Chat with an expert' },
    { icon: 'fact_check', image: 'assets/images/automotive/hero-workshop.jpeg', imageAlt: 'A vehicle being inspected in the Naboo workshop', title: 'Quality Assurance', text: 'Rest easy knowing that every car we offer undergoes rigorous quality checks. We stand behind the reliability and safety of our vehicles.', wa: whatsappLink('Hi Naboo Automotive — I have a question about vehicle quality checks.'), cta: 'Ask about our checks' },
  ];

  protected readonly advantages = [
    { icon: 'workspace_premium', title: 'Quality Assured', text: 'All our vehicles are thoroughly inspected and verified.' },
    { icon: 'sell', title: 'Best Prices', text: 'We offer competitive prices with great value.' },
    { icon: 'support_agent', title: 'Expert Support', text: 'Our team is here to help you every step of the way.' },
    { icon: 'credit_card', title: 'Flexible Options', text: 'Trade-ins, financing and custom solutions available.' },
  ];

  protected readonly steps = [
    { title: 'Clear pricing.', text: 'Fixed prices where the scope is fixed; otherwise an estimate or itemised quotation.' },
    { title: 'Your approval first.', text: 'Additional work is never added without your consent.' },
    { title: 'Accurate listings.', text: 'Sold and reserved vehicles are clearly marked.' },
    { title: 'A reference for everything.', text: 'Every enquiry receives a reference number you can quote.' },
  ];

  protected readonly vehicles = rxResource({
    stream: () =>
      this.api
        .query<{ vehicles: Page<VehicleCard> }>(VEHICLES, { page: 0, size: 6, sort: 'NEWEST' })
        .pipe(map((d) => d.vehicles)),
  });

  constructor() {
    inject(SeoService).set({
      title: SITE_NAME,
      description:
        'Naboo Automotive, Tanzania: vehicles for sale, workshop repairs and servicing, painting, detailing and restoration with transparent pricing.',
      path: '/',
    });
  }
}
