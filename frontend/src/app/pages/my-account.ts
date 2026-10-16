import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

@Component({
  selector: 'app-my-account',
  imports: [RouterLink, MatButtonModule, LoadState],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">My account</span>
        <h1>{{ auth.user() ? 'Welcome, ' + auth.user()!.fullName : 'My account' }}</h1>
      </div>
    </header>
    <div class="container section">
      @if (auth.user(); as u) {
        <div class="grid">
          <section class="card panel" aria-labelledby="profile">
            <h2 id="profile">Profile</h2>
            <dl>
              <dt>Name</dt><dd>{{ u.fullName }}</dd>
              <dt>Email</dt><dd>{{ u.email }}</dd>
              <dt>Phone</dt><dd>{{ u.phone ?? 'Not provided' }}</dd>
            </dl>
            <button mat-stroked-button type="button" (click)="auth.logout()">Sign out</button>
          </section>
          <section class="card panel" aria-labelledby="next">
            <h2 id="next">Bookings, quotations &amp; invoices</h2>
            <p>
              Your service bookings, rental reservations, quotations awaiting approval and invoices will appear here as these
              features launch. Enquiry references are sent to you when you submit an enquiry.
            </p>
            <div class="actions">
              <a mat-flat-button routerLink="/cars-for-sale">Browse vehicles</a>
              <a mat-stroked-button routerLink="/contact">Contact us</a>
            </div>
          </section>
        </div>
      } @else {
        <app-load-state state="loading" loadingText="Loading your account…" />
      }
    </div>
  `,
  styles: `
    .panel { padding: var(--space-5); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin: 0 0 var(--space-5); }
    dt { color: var(--naboo-text-muted); }
    dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  `,
})
export class MyAccount {
  protected readonly auth = inject(AuthService);

  constructor() {
    inject(SeoService).set({ title: 'My account', description: 'Your Naboo Automotive account.', path: '/my-account', noIndex: true });
  }
}
