import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { SeoService } from '../core/seo.service';
import { controlError } from '../shared/form-errors';

/** Only allow same-site relative redirects to avoid open-redirects. */
export function safeRedirect(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/my-account';
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container section auth">
      <section class="card panel" aria-labelledby="h">
        <h1 id="h">Sign in</h1>
        <p class="lead">Access your enquiries, bookings and quotations.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="email" />
            <mat-error>{{ err('email', 'Email') }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="current-password" />
            <mat-error>{{ err('password', 'Password') }}</mat-error>
          </mat-form-field>
          @if (error()) {
            <p class="alert alert--error" role="alert">{{ error() }}</p>
          }
          <button mat-flat-button class="btn-lg" type="submit" [disabled]="sending()">{{ sending() ? 'Signing in…' : 'Sign in' }}</button>
        </form>
        <p class="alt">New to Naboo Automotive? <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl() }">Create an account</a></p>
      </section>
    </div>
  `,
  styleUrl: './auth.scss',
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
