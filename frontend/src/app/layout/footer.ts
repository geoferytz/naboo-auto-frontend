import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BUSINESS } from '../core/business';
import { Logo } from './logo';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, Logo],
  template: `
    <footer class="footer">
      <div class="container cols">
        <div class="about">
          <app-logo />
          <p>Vehicle sales, workshop repairs, painting, detailing and restoration in Tanzania.</p>
        </div>
        <nav aria-label="Footer">
          <h2>Explore</h2>
          <a routerLink="/cars-for-sale">Cars for sale</a>
          <a routerLink="/rentals">Rentals</a>
          <a routerLink="/services">Services</a>
          <a routerLink="/accessories">Shop</a>
          <a routerLink="/about">About</a>
          <a routerLink="/contact">Contact</a>
        </nav>
        <div>
          <h2>Contact</h2>
          @if (business.phone) {
            <a [href]="'tel:' + business.phone">{{ business.phone }}</a>
          }
          @if (business.email) {
            <a [href]="'mailto:' + business.email">{{ business.email }}</a>
          }
          @if (business.address) {
            <span>{{ business.address }}</span>
          }
          <a routerLink="/contact">Send us a message</a>
        </div>
        @if (hasSocials) {
          <nav aria-label="Social media">
            <h2>Follow Us</h2>
            @for (s of socials; track s.label) {
              <a [href]="s.url" target="_blank" rel="noopener">{{ s.label }}</a>
            }
          </nav>
        }
        <nav aria-label="Legal">
          <h2>Legal</h2>
          <a routerLink="/privacy-policy">Privacy policy</a>
          <a routerLink="/terms">Terms and conditions</a>
        </nav>
      </div>
      <div class="container legal">
        <span>© {{ year }} Naboo Automotive. All prices in Tanzanian Shillings (TZS).</span>
      </div>
    </footer>
  `,
  styles: `
    .footer { background: var(--naboo-black); color: #c4c8ce; padding-top: var(--space-7); margin-top: auto; }
    .cols { display: grid; gap: var(--space-6); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .about { color: var(--naboo-white); }
    .about p { color: #aab0b8; margin-top: var(--space-4); max-width: 34ch; }
    h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--naboo-white); }
    nav, div { display: flex; flex-direction: column; gap: var(--space-2); }
    a { color: #c4c8ce; text-decoration: none; width: fit-content; }
    a:hover { color: var(--naboo-white); text-decoration: underline; }
    .legal { border-top: 1px solid #23262c; margin-top: var(--space-6); padding-block: var(--space-4); font-size: 0.85rem; }
  `,
})
export class Footer {
  protected readonly business = BUSINESS;
  protected readonly year = new Date().getFullYear();
  protected readonly socials = [
    { label: 'Facebook', url: BUSINESS.socials?.facebook },
    { label: 'Instagram', url: BUSINESS.socials?.instagram },
    { label: 'X', url: BUSINESS.socials?.x },
    { label: 'LinkedIn', url: BUSINESS.socials?.linkedin },
  ].filter((s): s is { label: string; url: string } => !!s.url);
  protected readonly hasSocials = this.socials.length > 0;
}
