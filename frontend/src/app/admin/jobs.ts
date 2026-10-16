import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../core/api';
import { CREATE_JOB, SET_JOB_STATUS, UPDATE_JOB, WORKSHOP_JOBS } from '../core/admin-queries';
import { JobStatus, Page, WorkshopJob } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const LABELS: Record<JobStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const NEXT: Record<JobStatus, { status: JobStatus; label: string }[]> = {
  SCHEDULED: [
    { status: 'IN_PROGRESS', label: 'Start' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  IN_PROGRESS: [
    { status: 'ON_HOLD', label: 'Pause' },
    { status: 'COMPLETED', label: 'Complete' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  ON_HOLD: [
    { status: 'IN_PROGRESS', label: 'Resume' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

@Component({
  selector: 'app-admin-jobs',
  imports: [FormsModule, ReactiveFormsModule, DatePipe, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Workshop jobs</h1>
        </div>
        <button mat-flat-button type="button" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? 'Close form' : 'New job card' }}
        </button>
      </div>
    </header>

    <div class="container section">
      @if (showCreate()) {
        <form [formGroup]="createForm" (ngSubmit)="create()" class="card create" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Vehicle</mat-label>
            <input matInput formControlName="vehicleDescription" maxlength="200" placeholder="e.g. 2019 Toyota Hilux, T 456 DEF" />
            <mat-error>Describe the vehicle.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Work to be done</mat-label>
            <textarea matInput formControlName="description" rows="3" maxlength="4000"
                      placeholder="e.g. Replace front brake pads and skim discs"></textarea>
            <mat-error>Describe the work.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Scheduled for (optional)</mat-label>
            <input matInput formControlName="scheduledFor" type="datetime-local" />
          </mat-form-field>
          @if (createError()) {
            <p class="alert alert--error" role="alert">{{ createError() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="busy()">Create job card</button>
        </form>
      }

      <mat-button-toggle-group [value]="statusFilter()" (change)="setFilter($event.value)" aria-label="Filter by status">
        <mat-button-toggle value="">All</mat-button-toggle>
        @for (s of statusKeys; track s) {
          <mat-button-toggle [value]="s">{{ label(s) }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading jobs…" emptyText="No jobs in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (j of items(); track j.id) {
            <article class="card row">
              <div class="main">
                <div class="line">
                  <span class="ref">{{ j.reference }}</span>
                  <span class="badge" [attr.data-status]="j.status">{{ label(j.status) }}</span>
                </div>
                <strong>{{ j.vehicleDescription }}</strong>
                <span class="meta">{{ j.description }}</span>
                @if (j.booking) {
                  <span class="meta">From booking {{ j.booking.reference }} ({{ j.booking.serviceName }})</span>
                }
                @if (j.scheduledFor) {
                  <span class="meta">Scheduled: {{ j.scheduledFor | date: 'medium' }}</span>
                }
                @if (j.status === 'IN_PROGRESS' || j.status === 'ON_HOLD') {
                  <form class="notes-form" (ngSubmit)="saveNotes(j)">
                    <mat-form-field appearance="outline">
                      <mat-label>Labour notes</mat-label>
                      <input matInput [ngModel]="j.laborNotes ?? ''" (ngModelChange)="notesDraft[j.id] = $event"
                             maxlength="500" />
                    </mat-form-field>
                    <button mat-stroked-button type="submit" [disabled]="busy()">Save note</button>
                  </form>
                }
                @if (j.laborNotes && j.status !== 'IN_PROGRESS' && j.status !== 'ON_HOLD') {
                  <span class="meta notes">“{{ j.laborNotes }}”</span>
                }
              </div>
              <div class="actions">
                @for (n of next(j.status); track n.status) {
                  @if (n.status === 'CANCELLED') {
                    <button mat-stroked-button type="button" [disabled]="busy()" (click)="update(j, n.status)">{{ n.label }}</button>
                  } @else {
                    <button mat-flat-button type="button" [disabled]="busy()" (click)="update(j, n.status)">{{ n.label }}</button>
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
    .create { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
    mat-button-toggle-group { margin-bottom: var(--space-4); flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); padding: var(--space-4); flex-wrap: wrap; }
    .line { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .notes { font-style: italic; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='SCHEDULED'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='IN_PROGRESS'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='ON_HOLD'] { background: #f5e3e3; color: #8a5a00; }
    .badge[data-status='COMPLETED'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='CANCELLED'] { background: #eceef1; color: #5a616b; }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .notes-form { display: flex; gap: var(--space-2); align-items: start; margin-top: var(--space-2); }
    .notes-form mat-form-field { width: 280px; }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
  `,
})
export class AdminJobs {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<WorkshopJob> | null>(null);
  protected readonly items = signal<WorkshopJob[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly notesDraft: Record<string, string> = {};
  protected readonly statusKeys = Object.keys(LABELS) as JobStatus[];
  protected readonly label = (s: JobStatus) => LABELS[s];
  protected readonly next = (s: JobStatus) => NEXT[s];

  protected readonly createForm = inject(FormBuilder).nonNullable.group({
    vehicleDescription: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    scheduledFor: [''],
  });

  constructor() {
    inject(SeoService).set({ title: 'Workshop jobs', description: '', path: '/admin/jobs', noIndex: true });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ workshopJobs: Page<WorkshopJob> }>(WORKSHOP_JOBS, {
        status: this.statusFilter() || null,
        page,
        size: 20,
      })
      .subscribe({
        next: ({ workshopJobs }) => {
          this.page.set(workshopJobs);
          this.items.set(workshopJobs.items);
          this.state.set(workshopJobs.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.createError.set(null);
    this.busy.set(true);
    const v = this.createForm.getRawValue();
    this.api
      .mutate(CREATE_JOB, {
        input: {
          vehicleDescription: v.vehicleDescription,
          description: v.description,
          scheduledFor: v.scheduledFor ? new Date(v.scheduledFor).toISOString() : null,
          bookingId: null,
          assignedToUserId: null,
        },
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.createForm.reset();
          this.showCreate.set(false);
          this.load(0);
        },
        error: (e) => {
          this.busy.set(false);
          this.createError.set(toApiError(e).message);
        },
      });
  }

  protected saveNotes(j: WorkshopJob): void {
    const notes = this.notesDraft[j.id];
    if (notes == null) return;
    this.busy.set(true);
    this.api.mutate(UPDATE_JOB, { id: j.id, input: { laborNotes: notes } }).subscribe({
      next: () => {
        this.busy.set(false);
        delete this.notesDraft[j.id];
        this.items.update((list) => list.map((i) => (i.id === j.id ? { ...i, laborNotes: notes || null } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected update(j: WorkshopJob, status: JobStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(SET_JOB_STATUS, { id: j.id, status }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === j.id ? { ...i, status } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
