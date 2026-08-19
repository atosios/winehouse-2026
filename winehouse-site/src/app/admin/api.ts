import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Local dev talks to the Docker API; production talks to the api. subdomain. */
export const API_BASE =
  typeof location !== 'undefined'
    ? (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:8080/api'
        : `https://api.${location.hostname.replace(/^www\./, '')}/api`)
    : 'http://localhost:8080/api';

export type PostType = 'story' | 'tasting_notes' | 'maker_spotlight' | 'pairing' | 'event' | 'gallery';
export type LayoutStyle = 'editorial' | 'hero_bleed' | 'split_cover' | 'minimal';
export type MoodColor = 'wine' | 'gold' | 'vine' | 'sand' | 'slate';

export interface PostMetaData {
  // Tasting notes
  wine_name?: string;
  producer?: string;
  vintage?: string;
  region?: string;
  grape_variety?: string;
  abv?: string;
  nose_notes?: string;
  palate_notes?: string;
  serving_temp?: string;
  sommelier_rating?: string;

  // Maker spotlight
  estate_name?: string;
  winemaker?: string;
  location?: string;
  farming_philosophy?: string;
  signature_bottle?: string;

  // Pairing
  dish_name?: string;
  matched_wine?: string;
  pairing_rationale?: string;
  glassware?: string;

  // Event
  event_date?: string;
  event_time?: string;
  event_location?: string;
  rsvp_link?: string;
}

export type FolderType = 'asset' | 'page' | 'post' | 'product';

