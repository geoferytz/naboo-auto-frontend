import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { can } from '../core/capabilities';
import { Role } from '../core/models';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  visible: (roles: readonly Role[] | undefined) => boolean;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="admin">
      <aside class="side" aria-label="Staff navigation">
        <p class="side-title">Staff area</p>
        <nav>
          @for (item of visibleItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!item.exact }">
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>
      <div class="content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .admin { display: flex; flex-direction: column; min-height: calc(100vh - var(--header-height)); }
    .side { background: var(--naboo-black); color: var(--naboo-white); }
    .side-title { margin: 0; padding: var(--space-3) var(--space-4); font-size: .8rem; letter-spacing: .08em;
      text-transform: uppercase; color: #9aa0a8; }
    .side nav { display: flex; gap: var(--space-1); padding: 0 var(--space-3) var(--space-3); overflow-x: auto; }
    .side a { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
      color: #d9dce0; text-decoration: none; border-radius: var(--radius-sm); white-space: nowrap; font-size: .95rem; }
    .side a:hover { background: #1d2025; color: var(--naboo-white); }
    .side a.active { background: var(--naboo-red); color: var(--naboo-white); }
    .side mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .content { flex: 1; min-width: 0; }
    @media (min-width: 960px) {
      .admin { flex-direction: row; }
      .side { width: 220px; flex-shrink: 0; }
      .side nav { flex-direction: column; overflow: visible; }
      .side a { width: 100%; }
    }
  `,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);

  private readonly items: NavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true, visible: () => true },
    { path: '/admin/vehicles', label: 'Vehicles', icon: 'directions_car', visible: can.vehicleManage },
    { path: '/admin/sales-enquiries', label: 'Sales enquiries', icon: 'inbox', visible: can.vehicleManage },
    { path: '/admin/contact-enquiries', label: 'Messages', icon: 'mail', visible: can.contactEnquiries },
    { path: '/admin/rentals', label: 'Rental fleet', icon: 'car_rental', visible: can.rentalManage },
    { path: '/admin/reservations', label: 'Reservations', icon: 'event_available', visible: can.rentalManage },
    { path: '/admin/bookings', label: 'Bookings', icon: 'calendar_month', visible: can.bookingManage },
    { path: '/admin/quotations', label: 'Quotations', icon: 'request_quote', visible: can.quotationManage },
    { path: '/admin/jobs', label: 'Jobs', icon: 'home_repair_service', visible: can.workshopManage },
    { path: '/admin/accessories', label: 'Accessories', icon: 'inventory_2', visible: can.inventoryManage },
    { path: '/admin/orders', label: 'Orders', icon: 'shopping_cart', visible: can.orderManage },
    { path: '/admin/invoices', label: 'Invoices', icon: 'receipt_long', visible: can.billingManage },
    { path: '/admin/services', label: 'Services', icon: 'build', visible: () => true },
    { path: '/admin/users', label: 'Users', icon: 'group', visible: can.userManage },
    { path: '/admin/audit', label: 'Activity log', icon: 'history', visible: can.auditView },
  ];

  protected visibleItems(): NavItem[] {
    return this.items.filter((i) => i.visible(this.auth.user()?.roles));
  }
}
