import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS, formatMoney, formatNumber } from '../core/format';
import { VehicleCard as Vehicle } from '../core/models';
import { VehiclePlaceholder } from './vehicle-placeholder';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, DatePipe, MatButtonModule, VehiclePlaceholder],
  template: `
    @let v = vehicle();
    <article class="card vehicle" [class.sold]="v.status === 'SOLD'">
      <a [routerLink]="['/cars-for-sale', v.slug]" class="media" [attr.aria-label]="v.title">
        @if (cover(); as img) {
          <img [src]="img.url" [alt]="img.altText" loading="lazy" decoding="async" width="640" height="400" />
        } @else {
          <app-vehicle-placeholder [label]="v.make" />
        }
        @if (v.status !== 'AVAILABLE') {
          <span [class]="'status badge status--' + v.status.toLowerCase()">{{ statusLabel[v.status] }}</span>
        }
      </a>
      <div class="body">
        <div class="topline">
          @if (v.publishedAt) {
            <time class="posted" [attr.datetime]="v.publishedAt">{{ v.publishedAt | date: 'MMM d, y' }}</time>
          }
        </div>
        <h3><a [routerLink]="['/cars-for-sale', v.slug]">{{ v.title }}</a></h3>
        <dl class="specs" aria-label="Key specifications">
          <div><dt>Mileage</dt><dd>{{ formatNumber(v.mileageKm) }} km</dd></div>
          <div><dt>Location</dt><dd>{{ v.location ?? '—' }}</dd></div>
          <div><dt>Engine</dt><dd>{{ engine(v) }}</dd></div>
          <div><dt>Transmission</dt><dd>{{ transmission[v.transmission] }}</dd></div>
        </dl>
        <div class="foot">
          <p class="price">{{ formatMoney(v.price) }}</p>
          <a mat-flat-button class="details" [routerLink]="['/cars-for-sale', v.slug]">More details</a>
        </div>
      </div>
    </article>
  `,
  styles: `
    .vehicle { overflow: hidden; display: flex; flex-direction: column; height: 100%; transition: box-shadow .2s, transform .2s; }
    .vehicle:hover { box-shadow: var(--shadow-raised); transform: translateY(-2px); }
    .media { position: relative; display: block; aspect-ratio: 16 / 10; background: var(--naboo-grey); }
    .media img { width: 100%; height: 100%; object-fit: cover; }
    .badge { position: absolute; top: 12px; left: 12px; }
    .sold .media img, .sold app-vehicle-placeholder { filter: grayscale(.8); opacity: .8; }
    .body { padding: var(--space-4); display: flex; flex-direction: column; flex: 1; }
    .topline { min-height: 1em; }
    .posted { font-size: .75rem; color: var(--naboo-text-muted); }
    h3 { font-size: 1.05rem; margin: var(--space-1) 0 var(--space-3); }
    h3 a { color: var(--naboo-text); text-decoration: none; }
    h3 a:hover { color: var(--naboo-red-dark); }
    .specs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2) var(--space-3); margin: 0 0 var(--space-3); }
    .specs > div { display: flex; justify-content: space-between; gap: var(--space-2); font-size: .82rem;
      border-bottom: 1px solid var(--naboo-border); padding-bottom: var(--space-1); }
    .specs dt { color: var(--naboo-text-muted); }
    .specs dd { margin: 0; font-weight: 600; text-align: right; }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: auto; }
    .price { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--naboo-red-dark); }
    .details { flex-shrink: 0; }
  `,
})
export class VehicleCardComponent {
  readonly vehicle = input.required<Vehicle>();
  protected readonly cover = computed(() => this.vehicle().images[0] ?? null);
  protected readonly fuel = FUEL_LABELS;
  protected readonly transmission = TRANSMISSION_LABELS;
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;

  protected engine(v: Vehicle): string {
    const parts = [v.engineCapacityCc ? `${formatNumber(v.engineCapacityCc)} cc` : null, v.engineCode].filter(Boolean);
    return parts.length ? parts.join(' · ') : FUEL_LABELS[v.fuelType];
  }
}
