import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../core/site-settings.service';
import { I18nService, I18nText } from '../../core/i18n.service';
import { WhReveal } from '../../shared/reveal';
import { ShopBottleItem, ShopCategoryItem } from '../../admin/api';

@Component({
  selector: 'wh-shop',
  imports: [RouterLink, WhReveal],
  templateUrl: './shop.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shop {
  private settingsService = inject(SiteSettingsService);
  private i18n = inject(I18nService);

  readonly page = computed(() => this.settingsService.shop());

  get site() {
    return this.settingsService.settings();
  }

  t(val: I18nText | string): string {
    return this.i18n.t(val as I18nText);
  }

  readonly activeCategory = signal<string>('ALL');

  readonly categories = computed<ShopCategoryItem[]>(() => {
    return this.page().categories || [];
  });

  readonly filteredItems = computed<ShopBottleItem[]>(() => {
    const cat = this.activeCategory();
    const bottles = this.page().bottles || [];
    if (cat === 'ALL') {
      return bottles;
    }
    return bottles.filter(item => item.category === cat);
  });

  setCategory(key: string): void {
    this.activeCategory.set(key);
  }
}
