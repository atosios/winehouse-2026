import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './auth';

@Component({
  selector: 'wh-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-background flex flex-col md:flex-row">
      <aside class="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-black/10 p-4 md:p-6 flex md:flex-col gap-4 items-center md:items-stretch">
        <a routerLink="/" class="block shrink-0" title="View website">
          <img src="/logo_default_mark.png" alt="The Winehouse" class="h-10 md:h-14 md:mx-auto" />
        </a>

        <nav class="flex md:flex-col gap-1 flex-1 overflow-x-auto">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary/10 font-semibold"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="rounded-lg px-3 py-2 text-sm whitespace-nowrap hover:bg-black/5 transition-colors"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <button
          type="button"
          class="text-sm opacity-70 hover:opacity-100 underline underline-offset-4 md:text-left"
          (click)="auth.logout()"
        >
          Sign out
        </button>
      </aside>

      <main class="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShell {
  auth = inject(AdminAuth);

  nav = [
    { path: '/admin', label: 'Overview', exact: true },
    { path: '/admin/posts', label: 'Posts', exact: false },
    { path: '/admin/pages', label: 'Pages', exact: false },
    { path: '/admin/assets', label: 'Files & images', exact: false },
    { path: '/admin/settings', label: 'Settings', exact: false },
  ];
}
