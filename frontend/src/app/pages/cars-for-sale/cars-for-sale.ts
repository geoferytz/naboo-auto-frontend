import { Component, computed, effect, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../../core/api';
import { catalogueFilter } from '../../core/catalogue-search';
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, options } from '../../core/format';
import { Page, VehicleCard, VehicleFilter, VehicleSort } from '../../core/models';
import { VEHICLES, VEHICLE_MAKES } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';
import { VehicleCardComponent } from '../../shared/vehicle-card/vehicle-card';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['search', 'make', 'model', 'bodyType', 'fuelType', 'transmission', 'condition', 'minYear', 'maxYear', 'minPrice', 'maxPrice'] as const;

@Component({
  selector: 'app-cars-for-sale',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    VehicleCardComponent,
    LoadState,
  ],
  templateUrl: './cars-for-sale.html',
  styleUrl: './cars-for-sale.css',
})
export class CarsForSale {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches;
  protected readonly bodyOptions = options(BODY_LABELS);
  protected readonly fuelOptions = options(FUEL_LABELS);
  protected readonly transmissionOptions = options(TRANSMISSION_LABELS);
  protected readonly conditionOptions = options(CONDITION_LABELS);
  protected readonly sortOptions: { value: VehicleSort; label: string }[] = [
    { value: 'NEWEST', label: 'Newest listings' },
    { value: 'PRICE_ASC', label: 'Price: low to high' },
    { value: 'PRICE_DESC', label: 'Price: high to low' },
    { value: 'YEAR_DESC', label: 'Year: newest first' },
    { value: 'MILEAGE_ASC', label: 'Mileage: lowest first' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    search: '',
    make: '',
    model: '',
    bodyType: '',
    fuelType: '',
    transmission: '',
    condition: '',
    minYear: '',
    maxYear: '',
    maxPrice: '',
    minPrice: '',
    includeSold: false,
  });

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly sort = computed(() => (this.params().get('sort') as VehicleSort | null) ?? 'NEWEST');

  protected readonly makes = rxResource({
    stream: () => this.api.query<{ vehicleMakes: string[] }>(VEHICLE_MAKES).pipe(map((d) => d.vehicleMakes)),
  });

  protected readonly results = rxResource({
    params: () => this.params(),
    stream: ({ params }) =>
      this.api
        .query<{ vehicles: Page<VehicleCard> }>(VEHICLES, {
          filter: toFilter(params),
          page: Math.max(0, Number(params.get('page') ?? 1) - 1) || 0,
          size: PAGE_SIZE,
          sort: params.get('sort') ?? 'NEWEST',
        })
        .pipe(map((d) => d.vehicles)),
  });

  constructor() {
    inject(SeoService).set({
      title: 'Cars for sale in Tanzania',
      description: 'Browse new and used cars for sale at Naboo Automotive with clear TZS prices, specifications and availability.',
      path: '/cars-for-sale',
    });
    effect(() => {
      const p = this.params();
      const values: Record<string, string> = {};
      FILTER_KEYS.forEach((k) => (values[k] = p.get(k) ?? ''));
      this.form.patchValue({ ...values, includeSold: p.get('includeSold') === 'true' }, { emitEvent: false });
    });
  }

  protected apply(): void {
    const v = this.form.getRawValue();
    const queryParams: Record<string, string | null> = { page: null, sort: this.params().get('sort') };
    FILTER_KEYS.forEach((k) => (queryParams[k] = String(v[k] ?? '').trim() || null));
    queryParams['includeSold'] = v.includeSold ? 'true' : null;
    void this.router.navigate([], { queryParams });
  }

  protected reset(): void {
    this.form.reset();
    void this.router.navigate([], { queryParams: {} });
  }

  protected setSort(sort: VehicleSort): void {
    void this.router.navigate([], { queryParams: { sort, page: null }, queryParamsHandling: 'merge' });
  }
}

function toFilter(p: ParamMap): VehicleFilter {
  return {
    ...catalogueFilter(p),
    search: p.get('search'),
    bodyType: p.get('bodyType') as VehicleFilter['bodyType'],
    fuelType: p.get('fuelType') as VehicleFilter['fuelType'],
    transmission: p.get('transmission') as VehicleFilter['transmission'],
    condition: p.get('condition') as VehicleFilter['condition'],
    includeSold: p.get('includeSold') === 'true',
  };
}
