import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { Api, toApiError } from '../../core/api';
import { SALES_ENQUIRIES, STAFF_USERS, UPDATE_SALES_ENQUIRY } from '../../core/admin-queries';
import { EnquiryStatus, Page, SalesEnquiry, User } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

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
  templateUrl: './sales-enquiries.html',
  styleUrl: './sales-enquiries.css',
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
