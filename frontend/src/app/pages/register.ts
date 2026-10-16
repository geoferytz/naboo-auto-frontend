import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';
import { safeRedirect } from './login';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container section auth">
      <section class="card panel" aria-labelledby="h">
        <h1 id="h">Create an account</h1>
        <p class="lead">Track your enquiries and, soon, your bookings and quotations.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
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
            <mat-label>Phone (optional)</mat-label>
            <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+255 7XX XXX XXX" />
            <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="new-password" />
            <mat-hint>At least 10 characters.</mat-hint>
            <mat-error>{{ err('password', 'Password') }}</mat-error>
          </mat-form-field>
          @if (error()) {
            <p class="alert alert--error" role="alert">{{ error() }}</p>
          }
          <button mat-flat-button class="btn-lg" type="submit" [disabled]="sending()">{{ sending() ? 'Creating account…' : 'Create account' }}</button>
          <p class="hint">By creating an account you agree to our <a routerLink="/terms">terms</a> and
            <a routerLink="/privacy-policy">privacy policy</a>.</p>
        </form>
        <p class="alt">Already registered? <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }">Sign in</a></p>
      </section>
    </div>
  `,
  styleUrl: './auth.scss',
})
export class Register {
  readonly returnUrl = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', Validators.pattern(PHONE_PATTERN)],
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
  });

  constructor() {
    inject(SeoService).set({
      title: 'Create an account',
      description: 'Create a Naboo Automotive customer account.',
      path: '/register',
      noIndex: true,
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
    this.sending.set(true);
    const v = this.form.getRawValue();
    this.auth.register({ ...v, phone: v.phone || null }).subscribe({
      next: () => void this.router.navigateByUrl(safeRedirect(this.returnUrl())),
      error: (e) => {
        this.sending.set(false);
        const apiError = toApiError(e);
        applyServerErrors(this.form, apiError.fields);
        this.error.set(apiError.message);
      },
    });
  }
}
