import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '../../core/site-config';
import { Flourish } from '../../shared/flourish';

@Component({
  selector: 'wh-about',
  imports: [RouterLink, Flourish],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  readonly site = SITE;

  /* ✏️ Edit the values/beliefs cards here */
  readonly values = [
    {
      title: 'Small makers first',
      text: 'We work with families and small estates — people who prune their own vines and answer their own phone.',
    },
    {
      title: 'Stories over scores',
      text: 'A wine is a place and a year in a bottle. We would rather tell you its story than give it a number.',
    },
    {
      title: 'Slow by design',
      text: 'Good wine is not in a hurry, and neither are we. Tastings run long, conversations run longer.',
    },
  ];
}
