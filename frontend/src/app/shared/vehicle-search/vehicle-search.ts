import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../../core/api';
import { VehicleSearchOption } from '../../core/models';
import { RENTAL_SEARCH_OPTIONS, VEHICLE_SEARCH_OPTIONS } from '../../core/queries';

@Component({
  selector: 'app-vehicle-search',
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './vehicle-search.html',
  styleUrl: './vehicle-search.css',
})
export class VehicleSearch {
  readonly initialKind = input<'sale' | 'rental'>('sale');
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  protected readonly kind = signal<'sale' | 'rental'>('sale');
  protected readonly form = inject(FormBuilder).nonNullable.group({ make: '', model: '', year: '', budget: '' });
  private readonly make = toSignal(this.form.controls.make.valueChanges, { initialValue: '' });
  private readonly model = toSignal(this.form.controls.model.valueChanges, { initialValue: '' });
  protected readonly options = rxResource({
    params: () => this.kind(),
    stream: ({ params }) => params === 'sale'
      ? this.api.query<{ vehicleSearchOptions: VehicleSearchOption[] }>(VEHICLE_SEARCH_OPTIONS).pipe(map((d) => d.vehicleSearchOptions))
      : this.api.query<{ rentalSearchOptions: VehicleSearchOption[] }>(RENTAL_SEARCH_OPTIONS).pipe(map((d) => d.rentalSearchOptions)),
  });
  private readonly rows = computed(() => this.options.hasValue() ? this.options.value() : []);
  protected readonly makes = computed(() => [...new Set(this.rows().map((v) => v.make))].sort());
  protected readonly models = computed(() => [...new Set(this.rows().filter((v) => v.make === this.make()).map((v) => v.model))].sort());
  protected readonly years = computed(() => [...new Set(this.rows()
    .filter((v) => (!this.make() || v.make === this.make()) && (!this.model() || v.model === this.model()))
    .map((v) => v.year))].sort((a, b) => b - a));
  protected readonly budgets = computed(() => this.kind() === 'sale' ? [
    { value: ':20000000', label: 'Up to TZS 20 million' },
    { value: '20000000:50000000', label: 'TZS 20–50 million' },
    { value: '50000000:100000000', label: 'TZS 50–100 million' },
    { value: '100000000:', label: 'TZS 100 million and above' },
  ] : [
    { value: ':100000', label: 'Up to TZS 100,000 / day' },
    { value: '100000:250000', label: 'TZS 100,000–250,000 / day' },
    { value: '250000:500000', label: 'TZS 250,000–500,000 / day' },
    { value: '500000:', label: 'TZS 500,000+ / day' },
  ]);

  constructor() {
    effect(() => {
      const p = this.params();
      this.kind.set(this.initialKind());
      this.form.setValue({
        make: p.get('make') ?? '', model: p.get('model') ?? '',
        year: p.get('minYear') === p.get('maxYear') ? p.get('minYear') ?? '' : '',
        budget: p.has('minPrice') || p.has('maxPrice') ? `${p.get('minPrice') ?? ''}:${p.get('maxPrice') ?? ''}` : '',
      });
    });
  }

  protected setKind(kind: 'sale' | 'rental'): void {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.form.reset();
  }

  protected makeChanged(): void {
    this.form.patchValue({ model: '', year: '' });
  }

  protected search(): void {
    const { make, model, year, budget } = this.form.getRawValue();
    const [minPrice, maxPrice] = budget.split(':');
    void this.router.navigate([this.kind() === 'sale' ? '/cars-for-sale' : '/rentals'], {
      queryParams: {
        make: make || null, model: model || null, minYear: year || null, maxYear: year || null,
        minPrice: minPrice || null, maxPrice: maxPrice || null,
      },
    });
  }
}
