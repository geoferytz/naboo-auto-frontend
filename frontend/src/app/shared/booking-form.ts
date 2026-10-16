import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { EnquiryReceipt } from '../core/models';
import { BOOK_SERVICE } from '../core/queries';
import { PHONE_PATTERN, applyServerErrors, controlError } from './form-errors';

/** Workshop appointment request for one service. Times are validated and capacity-checked on the server. */
@Component({
  selector: 'app-booking-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (receipt(); as r) {
      <div class="alert alert--success" role="status">
        <p><strong>{{ r.message }}</strong></p>
        <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
      </div>
      <button mat-stroked-button type="button" (click)="reset()">Book another appointment</button>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid one" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Preferred date and time</mat-label>
          <input matInput formControlName="scheduledStart" type="datetime-local" [min]="minStart" />
          <mat-error>{{ err('scheduledStart', 'Date and time') }}</mat-error>
          <mat-hint>Workshop hours are 08:00–17:00.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Your vehicle</mat-label>
          <input matInput formControlName="vehicleDescription" maxlength="200"
                 placeholder="e.g. 2018 Toyota Corolla, T 123 ABC" />
          <mat-error>{{ err('vehicleDescription', 'Vehicle description') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="fullName" autocomplete="name" maxlength="120" />
          <mat-error>{{ err('fullName', 'Full name') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email" />
          <mat-error>{{ err('email', 'Email') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+255 7XX XXX XXX" />
          <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notes (optional)</mat-label>
          <textarea matInput formControlName="notes" rows="2" maxlength="2000"></textarea>
        </mat-form-field>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="sending()">{{ sending() ? 'Booking…' : 'Book appointment' }}</button>
      </form>
    }
  `,
  styles: `
    .one { display: flex; flex-direction: column; gap: var(--space-3); }
    .ref { font-family: ui-monospace, monospace; }
  `,
})
export class BookingForm {
  readonly serviceId = input.required<string>();

  private readonly api = inject(Api);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  private readonly requestToken = crypto.randomUUID();

  /** Earliest bookable time: now + 2h, rounded to the minute (server re-validates). */
  protected readonly minStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    scheduledStart: ['', Validators.required],
    vehicleDescription: ['', [Validators.required, Validators.maxLength(200)]],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    notes: ['', Validators.maxLength(2000)],
  });

  constructor() {
    const auth = inject(AuthService);
    effect(() => {
      const u = auth.user();
      if (u && !this.form.controls.email.dirty) {
        this.form.patchValue({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
      }
    });
  }

  protected err(name: keyof typeof this.form.controls, label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected reset(): void {
    this.receipt.set(null);
    this.form.reset();
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    // datetime-local has no offset: interpret it in the local timezone.
    const scheduledStart = new Date(v.scheduledStart).toISOString();
    this.sending.set(true);
    this.api
      .mutate<{ bookService: EnquiryReceipt }>(BOOK_SERVICE, {
        input: {
          serviceId: this.serviceId(),
          fullName: v.fullName,
          email: v.email,
          phone: v.phone,
          vehicleDescription: v.vehicleDescription,
          scheduledStart,
          notes: v.notes || null,
          requestToken: this.requestToken,
        },
      })
      .subscribe({
        next: ({ bookService }) => {
          this.sending.set(false);
          this.receipt.set(bookService);
        },
        error: (e) => {
          this.sending.set(false);
          const apiError = toApiError(e);
          applyServerErrors(this.form, apiError.fields);
          this.error.set(apiError.message);
        },
      });
  }
}
