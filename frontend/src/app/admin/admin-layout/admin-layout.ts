import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { can } from '../../core/capabilities';
import { Role } from '../../core/models';

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
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
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
    { path: '/admin/site-settings', label: 'Site settings', icon: 'settings', visible: can.siteManage },
    { path: '/admin/users', label: 'Users', icon: 'group', visible: can.userManage },
    { path: '/admin/audit', label: 'Activity log', icon: 'history', visible: can.auditView },
  ];

  protected visibleItems(): NavItem[] {
    return this.items.filter((i) => i.visible(this.auth.user()?.roles));
  }
}
