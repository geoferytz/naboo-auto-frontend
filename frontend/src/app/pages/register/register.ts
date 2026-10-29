import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { SeoService } from '../../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';
import { safeRedirect } from '../login/login';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
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
