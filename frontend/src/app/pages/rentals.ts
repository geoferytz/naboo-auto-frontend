import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatMoney } from '../core/format';
import { Page, RentalVehicle } from '../core/models';
import { RENTAL_VEHICLES } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

@Component({
  selector: 'app-rentals',
  imports: [RouterLink, MatButtonModule, LoadState, VehiclePlaceholder],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">Rentals</span>
        <h1>Vehicles for hire</h1>
        <p class="lead">Well-maintained cars for daily hire in Tanzania. Reserve your dates and our team will confirm.</p>
      </div>
    </header>

    <div class="container section">
      @if (rentals.hasValue()) {
        @if (rentals.value().items.length) {
          <div class="grid">
            @for (v of rentals.value().items; track v.id) {
              <article class="card vehicle-card">
                <a [routerLink]="['/rentals', v.slug]" class="photo" tabindex="-1" aria-hidden="true">
                  @if (v.images.length) {
                    <img [src]="v.images[0].url" [alt]="v.images[0].altText" loading="lazy" />
                  } @else {
                    <app-vehicle-placeholder [label]="v.title" />
                  }
                </a>
                <div class="body">
                  <h2><a [routerLink]="['/rentals', v.slug]">{{ v.title }}</a></h2>
                  <p class="specs">
                    {{ v.seats ? v.seats + ' seats · ' : '' }}{{ trans(v.transmission) }} · {{ fuel(v.fuelType) }} · {{ body(v.bodyType) }}
                  </p>
                  <p class="price">{{ formatMoney(v.dailyRate) }} <span class="per">/ day</span></p>
                  <a mat-flat-button [routerLink]="['/rentals', v.slug]">Check dates &amp; book</a>
                </div>
              </article>
            }
          </div>
        } @else {
          <app-load-state state="empty" emptyText="No rental vehicles are listed right now. Please check back soon." />
        }
      } @else {
        <app-load-state [state]="rentals.error() ? 'error' : 'loading'" loadingText="Loading rental vehicles…" (retry)="rentals.reload()" />
      }
    </div>
  `,
  styles: `
    .grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
    .vehicle-card { overflow: hidden; display: flex; flex-direction: column; }
    .photo { display: block; aspect-ratio: 16/10; background: var(--naboo-grey); }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .body { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
    .body h2 { margin: 0; font-size: 1.1rem; }
    .body h2 a { color: inherit; text-decoration: none; }
    .specs { color: var(--naboo-text-muted); font-size: .9rem; margin: 0; }
    .price { font-weight: 700; font-size: 1.15rem; margin: 0; }
    .per { font-weight: 400; font-size: .85rem; color: var(--naboo-text-muted); }
    .body a[mat-flat-button] { margin-top: auto; align-self: flex-start; }
  `,
})
export class Rentals {
  protected readonly formatMoney = formatMoney;
  protected readonly fuel = (f: keyof typeof FUEL_LABELS) => FUEL_LABELS[f];
  protected readonly trans = (t: keyof typeof TRANSMISSION_LABELS) => TRANSMISSION_LABELS[t];
  protected readonly body = (b: keyof typeof BODY_LABELS) => BODY_LABELS[b];

  protected readonly rentals = rxResource({
    stream: () =>
      inject(Api)
        .query<{ rentalVehicles: Page<RentalVehicle> }>(RENTAL_VEHICLES, { page: 0, size: 24 })
        .pipe(map((d) => d.rentalVehicles)),
  });

  constructor() {
    inject(SeoService).set({
      title: 'Car rentals',
      description: 'Hire a well-maintained vehicle from Naboo Automotive — daily rates in TZS, easy reservation.',
      path: '/rentals',
    });
  }
}