export interface Folder {
  id: number;
  name: string;
  type: FolderType;
  parent_id: number | null;
  color?: string | null;
  items_count?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  post_type: PostType;
  category: string | null;
  folder_id?: number | null;
  folder?: Folder | null;
  tags: string[] | null;
  author_name: string | null;
  layout_style: LayoutStyle;
  mood_color: MoodColor;
  meta_data: PostMetaData | null;
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
  folder_id?: number | null;
  folder?: Folder | null;
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
  folder_id?: number | null;
  folder?: Folder | null;
  url: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

import { I18nText } from '../core/i18n.service';
export type { I18nText };

export interface SiteColors {
  primary: string;
  paper: string;
  ink: string;
  accent: string;
  terracotta: string;
  card_dark: string;
}

export interface HeroSectionContent {
  tag?: I18nText;
  video_url: string;
  fallback_image_url?: string;
  video_alt_url?: string;
  small_prefix: I18nText;
  big_title: I18nText;
  show_stain: boolean;
}

export interface IntroSectionContent {
  enabled: boolean;
  tag: I18nText;
  tape_sticker: I18nText;
  heading_line1: I18nText;
  heading_line2: I18nText;
  bullet_points: I18nText[];
  philosophy_label: I18nText;
  philosophy_quote: I18nText;
  image_url: string;
  image_tag: I18nText;
  monogram: string;
  vertical_banner: I18nText;
  cta_text: I18nText;
  cta_link: string;
}

export interface ManifestoSectionContent {
  enabled: boolean;
  tag: I18nText;
  headline: I18nText;
  paragraph_1: I18nText;
  paragraph_2: I18nText;
  stamp_text: I18nText;
  stamp_icon: string;
  side_tags: I18nText;
}

export interface ServiceItemContent {
  num: string;
  title: I18nText;
  subtitle: I18nText;
  link: string;
}

export interface ServicesSectionContent {
  enabled: boolean;
  tag: I18nText;
  items: ServiceItemContent[];
}

export interface CraftMetricContent {
  num: string;
  name: I18nText;
  pct: number;
}

export interface CraftSectionContent {
  enabled: boolean;
  tag: I18nText;
  keywords: I18nText[];
  metrics: CraftMetricContent[];
  asterisk_tape: I18nText;
  asterisk_symbol: string;
  kraft_note: I18nText;
}

export interface CellarItemContent {
  name: I18nText;
  font_style: string;
  img: string;
  tags: I18nText[];
  link: string;
  badge_bg?: string;
}

export interface CellarSectionContent {
  enabled: boolean;
  tag: I18nText;
  view_all_text: I18nText;
  view_all_link: string;
  items: CellarItemContent[];
}

export interface PressQuoteContent {
  quote: I18nText;
  author: I18nText;
}

export interface TestimonialContent {
  text: I18nText;
  author: I18nText;
  title: I18nText;
}

export interface PressLogoItem {
  name: I18nText;
  image_url?: string;
}

export interface PressSectionContent {
  enabled: boolean;
  tag: I18nText;
  quotes: PressQuoteContent[];
  logos: Array<PressLogoItem | any>;
  testimonials: TestimonialContent[];
}

export interface ContactSocialLink {
  label: I18nText;
  url: string;
}

export interface ContactSectionContent {
  enabled: boolean;
  tag: I18nText;
  headline: I18nText;
  subtext: I18nText;
  button_text: I18nText;
  card_cellar_label: I18nText;
  card_cellar_text: I18nText;
  card_direct_label: I18nText;
  card_email: string;
  card_phone: string;
  card_socials: ContactSocialLink[];
  card_kraft_note: I18nText;
}

export interface FooterLinkContent {
  label: I18nText;
  path: string;
}

export interface FooterSectionContent {
  tag?: I18nText;
  brand_name: I18nText;
  badge_logo?: string;
  tagline?: I18nText;
  copyright_text: I18nText;
  links: FooterLinkContent[];
}

export interface HomepageContent {
  hero: HeroSectionContent;
  intro: IntroSectionContent;
  manifesto: ManifestoSectionContent;
  services: ServicesSectionContent;
  craft: CraftSectionContent;
  cellar: CellarSectionContent;
  press: PressSectionContent;
  contact: ContactSectionContent;
  footer: FooterSectionContent;
}

export interface AboutBenchmarkItem {
  num: string;
  label: I18nText;
  note: I18nText;
}

export interface AboutValueItem {
  num: string;
  title: I18nText;
  tag: string;
  text: I18nText;
}

export interface AboutProtocolItem {
  num: string;
  title: I18nText;
  desc: I18nText;
}

export interface AboutPageContent {
  hero: {
    tag: I18nText;
    headline: I18nText;
    subtext: I18nText;
  };
  story: {
    tag: I18nText;
    quote: I18nText;
    body_1: I18nText;
    body_2: I18nText;
    note: I18nText;
    manifesto_tape: I18nText;
    manifesto_note: I18nText;
  };
  benchmarks: {
    tag: I18nText;
    items: AboutBenchmarkItem[];
  };
  values: {
    tag: I18nText;
    headline: I18nText;
    subtext: I18nText;
    items: AboutValueItem[];
  };
  protocols: {
    tag: I18nText;
    items: AboutProtocolItem[];
  };
  cta: {
    tape: I18nText;
    headline: I18nText;
    subtext: I18nText;
    button_shop_text: I18nText;
    button_contact_text: I18nText;
  };
}

export interface ShopCategoryItem {
  key: string;
  label: I18nText;
}

export interface ShopBottleItem {
  id: string;
  name: string;
  vintage: string;
  region: I18nText;
  varietal: I18nText;
  category: string;
  price: string;
  status: I18nText;
  statusBg: string;
  tastingNote: I18nText;
  img: string;
  alcohol: string;
  soil: I18nText;
}

export interface ShopPageContent {
  hero: {
    tag: I18nText;
    badge: I18nText;
    headline: I18nText;
    subtext: I18nText;
  };
  categories: ShopCategoryItem[];
  bottles: ShopBottleItem[];
  concierge: {
    tape: I18nText;
    headline: I18nText;
    subtext: I18nText;
    button_text: I18nText;
    kraft_note: I18nText;
  };
}

export interface ContactSubjectOption {
  value: string;
  label: string;
}

export interface ContactPageContent {
  hero: {
    tag: I18nText;
    headline: I18nText;
    subtext: I18nText;
  };
  form: {
    subjects: ContactSubjectOption[];
    button_text: I18nText;
  };
  dispatch: {
    tape: I18nText;
    kraft_note: I18nText;
  };
  schedule: {
    tag: I18nText;
    hours_title: I18nText;
    hours_tape: I18nText;
    hours_note: I18nText;
    location_title: I18nText;
    location_tape: I18nText;
    location_desc: I18nText;
    map_button_text: I18nText;
  };
}

export interface MaintenancePageContent {
  tag: I18nText;
  badge: I18nText;
  headline: I18nText;
  subtext: I18nText;
  video_url: string;
  video_badge: I18nText;
  inquiry_prefix: I18nText;
}

export interface StoreCategory {
  key: string;
  label: I18nText;
  enabled: boolean;
}

export interface StoreConfig {
  currency_symbol: string;
  currency_code: string;
  currency_position: 'before' | 'after';
  tax_rate: number;
  tax_included: boolean;
  store_enabled: boolean;
  free_shipping_threshold: number;
  shipping_fee: number;
  order_minimum_amount: number;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
  bank_beneficiary: string;
  categories: StoreCategory[];
  low_stock_threshold?: number;
}

export interface MailConfig {
  mail_driver: string; // 'smtp' | 'log' | 'sendmail'
  mail_host: string;
  mail_port: number;
  mail_encryption: string; // 'tls' | 'ssl' | 'none'
  mail_username: string;
  mail_password?: string;
  mail_from_address: string;
  mail_from_name: string;
  company_notification_email: string;
  notify_on_new_order: boolean;
  notify_on_new_message: boolean;
  notify_on_order_status_change?: boolean;
  send_customer_order_confirmation: boolean;
}

export interface SeoPageMetadata {
  title?: I18nText;
  description?: I18nText;
}

export interface SeoConfigSettings {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_image?: string;
  google_verification?: string;
  bing_verification?: string;
  pinterest_verification?: string;
  yandex_verification?: string;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  meta_pixel_id?: string;
  indexing_enabled: boolean;
  page_seo?: {
    home?: SeoPageMetadata;
    shop?: SeoPageMetadata;
    about?: SeoPageMetadata;
    contact?: SeoPageMetadata;
  };
}

export interface SiteSettings {
  name: string;
  tagline: string;
  description: string;
  legalName: string;
  contact: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    mapUrl: string;
  };
  hours: Array<{ days: string; time: string }>;
  socials: Array<{ label: string; url: string; icon?: string }>;
  nav: Array<{ label: string; path: string }>;
  colors: SiteColors;
  homepage_content?: HomepageContent;
  about_content?: AboutPageContent;
  shop_content?: ShopPageContent;
  contact_content?: ContactPageContent;
  maintenance_content?: MaintenancePageContent;
  maintenance_mode: boolean;
  store_config?: StoreConfig;
  mail_config?: MailConfig;
  seo_config?: SeoConfigSettings;
}

