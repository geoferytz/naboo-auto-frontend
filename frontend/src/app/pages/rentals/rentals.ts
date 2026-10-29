import { Component, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../../core/api';
import { catalogueFilter } from '../../core/catalogue-search';
import { VehicleSearch } from '../../shared/vehicle-search/vehicle-search';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatMoney } from '../../core/format';
import { Page, RentalVehicle } from '../../core/models';
import { RENTAL_VEHICLES } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

@Component({
  selector: 'app-rentals',
  imports: [RouterLink, MatButtonModule, LoadState, VehiclePlaceholder, VehicleSearch],
  templateUrl: './rentals.html',
  styleUrl: './rentals.css',
})
export class Rentals {
  private readonly api = inject(Api);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly formatMoney = formatMoney;
  protected readonly fuel = (f: keyof typeof FUEL_LABELS) => FUEL_LABELS[f];
  protected readonly trans = (t: keyof typeof TRANSMISSION_LABELS) => TRANSMISSION_LABELS[t];
  protected readonly body = (b: keyof typeof BODY_LABELS) => BODY_LABELS[b];

  protected readonly rentals = rxResource({
    params: () => this.params(),
    stream: ({ params }) =>
      this.api
        .query<{ rentalVehicles: Page<RentalVehicle> }>(RENTAL_VEHICLES, {
          filter: catalogueFilter(params),
          page: Math.max(0, Math.trunc(Number(params.get('page') ?? 1)) - 1) || 0, size: 24,
        })
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
