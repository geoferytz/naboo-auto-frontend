import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { whatsappLink } from '../core/business';
import { FUEL_LABELS, TRANSMISSION_LABELS, formatMoney } from '../core/format';
import { Page, ServiceCategory, ServiceItem, VehicleCard } from '../core/models';
import { SERVICE_CATALOGUE, VEHICLES, VEHICLE_MAKES } from '../core/queries';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';
import { VehicleCardComponent } from '../shared/vehicle-card';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

const PRICE_BANDS: { label: string; min: string | null; max: string | null }[] = [
  { label: 'Under TZS 25M', min: null, max: '25000000' },
  { label: 'TZS 25M – 50M', min: '25000000', max: '50000000' },
  { label: 'TZS 50M – 100M', min: '50000000', max: '100000000' },
  { label: 'Over TZS 100M', min: '100000000', max: null },
];

@Component({
  selector: 'app-home',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    VehicleCardComponent,
    LoadState,
    VehiclePlaceholder,
  ],
  template: `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Premium cars for sale</span>
          <h1>Drive Your<br /><span class="red">Dream</span> Today</h1>
          <p class="lead">
            Quality vehicles. Reliable service. At Naboo Automotive, we bring you the best cars at competitive prices.
          </p>
          <div class="actions">
            <a mat-flat-button class="btn-lg" routerLink="/cars-for-sale">Browse our cars →</a>
            <a mat-stroked-button class="btn-lg ghost" routerLink="/contact">Contact us</a>
          </div>
          <ul class="trust" aria-label="Why buy from us">
            @for (t of trust; track t.label) {
              <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ t.icon }}</mat-icon>{{ t.label }}</li>
            }
          </ul>
        </div>

        <div class="hero-vehicle" aria-hidden="false">
          <div class="frame">
            @if (featured(); as v) {
              @if (v.images.length) {
                <img [src]="v.images[0].url" [alt]="v.images[0].altText" width="880" height="550" fetchpriority="high" />
              } @else {
                <app-vehicle-placeholder [label]="v.title" />
              }
              <div class="caption">
                <strong>{{ v.title }}</strong>
                <span>{{ v.year }} &nbsp;·&nbsp; {{ fuel[v.fuelType] }} &nbsp;·&nbsp; {{ trans[v.transmission] }}</span>
              </div>
            } @else {
              <app-vehicle-placeholder label="Naboo Automotive" />
            }
          </div>
          <div class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
        </div>
      </div>
    </section>

    <div class="container search-wrap">
      <form class="search-panel" [formGroup]="search" (ngSubmit)="searchCars()" aria-label="Search vehicles">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>All makes</mat-label>
          <mat-select formControlName="make">
            <mat-option [value]="''">All makes</mat-option>
            @for (m of makes.value() ?? []; track m) {
              <mat-option [value]="m">{{ m }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Model</mat-label>
          <input matInput formControlName="model" placeholder="e.g. Prado" maxlength="60" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Year</mat-label>
          <input matInput type="number" inputmode="numeric" formControlName="year" min="1950" max="2100" placeholder="Any" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Price range</mat-label>
          <mat-select formControlName="band">
            <mat-option [value]="-1">Any price</mat-option>
            @for (b of priceBands; track b.label; let i = $index) {
              <mat-option [value]="i">{{ b.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-flat-button type="submit" class="search-btn">
          <mat-icon fontSet="material-symbols-outlined">search</mat-icon> Search cars
        </button>
      </form>
    </div>

    <section class="section" aria-labelledby="featured">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow red">Featured cars</span>
            <h2 id="featured">Our popular vehicles</h2>
          </div>
          <a class="view-all" routerLink="/cars-for-sale">View all cars →</a>
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

    <section class="section section--dark advantage" aria-labelledby="advantage">
      <div class="container">
        <div class="adv-head">
          <span class="eyebrow">Why choose us</span>
          <h2 id="advantage">The Naboo advantage</h2>
          <p>We are committed to making your car buying journey simple, transparent and enjoyable.</p>
        </div>
        <div class="adv-grid">
          @for (a of advantages; track a.title) {
            <div class="adv">
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ a.icon }}</mat-icon>
              <h3>{{ a.title }}</h3>
              <p>{{ a.text }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="wa-cta" aria-labelledby="cta">
      <div class="container wa-inner">
        <div>
          <h2 id="cta">Ready to find your perfect car?</h2>
          <p>Get in touch with our team today and let's get you on the road.</p>
        </div>
        @if (whatsapp; as wa) {
          <a mat-flat-button class="wa-btn" [href]="wa" target="_blank" rel="noopener">
            <mat-icon fontSet="material-symbols-outlined">chat</mat-icon> Chat on WhatsApp →
          </a>
        } @else {
          <a mat-flat-button class="wa-btn" routerLink="/contact">
            <mat-icon fontSet="material-symbols-outlined">mail</mat-icon> Contact us →
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    .hero { position: relative; color: var(--naboo-white); overflow: hidden;
      background: radial-gradient(ellipse at 82% 30%, #3a1215 0%, transparent 55%),
        linear-gradient(155deg, #1b1e24 0%, var(--naboo-black) 55%); }
    .hero-grid { display: grid; gap: var(--space-6); padding-block: clamp(3rem, 8vw, 5.5rem) calc(var(--space-7) + 40px); }
    .hero-copy { max-width: 560px; }
    .hero .eyebrow { color: var(--naboo-red); font-weight: 700; letter-spacing: .18em; }
    .hero h1 { font-size: clamp(2.4rem, 6vw, 3.8rem); line-height: 1.05; margin: var(--space-3) 0; }
    .red { color: var(--naboo-red); }
    .hero .lead { color: #c4c8ce; }
    .hero .actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-block: var(--space-5); }
    .ghost { color: var(--naboo-white) !important; border-color: rgba(255,255,255,.4) !important; }
    .trust { display: flex; flex-wrap: wrap; gap: var(--space-4); list-style: none; margin: 0; padding: 0;
      font-size: .85rem; color: #c4c8ce; }
    .trust li { display: inline-flex; align-items: center; gap: var(--space-2); }
    .trust mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--naboo-white); }
    .hero-vehicle { position: relative; }
    .frame { border-radius: var(--radius-md); overflow: hidden; aspect-ratio: 16 / 10; background: #000;
      box-shadow: 0 24px 60px rgba(0,0,0,.55); position: relative; }
    .frame img, .frame app-vehicle-placeholder { width: 100%; height: 100%; object-fit: cover; display: block; }
    .caption { position: absolute; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(0,0,0,.75));
      color: var(--naboo-white); padding: var(--space-4) var(--space-5); text-align: right; }
    .caption strong { display: block; font-size: .95rem; }
    .caption span { font-size: .8rem; color: #d0d4da; }
    .dots { display: flex; gap: 6px; justify-content: center; margin-top: var(--space-3); }
    .dots i { width: 7px; height: 7px; border-radius: 50%; background: #4a4f58; }
    .dots i.on { background: var(--naboo-red); }

    .search-wrap { margin-top: -40px; position: relative; z-index: 5; }
    .search-panel { background: var(--naboo-white); border-radius: var(--radius-md);
      box-shadow: 0 12px 40px rgba(0,0,0,.14); padding: var(--space-4);
      display: grid; gap: var(--space-3); }
    .search-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); }
    @media (min-width: 960px) {
      .hero-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); align-items: center; }
      .search-panel { grid-template-columns: 1.2fr 1.2fr .8fr 1.2fr auto; align-items: center; }
    }

    .eyebrow { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; }
    .eyebrow.red { color: var(--naboo-red); }
    .section-head { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: end; justify-content: space-between;
      margin-bottom: var(--space-5); }
    .section-head h2 { margin: 0; }
    .view-all { color: var(--naboo-red-dark); font-weight: 600; text-decoration: none; }
    .view-all:hover { text-decoration: underline; }
    .grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }

    .advantage .adv-head { max-width: 560px; margin-bottom: var(--space-6); }
    .advantage .eyebrow { color: var(--naboo-red); }
    .advantage h2 { color: var(--naboo-white); }
    .advantage .adv-head p { color: #aab0b8; }
    .adv-grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .adv { border-top: 2px solid var(--naboo-red); padding-top: var(--space-3); }
    .adv mat-icon { color: var(--naboo-red); font-size: 28px; width: 28px; height: 28px; }
    .adv h3 { color: var(--naboo-white); font-size: 1rem; margin: var(--space-2) 0 var(--space-1); }
    .adv p { color: #aab0b8; font-size: .9rem; margin: 0; }

    .wa-cta { background: linear-gradient(100deg, #2a0d10 0%, var(--naboo-black) 55%),
        radial-gradient(ellipse at 10% 50%, rgba(229,43,54,.35), transparent 60%); color: var(--naboo-white); }
    .wa-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4);
      padding-block: var(--space-6); }
    .wa-inner h2 { margin: 0; font-size: 1.5rem; }
    .wa-inner p { color: #c4c8ce; margin: var(--space-1) 0 0; }
    .wa-btn { display: inline-flex; align-items: center; gap: var(--space-2); }
  `,
})
export class Home {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly fuel = FUEL_LABELS;
  protected readonly trans = TRANSMISSION_LABELS;
  protected readonly formatMoney = formatMoney;
  protected readonly priceBands = PRICE_BANDS;
  protected readonly whatsapp = whatsappLink('Hello Naboo Automotive, I am looking for a car.');

