import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE } from './api';

const TOKEN_KEY = 'wh_admin_token';

@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<{ name: string; email: string } | null>(null);

  get token(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: { name: string; email: string } }>(
        `${API_BASE}/admin/login`,
        { email, password },
      )
      .pipe(
        tap((res) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, res.token);
          }
          this.user.set(res.user);
        }),
      );
  }

  logout() {
    this.http.post(`${API_BASE}/admin/logout`, {}).subscribe({
      complete: () => this.clear(),
      error: () => this.clear(),
    });
  }

  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.user.set(null);
    this.router.navigateByUrl('/admin/login');
  }
}

/** Attaches the admin token to API calls; kicks back to login on 401. */
export const adminInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuth);

  if (req.url.startsWith(API_BASE) && auth.token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/json',
      },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && req.url.startsWith(API_BASE)) {
        auth.clear();
      }
      return throwError(() => err);
    }),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.parseUrl('/admin/login');
};
