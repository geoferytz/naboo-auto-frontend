import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../../core/api';
import { SERVICE_BOOKINGS, SET_WORKSHOP_CAPACITY, UPDATE_BOOKING, WORKSHOP_CAPACITY } from '../../core/admin-queries';
import { BookingStatus, Page, ServiceBooking } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

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
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
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
