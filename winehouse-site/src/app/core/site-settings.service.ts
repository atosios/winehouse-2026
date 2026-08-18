import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { SITE } from './site-config';
import {
  API_BASE,
  HomepageContent,
  AboutPageContent,
  ShopPageContent,
  ContactPageContent,
  MaintenancePageContent,
  SiteColors,
  SiteSettings,
  StoreConfig,
  MailConfig,
} from '../admin/api';

export const DEFAULT_MAIL_CONFIG: MailConfig = {
  mail_driver: 'smtp',
  mail_host: 'smtp.winehouse.gr',
  mail_port: 587,
  mail_encryption: 'tls',
  mail_username: 'info@winehouse.gr',
  mail_password: '',
  mail_from_address: 'info@winehouse.gr',
  mail_from_name: 'The Winehouse',
  company_notification_email: 'info@winehouse.gr',
  notify_on_new_order: true,
  notify_on_new_message: true,
  notify_on_order_status_change: true,
  send_customer_order_confirmation: true,
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  currency_symbol: '€',
  currency_code: 'EUR',
  currency_position: 'before',
  tax_rate: 24,
  tax_included: true,
  store_enabled: true,
  free_shipping_threshold: 150.0,
  shipping_fee: 15.0,
  order_minimum_amount: 0.0,
  bank_name: 'National Bank of Greece',
  bank_iban: 'GR12 0110 1250 0000 1234 5678 901',
  bank_bic: 'ETHNGRAA',
  bank_beneficiary: 'The Winehouse Ltd',
  categories: [
    { key: 'ALL', label: { en: 'ALL BOTTLES', el: 'ΟΛΕΣ ΟΙ ΦΙΑΛΕΣ' }, enabled: true },
    { key: 'VOLCANIC', label: { en: 'VOLCANIC SOIL', el: 'ΗΦΑΙΣΤΕΙΑΚΟ ΕΔΑΦΟΣ' }, enabled: true },
    { key: 'NATURAL', label: { en: 'NATURAL & WILD', el: 'ΦΥΣΙΚΑ & ΑΓΡΙΑ' }, enabled: true },
    { key: 'RESERVE', label: { en: 'CELLAR RESERVE', el: 'ΠΑΛΑΙΩΣΗ & RESERVE' }, enabled: true },
    { key: 'INDIGENOUS', label: { en: 'ANCIENT INDIGENOUS', el: 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ' }, enabled: true },
  ],
  low_stock_threshold: 5,
};

export const DEFAULT_SITE_COLORS: SiteColors = {
  primary: '#c84b31',
  paper: '#ece7e1',
  ink: '#111111',
  accent: '#c9a227',
  terracotta: '#c84b31',
  card_dark: '#111111',
};

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    tag: '/ HERO',
    video_url: 'def.mp4',
    fallback_image_url: 'editorial_intro.jpg',
    video_alt_url: 'hero_video.mp4',
    small_prefix: 'The',
    big_title: 'Winehouse',
    show_stain: false,
  },
  intro: {
    enabled: true,
    tag: '/ WINE ATELIER & CELLAR',
    tape_sticker: 'WINE ATELIER',
    heading_line1: 'WINE',
    heading_line2: 'HOUSE',
    bullet_points: [
      '+ SMALL-BATCH INDEPENDENT GROWERS',
      '+ LOW-INTERVENTION & BIODYNAMIC',
      '+ UNFILTERED STORIES FROM THE VINES',
    ],
    philosophy_label: 'Philosophy',
    philosophy_quote: '“Wine is bottled emotion, shaped by ancient sun and quiet patience.”',
    image_url: 'editorial_intro.jpg',
    image_tag: 'CURATED SELECTION',
    monogram: 'WH',
    vertical_banner: 'AVAILABLE FOR PRIVATE TASTINGS',
    cta_text: "LET'S\nTASTE",
    cta_link: '/contact',
  },
  manifesto: {
    enabled: true,
    tag: '/ MANIFESTO',
    headline: "GOOD WINE\nISN'T DECORATION.\nIT'S DIRECTION.",
    paragraph_1: 'We believe in clarity over clutter. Soil over shortcuts. Emotion over formality.',
    paragraph_2:
      'Our cellar lives at the intersection of wild Mediterranean terroir and quiet craftsmanship — where forgotten varieties become unforgettable memories, and every bottle creates lasting impact.',
    stamp_text: 'WINEHOUSE • SOUL • ATELIER • 2026 •',
    stamp_icon: '🍇',
    side_tags: "SOIL\nPEOPLE\nCULTURE",
  },
  services: {
    enabled: true,
    tag: '/ SERVICES',
    items: [
      {
        num: '01',
        title: 'CELLAR SELECTION',
        subtitle: 'SMALL-BATCH PRODUCERS, INDIGENOUS VARIETALS, NATURAL IMPORTS, RARE VINTAGES',
        link: '/shop',
      },
      {
        num: '02',
        title: 'PRIVATE TASTINGS',
        subtitle: 'GUIDED SOMMELIER FLIGHTS, SENSORY PAIRINGS, INTIMATE TABLE GATHERINGS',
        link: '/contact',
      },
      {
        num: '03',
        title: 'VINEYARD EXPEDITIONS',
        subtitle: 'TERROIR WALKS, HARVEST EXPEDITIONS, DIRECT PRODUCER MASTERCLASSES',
        link: '/about',
      },
      {
        num: '04',
        title: 'CELLAR CURATION',
        subtitle: 'HOME & RESTAURANT CELLAR ARCHITECTURE, BESPOKE SOURCING, VINTAGE ADVISORY',
        link: '/contact',
      },
    ],
  },
  craft: {
    enabled: true,
    tag: '/ EXPERTISE & CRAFT',
    keywords: [
      'MEDITERRANEAN SOIL',
      'INDIGENOUS VINES',
      'UNFILTERED PASSION',
      'CURATED TASTING',
    ],
    metrics: [
      { num: '01', name: 'ORGANIC & BIODYNAMIC', pct: 90 },
      { num: '02', name: 'INDIGENOUS VARIETIES', pct: 95 },
      { num: '03', name: 'SMALL PRODUCERS', pct: 100 },
      { num: '04', name: 'RARE & AGED VINTAGES', pct: 85 },
      { num: '05', name: 'NATURAL & UNFILTERED', pct: 80 },
      { num: '06', name: 'HAND-HARVESTED LOTS', pct: 95 },
    ],
    asterisk_tape: 'EST. ATELIER',
    asterisk_symbol: '*',
    kraft_note: "BOTTLES THAT\nMOVE PEOPLE",
  },
  cellar: {
    enabled: true,
    tag: '/ SELECTED WORK & CELLAR',
    view_all_text: 'VIEW ALL PROJECTS & BOTTLES',
    view_all_link: '/shop',
    items: [
      {
        name: 'RITUÁL',
        font_style: 'font-serif tracking-wider font-semibold',
        img: 'cellar_ritual.jpg',
        tags: ['BRANDING', 'XINOMAVRO', '2021'],
        link: '/shop',
        badge_bg: 'bg-[#b83822]',
      },
      {
        name: 'AUREA',
        font_style: 'font-serif tracking-widest uppercase font-light',
        img: 'cellar_aurea.jpg',
        tags: ['VOLCANIC', 'ASSYRTIKO', '2023'],
        link: '/shop',
        badge_bg: 'bg-[#111111]',
      },
      {
        name: 'NÉCTAR',
        font_style: 'font-sans font-bold tracking-tight',
        img: 'cellar_nectar.jpg',
        tags: ['NATURAL', 'ORANGE', '2024'],
        link: '/shop',
        badge_bg: 'bg-[#b83822]',
      },
      {
        name: 'SABLE',
        font_style: 'font-sans font-extrabold tracking-normal',
        img: 'cellar_sable.jpg',
        tags: ['RESERVE', 'CELLAR LOT', '2019'],
        link: '/shop',
        badge_bg: 'bg-[#111111]',
      },
    ],
  },
  press: {
    enabled: true,
    tag: '/ PRESS & WORDS',
    quotes: [
      {
        quote:
          'THE WINEHOUSE HAS A RARE ABILITY TO TURN ANCIENT SOIL AND FORGOTTEN VINES INTO PROFOUND STORIES THAT RESONATE DEEPLY.',
        author: '— THE CULINARY REVIEW',
      },
      {
        quote:
          'AN UNMATCHED CURATION OF THE MOST PROVOCATIVE LOW-INTERVENTION WINES AND CULTURAL SOUL.',
        author: '— GASTRONOMY DISPATCH',
      },
      {
        quote:
          'ELEGANCE, CLARITY, AND PURE EMOTION IN EVERY BOTTLE. A BENCHMARK FOR CONTEMPORARY WINE CULTURE.',
        author: '— MEDITERRANEAN TASTE JOURNAL',
      },
    ],
    logos: [
      { name: 'DECANTER', image_url: '' },
      { name: 'WALLPAPER*', image_url: '' },
      { name: 'WINE SPECTATOR', image_url: '' },
      { name: 'MICHELIN', image_url: '' },
      { name: 'MONOCLE', image_url: '' },
      { name: 'LE FIGARO', image_url: '' },
    ],
    testimonials: [
      {
        text: '“The Winehouse is a brilliant cellar and strategic partner. Their curated selections elevate our table and move our guests.”',
        author: 'ALEXANDRA BOND',
        title: 'HEAD SOMMELIER, AUREA',
      },
      {
        text: '“They bring clarity, vision, and refined elegance to every tasting. A true creative leader in Mediterranean wine.”',
        author: 'JONAS WOLFF',
        title: 'FOUNDER, STUDIO WOLFF',
      },
      {
        text: '“The way The Winehouse connects history, soil, and human emotion is what makes their work unforgettable.”',
        author: 'MARIA SILVA',
        title: 'CURATOR, RITUÁL',
      },
    ],
  },
  contact: {
    enabled: true,
    tag: '/ GET IN TOUCH',
    headline: "LET'S CREATE\nSOMETHING\nMEANINGFUL.",
    subtext: 'Curating bespoke wine experiences, private table tastings & cellar consultation.',
    button_text: 'SEND MESSAGE',
    card_cellar_label: 'Cellar',
    card_cellar_text: "INDEPENDENT ATELIER\nSHIPPING WORLDWIDE",
    card_direct_label: 'Direct',
    card_email: 'hello@thewinehouse.gr',
    card_phone: '+30 210 123 4567',
    card_socials: [
      { label: 'INSTAGRAM', url: 'https://instagram.com' },
      { label: 'SUBSTACK', url: 'https://substack.com' },
      { label: 'SPOTIFY', url: 'https://spotify.com' },
    ],
    card_kraft_note: "I'M ALWAYS OPEN\nTO NEW IDEAS",
  },
  footer: {
    tag: '/ FOOTER',
    brand_name: 'THE WINEHOUSE',
    badge_logo: '/logo_badge.png',
    tagline: 'A house of wine, stories & slow living',
    copyright_text: '© 2026 THE WINEHOUSE. ALL RIGHTS RESERVED.',
    links: [
      { label: 'PRIVACY', path: '/about' },
      { label: 'TERMS', path: '/about' },
    ],
  },
};

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: {
    tag: '/ OUR STORY & PHILOSOPHY',
    headline: 'A HOUSE BUILT ON CORKS, TERROIR & CONVERSATIONS',
    subtext: 'From forgotten ancient hillsides to bespoke cellar vaults — curated low-intervention wines and living Mediterranean stories.',
  },
  story: {
    tag: '/ THE CELLAR ORIGINS',
    quote: '“The Winehouse began around a quiet table, long after the plates were cleared, when someone opened one more bottle ‘just to try’.”',
    body_1: 'What started as a modest shelf of personal favourites for friends slowly grew into a private cellar, then a curated atelier, and finally a dedicated home for Mediterranean wine culture.',
    body_2: 'We are not sommeliers in rigid suits. We are people who fell for wine sideways — through harvest trips at dawn, through vignerons who speak of their ancient rootstocks like family, and through bottles that taste unequivocally like the volcanic slope or limestone crag they came from. That is the only wine we look for, and the only kind we pour.',
    note: 'Every single allocation on our shelves has been tasted, argued over, and loved by our team.',
    manifesto_tape: 'MANIFESTO',
    manifesto_note: "LOW INTERVENTION • UNFILTERED\nAUTHENTIC LIVING SOIL\nWINES WITH MEMORY & SOUL",
  },
  benchmarks: {
    tag: '/ CELLAR BENCHMARKS',
    items: [
      { num: '120+', label: { en: 'Curated Parcels', el: 'Επιλεγμένα Αμπελοτόπια' }, note: { en: 'Across 14 Mediterranean microclimates', el: 'Σε 14 μεσογειακά μικροκλίματα' } },
      { num: '100%', label: { en: 'Low-Intervention', el: 'Ήπιας Παρέμβασης' }, note: { en: 'Native wild yeasts & zero additives', el: 'Αυτόχθονες ζύμες, χωρίς πρόσθετα' } },
      { num: '18 yrs', label: { en: 'Cellar Archival Depth', el: 'Βάθος Αρχειακής Κάβας' }, note: { en: 'Rare vintages dating back to 2008', el: 'Σπάνιες σοδειές από το 2008' } },
      { num: '450+', label: { en: 'Tastings Hosted', el: 'Γευσιγνωσίες' }, note: { en: 'Private sommelier & pairing sessions', el: 'Ιδιωτικές συνεδρίες sommelier' } },
    ],
  },
  values: {
    tag: '/ WHAT WE BELIEVE',
    headline: 'OUR HOUSE PRINCIPLES',
    subtext: 'NON-NEGOTIABLE STANDARDS',
    items: [
      {
        num: '01',
        title: { en: 'Small Makers & Living Soil', el: 'Μικροί Παραγωγοί & Ζωντανό Έδαφος' },
        tag: '/ ORIGIN',
        text: {
          en: 'We champion independent families and small artisanal estates who prune their own ancient vines, harvest by hand, and honor the living biodiversity of their unique soils.',
          el: 'Στηρίζουμε ανεξάρτητους αμπελουργούς που κλαδεύουν οι ίδιοι τα αρχαία κλήματά τους, τρυγούν με το χέρι και σέβονται τη βιοποικιλότητα του τόπου τους.',
        },
      },
      {
        num: '02',
        title: { en: 'Stories Over Point Scores', el: 'Ιστορίες Αντί για Βαθμολογίες' },
        tag: '/ PHILOSOPHY',
        text: {
          en: 'A bottle of wine is a specific landscape and vintage captured in glass. We would rather tell you its raw cultural story and human soul than assign an arbitrary number.',
          el: 'Ένα κρασί είναι ένα συγκεκριμένο τοπίο και μια χρονιά κλεισμένα σε γυαλί. Προτιμούμε να μοιραστούμε την αληθινή ιστορία του παρά να του δώσουμε έναν αριθμό.',
        },
      },
      {
        num: '03',
        title: { en: 'Slow Time & Cellar Patience', el: 'Αργός Χρόνος & Υπομονή Κάβας' },
        tag: '/ PATIENCE',
        text: {
          en: 'Profound wine cannot be rushed. From patient cellar resting to long evenings around our tasting table, we believe the greatest conversations take time to unfold.',
          el: 'Το σπουδαίο κρασί δεν βιάζεται. Από την υπομονετική παλαίωση στην κάβα μέχρι τις μακριές βραδιές στο τραπέζι, πιστεύουμε ότι οι καλύτερες συζητήσεις θέλουν χρόνο.',
        },
      },
    ],
  },
  protocols: {
    tag: '/ THE CELLAR PROCESS',
    items: [
      {
        num: 'A',
        title: { en: 'Direct Estate Allocation', el: 'Απευθείας Κατανομή Κτημάτων' },
        desc: {
          en: 'Securing rare, allocated bottles directly from cellar doors before international release.',
          el: 'Εξασφάλιση σπάνιων φιαλών απευθείας από τα κτήματα πριν την ευρεία κυκλοφορία.',
        },
      },
      {
        num: 'B',
        title: { en: 'Climate-Guaranteed Logistics', el: 'Εγγυημένη Ψυχόμενη Μεταφορά' },
        desc: {
          en: 'Pristine temperature-controlled storage and transit from the cellar straight to your table.',
          el: 'Απόλυτος έλεγχος θερμοκρασίας και αποθήκευσης από το οινοποιείο στο τραπέζι σας.',
        },
      },
      {
        num: 'C',
        title: { en: 'Bespoke Sommelier Advisory', el: 'Προσωποποιημένη Συμβουλευτική' },
        desc: {
          en: 'Personalized cellar curation, hospitality wine programs, and private event pairings.',
          el: 'Εξατομικευμένη επιμέλεια ιδιωτικής κάβας και προτάσεις γευσιγνωσίας.',
        },
      },
    ],
  },
  cta: {
    tape: 'VISIT OR INQUIRE',
    headline: 'CURIOUS? THIRSTY? BOTH?',
    subtext: 'Come find us in our cellar space, or explore the current rare harvest allocations online.',
    button_shop_text: 'Explore the e-Shop',
    button_contact_text: 'Get in Touch',
  },
};

