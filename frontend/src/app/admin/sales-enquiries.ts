import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Api, toApiError } from '../core/api';
import { SALES_ENQUIRIES, STAFF_USERS, UPDATE_SALES_ENQUIRY } from '../core/admin-queries';
import { EnquiryStatus, Page, SalesEnquiry, User } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  VIEWING_SCHEDULED: 'Viewing scheduled',
  CLOSED_WON: 'Closed — won',
  CLOSED_LOST: 'Closed — lost',
};

@Component({
  selector: 'app-admin-sales-enquiries',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatSelectModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Sales enquiries</h1>
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
        <app-load-state [state]="state()" loadingText="Loading enquiries…" emptyText="No enquiries in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (e of items(); track e.id) {
            <article class="card enquiry">
              <button type="button" class="summary" (click)="toggle(e.id)" [attr.aria-expanded]="open() === e.id">
                <span class="ref">{{ e.reference }}</span>
                <span class="who">
                  <strong>{{ e.fullName }}</strong>
                  <span class="meta">{{ e.vehicle.title }} · {{ e.type === 'VIEWING' ? 'Viewing request' : 'Question' }}</span>
                </span>
                <span class="badge" [attr.data-status]="e.status">{{ label(e.status) }}</span>
                <span class="meta">{{ e.createdAt | date: 'mediumDate' }}</span>
              </button>
              @if (open() === e.id) {
                <div class="detail">
                  <dl>
                    <div><dt>Vehicle</dt><dd><a [routerLink]="['/admin/vehicles', e.vehicle.id]">{{ e.vehicle.title }}</a></dd></div>
                    <div><dt>Email</dt><dd><a [href]="'mailto:' + e.email">{{ e.email }}</a></dd></div>
                    <div><dt>Phone</dt><dd><a [href]="'tel:' + e.phone">{{ e.phone }}</a></dd></div>
                    @if (e.preferredViewingAt) {
                      <div><dt>Preferred viewing</dt><dd>{{ e.preferredViewingAt | date: 'medium' }}</dd></div>
                    }
                    @if (e.message) {
                      <div class="full"><dt>Message</dt><dd class="msg">{{ e.message }}</dd></div>
                    }
                  </dl>
                  <form [formGroup]="editForm" (ngSubmit)="save(e)" class="edit">
                    <mat-form-field appearance="outline">
                      <mat-label>Status</mat-label>
                      <mat-select formControlName="status">
                        @for (s of statusKeys; track s) {
                          <mat-option [value]="s">{{ label(s) }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Assigned to</mat-label>
                      <mat-select formControlName="assignedToUserId">
                        <mat-option value="">Unassigned</mat-option>
                        @for (u of staff(); track u.id) {
                          <mat-option [value]="u.id">{{ u.fullName }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button mat-flat-button type="submit" [disabled]="busy()">Save</button>
                  </form>
                </div>
              }
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
    .enquiry { overflow: hidden; }
    .summary { display: flex; align-items: center; gap: var(--space-4); width: 100%; padding: var(--space-3) var(--space-4);
      background: none; border: 0; cursor: pointer; text-align: left; font: inherit; flex-wrap: wrap; }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .who { flex: 1; min-width: 160px; }
    .meta { display: block; font-size: .82rem; color: var(--naboo-text-muted); }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='NEW'] { background: #fde8e9; color: #a3121c; }
    .badge[data-status='CONTACTED'], .badge[data-status='VIEWING_SCHEDULED'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='CLOSED_WON'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='CLOSED_LOST'] { background: #eceef1; color: #5a616b; }
    .detail { border-top: 1px solid var(--naboo-border); padding: var(--space-4); }
    dl { display: grid; gap: var(--space-2) var(--space-5); margin: 0 0 var(--space-4); grid-template-columns: 1fr; }
    dl div { display: grid; grid-template-columns: 120px 1fr; gap: var(--space-2); }
    dl .full { grid-column: 1 / -1; }
    dt { color: var(--naboo-text-muted); font-size: .85rem; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .msg { white-space: pre-wrap; }
    .edit { display: flex; gap: var(--space-3); align-items: start; flex-wrap: wrap; }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
    @media (min-width: 720px) { dl { grid-template-columns: 1fr 1fr; } }
  `,
})
export class AdminSalesEnquiries {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<SalesEnquiry> | null>(null);
  protected readonly items = signal<SalesEnquiry[]>([]);
  protected readonly staff = signal<User[]>([]);
  protected readonly open = signal<string | null>(null);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(STATUS_LABELS) as EnquiryStatus[];
  protected readonly label = (s: EnquiryStatus) => STATUS_LABELS[s];

  protected readonly editForm = inject(FormBuilder).nonNullable.group({
    status: ['NEW' as EnquiryStatus],
    assignedToUserId: [''],
  });

  constructor() {
    inject(SeoService).set({ title: 'Sales enquiries', description: '', path: '/admin/sales-enquiries', noIndex: true });
    this.api.query<{ staffUsers: User[] }>(STAFF_USERS, { includeDisabled: false }).subscribe({
      next: ({ staffUsers }) => this.staff.set(staffUsers),
      error: () => {},
    });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.open.set(null);
    this.load(0);
  }

  protected toggle(id: string): void {
    const next = this.open() === id ? null : id;
    this.open.set(next);
    const e = this.items().find((i) => i.id === next);
    if (e) {
      this.editForm.setValue({ status: e.status, assignedToUserId: e.assignedToUserId ?? '' });
    }
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ salesEnquiries: Page<SalesEnquiry> }>(SALES_ENQUIRIES, {
        status: this.statusFilter() || null,
        page,
        size: 20,
      })
      .subscribe({
        next: ({ salesEnquiries }) => {
          this.page.set(salesEnquiries);
          this.items.set(salesEnquiries.items);
          this.state.set(salesEnquiries.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected save(e: SalesEnquiry): void {
    this.busy.set(true);
    this.error.set(null);
    const v = this.editForm.getRawValue();
    this.api
      .mutate<{ updateSalesEnquiry: Pick<SalesEnquiry, 'id' | 'status' | 'assignedToUserId'> }>(UPDATE_SALES_ENQUIRY, {
        id: e.id,
        input: { status: v.status, assignedToUserId: v.assignedToUserId || null },
      })
      .subscribe({
        next: ({ updateSalesEnquiry }) => {
          this.busy.set(false);
          this.items.update((list) => list.map((i) => (i.id === e.id ? { ...i, ...updateSalesEnquiry } : i)));
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(toApiError(err).message);
        },
      });
  }
}
