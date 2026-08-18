import { DatePipe } from '@angular/common';
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminApi, AdminUser } from './api';
import { AdminConfirm } from './confirm-dialog';

@Component({
  selector: 'wh-admin-users',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Team & Users</h1>
        @if (!loading()) {
          <p class="text-xs text-slate-500 mt-0.5">{{ users().length }} authorized administrator{{ users().length !== 1 ? 's' : '' }}</p>
        }
      </div>
      <a routerLink="new" class="btn btn-primary self-start sm:self-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add User</span>
      </a>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <input class="admin-search" placeholder="Search team by name or email…" [(ngModel)]="searchQuery" />
    </div>

    @if (loading()) {
      <div class="admin-card text-center py-12 text-slate-400 text-sm">
        Loading user directory…
      </div>
    } @else if (filteredUsers().length === 0) {
      <div class="admin-card admin-empty-state">
        <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
        <p>
          @if (searchQuery) {
            No users match your search query.
          } @else {
            No user accounts found.
          }
        </p>
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (user of filteredUsers(); track user.id) {
          <div class="admin-card !p-5 flex items-start gap-3.5 hover:border-slate-300 transition-all">
            <span class="admin-avatar admin-avatar-lg shrink-0">{{ getInitials(user.name) }}</span>
            <div class="flex-1 min-w-0">
              <a [routerLink]="[user.id]" class="text-sm font-semibold text-slate-900 hover:underline block truncate">
                {{ user.name }}
              </a>
              <p class="text-xs text-slate-500 truncate mt-0.5">{{ user.email }}</p>
              <span class="inline-block px-2 py-0.5 text-2xs font-semibold text-slate-500 bg-slate-100 rounded-md mt-2">
                Joined {{ user.created_at | date: 'mediumDate' }}
              </span>

              <div class="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                <a [routerLink]="[user.id]" class="font-semibold text-slate-700 hover:text-slate-900">Edit Profile</a>
                <button type="button" class="font-semibold text-red-600 hover:text-red-800 ml-auto" (click)="remove(user)">Delete</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminUsers implements OnInit {
  private api = inject(AdminApi);
  private confirm = inject(AdminConfirm);
  users = signal<AdminUser[]>([]);
  loading = signal(true);
  searchQuery = '';

  filteredUsers = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.api.listUsers().subscribe((users) => {
      this.users.set(users);
      this.loading.set(false);
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  async remove(user: AdminUser) {
    const ok = await this.confirm.open({
      title: 'Remove user account',
      message: `Are you sure you want to remove "${user.name}" (${user.email})? They will immediately lose dashboard access.`,
      confirmLabel: 'Remove Account',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Could not delete this user account.');
      },
    });
  }
}

@Component({
  selector: 'wh-admin-user-edit',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <a routerLink="/admin/users" class="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>All Users</span>
        </a>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{{ isNew ? 'Add Administrator' : 'Edit User Profile' }}</h1>
      </div>
    </div>

    <form class="space-y-6" (ngSubmit)="save()">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Sidebar Column (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="admin-card text-center p-6 space-y-3">
            <span class="admin-avatar admin-avatar-lg shadow-sm mx-auto text-base">{{ initials }}</span>
            <div>
              <h2 class="text-sm font-bold text-slate-900">{{ name || 'New Administrator' }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ email || 'No email assigned' }}</p>
            </div>
            <span class="inline-block px-2.5 py-0.5 text-2xs font-mono font-bold uppercase rounded-md bg-slate-100 text-slate-700">
              Administrator Role
            </span>
          </div>

          @if (!isNew) {
            <div class="admin-danger-zone">
              <h3 class="text-xs font-bold text-red-900 uppercase tracking-wider">Danger Zone</h3>
              <p class="text-2xs text-slate-500 my-2">Permanently delete this administrator account. This user will immediately lose access.</p>
              <button type="button" class="btn btn-danger w-full justify-center text-xs" (click)="deleteUser()">Delete User Account</button>
            </div>
          }
        </div>

        <!-- Form Fields Column (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="admin-card space-y-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-2">Profile Credentials</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="admin-field-label" for="user-name">Full Name</label>
                <input id="user-name" class="admin-field-input" name="name" [(ngModel)]="name" required placeholder="e.g. Maria Papadaki" />
              </div>

              <div>
                <label class="admin-field-label" for="user-email">Email Address</label>
                <input
                  id="user-email"
                  class="admin-field-input"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  autocomplete="off"
                  placeholder="maria@thewinehouse.gr"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label class="admin-field-label" for="user-password">
                  Password
                  @if (!isNew) {
                    <span class="text-slate-400 font-normal normal-case">(leave blank to keep current)</span>
                  }
                  @if (isNew) {
                    <span class="text-slate-400 font-normal normal-case">(min 10 chars)</span>
                  }
                </label>
                <input
                  id="user-password"
                  class="admin-field-input"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  [required]="isNew"
                  minlength="10"
                  autocomplete="new-password"
                />
                @if (password) {
                  <div class="mt-1.5 flex items-center gap-2">
                    <div class="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        [style.width]="passwordStrength + '%'"
                        [style.background-color]="passwordStrength >= 75 ? '#10b981' : passwordStrength >= 40 ? '#f59e0b' : '#ef4444'"
                      ></div>
                    </div>
                    <span class="text-[10px] font-semibold text-slate-500">{{ passwordStrengthLabel }}</span>
                  </div>
                }
              </div>

              <div>
                <label class="admin-field-label" for="user-password-confirm">Confirm Password</label>
                <input
                  id="user-password-confirm"
                  class="admin-field-input"
                  type="password"
                  name="password_confirmation"
                  [(ngModel)]="passwordConfirmation"
                  [required]="isNew || !!password"
                  autocomplete="new-password"
                />
                @if (password && passwordConfirmation && password !== passwordConfirmation) {
                  <p class="text-2xs text-red-600 font-semibold mt-1">Passwords do not match</p>
                }
              </div>
            </div>

            @if (error()) {
              <p class="text-xs text-red-600 font-semibold">{{ error() }}</p>
            }
            @if (saved()) {
              <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                <span>✓</span> {{ isNew ? 'Account created successfully' : 'Profile updated' }}
              </div>
            }

            <div class="pt-2 flex justify-end">
              <button class="btn btn-primary btn-sm" type="submit" [disabled]="busy()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>{{ busy() ? 'Saving…' : (isNew ? 'Create Administrator' : 'Save Changes') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  `,
})
export class AdminUserEdit implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirm = inject(AdminConfirm);

  isNew = this.route.snapshot.paramMap.get('id') === 'new';
  name = '';
  email = '';
  password = '';
  passwordConfirmation = '';
  private userId = 0;

  busy = signal(false);
  saved = signal(false);
  error = signal('');

  get initials(): string {
    if (!this.name) return this.isNew ? '+' : 'U';
    return this.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  get passwordStrength(): number {
    const p = this.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 10) score += 25;
    if (p.length >= 14) score += 15;
    if (/[A-Z]/.test(p)) score += 15;
    if (/[a-z]/.test(p)) score += 10;
    if (/[0-9]/.test(p)) score += 15;
    if (/[^A-Za-z0-9]/.test(p)) score += 20;
    return Math.min(score, 100);
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s >= 75) return 'Strong';
    if (s >= 40) return 'Fair';
    return 'Weak';
  }

  ngOnInit() {
    if (!this.isNew) {
      this.userId = Number(this.route.snapshot.paramMap.get('id'));
      this.api.getUser(this.userId).subscribe((user) => {
        this.name = user.name;
        this.email = user.email;
        this.userId = user.id;
      });
    }
  }

  save() {
    if (!this.name || !this.email) return;

    if (this.isNew && !this.password) {
      this.error.set('Password is required for new accounts.');
      return;
    }

    if (this.password && this.password !== this.passwordConfirmation) {
      this.error.set('The two passwords do not match.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);

    if (this.isNew) {
      this.api
        .createUser({
          name: this.name,
          email: this.email,
          password: this.password,
          password_confirmation: this.passwordConfirmation,
        })
        .subscribe({
          next: (user) => {
            this.busy.set(false);
            this.saved.set(true);
            this.router.navigate(['/admin/users', user.id]);
          },
          error: (err) => {
            this.busy.set(false);
            this.error.set(
              err.error?.message ?? 'Could not create user. Please try again.',
            );
          },
        });
    } else {
      const data: {
        name: string;
        email: string;
        password?: string;
        password_confirmation?: string;
      } = { name: this.name, email: this.email };

      if (this.password) {
        data.password = this.password;
        data.password_confirmation = this.passwordConfirmation;
      }

      this.api.updateUser(this.userId, data).subscribe({
        next: (user) => {
          this.busy.set(false);
          this.saved.set(true);
          this.name = user.name;
          this.email = user.email;
          this.password = '';
          this.passwordConfirmation = '';
          setTimeout(() => this.saved.set(false), 3000);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(
            err.error?.message ?? 'Could not save. Please try again.',
          );
        },
      });
    }
  }

  async deleteUser() {
    const ok = await this.confirm.open({
      title: 'Delete user account',
      message: `Permanently delete "${this.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteUser(this.userId).subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not delete this user.');
      },
    });
  }
}
