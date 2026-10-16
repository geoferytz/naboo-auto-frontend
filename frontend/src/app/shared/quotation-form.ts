import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { EnquiryReceipt, WorkType } from '../core/models';
import { REQUEST_QUOTATION } from '../core/queries';
import { PHONE_PATTERN, applyServerErrors, controlError } from './form-errors';

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
  template: `
    @if (receipt(); as r) {
      <div class="alert alert--success" role="status">
        <p><strong>{{ r.message }}</strong></p>
        <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
      </div>
      <button mat-stroked-button type="button" (click)="reset()">Request another quotation</button>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid one" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Type of work</mat-label>
          <mat-select formControlName="workType">
            @for (w of workTypes; track w.value) {
              <mat-option [value]="w.value">{{ w.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Your vehicle</mat-label>
          <input matInput formControlName="vehicleDescription" maxlength="200"
                 placeholder="e.g. 2015 Subaru Forester, silver" />
          <mat-error>{{ err('vehicleDescription', 'Vehicle description') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Describe the work you need</mat-label>
          <textarea matInput formControlName="description" rows="4" maxlength="4000"
                    placeholder="e.g. Full respray in red; small dent on the bonnet to be repaired first."></textarea>
          <mat-error>{{ err('description', 'Description') }}</mat-error>
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
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Request quotation' }}</button>
      </form>
    }
  `,
  styles: `
    .one { display: flex; flex-direction: column; gap: var(--space-3); }
    .ref { font-family: ui-monospace, monospace; }
  `,
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
