import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { EnquiryReceipt } from '../../core/models';
import { BOOK_SERVICE } from '../../core/queries';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../form-errors';

/** Workshop appointment request for one service. Times are validated and capacity-checked on the server. */
@Component({
  selector: 'app-booking-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './booking-form.html',
  styleUrl: './booking-form.css',
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
