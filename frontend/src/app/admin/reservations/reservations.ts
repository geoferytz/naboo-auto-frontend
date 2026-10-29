import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../../core/api';
import { RESERVATIONS, UPDATE_RESERVATION } from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { Page, Reservation, ReservationStatus } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

const LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Out on hire',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Allowed next statuses per current status (mirrors the server transition rules). */
const NEXT: Record<ReservationStatus, { status: ReservationStatus; label: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirm' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  CONFIRMED: [
    { status: 'ACTIVE', label: 'Mark collected' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  ACTIVE: [{ status: 'COMPLETED', label: 'Mark returned' }],
  COMPLETED: [],
  CANCELLED: [],
};

@Component({
  selector: 'app-admin-reservations',
  imports: [DatePipe, MatButtonModule, MatButtonToggleModule, LoadState],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class AdminReservations {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<Reservation> | null>(null);
  protected readonly items = signal<Reservation[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as ReservationStatus[];
  protected readonly label = (s: ReservationStatus) => LABELS[s];
  protected readonly next = (s: ReservationStatus) => NEXT[s];
  protected readonly formatMoney = formatMoney;

  constructor() {
    inject(SeoService).set({ title: 'Rental reservations', description: '', path: '/admin/reservations', noIndex: true });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ rentalReservations: Page<Reservation> }>(RESERVATIONS, {
        status: this.statusFilter() || null,
        page,
        size: 20,
      })
      .subscribe({
        next: ({ rentalReservations }) => {
          this.page.set(rentalReservations);
          this.items.set(rentalReservations.items);
          this.state.set(rentalReservations.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected update(r: Reservation, status: ReservationStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(UPDATE_RESERVATION, { id: r.id, input: { status } }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === r.id ? { ...i, status } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
