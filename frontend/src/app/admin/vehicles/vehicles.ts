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
import { ADMIN_VEHICLES, SET_VEHICLE_PUBLISHED } from '../../core/admin-queries';
import { STATUS_LABELS, formatMoney, options } from '../../core/format';
import { AdminVehicleFilter, Page, VehicleCard, VehicleStatus } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

type AdminVehicleRow = Pick<VehicleCard, 'id' | 'slug' | 'title' | 'make' | 'model' | 'year' | 'status' | 'price' | 'images'> & {
  published: boolean;
};

@Component({
  selector: 'app-admin-vehicles',
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
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.css',
})
export class AdminVehicles {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<AdminVehicleRow> | null>(null);
  protected readonly items = signal<AdminVehicleRow[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusOptions = options(STATUS_LABELS);
  protected readonly formatMoney = formatMoney;
  protected readonly statusLabel = (s: VehicleStatus) => STATUS_LABELS[s];

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    search: [''],
    status: [''],
    published: [''],
  });

  constructor() {
    inject(SeoService).set({ title: 'Manage vehicles', description: '', path: '/admin/vehicles', noIndex: true });
    this.filters.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.load(0));
    this.load(0);
  }

  protected load(page = 0): void {
    const f = this.filters.getRawValue();
    const filter: AdminVehicleFilter = {
      search: f.search || null,
      status: (f.status || null) as VehicleStatus | null,
      published: f.published === '' ? null : f.published === 'true',
    };
    this.state.set('loading');
    this.api.query<{ adminVehicles: Page<AdminVehicleRow> }>(ADMIN_VEHICLES, { filter, page, size: 20 }).subscribe({
      next: ({ adminVehicles }) => {
        this.page.set(adminVehicles);
        this.items.set(adminVehicles.items);
        this.state.set(adminVehicles.items.length ? 'ready' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  protected go(page: number): void {
    this.load(page);
  }

  protected togglePublished(v: AdminVehicleRow): void {
    this.busy.set(true);
    this.error.set(null);
    this.api
      .mutate<{ setVehiclePublished: { id: string; published: boolean } }>(SET_VEHICLE_PUBLISHED, {
        id: v.id,
        published: !v.published,
      })
      .subscribe({
        next: ({ setVehiclePublished }) => {
          this.busy.set(false);
          this.items.update((list) => list.map((i) => (i.id === v.id ? { ...i, published: setVehiclePublished.published } : i)));
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(toApiError(e).message);
        },
      });
  }
}
