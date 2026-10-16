import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'about', loadComponent: () => import('./pages/about').then((m) => m.About) },
  { path: 'cars-for-sale', loadComponent: () => import('./pages/cars-for-sale').then((m) => m.CarsForSale) },
  { path: 'cars-for-sale/:slug', loadComponent: () => import('./pages/vehicle-detail').then((m) => m.VehicleDetail) },
  { path: 'services', loadComponent: () => import('./pages/services').then((m) => m.Services) },
  { path: 'services/:slug', loadComponent: () => import('./pages/service-detail').then((m) => m.ServiceDetail) },
  { path: 'contact', loadComponent: () => import('./pages/contact').then((m) => m.Contact) },
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./pages/register').then((m) => m.Register) },
  { path: 'my-account', canActivate: [authGuard], loadComponent: () => import('./pages/my-account').then((m) => m.MyAccount) },
  { path: 'privacy-policy', data: { kind: 'privacy' }, loadComponent: () => import('./pages/legal').then((m) => m.Legal) },
  { path: 'terms', data: { kind: 'terms' }, loadComponent: () => import('./pages/legal').then((m) => m.Legal) },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
