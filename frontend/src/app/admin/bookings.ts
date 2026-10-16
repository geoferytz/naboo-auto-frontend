import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../core/api';
import { SERVICE_BOOKINGS, SET_WORKSHOP_CAPACITY, UPDATE_BOOKING, WORKSHOP_CAPACITY } from '../core/admin-queries';
import { BookingStatus, Page, ServiceBooking } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

const NEXT: Record<BookingStatus, { status: BookingStatus; label: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirm' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  CONFIRMED: [
    { status: 'IN_PROGRESS', label: 'Start work' },
    { status: 'CANCELLED', label: 'Cancel' },
    { status: 'NO_SHOW', label: 'No-show' },
  ],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Complete' }],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Component({
  selector: 'app-admin-bookings',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Workshop bookings</h1>
        </div>
        <form [formGroup]="capacityForm" (ngSubmit)="saveCapacity()" class="capacity" aria-label="Workshop capacity">
          <mat-form-field appearance="outline">
            <mat-label>Concurrent jobs</mat-label>
            <input matInput formControlName="maxConcurrentJobs" type="number" min="1" max="20" />
          </mat-form-field>
          <button mat-stroked-button type="submit" [disabled]="busy()">Save</button>
        </form>
      </div>
    </header>

    <div class="container section">
      <mat-button-toggle-group [value]="statusFilter()" (change)="setFilter($event.value)" aria-label="Filter by status">
        <mat-button-toggle value="">All</mat-button-toggle>
        @for (s of statusKeys; track s) {
          <mat-button-toggle [value]="s">{{ label(s) }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading bookings…" emptyText="No bookings in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (b of items(); track b.id) {
            <article class="card row">
              <div class="main">
                <div class="line">
                  <span class="ref">{{ b.reference }}</span>
                  <span class="badge" [attr.data-status]="b.status">{{ label(b.status) }}</span>
                </div>
                <strong>{{ b.service.name }}</strong>
                <span class="meta">{{ b.service.category }} · {{ b.scheduledStart | date: 'medium' }} →
                  {{ b.scheduledEnd | date: 'shortTime' }}</span>
                <span class="meta">{{ b.vehicleDescription }}</span>
                <span class="meta">{{ b.fullName }} · {{ b.phone }} · {{ b.email }}</span>
                @if (b.notes) {
                  <span class="meta notes">“{{ b.notes }}”</span>
                }
              </div>
              <div class="actions">
                @for (n of next(b.status); track n.status) {
                  @if (n.status === 'CANCELLED' || n.status === 'NO_SHOW') {
                    <button mat-stroked-button type="button" [disabled]="busy()" (click)="update(b, n.status)">{{ n.label }}</button>
                  } @else {
                    <button mat-flat-button type="button" [disabled]="busy()" (click)="update(b, n.status)">{{ n.label }}</button>
                  }
                }
              </div>
            </article>
          }
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        @if ((page()?.totalPages ?? 0) > 1) {
          <nav class="pager" aria-label="Pages">
            <button mat-stroked-button type="button" [disabled]="page()!.page === 0" (click)="load(page()!.page - 1)">Previous</button>
            <span>Page {{ page()!.page + 1 }} of {{ page()!.totalPages }}</span>
            <button mat-stroked-button type="button" [disabled]="page()!.page + 1 >= page()!.totalPages" (click)="load(page()!.page + 1)">Next</button>
          </nav>
        }
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .capacity { display: flex; gap: var(--space-2); align-items: start; }
    .capacity mat-form-field { width: 130px; }
    mat-button-toggle-group { margin-bottom: var(--space-4); flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); padding: var(--space-4);
      flex-wrap: wrap; }
    .line { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .notes { font-style: italic; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='PENDING'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='CONFIRMED'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='IN_PROGRESS'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='COMPLETED'] { background: #eceef1; color: #5a616b; }
    .badge[data-status='CANCELLED'], .badge[data-status='NO_SHOW'] { background: #f5e3e3; color: #8a1e1e; }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
  `,
})
export class AdminBookings {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<ServiceBooking> | null>(null);
  protected readonly items = signal<ServiceBooking[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as BookingStatus[];
  protected readonly label = (s: BookingStatus) => LABELS[s];
  protected readonly next = (s: BookingStatus) => NEXT[s];

  protected readonly capacityForm = inject(FormBuilder).nonNullable.group({
    maxConcurrentJobs: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  constructor() {
    inject(SeoService).set({ title: 'Workshop bookings', description: '', path: '/admin/bookings', noIndex: true });
    this.api.query<{ workshopCapacity: { maxConcurrentJobs: number } }>(WORKSHOP_CAPACITY).subscribe({
      next: ({ workshopCapacity }) => this.capacityForm.patchValue({ maxConcurrentJobs: workshopCapacity.maxConcurrentJobs }),
      error: () => {},
    });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ serviceBookings: Page<ServiceBooking> }>(SERVICE_BOOKINGS, {
        status: this.statusFilter() || null,
        page,
        size: 20,
      })
      .subscribe({
        next: ({ serviceBookings }) => {
          this.page.set(serviceBookings);
          this.items.set(serviceBookings.items);
          this.state.set(serviceBookings.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected update(b: ServiceBooking, status: BookingStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(UPDATE_BOOKING, { id: b.id, input: { status } }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === b.id ? { ...i, status } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected saveCapacity(): void {
    if (this.capacityForm.invalid) {
      this.capacityForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(SET_WORKSHOP_CAPACITY, { input: this.capacityForm.getRawValue() }).subscribe({
      next: () => this.busy.set(false),
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
