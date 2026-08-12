import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '../../core/site-config';
import { Flourish } from '../../shared/flourish';

@Component({
  selector: 'wh-shop',
  imports: [RouterLink, Flourish],
  templateUrl: './shop.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shop {
  readonly site = SITE;

  /* ✏️ Placeholder shelves shown until the real catalogue is connected */
  readonly shelves = [
    { name: 'Reds', note: 'Deep, structured, story-rich' },
    { name: 'Whites', note: 'Crisp coastlines & sunlit slopes' },
    { name: 'Rosés', note: 'Summer, bottled mid-laugh' },
    { name: 'Sparkling', note: 'For days that deserve bubbles' },
    { name: 'Sweet & Fortified', note: 'Dessert’s oldest companions' },
    { name: 'Rare finds', note: 'Small lots, big characters' },
  ];
}
