import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wh-admin-overview',
  imports: [RouterLink],
  template: `
    <h1 class="font-display text-3xl mb-2">Welcome back</h1>
    <p class="opacity-70 mb-8">What would you like to do today?</p>

    <div class="grid gap-4 sm:grid-cols-2">
      @for (card of cards; track card.path) {
        <a [routerLink]="card.path" class="paper p-6 block hover:-translate-y-0.5 transition-transform">
          <h2 class="font-display text-xl mb-1">{{ card.title }}</h2>
          <p class="text-sm opacity-70">{{ card.text }}</p>
        </a>
      }
    </div>
  `,
})
export class AdminOverview {
  cards = [
    {
      path: '/admin/posts',
      title: 'Posts',
      text: 'Write news, stories and announcements for the website.',
    },
    {
      path: '/admin/pages',
      title: 'Pages',
      text: 'Edit standalone pages with their own web address.',
    },
    {
      path: '/admin/assets',
      title: 'Files & images',
      text: 'Upload photos and documents, then use them in posts and pages.',
    },
    {
      path: '/admin/settings',
      title: 'Settings',
      text: 'Change your admin password.',
    },
  ];
}
