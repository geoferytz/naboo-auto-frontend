import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { Logo } from './logo';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, Logo],
  template: `
    <header class="header">
      <div class="container bar">
        <a routerLink="/" class="brand" aria-label="Naboo Automotive home"><app-logo /></a>

        <nav class="nav" aria-label="Main">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active">{{ link.label }}</a>
          }
        </nav>

        <div class="right">
          @if (auth.isAuthenticated()) {
            <a mat-button routerLink="/my-account" class="account">
              <mat-icon fontSet="material-symbols-outlined">account_circle</mat-icon>
              <span class="label">{{ auth.user()?.fullName ?? 'My account' }}</span>
            </a>
          } @else {
            <a mat-button routerLink="/login" class="account">
              <mat-icon fontSet="material-symbols-outlined">login</mat-icon><span class="label">Sign in</span>
            </a>
          }
          <a mat-flat-button routerLink="/contact" [queryParams]="{ subject: 'Quotation request' }" class="cta">Get a quote</a>
          <button
            mat-icon-button
            class="menu-toggle"
            type="button"
            [attr.aria-expanded]="open()"
            aria-controls="mobile-nav"
            [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
            (click)="open.set(!open())"
          >
            <mat-icon fontSet="material-symbols-outlined">{{ open() ? 'close' : 'menu' }}</mat-icon>
          </button>
        </div>
      </div>

      @if (open()) {
        <nav id="mobile-nav" class="mobile" aria-label="Mobile">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active">{{ link.label }}</a>
          }
          <a routerLink="/contact" [queryParams]="{ subject: 'Quotation request' }">Get a quote</a>
        </nav>
      }
    </header>
  `,
  styles: `
    .header { position: sticky; top: 0; z-index: 100; background: var(--naboo-black); color: var(--naboo-white);
      border-bottom: 1px solid #23262c; }
    .bar { display: flex; align-items: center; gap: var(--space-4); height: var(--header-height); }
    .brand { display: inline-flex; color: inherit; text-decoration: none; }
    .nav { display: none; gap: var(--space-5); margin-left: var(--space-5); }
    .nav a, .mobile a { color: #d9dce0; text-decoration: none; font-weight: 500; font-size: 0.95rem; }
    .nav a { padding-block: 22px; border-bottom: 2px solid transparent; }
    .nav a:hover, .nav a.active { color: var(--naboo-white); border-bottom-color: var(--naboo-red); }
    .right { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }
    .account { color: var(--naboo-white) !important; }
    .account .label { display: none; max-width: 14ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cta { display: none !important; }
    .menu-toggle { color: var(--naboo-white); }
    .mobile { display: flex; flex-direction: column; padding: var(--space-2) var(--space-4) var(--space-4);
      border-top: 1px solid #23262c; }
    .mobile a { padding: var(--space-3) 0; border-bottom: 1px solid #23262c; font-size: 1.05rem; }
    .mobile a.active { color: var(--naboo-white); font-weight: 700; }
    @media (min-width: 640px) { .account .label { display: inline; } .cta { display: inline-flex !important; } }
    @media (min-width: 960px) { .nav { display: flex; } .menu-toggle, .mobile { display: none; } }
  `,
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly open = signal(false);
  protected readonly links = [
    { path: '/cars-for-sale', label: 'Cars for sale' },
    { path: '/services', label: 'Services' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.open.set(false));
  }
}
