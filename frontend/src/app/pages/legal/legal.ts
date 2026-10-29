import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../core/seo.service';

/**
 * Privacy policy and terms. The wording below is a starting draft and MUST be reviewed by
 * Naboo Automotive's legal adviser before launch (roadmap phase 15).
 */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  templateUrl: './legal.html',
  styleUrl: './legal.css',
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
