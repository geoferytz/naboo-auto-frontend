import { Component, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, interval, switchMap } from 'rxjs';

import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BUSINESS } from '../../core/business';
import { UNREAD_NOTIFICATION_COUNT } from '../../core/queries';
import { SiteContentStore } from '../../core/site-content';
import { Logo } from '../logo/logo';

interface NavLink {
  path: string;
  label: string;
  exact?: boolean;
  children?: { path: string; label: string; icon: string }[];
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, MatButtonModule, MatIconModule, MatMenuModule, Logo],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly business = BUSINESS;
  protected readonly site = inject(SiteContentStore);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected readonly currentPath = signal(this.router.url.split(/[?#]/)[0]);
  protected readonly open = signal(false);
  protected readonly unread = signal(0);
  protected readonly links: NavLink[] = [
    { path: '/', label: 'Home', exact: true },
    {
      path: '/cars-for-sale', label: 'Cars',
      children: [
        { path: '/cars-for-sale', label: 'Cars for Sale', icon: 'directions_car' },
        { path: '/rentals', label: 'Cars for Rental', icon: 'car_rental' },
        { path: '/car-exchange', label: 'Car Exchange', icon: 'swap_horiz' },
      ],
    },
    {
      path: '/services', label: 'Services',
      children: [
        { path: '/services/repairs-maintenance', label: 'Repairs & Maintenance', icon: 'build' },
        { path: '/services/painting-restoration', label: 'Painting & Restoration', icon: 'format_paint' },
        { path: '/services/detailing', label: 'Detailing', icon: 'auto_awesome' },
      ],
    },
    { path: '/accessories', label: 'Shop' },
    {
      path: '/about', label: 'About',
      children: [
        { path: '/about', label: 'About Naboo', icon: 'storefront' },
        { path: '/about/team', label: 'Our Team', icon: 'groups' },
        { path: '/about/workshop', label: 'Our Workshop', icon: 'photo_library' },
      ],
    },
    { path: '/contact', label: 'Contact' },
  ];

  constructor() {
    this.site.load();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe((event) => {
      this.currentPath.set(event.urlAfterRedirects.split(/[?#]/)[0]);
      this.open.set(false);
      this.refreshUnread();
    });
    // Poll while the app is open; only fires for signed-in users.
    interval(60_000)
      .pipe(
        filter(() => this.auth.isAuthenticated()),
        switchMap(() => this.countUnread()),
        takeUntilDestroyed(),
      )
      .subscribe((n) => this.unread.set(n));
    effect(() => {
      if (this.auth.isAuthenticated()) this.refreshUnread();
      else this.unread.set(0);
    });
  }

  protected groupActive(link: NavLink): boolean {
    return [link.path, ...(link.children ?? []).map((child) => child.path)]
      .some((path) => this.currentPath() === path || this.currentPath().startsWith(path + '/'));
  }

  private refreshUnread(): void {
    if (!this.auth.isAuthenticated()) return;
    this.countUnread().subscribe((n) => this.unread.set(n));
  }

  private countUnread() {
    return this.api
      .query<{ unreadNotificationCount: number }>(UNREAD_NOTIFICATION_COUNT)
      .pipe(switchMap((d) => [d.unreadNotificationCount]));
  }
}
