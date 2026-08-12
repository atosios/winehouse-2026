import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Page } from './api';

@Component({
  selector: 'wh-admin-pages',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-3xl">Pages</h1>
      <a routerLink="new" class="btn btn-primary">+ New page</a>
    </div>

    @if (loading()) {
      <p class="opacity-70">Loading…</p>
    } @else if (pages().length === 0) {
      <p class="opacity-70">No pages yet. Click “New page” to create one.</p>
    } @else {
      <ul class="space-y-2">
        @for (page of pages(); track page.id) {
          <li class="paper p-4 flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <a [routerLink]="[page.id]" class="font-semibold hover:underline">{{ page.title }}</a>
              <p class="text-xs opacity-60">
                /{{ page.slug }} · last edited {{ page.updated_at | date: 'mediumDate' }}
              </p>
            </div>
            <span
              class="text-xs rounded-full px-2 py-0.5"
              [class]="page.published ? 'bg-green-100 text-green-800' : 'bg-black/10'"
            >
              {{ page.published ? 'Live' : 'Hidden' }}
            </span>
            <button type="button" class="text-sm text-red-700 hover:underline" (click)="remove(page)">
              Delete
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminPages {
  private api = inject(AdminApi);
  pages = signal<Page[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.listPages().subscribe((pages) => {
      this.pages.set(pages);
      this.loading.set(false);
    });
  }

  remove(page: Page) {
    if (!confirm(`Delete “${page.title}”? This cannot be undone.`)) return;
    this.api.deletePage(page.id).subscribe(() => {
      this.pages.update((list) => list.filter((p) => p.id !== page.id));
    });
  }
}

@Component({
  selector: 'wh-admin-page-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/pages" class="text-sm opacity-70 hover:opacity-100">← Back to pages</a>
    <h1 class="font-display text-3xl mt-2 mb-6">{{ isNew ? 'New page' : 'Edit page' }}</h1>

    <form class="space-y-5 max-w-2xl" (ngSubmit)="save()">
      <div>
        <label class="field-label" for="title">Title</label>
        <input id="title" class="field-input" name="title" [(ngModel)]="model.title" required />
      </div>

      <div>
        <label class="field-label" for="slug">Web address <span class="opacity-60">(leave empty to create automatically)</span></label>
        <input id="slug" class="field-input" name="slug" [(ngModel)]="model.slug" placeholder="e.g. our-story" />
      </div>

      <div>
        <label class="field-label" for="body">Content</label>
        <textarea id="body" class="field-input min-h-72" name="body" [(ngModel)]="model.body"></textarea>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" [(ngModel)]="model.published" />
        Published (visible on the website)
      </label>

      @if (error()) {
        <p class="text-sm text-red-700">{{ error() }}</p>
      }

      <div class="flex items-center gap-3">
        <button class="btn btn-primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
        @if (saved()) {
          <span class="text-sm text-green-700">Saved ✓</span>
        }
      </div>
    </form>
  `,
})
export class AdminPageEdit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  model: Partial<Page> = { title: '', slug: '', body: '', published: true };
  busy = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnInit() {
    if (!this.isNew) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getPage(id).subscribe((page) => (this.model = page));
    }
  }

  save() {
    if (!this.model.title) return;
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);

    const req = this.isNew
      ? this.api.createPage(this.model)
      : this.api.updatePage(this.model.id!, this.model);

    req.subscribe({
      next: (page) => {
        this.busy.set(false);
        this.saved.set(true);
        if (this.isNew) {
          this.router.navigate(['/admin/pages', page.id]);
        } else {
          this.model = page;
        }
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Could not save. Please try again.');
      },
    });
  }
}
