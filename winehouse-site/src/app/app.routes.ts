import { CanMatchFn, Routes } from '@angular/router';
import { SITE } from './core/site-config';
import { AdminAuth, adminGuard } from './admin/auth';
import { SiteSettingsService } from './core/site-settings.service';
import { inject } from '@angular/core';

const title = (page: string) => `${page} — ${SITE.name}`;

/* Dynamic MAINTENANCE MODE — governed by database settings and admin login */
const maintenanceGate: CanMatchFn = () => {
  const settings = inject(SiteSettingsService);
  const auth = inject(AdminAuth);
  return !settings.isMaintenanceMode() || auth.isLoggedIn;
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `${SITE.name} — ${SITE.tagline}`,
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'about',
    title: title('About Us'),
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'shop',
    title: title('e-Shop'),
    loadComponent: () => import('./pages/shop/shop').then((m) => m.Shop),
  },
  {
    path: 'shop/:slug',
    title: title('Bottle Reference'),
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'product/:slug',
    title: title('Bottle Reference'),
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'posts/:slug',
    title: title('Journal Dispatch'),
    loadComponent: () =>
      import('./pages/post-detail/post-detail').then((m) => m.PostDetail),
  },
  {
    path: 'post/:slug',
    title: title('Journal Dispatch'),
    loadComponent: () =>
      import('./pages/post-detail/post-detail').then((m) => m.PostDetail),
  },
  {
    path: 'journal/:slug',
    title: title('Journal Dispatch'),
    loadComponent: () =>
      import('./pages/post-detail/post-detail').then((m) => m.PostDetail),
  },
  {
    path: 'contact',
    title: title('Contact'),
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'terms',
    title: title('Terms & Conditions'),
    loadComponent: () => import('./pages/legal/legal').then((m) => m.LegalPage),
  },
  {
    path: 'privacy',
    title: title('Privacy & Cookie Policy'),
    loadComponent: () => import('./pages/legal/legal').then((m) => m.LegalPage),
  },
  {
    path: 'legal',
    title: title('Legal & Policies'),
    loadComponent: () => import('./pages/legal/legal').then((m) => m.LegalPage),
  },
  {
    path: 'maintenance',
    title: title('Under maintenance'),
    loadComponent: () => import('./pages/maintenance/maintenance').then((m) => m.Maintenance),
  },
  {
    path: 'newsletter/unsubscribe',
    title: title('Newsletter Preferences'),
    loadComponent: () => import('./pages/newsletter/unsubscribe').then((m) => m.NewsletterUnsubscribe),
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
        path: 'products',
        title: title('Products Catalog'),
        loadComponent: () => import('./admin/products').then((m) => m.AdminProducts),
      },
      {
        path: 'orders',
        title: title('Orders Ledger'),
        loadComponent: () => import('./admin/orders').then((m) => m.AdminOrders),
      },
      {
        path: 'messages',
        title: title('Inquiries & Messages'),
        loadComponent: () => import('./admin/messages').then((m) => m.AdminMessages),
      },
      {
        path: 'store-config',
        title: title('Store Configuration'),
        loadComponent: () => import('./admin/store-config').then((m) => m.AdminStoreConfig),
      },
      {
        path: 'page-editor',
        title: title('Page Content Editor'),
        loadComponent: () => import('./admin/homepage-editor').then((m) => m.AdminPageEditor),
      },
      {
        path: 'homepage',
        title: title('Page Content Editor'),
        loadComponent: () => import('./admin/homepage-editor').then((m) => m.AdminHomepageEditor),
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
        path: 'newsletter',
        title: title('Newsletter & Audience Studio'),
        loadComponent: () => import('./admin/newsletter').then((m) => m.AdminNewsletter),
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
        path: 'users',
        loadComponent: () => import('./admin/users').then((m) => m.AdminUsers),
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./admin/users').then((m) => m.AdminUserEdit),
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/settings').then((m) => m.AdminSettings),
      },
    ],
  },
  { path: '**', redirectTo: '/' },
];
