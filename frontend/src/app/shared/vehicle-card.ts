import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { CONDITION_LABELS, FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS, formatMoney, formatNumber } from '../core/format';
import { VehicleCard as Vehicle } from '../core/models';
import { VehiclePlaceholder } from './vehicle-placeholder';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, MatButtonModule, MatIconModule, VehiclePlaceholder],
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
        <h3><a [routerLink]="['/cars-for-sale', v.slug]">{{ v.title }}</a></h3>
        <ul class="specs" aria-label="Key specifications">
          <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">speed</mat-icon>{{ formatNumber(v.mileageKm) }} km</li>
          <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">local_gas_station</mat-icon>{{ fuel[v.fuelType] }}</li>
          <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">settings</mat-icon>{{ transmission[v.transmission] }}</li>
          <li><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">verified</mat-icon>{{ condition[v.condition] }}</li>
          @if (v.location) {
            <li class="loc"><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">location_on</mat-icon>{{ v.location }}</li>
          }
        </ul>
        <p class="price">{{ formatMoney(v.price) }}</p>
        <a mat-flat-button class="details" [routerLink]="['/cars-for-sale', v.slug]">
          View Details <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">arrow_forward</mat-icon>
        </a>
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
    h3 { font-size: 1.05rem; margin-bottom: var(--space-2); }
    h3 a { color: var(--naboo-text); text-decoration: none; }
    h3 a:hover { color: var(--naboo-red-dark); }
    .specs { list-style: none; margin: 0 0 var(--space-3); padding: 0; display: grid;
      grid-template-columns: 1fr 1fr; gap: 6px 12px; color: var(--naboo-text-muted); font-size: .82rem; }
    .specs li { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
    .specs mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--naboo-text-muted); flex-shrink: 0; }
    .loc { grid-column: 1 / -1; }
    .price { margin: auto 0 var(--space-3); font-size: 1.15rem; font-weight: 800; color: var(--naboo-red); }
    .details { background: var(--naboo-red) !important; color: var(--naboo-white) !important; width: 100%; }
    .details:hover { background: var(--naboo-red-dark) !important; }
  `,
})
export class VehicleCardComponent {
  readonly vehicle = input.required<Vehicle>();
  protected readonly cover = computed(() => this.vehicle().images[0] ?? null);
  protected readonly fuel = FUEL_LABELS;
  protected readonly transmission = TRANSMISSION_LABELS;
  protected readonly condition = CONDITION_LABELS;
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;
}