  protected readonly trust = [
    { icon: 'verified', label: 'Verified Vehicles' },
    { icon: 'handshake', label: 'Trusted Dealer' },
    { icon: 'support_agent', label: 'After Sales Support' },
  ];

  protected readonly advantages = [
    { icon: 'verified', title: 'Quality Assured', text: 'All our vehicles are thoroughly inspected and verified.' },
    { icon: 'sell', title: 'Best Prices', text: 'We offer competitive prices with great value.' },
    { icon: 'support_agent', title: 'Expert Support', text: 'Our team is here to help you every step of the way.' },
    { icon: 'sync_alt', title: 'Flexible Options', text: 'Trade-ins, financing and custom solutions available.' },
  ];

  protected readonly search = inject(FormBuilder).nonNullable.group({
    make: '',
    model: '',
    year: '' as string | number,
    band: -1,
  });

  protected readonly makes = rxResource({
    stream: () => this.api.query<{ vehicleMakes: string[] }>(VEHICLE_MAKES).pipe(map((d) => d.vehicleMakes)),
  });

  protected readonly vehicles = rxResource({
    stream: () =>
      this.api
        .query<{ vehicles: Page<VehicleCard> }>(VEHICLES, { page: 0, size: 4, sort: 'NEWEST' })
        .pipe(map((d) => d.vehicles)),
  });

  protected readonly featured = computed(() =>
    this.vehicles.hasValue() ? (this.vehicles.value().items[0] ?? null) : null,
  );

  protected searchCars(): void {
    const v = this.search.getRawValue();
    const band = v.band >= 0 ? PRICE_BANDS[v.band] : null;
    const year = Number(v.year);
    void this.router.navigate(['/cars-for-sale'], {
      queryParams: {
        make: v.make || null,
        search: v.model.trim() || null,
        minYear: Number.isFinite(year) && year >= 1950 ? year : null,
        maxYear: Number.isFinite(year) && year >= 1950 ? year : null,
        minPrice: band?.min ?? null,
        maxPrice: band?.max ?? null,
      },
    });
  }

  constructor() {
    inject(SeoService).set({
      title: SITE_NAME,
      description:
        'Naboo Automotive, Tanzania: quality vehicles for sale, workshop repairs and servicing, painting, detailing and restoration with transparent pricing.',
      path: '/',
    });
  }
}
