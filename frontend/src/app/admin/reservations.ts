import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../core/api';
import { RESERVATIONS, UPDATE_RESERVATION } from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { Page, Reservation, ReservationStatus } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Rental reservations</h1>
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
        <app-load-state [state]="state()" loadingText="Loading reservations…" emptyText="No reservations in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (r of items(); track r.id) {
            <article class="card row">
              <div class="main">
                <div class="line">
                  <span class="ref">{{ r.reference }}</span>
                  <span class="badge" [attr.data-status]="r.status">{{ label(r.status) }}</span>
                </div>
                <strong>{{ r.vehicle.title }}</strong>
                <span class="meta">{{ r.startDate | date: 'mediumDate' }} → {{ r.endDate | date: 'mediumDate' }} ·
                  {{ r.days }} day{{ r.days === 1 ? '' : 's' }} · {{ formatMoney(r.total) }}</span>
                <span class="meta">{{ r.fullName }} · {{ r.phone }} · {{ r.email }}</span>
                @if (r.notes) {
                  <span class="meta notes">“{{ r.notes }}”</span>
                }
              </div>
              <div class="actions">
                @for (n of next(r.status); track n.status) {
                  @if (n.status === 'CANCELLED') {
                    <button mat-stroked-button type="button" [disabled]="busy()" (click)="update(r, n.status)">{{ n.label }}</button>
                  } @else {
                    <button mat-flat-button type="button" [disabled]="busy()" (click)="update(r, n.status)">{{ n.label }}</button>
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
    .badge[data-status='ACTIVE'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='COMPLETED'] { background: #eceef1; color: #5a616b; }
    .badge[data-status='CANCELLED'] { background: #f5e3e3; color: #8a1e1e; }
    .actions { display: flex; gap: var(--space-2); }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
  `,
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
