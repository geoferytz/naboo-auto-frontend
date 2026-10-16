import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../core/api';
import { CONTACT_ENQUIRIES, UPDATE_CONTACT_ENQUIRY } from '../core/admin-queries';
import { ContactEnquiry, ContactEnquiryStatus, Page } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const LABELS: Record<ContactEnquiryStatus, string> = { NEW: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };

@Component({
  selector: 'app-admin-contact-enquiries',
  imports: [DatePipe, LowerCasePipe, MatButtonModule, MatButtonToggleModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Contact messages</h1>
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
        <app-load-state [state]="state()" loadingText="Loading messages…" emptyText="No messages in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (e of items(); track e.id) {
            <article class="card enquiry">
              <button type="button" class="summary" (click)="toggle(e.id)" [attr.aria-expanded]="open() === e.id">
                <span class="ref">{{ e.reference }}</span>
                <span class="who">
                  <strong>{{ e.subject }}</strong>
                  <span class="meta">{{ e.fullName }}</span>
                </span>
                <span class="badge" [attr.data-status]="e.status">{{ label(e.status) }}</span>
                <span class="meta">{{ e.createdAt | date: 'mediumDate' }}</span>
              </button>
              @if (open() === e.id) {
                <div class="detail">
                  <dl>
                    <div><dt>Email</dt><dd><a [href]="'mailto:' + e.email">{{ e.email }}</a></dd></div>
                    @if (e.phone) {
                      <div><dt>Phone</dt><dd><a [href]="'tel:' + e.phone">{{ e.phone }}</a></dd></div>
                    }
                    <div class="full"><dt>Message</dt><dd class="msg">{{ e.message }}</dd></div>
                  </dl>
                  <div class="actions">
                    @for (s of statusKeys; track s) {
                      <button mat-stroked-button type="button" [disabled]="busy() || e.status === s" (click)="setStatus(e, s)">
                        Mark {{ label(s) | lowercase }}
                      </button>
                    }
                  </div>
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
    mat-button-toggle-group { margin-bottom: var(--space-4); }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .enquiry { overflow: hidden; }
    .summary { display: flex; align-items: center; gap: var(--space-4); width: 100%; padding: var(--space-3) var(--space-4);
      background: none; border: 0; cursor: pointer; text-align: left; font: inherit; flex-wrap: wrap; }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .who { flex: 1; min-width: 160px; }
    .meta { display: block; font-size: .82rem; color: var(--naboo-text-muted); }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='NEW'] { background: #fde8e9; color: #a3121c; }
    .badge[data-status='IN_PROGRESS'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='RESOLVED'] { background: #e4f5e8; color: #146c2e; }
    .detail { border-top: 1px solid var(--naboo-border); padding: var(--space-4); }
    dl { display: grid; gap: var(--space-2) var(--space-5); margin: 0 0 var(--space-4); }
    dl div { display: grid; grid-template-columns: 120px 1fr; gap: var(--space-2); }
    dt { color: var(--naboo-text-muted); font-size: .85rem; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .msg { white-space: pre-wrap; }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
  `,
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
