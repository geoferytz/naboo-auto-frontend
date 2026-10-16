import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Api } from '../core/api';
import { AUDIT_LOGS } from '../core/admin-queries';
import { AuditLogEntry, Page } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

@Component({
  selector: 'app-admin-audit',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Activity log</h1>
      </div>
    </header>

    <div class="container section">
      <form [formGroup]="filters" class="filter-bar" aria-label="Filter activity">
        <mat-form-field appearance="outline">
          <mat-label>Entity type</mat-label>
          <input matInput formControlName="entityType" placeholder="e.g. Vehicle" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Entity ID</mat-label>
          <input matInput formControlName="entityId" />
        </mat-form-field>
      </form>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading activity…" emptyText="No activity recorded yet." (retry)="load()" />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">By</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td class="when">{{ a.createdAt | date: 'medium' }}</td>
                  <td><code>{{ a.action }}</code></td>
                  <td>{{ a.entityType }}<span class="meta">{{ a.entityId }}</span></td>
                  <td>{{ a.actorName }}</td>
                  <td class="details">{{ a.details }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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
    .filter-bar { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--naboo-white); }
    th, td { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--naboo-border); vertical-align: top; }
    th { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--naboo-text-muted); }
    .when { white-space: nowrap; }
    code { font-size: .82rem; }
    .meta { display: block; font-size: .75rem; color: var(--naboo-text-muted); font-family: ui-monospace, monospace; }
    .details { max-width: 320px; overflow-wrap: anywhere; font-size: .85rem; color: var(--naboo-text-muted); }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
  `,
})
export class AdminAudit {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<AuditLogEntry> | null>(null);
  protected readonly items = signal<AuditLogEntry[]>([]);

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    entityType: [''],
    entityId: [''],
  });

  constructor() {
    inject(SeoService).set({ title: 'Activity log', description: '', path: '/admin/audit', noIndex: true });
    this.filters.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => this.load(0));
    this.load(0);
  }

  protected load(page = 0): void {
    const f = this.filters.getRawValue();
    this.state.set('loading');
    this.api
      .query<{ auditLogs: Page<AuditLogEntry> }>(AUDIT_LOGS, {
        entityType: f.entityType || null,
        entityId: f.entityId || null,
        page,
        size: 50,
      })
      .subscribe({
        next: ({ auditLogs }) => {
          this.page.set(auditLogs);
          this.items.set(auditLogs.items);
          this.state.set(auditLogs.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }
}
