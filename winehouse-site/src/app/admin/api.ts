import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Local dev talks to the Docker API; production talks to the api. subdomain. */
export const API_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : `https://api.${location.hostname.replace(/^www\./, '')}/api`;

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  body: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  name: string;
  path: string;
  mime_type: string | null;
  size: number;
  url: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private base = `${API_BASE}/admin`;

  // Posts
  listPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.base}/posts`);
  }
  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.base}/posts/${id}`);
  }
  createPost(data: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(`${this.base}/posts`, data);
  }
  updatePost(id: number, data: Partial<Post>): Observable<Post> {
    return this.http.put<Post>(`${this.base}/posts/${id}`, data);
  }
  deletePost(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/posts/${id}`);
  }

  // Pages
  listPages(): Observable<Page[]> {
    return this.http.get<Page[]>(`${this.base}/pages`);
  }
  getPage(id: number): Observable<Page> {
    return this.http.get<Page>(`${this.base}/pages/${id}`);
  }
  createPage(data: Partial<Page>): Observable<Page> {
    return this.http.post<Page>(`${this.base}/pages`, data);
  }
  updatePage(id: number, data: Partial<Page>): Observable<Page> {
    return this.http.put<Page>(`${this.base}/pages/${id}`, data);
  }
  deletePage(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/pages/${id}`);
  }

  // Assets
  listAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.base}/assets`);
  }
  uploadAsset(file: File): Observable<Asset> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Asset>(`${this.base}/assets`, form);
  }
  deleteAsset(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/assets/${id}`);
  }

  // Account
  updatePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Observable<unknown> {
    return this.http.put(`${this.base}/password`, data);
  }
}
