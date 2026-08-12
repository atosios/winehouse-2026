import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, Post } from './api';

@Component({
  selector: 'wh-admin-posts',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-3xl">Posts</h1>
      <a routerLink="new" class="btn btn-primary">+ New post</a>
    </div>

    @if (loading()) {
      <p class="opacity-70">Loading…</p>
    } @else if (posts().length === 0) {
      <p class="opacity-70">No posts yet. Click “New post” to write your first one.</p>
    } @else {
      <ul class="space-y-2">
        @for (post of posts(); track post.id) {
          <li class="paper p-4 flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <a [routerLink]="[post.id]" class="font-semibold hover:underline">{{ post.title }}</a>
              <p class="text-xs opacity-60">
                {{ post.published ? 'Published' : 'Draft' }} ·
                last edited {{ post.updated_at | date: 'mediumDate' }}
              </p>
            </div>
            <span
              class="text-xs rounded-full px-2 py-0.5"
              [class]="post.published ? 'bg-green-100 text-green-800' : 'bg-black/10'"
            >
              {{ post.published ? 'Live' : 'Draft' }}
            </span>
            <button type="button" class="text-sm text-red-700 hover:underline" (click)="remove(post)">
              Delete
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class AdminPosts {
  private api = inject(AdminApi);
  posts = signal<Post[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.listPosts().subscribe((posts) => {
      this.posts.set(posts);
      this.loading.set(false);
    });
  }

  remove(post: Post) {
    if (!confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    this.api.deletePost(post.id).subscribe(() => {
      this.posts.update((list) => list.filter((p) => p.id !== post.id));
    });
  }
}

@Component({
  selector: 'wh-admin-post-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/posts" class="text-sm opacity-70 hover:opacity-100">← Back to posts</a>
    <h1 class="font-display text-3xl mt-2 mb-6">{{ isNew ? 'New post' : 'Edit post' }}</h1>

    <form class="space-y-5 max-w-2xl" (ngSubmit)="save()">
      <div>
        <label class="field-label" for="title">Title</label>
        <input id="title" class="field-input" name="title" [(ngModel)]="model.title" required />
      </div>

      <div>
        <label class="field-label" for="excerpt">Short summary <span class="opacity-60">(optional)</span></label>
        <input id="excerpt" class="field-input" name="excerpt" [(ngModel)]="model.excerpt" maxlength="500" />
      </div>

      <div>
        <label class="field-label" for="body">Content</label>
        <textarea id="body" class="field-input min-h-72" name="body" [(ngModel)]="model.body"></textarea>
      </div>

      <div>
        <label class="field-label" for="cover">Cover image address <span class="opacity-60">(paste a link from “Files & images”)</span></label>
        <input id="cover" class="field-input" name="cover" [(ngModel)]="model.cover_image" />
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
export class AdminPostEdit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  model: Partial<Post> = { title: '', excerpt: '', body: '', cover_image: '', published: false };
  busy = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnInit() {
    if (!this.isNew) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getPost(id).subscribe((post) => (this.model = post));
    }
  }

  save() {
    if (!this.model.title) return;
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);

    const req = this.isNew
      ? this.api.createPost(this.model)
      : this.api.updatePost(this.model.id!, this.model);

    req.subscribe({
      next: (post) => {
        this.busy.set(false);
        this.saved.set(true);
        if (this.isNew) {
          this.router.navigate(['/admin/posts', post.id]);
        } else {
          this.model = post;
        }
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Could not save. Please try again.');
      },
    });
  }
}
