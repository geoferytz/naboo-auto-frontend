import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CONDITION_LABELS, FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS, formatMoney, formatNumber } from '../core/format';
import { VehicleCard as Vehicle } from '../core/models';
import { VehiclePlaceholder } from './vehicle-placeholder';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, VehiclePlaceholder],
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
          <li>{{ formatNumber(v.mileageKm) }} km</li>
          <li>{{ fuel[v.fuelType] }}</li>
          <li>{{ transmission[v.transmission] }}</li>
          <li>{{ condition[v.condition] }}</li>
        </ul>
        <p class="price">{{ formatMoney(v.price) }}</p>
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
    .specs { list-style: none; margin: 0 0 var(--space-3); padding: 0; display: flex; flex-wrap: wrap; gap: 4px 12px;
      color: var(--naboo-text-muted); font-size: .875rem; }
    .specs li + li::before { content: '•'; margin-right: 12px; color: var(--naboo-grey-dark); }
    .price { margin: auto 0 0; font-size: 1.2rem; font-weight: 800; }
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
