import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Api, toApiError } from '../core/api';
import { ADMIN_RENTALS, SET_RENTAL_PUBLISHED } from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { AdminRentalFilter, Page, RentalVehicle } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Rental fleet</h1>
        </div>
        <a mat-flat-button routerLink="/admin/rentals/new"><mat-icon fontSet="material-symbols-outlined">add</mat-icon> Add rental vehicle</a>
      </div>
    </header>

    <div class="container section">
      <form [formGroup]="filters" class="filter-bar" aria-label="Filter rental vehicles">
        <mat-form-field appearance="outline" class="grow">
          <mat-label>Search</mat-label>
          <input matInput formControlName="search" placeholder="Make, model or registration" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="">All</mat-option>
            <mat-option value="AVAILABLE">Available</mat-option>
            <mat-option value="UNAVAILABLE">Unavailable</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Visibility</mat-label>
          <mat-select formControlName="published">
            <mat-option value="">All</mat-option>
            <mat-option value="true">Published</mat-option>
            <mat-option value="false">Hidden</mat-option>
          </mat-select>
        </mat-form-field>
      </form>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading rental vehicles…" emptyText="No vehicles match this filter." (retry)="load()" />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Vehicle</th>
                <th scope="col">Daily rate</th>
                <th scope="col">Status</th>
                <th scope="col">Visible</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (v of items(); track v.id) {
                <tr>
                  <td>
                    <div class="vehicle">
                      @if (v.images.length) {
                        <img [src]="v.images[0].url" [alt]="v.images[0].altText" width="72" height="48" />
                      } @else {
                        <span class="thumb"><app-vehicle-placeholder /></span>
                      }
                      <div>
                        <a [routerLink]="['/admin/rentals', v.id]" class="title">{{ v.title }}</a>
                        <span class="meta">{{ v.seats ? v.seats + ' seats' : '' }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ formatMoney(v.dailyRate) }}</td>
                  <td><span class="badge" [attr.data-status]="v.status">{{ v.status === 'AVAILABLE' ? 'Available' : 'Unavailable' }}</span></td>
                  <td>
                    <button mat-button type="button" (click)="togglePublished(v)" [disabled]="busy()">
                      {{ v.published ? 'Published' : 'Hidden' }}
                    </button>
                  </td>
                  <td>
                    <a mat-stroked-button [routerLink]="['/admin/rentals', v.id]">Edit</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        @if ((page()?.totalPages ?? 0) > 1) {
          <nav class="pager" aria-label="Pages">
            <button mat-stroked-button type="button" [disabled]="page()!.page === 0" (click)="go(page()!.page - 1)">Previous</button>
            <span>Page {{ page()!.page + 1 }} of {{ page()!.totalPages }}</span>
            <button mat-stroked-button type="button" [disabled]="page()!.page + 1 >= page()!.totalPages" (click)="go(page()!.page + 1)">Next</button>
          </nav>
        }
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .filter-bar { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4); }
    .filter-bar .grow { flex: 1 1 220px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--naboo-white); }
    th, td { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--naboo-border); vertical-align: middle; }
    th { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--naboo-text-muted); }
    .vehicle { display: flex; align-items: center; gap: var(--space-3); min-width: 200px; }
    .vehicle img, .thumb { width: 72px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); display: block;
      background: var(--naboo-grey); overflow: hidden; }
    .title { font-weight: 600; color: var(--naboo-text); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='AVAILABLE'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='UNAVAILABLE'] { background: #f5e3e3; color: #8a1e1e; }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
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
