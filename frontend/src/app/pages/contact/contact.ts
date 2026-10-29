import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BUSINESS } from '../../core/business';
import { EnquiryReceipt } from '../../core/models';
import { SUBMIT_CONTACT_ENQUIRY } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { SiteContentStore } from '../../core/site-content';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  /** Pre-fills the subject, e.g. /contact?subject=Quotation%20request */
  readonly subject = input<string>();

  private readonly api = inject(Api);
  private readonly site = inject(SiteContentStore);
  protected readonly business = BUSINESS;
  protected readonly page = computed(() => this.site.content().contactPage);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', Validators.pattern(PHONE_PATTERN)],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    message: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  constructor() {
    const auth = inject(AuthService);
    this.site.load();
    inject(SeoService).set({
      title: 'Contact us',
      description: 'Contact Naboo Automotive about vehicles for sale, workshop services, painting, restoration or a quotation.',
      path: '/contact',
    });
    effect(() => {
      const s = this.subject();
      if (s && !this.form.controls.subject.dirty) {
        this.form.controls.subject.setValue(s.slice(0, 150));
      }
    });
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

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .mutate<{ submitContactEnquiry: EnquiryReceipt }>(SUBMIT_CONTACT_ENQUIRY, {
        input: { ...v, phone: v.phone || null },
      })
      .subscribe({
        next: ({ submitContactEnquiry }) => {
          this.sending.set(false);
          this.receipt.set(submitContactEnquiry);
          this.form.reset({ fullName: v.fullName, email: v.email, phone: v.phone });
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
