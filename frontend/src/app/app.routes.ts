import { Routes } from '@angular/router';

import { authGuard, staffGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'about', loadComponent: () => import('./pages/about').then((m) => m.About) },
  { path: 'cars-for-sale', loadComponent: () => import('./pages/cars-for-sale').then((m) => m.CarsForSale) },
  { path: 'cars-for-sale/:slug', loadComponent: () => import('./pages/vehicle-detail').then((m) => m.VehicleDetail) },
  { path: 'rentals', loadComponent: () => import('./pages/rentals').then((m) => m.Rentals) },
  { path: 'rentals/:slug', loadComponent: () => import('./pages/rental-detail').then((m) => m.RentalDetail) },
  { path: 'services', loadComponent: () => import('./pages/services').then((m) => m.Services) },
  { path: 'services/:slug', loadComponent: () => import('./pages/service-detail').then((m) => m.ServiceDetail) },
  { path: 'contact', loadComponent: () => import('./pages/contact').then((m) => m.Contact) },
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./pages/register').then((m) => m.Register) },
  { path: 'my-account', canActivate: [authGuard], loadComponent: () => import('./pages/my-account').then((m) => m.MyAccount) },
  {
    path: 'admin',
    canActivate: [staffGuard],
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', loadComponent: () => import('./admin/dashboard').then((m) => m.AdminDashboard) },
      { path: 'vehicles', loadComponent: () => import('./admin/vehicles').then((m) => m.AdminVehicles) },
      { path: 'vehicles/new', loadComponent: () => import('./admin/vehicle-edit').then((m) => m.AdminVehicleEdit) },
      { path: 'vehicles/:id', loadComponent: () => import('./admin/vehicle-edit').then((m) => m.AdminVehicleEdit) },
      { path: 'sales-enquiries', loadComponent: () => import('./admin/sales-enquiries').then((m) => m.AdminSalesEnquiries) },
      { path: 'contact-enquiries', loadComponent: () => import('./admin/contact-enquiries').then((m) => m.AdminContactEnquiries) },
      { path: 'rentals', loadComponent: () => import('./admin/rentals').then((m) => m.AdminRentals) },
      { path: 'rentals/new', loadComponent: () => import('./admin/rental-edit').then((m) => m.AdminRentalEdit) },
      { path: 'rentals/:id', loadComponent: () => import('./admin/rental-edit').then((m) => m.AdminRentalEdit) },
      { path: 'reservations', loadComponent: () => import('./admin/reservations').then((m) => m.AdminReservations) },
      { path: 'bookings', loadComponent: () => import('./admin/bookings').then((m) => m.AdminBookings) },
      { path: 'quotations', loadComponent: () => import('./admin/quotations').then((m) => m.AdminQuotations) },
      { path: 'services', loadComponent: () => import('./admin/services').then((m) => m.AdminServices) },
      { path: 'users', loadComponent: () => import('./admin/users').then((m) => m.AdminUsers) },
      { path: 'audit', loadComponent: () => import('./admin/audit').then((m) => m.AdminAudit) },
    ],
  },
  { path: 'privacy-policy', data: { kind: 'privacy' }, loadComponent: () => import('./pages/legal').then((m) => m.Legal) },
  { path: 'terms', data: { kind: 'terms' }, loadComponent: () => import('./pages/legal').then((m) => m.Legal) },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
