import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Api, toApiError } from '../../core/api';
import { ADMIN_RENTALS, SET_RENTAL_PUBLISHED } from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { AdminRentalFilter, Page, RentalVehicle } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

@Component({
  selector: 'app-admin-rentals',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    LoadState,
    VehiclePlaceholder,
  ],
  templateUrl: './rentals.html',
  styleUrl: './rentals.css',
})
export class AdminRentals {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<RentalVehicle> | null>(null);
  protected readonly items = signal<RentalVehicle[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formatMoney = formatMoney;

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    search: [''],
    status: [''],
    published: [''],
  });

  constructor() {
    inject(SeoService).set({ title: 'Manage rental fleet', description: '', path: '/admin/rentals', noIndex: true });
    this.filters.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.load(0));
    this.load(0);
  }

  protected load(page = 0): void {
    const f = this.filters.getRawValue();
    const filter: AdminRentalFilter = {
      search: f.search || null,
      status: (f.status || null) as AdminRentalFilter['status'],
      published: f.published === '' ? null : f.published === 'true',
    };
    this.state.set('loading');
    this.api.query<{ adminRentalVehicles: Page<RentalVehicle> }>(ADMIN_RENTALS, { filter, page, size: 20 }).subscribe({
      next: ({ adminRentalVehicles }) => {
        this.page.set(adminRentalVehicles);
        this.items.set(adminRentalVehicles.items);
        this.state.set(adminRentalVehicles.items.length ? 'ready' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  protected go(page: number): void {
    this.load(page);
  }

  protected togglePublished(v: RentalVehicle): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(SET_RENTAL_PUBLISHED, { id: v.id, published: !v.published }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === v.id ? { ...i, published: !v.published } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
