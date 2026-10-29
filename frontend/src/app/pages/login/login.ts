import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { SeoService } from '../../core/seo.service';
import { controlError } from '../../shared/form-errors';

/** Only allow same-site relative redirects to avoid open-redirects. */
export function safeRedirect(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/my-account';
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly returnUrl = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    inject(SeoService).set({ title: 'Sign in', description: 'Sign in to your Naboo Automotive account.', path: '/login', noIndex: true });
  }

  protected err(name: 'email' | 'password', label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl(safeRedirect(this.returnUrl())),
      error: (e) => {
        this.sending.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
