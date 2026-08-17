/* =============================================================================
   The Winehouse — SITE CONFIGURATION
   -----------------------------------------------------------------------------
   ✏️  EDIT THIS FILE TO CHANGE SITE-WIDE TEXTS & DETAILS — no coding required.

   Everything between quotes '...' is plain text you can change freely.
   Colours, fonts and spacing live in:  src/styles/theme.css
   ============================================================================= */

export const SITE = {
  /* Brand ------------------------------------------------------------------ */
  name: 'The Winehouse',
  tagline: 'A house of wine, stories & slow living',
  description:
    'Curated wines from small vineyards, tales from the cellar, tastings and tours. Poured with care, told with love.',

  /* Contact details ---------------------------------------------------------- */
  contact: {
    email: 'contact@winehouse.gr',
    phone: '+30 210 000 0000',
    address: {
      street: 'Independent Wine Atelier',
      city: 'Worldwide Curation & Delivery',
      postalCode: '',
      country: '',
    },
    /* Paste a Google Maps share link here */
    mapUrl: '',
  },

  /* Opening hours (shown on Contact page & footer) --------------------------- */
  hours: [
    { days: 'Tuesday – Friday', time: '12:00 – 22:00' },
    { days: 'Saturday', time: '11:00 – 23:00' },
    { days: 'Sunday & Monday', time: 'Closed' },
  ],

  /* Social links — remove a line to hide it ---------------------------------- */
  socials: [
    { label: 'Instagram', url: 'https://instagram.com/thewinehouse' },
    { label: 'Facebook', url: 'https://facebook.com/thewinehouse' },
  ],

  /* Main navigation (header) -------------------------------------------------- */
  nav: [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'e-Shop', path: '/shop' },
    { label: 'Contact', path: '/contact' },
  ],

  /* Footer legal line ---------------------------------------------------------- */
  legalName: 'The Winehouse',
} as const;