export const DEFAULT_SHOP_CONTENT: ShopPageContent = {
  hero: {
    tag: '/ THE CELLAR COLLECTION',
    badge: 'LIMITED HARVEST ALLOCATIONS',
    headline: 'CURATED HARVESTS & RARE ALLOCATIONS',
    subtext: 'Bottles sourced directly from autonomous estate cellar doors, ungrafted volcanic hillsides, and micro-parcels.',
  },
  categories: [
    { key: 'ALL', label: { en: 'ALL ALLOCATIONS', el: 'ΟΛΕΣ ΟΙ ΕΤΙΚΕΤΕΣ' } },
    { key: 'VOLCANIC', label: { en: 'VOLCANIC & ISLANDS', el: 'ΗΦΑΙΣΤΕΙΑΚΑ & ΝΗΣΙΩΤΙΚΑ' } },
    { key: 'NATURAL', label: { en: 'RAW & NATURAL', el: 'ΦΥΣΙΚΑ & ΗΠΙΑΣ ΠΑΡΕΜΒΑΣΗΣ' } },
    { key: 'RESERVE', label: { en: 'RESERVE ARCHIVE', el: 'ΠΑΛΑΙΩΣΗΣ & ΣΠΑΝΙΑ' } },
    { key: 'INDIGENOUS', label: { en: 'INDIGENOUS PARCELS', el: 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ' } },
  ],
  bottles: [
    {
      id: 'ritual-2021',
      name: 'RITUÁL',
      vintage: '2021',
      region: { en: 'Naoussa, Macedonia', el: 'Νάουσα, Μακεδονία' },
      varietal: { en: 'Xinomavro Old Vines', el: 'Ξινόμαυρο Παλαιά Κλήματα' },
      category: 'INDIGENOUS',
      price: '€ 48.00',
      status: { en: 'LIMITED 120 BOTTLES', el: 'ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ' },
      statusBg: 'bg-[#922e1b]',
      tastingNote: {
        en: 'Sundried tomato, wild rosehip, dark cherry, and tense mineral tannins. Pure northern elegance.',
        el: 'Λιαστή ντομάτα, άγριο κυνόροδο, σκούρο κεράσι και έντονες ορυκτές τανίνες.',
      },
      img: 'cellar_ritual.jpg',
      alcohol: '13.5%',
      soil: { en: 'Limestone & Clay Slopes', el: 'Ασβεστολιθικές & Αργιλώδεις Πλαγιές' },
    },
    {
      id: 'aurea-2023',
      name: 'AUREA',
      vintage: '2023',
      region: { en: 'Pyrgos, Santorini', el: 'Πύργος, Σαντορίνη' },
      varietal: { en: 'Ungrafted Assyrtiko', el: 'Αυτόριζο Ασύρτικο' },
      category: 'VOLCANIC',
      price: '€ 62.00',
      status: { en: 'NEW ALLOCATION', el: 'ΝΕΑ ΕΣΟΔΕΙΑ' },
      statusBg: 'bg-[var(--color-foreground)]',
      tastingNote: {
        en: 'Razor-sharp salinity, crushed volcanic pumice, citrus blossom, and electrifying acidity.',
        el: 'Κοφτερή αλατότητα, θρυμματισμένη κίσσηρη, άνθη εσπεριδοειδών και ηλεκτριστική οξύτητα.',
      },
      img: 'cellar_aurea.jpg',
      alcohol: '14.0%',
      soil: { en: 'Volcanic Ash & Basalt', el: 'Ηφαιστειακή Τέφρα & Βασάλτης' },
    },
    {
      id: 'nectar-2024',
      name: 'NÉCTAR',
      vintage: '2024',
      region: { en: 'Heraklion Hills, Crete', el: 'Ηράκλειο, Κρήτη' },
      varietal: { en: 'Skin-Contact Vidiano', el: 'Βιδιανό Orange 30 Ημερών' },
      category: 'NATURAL',
      price: '€ 39.00',
      status: { en: 'LOW INTERVENTION', el: 'ΗΠΙΑΣ ΠΑΡΕΜΒΑΣΗΣ' },
      statusBg: 'bg-[#922e1b]',
      tastingNote: {
        en: 'Bergamot peel, chamomile, dried apricot, and subtle amber tea tannins. Unfiltered soul.',
        el: 'Φλούδα περγαμόντου, χαμομήλι, αποξηραμένο βερίκοκο και ήπιες τανίνες.',
      },
      img: 'cellar_nectar.jpg',
      alcohol: '13.0%',
      soil: { en: 'Schist & Loam', el: 'Σχιστόλιθος & Πηλός' },
    },
    {
      id: 'sable-2019',
      name: 'SABLE',
      vintage: '2019',
      region: { en: 'Northern Aegean Terraces', el: 'Βόρειο Αιγαίο' },
      varietal: { en: 'Limnio & Mavrotragano', el: 'Λημνιό & Μαυροτράγανο' },
      category: 'RESERVE',
      price: '€ 74.00',
      status: { en: 'CELLAR RESERVE', el: 'ΑΡΧΕΙΑΚΗ ΣΥΛΛΟΓΗ' },
      statusBg: 'bg-[var(--color-foreground)]',
      tastingNote: {
        en: 'Dark bramble fruit, crushed peppercorn, tobacco leaf, and structured deep Mediterranean warmth.',
        el: 'Σκούρα φρούτα του δάσους, πιπέρι, καπνός και βαθιά μεσογειακή δομή.',
      },
      img: 'cellar_sable.jpg',
      alcohol: '14.5%',
      soil: { en: 'Granitic Sandy Soil', el: 'Γρανιτικό Αμμώδες Έδαφος' },
    },
    {
      id: 'anapnoi-2022',
      name: 'ANAPNOÍ',
      vintage: '2022',
      region: { en: 'Slopes of Ainos, Cephalonia', el: 'Πλαγιές Αίνου, Κεφαλονιά' },
      varietal: { en: 'High-Altitude Robola', el: 'Ρομπόλα Υψηλού Υψομέτρου' },
      category: 'VOLCANIC',
      price: '€ 44.00',
      status: { en: 'ALLOCATED LOT', el: 'ΣΠΑΝΙΑ ΠΑΡΤΙΔΑ' },
      statusBg: 'bg-[var(--color-foreground)]',
      tastingNote: {
        en: 'Flint smoke, green pear, mountain herbs, and an invigorating limestone crystalline finish.',
        el: 'Καπνός πυρόλιθου, πράσινο αχλάδι, ορεινά βότανα και κρυστάλλινη επίγευση.',
      },
      img: 'editorial_intro.jpg',
      alcohol: '13.0%',
      soil: { en: 'High Altitude Limestone', el: 'Υψίπεδο Ασβεστολίθου' },
    },
    {
      id: 'vathos-2017',
      name: 'VÁTHOS',
      vintage: '2017',
      region: { en: 'Santorini Caldera Terraces', el: 'Καλντέρα, Σαντορίνη' },
      varietal: { en: 'Centenarian Mavrotragano', el: 'Υπεραιωνόβιο Μαυροτράγανο' },
      category: 'RESERVE',
      price: '€ 98.00',
      status: { en: 'PRIVATE VAULT', el: 'ΙΔΙΩΤΙΚΟ VAULT' },
      statusBg: 'bg-[#922e1b]',
      tastingNote: {
        en: 'Dried fig, graphite, cedarwood, wild rosemary, and massive velvety depth from 7 years cellar sleep.',
        el: 'Αποξηραμένο σύκο, γραφίτης, κέδρος, δεντρολίβανο και βελούδινο βάθος.',
      },
      img: 'hero_cellar.png',
      alcohol: '14.5%',
      soil: { en: 'Ungrafted Volcanic Soil', el: 'Αυτόριζο Ηφαιστειακό Έδαφος' },
    },
  ],
  concierge: {
    tape: 'PRIVATE SOMMELIER CONCIERGE',
    headline: 'LOOKING FOR RARE ARCHIVES OR CELLAR SOURCING?',
    subtext: 'We curate private collections, source museum-allocated verticals, and arrange custom delivery for private cellar cellars across Europe.',
    button_text: 'Consult Our Sommelier →',
    kraft_note: 'BESPOKE CELLAR CURATION',
  },
};

export const DEFAULT_CONTACT_PAGE_CONTENT: ContactPageContent = {
  hero: {
    tag: '/ DIRECT CORRESPONDENCE',
    headline: 'WRITE TO US — WE ALWAYS WRITE BACK',
    subtext: 'Tasting inquiries, cellar consultations, rare bottle allocations, or just to talk Mediterranean wine.',
  },
  form: {
    subjects: [
      { value: 'Private Tasting', label: 'PRIVATE TASTING & PAIRINGS' },
      { value: 'Cellar Consulting', label: 'CELLAR CONSULTING & SOURCING' },
      { value: 'Event Hosting', label: 'EVENT HOSTING & SOMMELIER' },
      { value: 'Press & Collab', label: 'PRESS & EDITORIAL INQUIRY' },
      { value: 'General Inquiry', label: 'GENERAL INQUIRY' },
    ],
    button_text: 'Send Message',
  },
  dispatch: {
    tape: 'CELLAR DISPATCH',
    kraft_note: "TASTINGS BY APPOINTMENT\nWALK-INS WELCOME DURING CELLAR HOURS",
  },
  schedule: {
    tag: '/ CELLAR SCHEDULE & LOCATION',
    hours_title: 'Cellar Door Hours',
    hours_tape: 'WEEKLY SCHEDULE',
    hours_note: 'Private tastings can be arranged outside regular hours upon request.',
    location_title: 'Location & Access',
    location_tape: 'ATHENS CELLAR',
    location_desc: 'Situated in the historic heart of the city. Easily reachable by metro and private transit.',
    map_button_text: 'Open in Google Maps',
  },
};

export const DEFAULT_MAINTENANCE_CONTENT: MaintenancePageContent = {
  tag: '/ HOLDING STATE',
  badge: 'CELLAR CURATION',
  headline: 'THE CELLAR IS BEING RESTOCKED',
  subtext: 'Our allocations ledger and digital cellar space are undergoing seasonal curation.',
  video_url: 'maintenance.mp4',
  video_badge: 'REOPENING SOON',
  inquiry_prefix: 'Direct Inquiries:',
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: SITE.name,
  tagline: SITE.tagline,
  description: SITE.description,
  legalName: SITE.legalName,
  contact: {
    email: SITE.contact.email,
    phone: SITE.contact.phone,
    address: { ...SITE.contact.address },
    mapUrl: SITE.contact.mapUrl,
  },
  hours: [...SITE.hours],
  socials: [...SITE.socials],
  nav: [...SITE.nav],
  colors: { ...DEFAULT_SITE_COLORS },
  homepage_content: JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONTENT)),
  about_content: JSON.parse(JSON.stringify(DEFAULT_ABOUT_CONTENT)),
  shop_content: JSON.parse(JSON.stringify(DEFAULT_SHOP_CONTENT)),
  contact_content: JSON.parse(JSON.stringify(DEFAULT_CONTACT_PAGE_CONTENT)),
  maintenance_content: JSON.parse(JSON.stringify(DEFAULT_MAINTENANCE_CONTENT)),
  maintenance_mode: false,
  store_config: JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG)),
  mail_config: JSON.parse(JSON.stringify(DEFAULT_MAIL_CONFIG)),
};

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  readonly settings = signal<SiteSettings>(DEFAULT_SITE_SETTINGS);
  readonly isLoaded = signal(false);

  readonly name = computed(() => this.settings().name);
  readonly tagline = computed(() => this.settings().tagline);
  readonly description = computed(() => this.settings().description);
  readonly legalName = computed(() => this.settings().legalName);
  readonly contact = computed(() => this.settings().contact);
  readonly hours = computed(() => this.settings().hours);
  readonly socials = computed(() => this.settings().socials);
  readonly nav = computed(() => this.settings().nav);
  readonly colors = computed(() => this.settings().colors || DEFAULT_SITE_COLORS);
  readonly homepage = computed<HomepageContent>(() => this.settings().homepage_content || DEFAULT_HOMEPAGE_CONTENT);
  readonly about = computed<AboutPageContent>(() => this.settings().about_content || DEFAULT_ABOUT_CONTENT);
  readonly shop = computed<ShopPageContent>(() => this.settings().shop_content || DEFAULT_SHOP_CONTENT);
  readonly contactPage = computed<ContactPageContent>(() => this.settings().contact_content || DEFAULT_CONTACT_PAGE_CONTENT);
  readonly maintenancePage = computed<MaintenancePageContent>(() => this.settings().maintenance_content || DEFAULT_MAINTENANCE_CONTENT);
  readonly isMaintenanceMode = computed(() => this.settings().maintenance_mode);
  readonly storeConfig = computed<StoreConfig>(() => this.settings().store_config || DEFAULT_STORE_CONFIG);

  constructor() {
    this.applyTheme(DEFAULT_SITE_COLORS);
  }

  /**
   * Dynamically apply colors as CSS Custom Properties on document root.
   */
  applyTheme(colors?: SiteColors): void {
    if (!colors || typeof document === 'undefined') return;
    const root = document.documentElement;

    if (colors.primary) {
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-wine-700', colors.primary);
    }
    if (colors.paper) {
      root.style.setProperty('--color-paper-light', colors.paper);
      root.style.setProperty('--color-background', colors.paper);
      root.style.setProperty('--color-surface', colors.paper);
    }
    if (colors.ink) {
      root.style.setProperty('--color-foreground', colors.ink);
      root.style.setProperty('--color-ink', colors.ink);
    }
    if (colors.accent) {
      root.style.setProperty('--color-accent', colors.accent);
      root.style.setProperty('--color-gold-500', colors.accent);
    }
    if (colors.terracotta) {
      root.style.setProperty('--color-terracotta', colors.terracotta);
    }
    if (colors.card_dark) {
      root.style.setProperty('--color-paper-dark', colors.card_dark);
    }
  }

  /**
   * Load public settings from backend API. Falls back cleanly to local defaults.
   */
  load(): Observable<SiteSettings> {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoaded.set(true);
      return of(this.settings());
    }
    return this.http.get<SiteSettings>(`${API_BASE}/settings`).pipe(
      tap((loaded) => {
        if (loaded && typeof loaded === 'object') {
          const mergedColors: SiteColors = {
            ...DEFAULT_SITE_COLORS,
            ...(loaded.colors || {}),
          };

          const mergedHomepage: HomepageContent = {
            ...DEFAULT_HOMEPAGE_CONTENT,
            ...(loaded.homepage_content || {}),
            hero: {
              ...DEFAULT_HOMEPAGE_CONTENT.hero,
              ...(loaded.homepage_content?.hero || {}),
            },
            intro: {
              ...DEFAULT_HOMEPAGE_CONTENT.intro,
              ...(loaded.homepage_content?.intro || {}),
              bullet_points: Array.isArray(loaded.homepage_content?.intro?.bullet_points)
                ? loaded.homepage_content.intro.bullet_points
                : DEFAULT_HOMEPAGE_CONTENT.intro.bullet_points,
            },
            manifesto: {
              ...DEFAULT_HOMEPAGE_CONTENT.manifesto,
              ...(loaded.homepage_content?.manifesto || {}),
            },
            services: {
              ...DEFAULT_HOMEPAGE_CONTENT.services,
              ...(loaded.homepage_content?.services || {}),
              items: Array.isArray(loaded.homepage_content?.services?.items)
                ? loaded.homepage_content.services.items
                : DEFAULT_HOMEPAGE_CONTENT.services.items,
            },
            craft: {
              ...DEFAULT_HOMEPAGE_CONTENT.craft,
              ...(loaded.homepage_content?.craft || {}),
              keywords: Array.isArray(loaded.homepage_content?.craft?.keywords)
                ? loaded.homepage_content.craft.keywords
                : DEFAULT_HOMEPAGE_CONTENT.craft.keywords,
              metrics: Array.isArray(loaded.homepage_content?.craft?.metrics)
                ? loaded.homepage_content.craft.metrics
                : DEFAULT_HOMEPAGE_CONTENT.craft.metrics,
            },
            cellar: {
              ...DEFAULT_HOMEPAGE_CONTENT.cellar,
              ...(loaded.homepage_content?.cellar || {}),
              items: Array.isArray(loaded.homepage_content?.cellar?.items)
                ? loaded.homepage_content.cellar.items
                : DEFAULT_HOMEPAGE_CONTENT.cellar.items,
            },
            press: {
              ...DEFAULT_HOMEPAGE_CONTENT.press,
              ...(loaded.homepage_content?.press || {}),
              quotes: Array.isArray(loaded.homepage_content?.press?.quotes)
                ? loaded.homepage_content.press.quotes
                : DEFAULT_HOMEPAGE_CONTENT.press.quotes,
              logos: Array.isArray(loaded.homepage_content?.press?.logos)
                ? loaded.homepage_content.press.logos
                : DEFAULT_HOMEPAGE_CONTENT.press.logos,
              testimonials: Array.isArray(loaded.homepage_content?.press?.testimonials)
                ? loaded.homepage_content.press.testimonials
                : DEFAULT_HOMEPAGE_CONTENT.press.testimonials,
            },
            contact: {
              ...DEFAULT_HOMEPAGE_CONTENT.contact,
              ...(loaded.homepage_content?.contact || {}),
              card_socials: Array.isArray(loaded.homepage_content?.contact?.card_socials)
                ? loaded.homepage_content.contact.card_socials
                : DEFAULT_HOMEPAGE_CONTENT.contact.card_socials,
            },
            footer: {
              ...DEFAULT_HOMEPAGE_CONTENT.footer,
              ...(loaded.homepage_content?.footer || {}),
              links: Array.isArray(loaded.homepage_content?.footer?.links)
                ? loaded.homepage_content.footer.links
                : DEFAULT_HOMEPAGE_CONTENT.footer.links,
            },
          };

          const merged: SiteSettings = {
            ...DEFAULT_SITE_SETTINGS,
            ...loaded,
            contact: {
              ...DEFAULT_SITE_SETTINGS.contact,
              ...(loaded.contact || {}),
              address: {
                ...DEFAULT_SITE_SETTINGS.contact.address,
                ...(loaded.contact?.address || {}),
              },
            },
            hours: Array.isArray(loaded.hours) ? loaded.hours : DEFAULT_SITE_SETTINGS.hours,
            socials: Array.isArray(loaded.socials) ? loaded.socials : DEFAULT_SITE_SETTINGS.socials,
            nav: Array.isArray(loaded.nav) ? this.dedupeNav(loaded.nav) : DEFAULT_SITE_SETTINGS.nav,
            colors: mergedColors,
            homepage_content: mergedHomepage,
            about_content: loaded.about_content || DEFAULT_ABOUT_CONTENT,
            shop_content: loaded.shop_content || DEFAULT_SHOP_CONTENT,
            contact_content: loaded.contact_content || DEFAULT_CONTACT_PAGE_CONTENT,
            maintenance_content: loaded.maintenance_content || DEFAULT_MAINTENANCE_CONTENT,
            store_config: {
              ...DEFAULT_STORE_CONFIG,
              ...(loaded.store_config || {}),
              tax_rate: Number((loaded.store_config as any)?.tax_rate ?? DEFAULT_STORE_CONFIG.tax_rate),
              tax_included: Boolean((loaded.store_config as any)?.tax_included ?? DEFAULT_STORE_CONFIG.tax_included),
              store_enabled: Boolean((loaded.store_config as any)?.store_enabled ?? DEFAULT_STORE_CONFIG.store_enabled),
              free_shipping_threshold: Number((loaded.store_config as any)?.free_shipping_threshold ?? DEFAULT_STORE_CONFIG.free_shipping_threshold),
              shipping_fee: Number((loaded.store_config as any)?.shipping_fee ?? DEFAULT_STORE_CONFIG.shipping_fee),
              order_minimum_amount: Number((loaded.store_config as any)?.order_minimum_amount ?? DEFAULT_STORE_CONFIG.order_minimum_amount),
              categories: Array.isArray((loaded.store_config as any)?.categories)
                ? (loaded.store_config as any).categories
                : DEFAULT_STORE_CONFIG.categories,
            },
            mail_config: {
              ...DEFAULT_MAIL_CONFIG,
              ...(loaded.mail_config || {}),
            },
          };

          this.settings.set(merged);
          this.applyTheme(mergedColors);
        }
        this.isLoaded.set(true);
      }),
      catchError(() => {
        // Backend offline or unreachable — keep default fallback
        this.applyTheme(DEFAULT_SITE_COLORS);
        this.isLoaded.set(true);
        return of(this.settings());
      })
    );
  }

  /**
   * Update settings in database via admin API and update local reactive state.
   */
  update(data: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.http.put<SiteSettings>(`${API_BASE}/admin/settings`, data).pipe(
      tap((updated) => {
        if (updated && typeof updated === 'object') {
          const mergedColors: SiteColors = {
            ...DEFAULT_SITE_COLORS,
            ...(updated.colors || (data.colors ? data.colors : this.settings().colors) || {}),
          };

          const rawHp = updated.homepage_content || data.homepage_content || this.settings().homepage_content || DEFAULT_HOMEPAGE_CONTENT;
          const mergedHomepage: HomepageContent = {
            ...DEFAULT_HOMEPAGE_CONTENT,
            ...rawHp,
            hero: { ...DEFAULT_HOMEPAGE_CONTENT.hero, ...(rawHp.hero || {}) },
            intro: {
              ...DEFAULT_HOMEPAGE_CONTENT.intro,
              ...(rawHp.intro || {}),
              bullet_points: Array.isArray(rawHp.intro?.bullet_points) ? rawHp.intro.bullet_points : DEFAULT_HOMEPAGE_CONTENT.intro.bullet_points,
            },
            manifesto: { ...DEFAULT_HOMEPAGE_CONTENT.manifesto, ...(rawHp.manifesto || {}) },
            services: {
              ...DEFAULT_HOMEPAGE_CONTENT.services,
              ...(rawHp.services || {}),
              items: Array.isArray(rawHp.services?.items) ? rawHp.services.items : DEFAULT_HOMEPAGE_CONTENT.services.items,
            },
            craft: {
              ...DEFAULT_HOMEPAGE_CONTENT.craft,
              ...(rawHp.craft || {}),
              keywords: Array.isArray(rawHp.craft?.keywords) ? rawHp.craft.keywords : DEFAULT_HOMEPAGE_CONTENT.craft.keywords,
              metrics: Array.isArray(rawHp.craft?.metrics) ? rawHp.craft.metrics : DEFAULT_HOMEPAGE_CONTENT.craft.metrics,
            },
            cellar: {
              ...DEFAULT_HOMEPAGE_CONTENT.cellar,
              ...(rawHp.cellar || {}),
              items: Array.isArray(rawHp.cellar?.items) ? rawHp.cellar.items : DEFAULT_HOMEPAGE_CONTENT.cellar.items,
            },
            press: {
              ...DEFAULT_HOMEPAGE_CONTENT.press,
              ...(rawHp.press || {}),
              quotes: Array.isArray(rawHp.press?.quotes) ? rawHp.press.quotes : DEFAULT_HOMEPAGE_CONTENT.press.quotes,
              logos: Array.isArray(rawHp.press?.logos) ? rawHp.press.logos : DEFAULT_HOMEPAGE_CONTENT.press.logos,
              testimonials: Array.isArray(rawHp.press?.testimonials) ? rawHp.press.testimonials : DEFAULT_HOMEPAGE_CONTENT.press.testimonials,
            },
            contact: {
              ...DEFAULT_HOMEPAGE_CONTENT.contact,
              ...(rawHp.contact || {}),
              card_socials: Array.isArray(rawHp.contact?.card_socials) ? rawHp.contact.card_socials : DEFAULT_HOMEPAGE_CONTENT.contact.card_socials,
            },
            footer: {
              ...DEFAULT_HOMEPAGE_CONTENT.footer,
              ...(rawHp.footer || {}),
              links: Array.isArray(rawHp.footer?.links) ? rawHp.footer.links : DEFAULT_HOMEPAGE_CONTENT.footer.links,
            },
          };

          const rawSc = updated.store_config || data.store_config || this.settings().store_config || DEFAULT_STORE_CONFIG;
          const mergedStoreConfig: StoreConfig = {
            ...DEFAULT_STORE_CONFIG,
            ...rawSc,
            tax_rate: Number((rawSc as any)?.tax_rate ?? DEFAULT_STORE_CONFIG.tax_rate),
            tax_included: Boolean((rawSc as any)?.tax_included ?? DEFAULT_STORE_CONFIG.tax_included),
            store_enabled: Boolean((rawSc as any)?.store_enabled ?? DEFAULT_STORE_CONFIG.store_enabled),
            free_shipping_threshold: Number((rawSc as any)?.free_shipping_threshold ?? DEFAULT_STORE_CONFIG.free_shipping_threshold),
            shipping_fee: Number((rawSc as any)?.shipping_fee ?? DEFAULT_STORE_CONFIG.shipping_fee),
            order_minimum_amount: Number((rawSc as any)?.order_minimum_amount ?? DEFAULT_STORE_CONFIG.order_minimum_amount),
            categories: Array.isArray((rawSc as any)?.categories)
              ? (rawSc as any).categories
              : DEFAULT_STORE_CONFIG.categories,
          };

          const merged: SiteSettings = {
            ...this.settings(),
            ...updated,
            contact: {
              ...this.settings().contact,
              ...(updated.contact || {}),
              address: {
                ...this.settings().contact.address,
                ...(updated.contact?.address || {}),
              },
            },
            hours: Array.isArray(updated.hours) ? updated.hours : this.settings().hours,
            socials: Array.isArray(updated.socials) ? updated.socials : this.settings().socials,
            nav: Array.isArray(updated.nav) ? this.dedupeNav(updated.nav) : this.dedupeNav(this.settings().nav),
            colors: mergedColors,
            homepage_content: mergedHomepage,
            about_content: updated.about_content || data.about_content || this.settings().about_content || DEFAULT_ABOUT_CONTENT,
            shop_content: updated.shop_content || data.shop_content || this.settings().shop_content || DEFAULT_SHOP_CONTENT,
            contact_content: updated.contact_content || data.contact_content || this.settings().contact_content || DEFAULT_CONTACT_PAGE_CONTENT,
            maintenance_content: updated.maintenance_content || data.maintenance_content || this.settings().maintenance_content || DEFAULT_MAINTENANCE_CONTENT,
            store_config: mergedStoreConfig,
          };

          this.settings.set(merged);
          this.applyTheme(mergedColors);
        }
      })
    );
  }

  private dedupeNav(items: Array<{ label: string; path: string }>): Array<{ label: string; path: string }> {
    if (!Array.isArray(items)) return [...DEFAULT_SITE_SETTINGS.nav];
    const seen = new Set<string>();
    const result: Array<{ label: string; path: string }> = [];
    for (const item of items) {
      if (!item || !item.path) continue;
      if (!seen.has(item.path)) {
        seen.add(item.path);
        result.push(item);
      }
    }
    return result.length > 0 ? result : [...DEFAULT_SITE_SETTINGS.nav];
  }
}
