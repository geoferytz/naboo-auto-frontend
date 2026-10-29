import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { EnquiryReceipt, WorkType } from '../../core/models';
import { REQUEST_QUOTATION } from '../../core/queries';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../form-errors';

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'PAINTING', label: 'Painting / respray' },
  { value: 'COLOUR_CHANGE', label: 'Colour change' },
  { value: 'DETAILING', label: 'Detailing' },
  { value: 'RESTORATION', label: 'Restoration' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ACCESSORIES', label: 'Accessories & fitting' },
  { value: 'OTHER', label: 'Other work' },
];

/** Request for a priced-on-application quotation. Staff attach a price; the customer approves or declines. */
@Component({
  selector: 'app-quotation-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './quotation-form.html',
  styleUrl: './quotation-form.css',
})
export class QuotationForm {
  /** Optional link to a catalogue service. */
  readonly serviceId = input<string | null>(null);

  private readonly api = inject(Api);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  protected readonly workTypes = WORK_TYPES;
  private readonly requestToken = crypto.randomUUID();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    workType: ['PAINTING' as WorkType, Validators.required],
    vehicleDescription: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
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
    this.form.reset({ workType: 'PAINTING' });
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .mutate<{ requestQuotation: EnquiryReceipt }>(REQUEST_QUOTATION, {
        input: { ...v, serviceId: this.serviceId(), requestToken: this.requestToken },
      })
      .subscribe({
        next: ({ requestQuotation }) => {
          this.sending.set(false);
          this.receipt.set(requestQuotation);
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
