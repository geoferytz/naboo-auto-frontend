import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../../core/api';
import { CONTACT_ENQUIRIES, UPDATE_CONTACT_ENQUIRY } from '../../core/admin-queries';
import { ContactEnquiry, ContactEnquiryStatus, Page } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

const LABELS: Record<ContactEnquiryStatus, string> = { NEW: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };

@Component({
  selector: 'app-admin-contact-enquiries',
  imports: [DatePipe, LowerCasePipe, MatButtonModule, MatButtonToggleModule, LoadState],
  templateUrl: './contact-enquiries.html',
  styleUrl: './contact-enquiries.css',
})
export class AdminContactEnquiries {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<ContactEnquiry> | null>(null);
  protected readonly items = signal<ContactEnquiry[]>([]);
  protected readonly open = signal<string | null>(null);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as ContactEnquiryStatus[];
  protected readonly label = (s: ContactEnquiryStatus) => LABELS[s];

  constructor() {
    inject(SeoService).set({ title: 'Contact messages', description: '', path: '/admin/contact-enquiries', noIndex: true });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.open.set(null);
    this.load(0);
  }

  protected toggle(id: string): void {
    this.open.set(this.open() === id ? null : id);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ contactEnquiries: Page<ContactEnquiry> }>(CONTACT_ENQUIRIES, {
        status: this.statusFilter() || null,
        page,
        size: 20,
      })
      .subscribe({
        next: ({ contactEnquiries }) => {
          this.page.set(contactEnquiries);
          this.items.set(contactEnquiries.items);
          this.state.set(contactEnquiries.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected setStatus(e: ContactEnquiry, status: ContactEnquiryStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(UPDATE_CONTACT_ENQUIRY, { id: e.id, status }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === e.id ? { ...i, status } : i)));
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
