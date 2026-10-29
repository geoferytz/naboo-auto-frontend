import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../../core/api';
import { CREATE_JOB, SET_JOB_STATUS, UPDATE_JOB, WORKSHOP_JOBS } from '../../core/admin-queries';
import { JobStatus, Page, WorkshopJob } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

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
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
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
