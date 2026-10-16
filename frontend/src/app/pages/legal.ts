import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '../core/seo.service';

/**
 * Privacy policy and terms. The wording below is a starting draft and MUST be reviewed by
 * Naboo Automotive's legal adviser before launch (roadmap phase 15).
 */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="container">
        <h1>{{ kind() === 'privacy' ? 'Privacy policy' : 'Terms and conditions' }}</h1>
        <p class="lead">Draft — subject to legal review before launch.</p>
      </div>
    </header>
    <article class="container section prose">
      @if (kind() === 'privacy') {
        <h2>What we collect</h2>
        <p>When you submit an enquiry, request a viewing, contact us or create an account, we collect the details you provide:
          your name, email address, phone number, and the content of your message.</p>
        <h2>How we use it</h2>
        <p>We use your information only to respond to your enquiry, provide the services you request, and manage your account.
          We do not sell your personal information.</p>
        <h2>Security and retention</h2>
        <p>Your information is stored securely and access is restricted to authorised staff. We keep records only as long as
          needed for the purposes above and to meet applicable Tanzanian legal requirements.</p>
        <h2>Your rights</h2>
        <p>You may ask us to access, correct or delete your personal information by <a routerLink="/contact">contacting us</a>.</p>
      } @else {
        <h2>Listings and prices</h2>
        <p>Vehicle and service prices are shown in Tanzanian Shillings (TZS). Listings are subject to availability; a vehicle is
          not reserved for you until confirmed in writing by Naboo Automotive.</p>
        <h2>Estimates and quotations</h2>
        <p>"Starting from" and hourly prices are estimates. Work requiring inspection or a quotation is carried out only after
          you approve the quotation. Additional work is not performed without your approval.</p>
        <h2>Enquiries</h2>
        <p>Submitting an enquiry or viewing request does not create a binding agreement. We will contact you to confirm details.</p>
        <h2>Contact</h2>
        <p>Questions about these terms? <a routerLink="/contact">Contact us</a>.</p>
      }
    </article>
  `,
  styles: `
    .prose { max-width: 760px; }
    .prose h2 { font-size: 1.25rem; margin-top: var(--space-6); }
  `,
})
export class Legal {
  readonly kind = input<'privacy' | 'terms'>('privacy');
  private readonly seo = inject(SeoService);

  constructor() {
    effect(() => {
      const privacy = this.kind() === 'privacy';
      this.seo.set({
        title: privacy ? 'Privacy policy' : 'Terms and conditions',
        description: privacy ? 'How Naboo Automotive handles your personal information.' : 'Terms for using the Naboo Automotive website.',
        path: privacy ? '/privacy-policy' : '/terms',
      });
    });
  }
}
