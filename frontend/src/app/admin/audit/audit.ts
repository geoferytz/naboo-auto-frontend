import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Api } from '../../core/api';
import { AUDIT_LOGS } from '../../core/admin-queries';
import { AuditLogEntry, Page } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

@Component({
  selector: 'app-admin-audit',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, LoadState],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
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
