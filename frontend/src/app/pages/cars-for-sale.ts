import { Component, computed, effect, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, options } from '../core/format';
import { Page, VehicleCard, VehicleFilter, VehicleSort } from '../core/models';
import { VEHICLES, VEHICLE_MAKES } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';
import { VehicleCardComponent } from '../shared/vehicle-card';

const PAGE_SIZE = 12;
const FILTER_KEYS = [
  'search', 'make', 'minYear', 'maxYear', 'minPrice', 'maxPrice',
  'location', 'condition', 'bodyType', 'fuelType', 'transmission', 'color',
] as const;

@Component({
  selector: 'app-cars-for-sale',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    VehicleCardComponent,
    LoadState,
  ],
  template: `
    <div class="container section layout">
      <aside class="sidebar" aria-label="Vehicle filters">
        <details [open]="wide" class="panel">
          <summary>
            <mat-icon fontSet="material-symbols-outlined">tune</mat-icon> Filters
            <span class="found">Found cars: <strong>{{ results.hasValue() ? results.value().totalCount : '…' }}</strong></span>
          </summary>
          <form [formGroup]="form" (ngSubmit)="apply()" class="filter-form" aria-label="Vehicle filters">
            <section class="group">
              <h3>Keyword</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <input matInput formControlName="search" placeholder="e.g. Prado, Hilux" maxlength="100" />
              </mat-form-field>
            </section>

            <section class="group">
              <h3>Basic information</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Make</mat-label>
                <mat-select formControlName="make">
                  <mat-option [value]="''">Any make</mat-option>
                  @for (m of makes.value() ?? []; track m) {
                    <mat-option [value]="m">{{ m }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="pair">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Year from</mat-label>
                  <input matInput type="number" inputmode="numeric" formControlName="minYear" min="1950" max="2100" />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Year to</mat-label>
                  <input matInput type="number" inputmode="numeric" formControlName="maxYear" min="1950" max="2100" />
                </mat-form-field>
              </div>
            </section>

            <section class="group">
              <h3>Car cost</h3>
              <div class="pair">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Price from</mat-label>
                  <input matInput type="number" inputmode="numeric" formControlName="minPrice" min="0" step="1000000" />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Price to</mat-label>
                  <input matInput type="number" inputmode="numeric" formControlName="maxPrice" min="0" step="1000000" />
                </mat-form-field>
              </div>
              <p class="hint">Prices in TZS</p>
            </section>

            <section class="group">
              <h3>Search region</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Location / yard</mat-label>
                <input matInput formControlName="location" placeholder="e.g. Dar es Salaam" maxlength="80" />
              </mat-form-field>
            </section>

            <section class="group">
              <h3>Vehicle condition</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select formControlName="condition">
                  <mat-option [value]="''">Any condition</mat-option>
                  @for (o of conditionOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </section>

            <section class="group">
              <h3>Characteristics</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Body type</mat-label>
                <mat-select formControlName="bodyType">
                  <mat-option [value]="''">Any</mat-option>
                  @for (o of bodyOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Fuel</mat-label>
                <mat-select formControlName="fuelType">
                  <mat-option [value]="''">Any</mat-option>
                  @for (o of fuelOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Transmission</mat-label>
                <mat-select formControlName="transmission">
                  <mat-option [value]="''">Any</mat-option>
                  @for (o of transmissionOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </section>

            <section class="group">
              <h3>Colour</h3>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <input matInput formControlName="color" placeholder="e.g. White" maxlength="40" />
              </mat-form-field>
            </section>

            <mat-checkbox formControlName="includeSold">Include sold vehicles</mat-checkbox>

            <div class="found-row">
              <span>Found cars: <strong>{{ results.hasValue() ? results.value().totalCount : '…' }}</strong></span>
            </div>
            <div class="actions">
              <button mat-flat-button type="submit" class="show-btn">Show</button>
              <button mat-icon-button type="button" (click)="reset()" aria-label="Clear all filters">
                <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
              </button>
            </div>
          </form>
        </details>
      </aside>

      <section class="results" aria-labelledby="results-heading">
        <div class="results-bar">
          <h1 id="results-heading" aria-live="polite">
            Cars for sale
            <span class="count">{{ results.hasValue() ? '· ' + results.value().totalCount + ' found' : '' }}</span>
          </h1>
          <mat-form-field appearance="outline" class="sort" subscriptSizing="dynamic">
            <mat-label>Sort by</mat-label>
            <mat-select [value]="sort()" (selectionChange)="setSort($event.value)">
              @for (s of sortOptions; track s.value) {
                <mat-option [value]="s.value">{{ s.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        @if (results.hasValue() && results.value().items.length) {
          @let r = results.value();
          <div class="grid">
            @for (v of r.items; track v.id) {
              <app-vehicle-card [vehicle]="v" />
            }
          </div>
          @if (r.totalPages > 1) {
            <nav class="pager" aria-label="Pagination">
              <a mat-stroked-button [routerLink]="[]" [queryParams]="{ page: r.page }" queryParamsHandling="merge"
                 [class.hidden]="r.page === 0" [attr.aria-disabled]="r.page === 0">Previous</a>
              <span>Page {{ r.page + 1 }} of {{ r.totalPages }}</span>
              <a mat-stroked-button [routerLink]="[]" [queryParams]="{ page: r.page + 2 }" queryParamsHandling="merge"
                 [class.hidden]="r.page + 1 >= r.totalPages">Next</a>
            </nav>
          }
        } @else {
          <app-load-state
            [state]="results.isLoading() ? 'loading' : results.error() ? 'error' : 'empty'"
            emptyText="No vehicles match your search right now."
            (retry)="results.reload()"
          >
            <div class="actions">
              <button mat-stroked-button type="button" (click)="reset()">Clear filters</button>
              <a mat-flat-button routerLink="/contact" [queryParams]="{ subject: 'Vehicle request' }">Ask us to find one</a>
            </div>
          </app-load-state>
        }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; gap: var(--space-5); padding-top: var(--space-5); }
    .panel { background: #fff; border: 1px solid var(--naboo-border); border-radius: var(--radius-md); overflow: hidden; }
    summary { cursor: pointer; font-weight: 700; padding: var(--space-3) var(--space-4); display: flex; align-items: center; gap: var(--space-2);
      border-bottom: 1px solid var(--naboo-border); }
    summary .found { margin-left: auto; font-weight: 500; font-size: .85rem; color: var(--naboo-text-muted); }
    summary::-webkit-details-marker { display: none; }
    .filter-form { display: flex; flex-direction: column; }
    .group { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--naboo-border);
      display: flex; flex-direction: column; gap: var(--space-2); }
    .group h3 { font-size: .85rem; font-weight: 700; margin: 0 0 var(--space-1); color: var(--naboo-text);
      display: flex; align-items: center; gap: var(--space-2); }
    .group h3::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--naboo-red); flex-shrink: 0; }
    .group mat-form-field { width: 100%; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
    .hint { font-size: .8rem; color: var(--naboo-text-muted); margin: 0; }
    .filter-form > mat-checkbox { margin: var(--space-3) var(--space-4) 0; }
    .found-row { padding: var(--space-3) var(--space-4) 0; font-size: .9rem; color: var(--naboo-text-muted); }
    .actions { display: flex; gap: var(--space-2); padding: var(--space-3) var(--space-4) var(--space-4); }
    .show-btn { flex: 1; }
    .results-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-3);
      margin-bottom: var(--space-4); }
    .results-bar h1 { margin: 0; font-size: 1.4rem; }
    .count { font-weight: 500; font-size: .95rem; color: var(--naboo-text-muted); }
    .sort { width: 210px; }
    .grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
    .pager { display: flex; justify-content: center; align-items: center; gap: var(--space-4); margin-top: var(--space-6); }
    .hidden { visibility: hidden; }
    @media (min-width: 960px) {
      .layout { grid-template-columns: 280px 1fr; align-items: start; }
      .sidebar { position: sticky; top: calc(var(--header-height) + var(--space-4)); }
      summary { cursor: default; }
    }
  `,
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
    minYear: '',
    maxYear: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    condition: '',
    bodyType: '',
    fuelType: '',
    transmission: '',
    color: '',
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
  const num = (k: string) => {
    const n = Number(p.get(k));
    return p.get(k) && Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const price = (k: string) => {
    const n = num(k);
    return n != null && n >= 0 ? String(n) : null;
  };
  return {
    search: p.get('search'),
    make: p.get('make'),
    bodyType: p.get('bodyType') as VehicleFilter['bodyType'],
    fuelType: p.get('fuelType') as VehicleFilter['fuelType'],
    transmission: p.get('transmission') as VehicleFilter['transmission'],
    condition: p.get('condition') as VehicleFilter['condition'],
    minYear: num('minYear'),
    maxYear: num('maxYear'),
    minPrice: price('minPrice'),
    maxPrice: price('maxPrice'),
    location: p.get('location'),
    color: p.get('color'),
    includeSold: p.get('includeSold') === 'true',
  };
}
