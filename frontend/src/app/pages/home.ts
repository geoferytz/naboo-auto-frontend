import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { servicePrice } from '../core/format';
import { Page, ServiceCategory, ServiceItem, VehicleCard } from '../core/models';
import { SERVICE_CATALOGUE, VEHICLES } from '../core/queries';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { HeroSlider } from '../shared/hero-slider';
import { LoadState } from '../shared/load-state';
import { VehicleCardComponent } from '../shared/vehicle-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, VehicleCardComponent, LoadState, HeroSlider],
  template: `
    <app-hero-slider />

    <section class="section" aria-labelledby="pillars">
      <div class="container">
        <h2 id="pillars" class="visually-hidden">What we do</h2>
        <div class="grid pillars">
          @for (p of pillars; track p.title) {
            <a class="card pillar" [routerLink]="p.link" [queryParams]="p.query ?? null">
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ p.icon }}</mat-icon>
              <h3>{{ p.title }}</h3>
              <p>{{ p.text }}</p>
              <span class="more">{{ p.cta }} →</span>
            </a>
          }
        </div>
      </div>
    </section>

    <section class="section section--grey" aria-labelledby="latest">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Cars for sale</span>
            <h2 id="latest">Latest vehicles</h2>
          </div>
          <a mat-stroked-button routerLink="/cars-for-sale">View all vehicles</a>
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

    <section class="section" aria-labelledby="services">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">Workshop</span>
            <h2 id="services">Services and pricing</h2>
          </div>
          <a mat-stroked-button routerLink="/services">All services</a>
        </div>
        @if (catalogue.hasValue() && catalogue.value().services.length) {
          <div class="grid">
            @for (s of catalogue.value().services.slice(0, 6); track s.id) {
              <a class="card service" [routerLink]="['/services', s.slug]">
                <span class="cat">{{ s.category.name }}</span>
                <h3>{{ s.name }}</h3>
                <p>{{ s.summary }}</p>
                <strong>{{ servicePrice(s) }}</strong>
              </a>
            }
          </div>
        } @else {
          <app-load-state
            [state]="catalogue.isLoading() ? 'loading' : catalogue.error() ? 'error' : 'empty'"
            emptyText="Our service catalogue is being updated. Contact us for a quotation."
            (retry)="catalogue.reload()"
          />
        }
      </div>
    </section>

    <section class="section section--dark" aria-labelledby="promise">
      <div class="container promise">
        <div>
          <span class="eyebrow">How we work</span>
          <h2 id="promise">Transparent from first enquiry to collection</h2>
        </div>
        <ul>
          <li><strong>Clear pricing.</strong> Fixed prices where the scope is fixed; otherwise an estimate or itemised quotation.</li>
          <li><strong>Your approval first.</strong> Additional work is never added without your consent.</li>
          <li><strong>Accurate listings.</strong> Sold and reserved vehicles are clearly marked.</li>
          <li><strong>A reference for everything.</strong> Every enquiry receives a reference number you can quote.</li>
        </ul>
      </div>
    </section>
  `,
  styles: `
    .pillar { padding: var(--space-5); text-decoration: none; color: inherit; display: flex; flex-direction: column;
      transition: box-shadow .2s, transform .2s; }
    .pillar:hover { box-shadow: var(--shadow-raised); transform: translateY(-2px); }
    .pillar mat-icon { color: var(--naboo-red); font-size: 32px; width: 32px; height: 32px; margin-bottom: var(--space-3); }
    .pillar p { color: var(--naboo-text-muted); flex: 1; }
    .more { font-weight: 600; color: var(--naboo-red-dark); }
    .section-head { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: end; justify-content: space-between;
      margin-bottom: var(--space-5); }
    .section-head h2 { margin: 0; }
    .service { padding: var(--space-5); text-decoration: none; color: inherit; display: flex; flex-direction: column; }
    .service:hover { box-shadow: var(--shadow-raised); }
    .service p { color: var(--naboo-text-muted); flex: 1; }
    .cat { font-size: .78rem; font-weight: 600; color: var(--naboo-text-muted); text-transform: uppercase; letter-spacing: .08em; }
    .promise { display: grid; gap: var(--space-6); }
    .promise ul { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-4); }
    .promise li { padding-left: var(--space-5); border-left: 3px solid var(--naboo-red); color: #c4c8ce; }
    .promise strong { color: var(--naboo-white); }
    @media (min-width: 900px) { .promise { grid-template-columns: 1fr 1.3fr; align-items: center; } }
  `,
})
export class Home {
  private readonly api = inject(Api);
  protected readonly servicePrice = servicePrice;

  protected readonly pillars = [
    { icon: 'directions_car', title: 'Cars for sale', text: 'Inspected new and used vehicles with clear prices and specifications.', link: '/cars-for-sale', cta: 'Browse vehicles' },
    { icon: 'build', title: 'Repairs & maintenance', text: 'Servicing, diagnostics, brakes, suspension and electrical work.', link: '/services', cta: 'View services' },
    { icon: 'format_paint', title: 'Painting & restoration', text: 'Resprays, colour changes, bodywork and complete restorations.', link: '/services', cta: 'View services' },
    { icon: 'request_quote', title: 'Request a quotation', text: 'Tell us about your vehicle and the work you need — we will reply with a quote.', link: '/contact', query: { subject: 'Quotation request' }, cta: 'Get a quote' },
  ];

  protected readonly vehicles = rxResource({
    stream: () =>
      this.api
        .query<{ vehicles: Page<VehicleCard> }>(VEHICLES, { page: 0, size: 6, sort: 'NEWEST' })
        .pipe(map((d) => d.vehicles)),
  });

  protected readonly catalogue = rxResource({
    stream: () => this.api.query<{ serviceCategories: ServiceCategory[]; services: ServiceItem[] }>(SERVICE_CATALOGUE),
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
