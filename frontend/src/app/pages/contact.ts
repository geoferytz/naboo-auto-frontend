import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { BUSINESS } from '../core/business';
import { EnquiryReceipt } from '../core/models';
import { SUBMIT_CONTACT_ENQUIRY } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">Contact</span>
        <h1>Talk to Naboo Automotive</h1>
        <p class="lead">Questions about a vehicle, a quotation for workshop work, or anything else — send us a message.</p>
      </div>
    </header>

    <div class="container section layout">
      <section class="card form-card" aria-labelledby="form-h">
        <h2 id="form-h">Send a message</h2>
        @if (receipt(); as r) {
          <div class="alert alert--success" role="status">
            <p><strong>{{ r.message }}</strong></p>
            <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
          </div>
          <button mat-stroked-button type="button" (click)="receipt.set(null)">Send another message</button>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="fullName" autocomplete="name" maxlength="120" />
              <mat-error>{{ err('fullName', 'Full name') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone (optional)</mat-label>
              <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+255 7XX XXX XXX" />
              <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email" />
              <mat-error>{{ err('email', 'Email') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Subject</mat-label>
              <input matInput formControlName="subject" maxlength="150" />
              <mat-error>{{ err('subject', 'Subject') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Message</mat-label>
              <textarea matInput formControlName="message" rows="6" maxlength="4000"
                        placeholder="Include your vehicle make, model and year if relevant."></textarea>
              <mat-error>{{ err('message', 'Message') }}</mat-error>
            </mat-form-field>
            @if (error()) {
              <p class="alert alert--error full" role="alert">{{ error() }}</p>
            }
            <div class="full actions">
              <button mat-flat-button class="btn-lg" type="submit" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Send message' }}</button>
              <span class="hint">See our <a routerLink="/privacy-policy">privacy policy</a>.</span>
            </div>
          </form>
        }
      </section>

      <aside class="details" aria-labelledby="details-h">
        <h2 id="details-h">Visit or call</h2>
        @if (business.phone) {
          <p><strong>Phone</strong><br /><a [href]="'tel:' + business.phone">{{ business.phone }}</a></p>
        }
        @if (business.whatsapp) {
          <p><strong>WhatsApp</strong><br /><a [href]="'https://wa.me/' + business.whatsapp" rel="noopener" target="_blank">Chat on WhatsApp</a></p>
        }
        @if (business.email) {
          <p><strong>Email</strong><br /><a [href]="'mailto:' + business.email">{{ business.email }}</a></p>
        }
        @if (business.address) {
          <p><strong>Address</strong><br />{{ business.address }}</p>
        }
        @if (business.openingHours) {
          <p><strong>Opening hours</strong></p>
          <ul>
            @for (h of business.openingHours; track h) {
              <li>{{ h }}</li>
            }
          </ul>
        }
        @if (!business.phone && !business.email && !business.address) {
          <p class="hint">Use the form and our team will get back to you by email or phone.</p>
        }
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; gap: var(--space-6); }
    .form-card { padding: var(--space-5); }
    .hint { color: var(--naboo-text-muted); font-size: .9rem; }
    .ref { font-family: ui-monospace, monospace; font-size: 1.1rem; }
    .details ul { padding-left: var(--space-5); }
    @media (min-width: 960px) { .layout { grid-template-columns: 1fr 320px; align-items: start; } }
  `,
})
export class Contact {
  /** Pre-fills the subject, e.g. /contact?subject=Quotation%20request */
  readonly subject = input<string>();

  private readonly api = inject(Api);
  protected readonly business = BUSINESS;
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
