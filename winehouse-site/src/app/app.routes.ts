import { CanMatchFn, Routes } from '@angular/router';
import { SITE } from './core/site-config';
import { AdminAuth, adminGuard } from './admin/auth';
import { inject } from '@angular/core';

const title = (page: string) => `${page} — ${SITE.name}`;

/* MAINTENANCE MODE — public pages only match when logged in as admin;
   visitors land on the maintenance screen. Set to false to go live. */
const MAINTENANCE = true;

const maintenanceGate: CanMatchFn = () => !MAINTENANCE || inject(AdminAuth).isLoggedIn;

export const routes: Routes = [
  {
    path: '',
    canMatch: [maintenanceGate],
    title: `${SITE.name} — ${SITE.tagline}`,
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'about',
    canMatch: [maintenanceGate],
    title: title('About Us'),
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'shop',
    canMatch: [maintenanceGate],
    title: title('e-Shop'),
    loadComponent: () => import('./pages/shop/shop').then((m) => m.Shop),
  },
  {
    path: 'contact',
    canMatch: [maintenanceGate],
    title: title('Contact'),
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'admin/login',
    title: title('Admin login'),
    loadComponent: () => import('./admin/login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    title: title('Dashboard'),
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./admin/overview').then((m) => m.AdminOverview),
      },
      {
        path: 'posts',
        loadComponent: () => import('./admin/posts').then((m) => m.AdminPosts),
      },
      {
        path: 'posts/:id',
        loadComponent: () => import('./admin/posts').then((m) => m.AdminPostEdit),
      },
      {
        path: 'pages',
        loadComponent: () => import('./admin/pages').then((m) => m.AdminPages),
      },
      {
        path: 'pages/:id',
        loadComponent: () => import('./admin/pages').then((m) => m.AdminPageEdit),
      },
      {
        path: 'assets',
        loadComponent: () => import('./admin/assets').then((m) => m.AdminAssets),
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/settings').then((m) => m.AdminSettings),
      },
    ],
  },
  {
    /* visitors during maintenance: every public URL ends up here */
    path: '',
    title: title('Under maintenance'),
    loadComponent: () => import('./pages/maintenance/maintenance').then((m) => m.Maintenance),
  },
  { path: '**', redirectTo: '' },
];