export interface GrapeVarietyItem {
  variety: I18nText;
  percentage?: number | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  vintage: string;
  region: I18nText;
  varietal: I18nText;
  varieties?: GrapeVarietyItem[];
  category: string;
  folder_id?: number | null;
  folder?: Folder | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  is_allocated: boolean;
  status_label: I18nText;
  status_bg: string;
  soil: I18nText;
  alcohol: string;
  tasting_note: I18nText;
  cover_image?: string | null;
  gallery?: string[];
  published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: number;
  product_id?: number | null;
  product_name: string;
  vintage?: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'allocated' | 'shipped' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  currency: string;
  payment_status: 'pending_bank' | 'paid' | 'waived' | 'refunded';
  payment_method: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  project_type?: string | null;
  message: string;
  is_read: boolean;
  status: 'new' | 'read' | 'archived' | 'replied';
  ip_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessagesResponse {
  messages: ContactMessage[];
  unread_count: number;
  total_count: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private base = `${API_BASE}/admin`;

  // Public Contact submission
  submitContactMessage(data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    project_type?: string;
    message: string;
  }): Observable<{ success: boolean; message: string; id: number }> {
    return this.http.post<{ success: boolean; message: string; id: number }>(`${API_BASE}/contact`, data);
  }

  // Public e-Shop endpoints
  getPublicProducts(params?: { category?: string; search?: string }): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_BASE}/shop/products`, { params: params as any });
  }
  getPublicProduct(slugOrId: string): Observable<Product> {
    return this.http.get<Product>(`${API_BASE}/shop/products/${slugOrId}`);
  }
  submitPublicOrder(data: {
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    shipping_address?: any;
    notes?: string;
    items: Array<{
      product_id?: number | null;
      product_name: string;
      vintage?: string | null;
      price: number;
      quantity: number;
    }>;
  }): Observable<Order> {
    return this.http.post<Order>(`${API_BASE}/shop/orders`, data);
  }

  // Contact Messages (Admin)
  listMessages(params?: { status?: string; search?: string }): Observable<MessagesResponse> {
    return this.http.get<MessagesResponse>(`${this.base}/messages`, { params: params as any });
  }
  getMessage(id: number): Observable<ContactMessage> {
    return this.http.get<ContactMessage>(`${this.base}/messages/${id}`);
  }
  updateMessageStatus(id: number, data: { is_read?: boolean; status?: string }): Observable<ContactMessage> {
    return this.http.put<ContactMessage>(`${this.base}/messages/${id}/status`, data);
  }
  deleteMessage(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/messages/${id}`);
  }

  // Products (Admin)
  listProducts(params?: { category?: string; search?: string }): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products`, { params: params as any });
  }
  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/${id}`);
  }
  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, data);
  }
  updateProduct(id: number, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, data);
  }
  deleteProduct(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/products/${id}`);
  }
  downloadProductCsvTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/products/template-csv`, { responseType: 'blob' });
  }
  importProductsCsv(file: File): Observable<{
    success: boolean;
    count: number;
    message?: string;
    errors?: string[];
    imported?: any[];
  }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.base}/products/import-csv`, form);
  }

  // Orders (Admin)
  listOrders(params?: { status?: string; search?: string }): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/orders`, { params: params as any });
  }
  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.base}/orders/${id}`);
  }
  updateOrderStatus(
    id: number,
    data: { status?: string; payment_status?: string; notes?: string }
  ): Observable<Order> {
    return this.http.put<Order>(`${this.base}/orders/${id}/status`, data);
  }
  deleteOrder(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/orders/${id}`);
  }

  // Settings
  getPublicSettings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(`${API_BASE}/settings`);
  }
  getSettings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(`${this.base}/settings`);
  }
  updateSettings(data: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.http.put<SiteSettings>(`${this.base}/settings`, data);
  }

  // Folders
  listFolders(type: FolderType): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.base}/folders`, { params: { type } });
  }
  createFolder(data: { name: string; type: FolderType; parent_id?: number | null; color?: string }): Observable<Folder> {
    return this.http.post<Folder>(`${this.base}/folders`, data);
  }
  updateFolder(id: number, data: { name?: string; parent_id?: number | null; color?: string }): Observable<Folder> {
    return this.http.put<Folder>(`${this.base}/folders/${id}`, data);
  }
  deleteFolder(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/folders/${id}`);
  }
  bulkMoveItems(type: FolderType, ids: number[], folder_id: number | null): Observable<{ ok: boolean; moved_count: number }> {
    return this.http.post<{ ok: boolean; moved_count: number }>(`${this.base}/folders/bulk-move`, { type, ids, folder_id });
  }

  // Posts
  listPosts(folder_id?: number | null | string): Observable<Post[]> {
    const params: Record<string, string> = {};
    if (folder_id !== undefined && folder_id !== null) {
      params['folder_id'] = String(folder_id);
    }
    return this.http.get<Post[]>(`${this.base}/posts`, { params });
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
  listCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/categories`);
  }
  createCategory(name: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/categories`, { name });
  }
  deleteCategory(name: string): Observable<{ success: boolean; categories: string[]; affected_posts: number }> {
    return this.http.request<{ success: boolean; categories: string[]; affected_posts: number }>('delete', `${this.base}/categories`, {
      body: { name },
    });
  }

  // Pages
  listPages(folder_id?: number | null | string): Observable<Page[]> {
    const params: Record<string, string> = {};
    if (folder_id !== undefined && folder_id !== null) {
      params['folder_id'] = String(folder_id);
    }
    return this.http.get<Page[]>(`${this.base}/pages`, { params });
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
  listAssets(folder_id?: number | null | string): Observable<Asset[]> {
    const params: Record<string, string> = {};
    if (folder_id !== undefined && folder_id !== null) {
      params['folder_id'] = String(folder_id);
    }
    return this.http.get<Asset[]>(`${this.base}/assets`, { params });
  }
  uploadAsset(file: File, folder_id?: number | null): Observable<Asset> {
    const form = new FormData();
    form.append('file', file);
    if (folder_id !== undefined && folder_id !== null) {
      form.append('folder_id', String(folder_id));
    }
    return this.http.post<Asset>(`${this.base}/assets`, form);
  }
  updateAsset(id: number, data: { name?: string; folder_id?: number | null }): Observable<Asset> {
    return this.http.put<Asset>(`${this.base}/assets/${id}`, data);
  }
  deleteAsset(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/assets/${id}`);
  }
  bulkDeleteAssets(ids: number[]): Observable<{ ok: boolean; deleted_count: number }> {
    return this.http.post<{ ok: boolean; deleted_count: number }>(`${this.base}/assets/bulk-delete`, { ids });
  }

  // Users
  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/users`);
  }
  getUser(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.base}/users/${id}`);
  }
  createUser(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/users`, data);
  }
  updateUser(
    id: number,
    data: {
      name: string;
      email: string;
      password?: string;
      password_confirmation?: string;
    },
  ): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/users/${id}`, data);
  }
  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/users/${id}`);
  }

  // Account
  updatePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Observable<unknown> {
    return this.http.put(`${this.base}/password`, data);
  }

  // Mail & SMTP Testing
  sendTestEmail(data: {
    recipient_email: string;
    mail_config?: Partial<MailConfig>;
  }): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.post<{ success: boolean; message?: string; error?: string }>(
      `${this.base}/settings/mail-test`,
      data
    );
  }
}
