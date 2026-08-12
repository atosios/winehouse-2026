import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '../../core/site-config';
import { Flourish } from '../../shared/flourish';
import { WhChinChin } from '../../shared/chin-chin';
import { WhReveal } from '../../shared/reveal';
import { WhTilt } from '../../shared/tilt';
import { WhDoodle } from '../../shared/doodles';
import { WhLogo } from '../../shared/brand-logo';

@Component({
  selector: 'wh-home',
  imports: [RouterLink, Flourish, WhChinChin, WhReveal, WhTilt, WhDoodle, WhLogo],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly site = SITE;

  /* ✏️ Static word strip under the hero */
  readonly bandWords = ['Chin chin', 'Vinitos', 'Stories', 'Tours', 'Slow living', 'Buena música'];

  /* ✏️ Cellar shelves teaser (links into the e-Shop) */
  readonly shelves = [
    { name: 'Reds', doodle: 'bottle' },
    { name: 'Whites', doodle: 'glass' },
    { name: 'Rosés', doodle: 'grapes' },
    { name: 'Sparkling', doodle: 'sparkle' },
    { name: 'Sweet', doodle: 'cork' },
    { name: 'Rare finds', doodle: 'corkscrew' },
  ] as const;

  /* ✏️ Edit the three homepage highlight cards here */
  readonly highlights = [
    {
      title: 'The Wines',
      text: 'Small-vineyard bottles chosen glass by glass — natural, honest, and full of place.',
      link: '/shop',
      linkLabel: 'Browse the shop',
      icon: 'bottle',
    },
    {
      title: 'Stories & Facts',
      text: 'Tales from winemakers, grape lore, tasting notes and everything between the vines.',
      link: '/about',
      linkLabel: 'Read our story',
      icon: 'quill',
    },
    {
      title: 'Tastings & Tours',
      text: 'Join us around the table — guided tastings, vineyard walks and slow evenings.',
      link: '/contact',
      linkLabel: 'Ask about a tour',
      icon: 'grapes',
    },
  ];

  /* ✏️ Edit the journal teasers here (placeholder posts until the blog arrives) */
  readonly posts = [
    {
      kicker: 'Wine facts',
      title: 'Why old vines make quiet, deep wines',
      excerpt: 'Age slows a vine down — and what it loses in yield, it gains in memory.',
    },
    {
      kicker: 'From the cellar',
      title: 'A short love letter to Assyrtiko',
      excerpt: 'Volcanic soil, salt wind, and a grape that refuses to be anything but itself.',
    },
    {
      kicker: 'Tours',
      title: 'Walking the terraces before harvest',
      excerpt: 'Notes from a September morning between the rows, basket in hand.',
    },
  ];
}
