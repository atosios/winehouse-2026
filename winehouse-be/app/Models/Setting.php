<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Default settings dictionary matching the Winehouse design and site-config.
     */
    public static function defaults(): array
    {
        return [
            'name' => 'The Winehouse',
            'tagline' => 'A house of wine, stories & slow living',
            'description' => 'Curated wines from small vineyards, tales from the cellar, tastings and tours. Poured with care, told with love.',
            'legalName' => 'The Winehouse',
            'contact' => [
                'email' => 'hello@thewinehouse.gr',
                'phone' => '+30 210 000 0000',
                'address' => [
                    'street' => 'Independent Wine Atelier',
                    'city' => 'Worldwide Curation & Delivery',
                    'postalCode' => '',
                    'country' => '',
                ],
                'mapUrl' => '',
            ],
            'hours' => [
                ['days' => 'Tuesday – Friday', 'time' => '12:00 – 22:00'],
                ['days' => 'Saturday', 'time' => '11:00 – 23:00'],
                ['days' => 'Sunday & Monday', 'time' => 'Closed'],
            ],
            'socials' => [
                ['label' => 'Instagram', 'url' => 'https://instagram.com/thewinehouse'],
                ['label' => 'Facebook', 'url' => 'https://facebook.com/thewinehouse'],
            ],
            'nav' => [
                ['label' => 'Home', 'path' => '/'],
                ['label' => 'About Us', 'path' => '/about'],
                ['label' => 'e-Shop', 'path' => '/shop'],
                ['label' => 'Contact', 'path' => '/contact'],
            ],
            'colors' => [
                'primary' => '#c84b31',
                'paper' => '#ece7e1',
                'ink' => '#111111',
                'accent' => '#c9a227',
                'terracotta' => '#c84b31',
                'card_dark' => '#111111',
            ],
            'homepage_content' => [
                'hero' => [
                    'tag' => '/ HERO',
                    'video_url' => 'def.mp4',
                    'video_alt_url' => 'hero_video.mp4',
                    'small_prefix' => 'The',
                    'big_title' => 'Winehouse',
                    'show_stain' => true,
                ],
                'intro' => [
                    'enabled' => true,
                    'tag' => '/ WINE ATELIER & CELLAR',
                    'tape_sticker' => 'WINE ATELIER',
                    'heading_line1' => 'WINE',
                    'heading_line2' => 'HOUSE',
                    'bullet_points' => [
                        '+ SMALL-BATCH INDEPENDENT GROWERS',
                        '+ LOW-INTERVENTION & BIODYNAMIC',
                        '+ UNFILTERED STORIES FROM THE VINES',
                    ],
                    'philosophy_label' => 'Philosophy',
                    'philosophy_quote' => '“Wine is bottled emotion, shaped by ancient sun and quiet patience.”',
                    'image_url' => 'editorial_intro.jpg',
                    'image_tag' => 'CURATED SELECTION',
                    'monogram' => 'WH',
                    'vertical_banner' => 'AVAILABLE FOR PRIVATE TASTINGS',
                    'cta_text' => "LET'S\nTASTE",
                    'cta_link' => '/contact',
                ],
                'manifesto' => [
                    'enabled' => true,
                    'tag' => '/ MANIFESTO',
                    'headline' => "GOOD WINE\nISN'T DECORATION.\nIT'S DIRECTION.",
                    'paragraph_1' => 'We believe in clarity over clutter. Soil over shortcuts. Emotion over formality.',
                    'paragraph_2' => 'Our cellar lives at the intersection of wild Mediterranean terroir and quiet craftsmanship — where forgotten varieties become unforgettable memories, and every bottle creates lasting impact.',
                    'stamp_text' => 'WINEHOUSE • SOUL • ATELIER • 2026 •',
                    'stamp_icon' => '🍇',
                    'side_tags' => "SOIL\nPEOPLE\nCULTURE",
                ],
                'services' => [
                    'enabled' => true,
                    'tag' => '/ SERVICES',
                    'items' => [
                        [
                            'num' => '01',
                            'title' => 'CELLAR SELECTION',
                            'subtitle' => 'SMALL-BATCH PRODUCERS, INDIGENOUS VARIETALS, NATURAL IMPORTS, RARE VINTAGES',
                            'link' => '/shop',
                        ],
                        [
                            'num' => '02',
                            'title' => 'PRIVATE TASTINGS',
                            'subtitle' => 'GUIDED SOMMELIER FLIGHTS, SENSORY PAIRINGS, INTIMATE TABLE GATHERINGS',
                            'link' => '/contact',
                        ],
                        [
                            'num' => '03',
                            'title' => 'VINEYARD EXPEDITIONS',
                            'subtitle' => 'TERROIR WALKS, HARVEST EXPEDITIONS, DIRECT PRODUCER MASTERCLASSES',
                            'link' => '/about',
                        ],
                        [
                            'num' => '04',
                            'title' => 'CELLAR CURATION',
                            'subtitle' => 'HOME & RESTAURANT CELLAR ARCHITECTURE, BESPOKE SOURCING, VINTAGE ADVISORY',
                            'link' => '/contact',
                        ],
                    ],
                ],
                'craft' => [
                    'enabled' => true,
                    'tag' => '/ EXPERTISE & CRAFT',
                    'keywords' => [
                        'NATURAL WINES',
                        'LOW INTERVENTION',
                        'OLD VINES CRAFT',
                        'SOMMELIER CURATION',
                        'TERROIR SOURCING',
                        'TASTING FLIGHTS',
                    ],
                    'metrics' => [
                        ['num' => '01', 'name' => 'INDEPENDENT GROWERS', 'pct' => 95],
                        ['num' => '02', 'name' => 'INDIGENOUS OLD VARIETALS', 'pct' => 90],
                        ['num' => '03', 'name' => 'ORGANIC & BIODYNAMIC', 'pct' => 90],
                        ['num' => '04', 'name' => 'RARE & AGED VINTAGES', 'pct' => 85],
                        ['num' => '05', 'name' => 'NATURAL & UNFILTERED', 'pct' => 80],
                        ['num' => '06', 'name' => 'HAND-HARVESTED LOTS', 'pct' => 95],
                    ],
                    'asterisk_tape' => 'EST. ATELIER',
                    'asterisk_symbol' => '*',
                    'kraft_note' => "BOTTLES THAT\nMOVE PEOPLE",
                ],
                'cellar' => [
                    'enabled' => true,
                    'tag' => '/ SELECTED WORK & CELLAR',
                    'view_all_text' => 'VIEW ALL PROJECTS & BOTTLES',
                    'view_all_link' => '/shop',
                    'items' => [
                        [
                            'name' => 'RITUÁL',
                            'font_style' => 'font-serif tracking-wider font-semibold',
                            'img' => 'cellar_ritual.jpg',
                            'tags' => ['BRANDING', 'XINOMAVRO', '2021'],
                            'link' => '/shop',
                            'badge_bg' => 'bg-[#b83822]',
                        ],
                        [
                            'name' => 'AUREA',
                            'font_style' => 'font-serif tracking-widest uppercase font-light',
                            'img' => 'cellar_aurea.jpg',
                            'tags' => ['VOLCANIC', 'ASSYRTIKO', '2023'],
                            'link' => '/shop',
                            'badge_bg' => 'bg-[#111111]',
                        ],
                        [
                            'name' => 'NÉCTAR',
                            'font_style' => 'font-sans font-bold tracking-tight',
                            'img' => 'cellar_nectar.jpg',
                            'tags' => ['NATURAL', 'ORANGE', '2024'],
                            'link' => '/shop',
                            'badge_bg' => 'bg-[#b83822]',
                        ],
                        [
                            'name' => 'SABLE',
                            'font_style' => 'font-sans font-extrabold tracking-normal',
                            'img' => 'cellar_sable.jpg',
                            'tags' => ['RESERVE', 'CELLAR LOT', '2019'],
                            'link' => '/shop',
                            'badge_bg' => 'bg-[#111111]',
                        ],
                    ],
                ],
                'press' => [
                    'enabled' => true,
                    'tag' => '/ PRESS & WORDS',
                    'quotes' => [
                        [
                            'quote' => 'THE WINEHOUSE HAS A RARE ABILITY TO TURN ANCIENT SOIL AND FORGOTTEN VINES INTO PROFOUND STORIES THAT RESONATE DEEPLY.',
                            'author' => '— THE CULINARY REVIEW',
                        ],
                        [
                            'quote' => 'AN UNMATCHED CURATION OF THE MOST PROVOCATIVE LOW-INTERVENTION WINES AND CULTURAL SOUL.',
                            'author' => '— GASTRONOMY DISPATCH',
                        ],
                        [
                            'quote' => 'ELEGANCE, CLARITY, AND PURE EMOTION IN EVERY BOTTLE. A BENCHMARK FOR CONTEMPORARY WINE CULTURE.',
                            'author' => '— MEDITERRANEAN TASTE JOURNAL',
                        ],
                    ],
                    'logos' => [
                        'DECANTER',
                        'WALLPAPER*',
                        'WINE SPECTATOR',
                        'MICHELIN',
                        'MONOCLE',
                        'LE FIGARO',
                    ],
                    'testimonials' => [
                        [
                            'text' => '“The Winehouse is a brilliant cellar and strategic partner. Their curated selections elevate our table and move our guests.”',
                            'author' => 'ALEXANDRA BOND',
                            'title' => 'HEAD SOMMELIER, AUREA',
                        ],
                        [
                            'text' => '“They bring clarity, vision, and refined elegance to every tasting. A true creative leader in Mediterranean wine.”',
                            'author' => 'JONAS WOLFF',
                            'title' => 'FOUNDER, STUDIO WOLFF',
                        ],
                        [
                            'text' => '“The way The Winehouse connects history, soil, and human emotion is what makes their work unforgettable.”',
                            'author' => 'MARIA SILVA',
                            'title' => 'CURATOR, RITUÁL',
                        ],
                    ],
                ],
                'contact' => [
                    'enabled' => true,
                    'tag' => '/ GET IN TOUCH',
                    'headline' => "LET'S CREATE\nSOMETHING\nMEANINGFUL.",
                    'subtext' => 'Curating bespoke wine experiences, private table tastings & cellar consultation.',
                    'button_text' => 'SEND MESSAGE',
                    'card_cellar_label' => 'Cellar',
                    'card_cellar_text' => "INDEPENDENT ATELIER\nSHIPPING WORLDWIDE",
                    'card_direct_label' => 'Direct',
                    'card_email' => 'hello@thewinehouse.gr',
                    'card_phone' => '+30 210 123 4567',
                    'card_socials' => [
                        ['label' => 'INSTAGRAM', 'url' => 'https://instagram.com'],
                        ['label' => 'SUBSTACK', 'url' => 'https://substack.com'],
                        ['label' => 'SPOTIFY', 'url' => 'https://spotify.com'],
                    ],
                    'card_kraft_note' => "I'M ALWAYS OPEN\nTO NEW IDEAS",
                ],
                'footer' => [
                    'tag' => '/ FOOTER',
                    'brand_name' => 'THE WINEHOUSE',
                    'copyright_text' => '© 2026 THE WINEHOUSE. ALL RIGHTS RESERVED.',
                    'links' => [
                        ['label' => 'PRIVACY', 'path' => '/about'],
                        ['label' => 'TERMS', 'path' => '/about'],
                    ],
                ],
            ],
            'about_content' => [
                'hero' => [
                    'tag' => '/ OUR STORY & PHILOSOPHY',
                    'headline' => 'A HOUSE BUILT ON CORKS, TERROIR & CONVERSATIONS',
                    'subtext' => 'From forgotten ancient hillsides to bespoke cellar vaults — curated low-intervention wines and living Mediterranean stories.',
                ],
                'story' => [
                    'tag' => '/ THE CELLAR ORIGINS',
                    'quote' => '“The Winehouse began around a quiet table, long after the plates were cleared, when someone opened one more bottle ‘just to try’.”',
                    'body_1' => 'What started as a modest shelf of personal favourites for friends slowly grew into a private cellar, then a curated atelier, and finally a dedicated home for Mediterranean wine culture.',
                    'body_2' => 'We are not sommeliers in rigid suits. We are people who fell for wine sideways — through harvest trips at dawn, through vignerons who speak of their ancient rootstocks like family, and through bottles that taste unequivocally like the volcanic slope or limestone crag they came from. That is the only wine we look for, and the only kind we pour.',
                    'note' => 'Every single allocation on our shelves has been tasted, argued over, and loved by our team.',
                    'manifesto_tape' => 'MANIFESTO',
                    'manifesto_note' => "LOW INTERVENTION • UNFILTERED\nAUTHENTIC LIVING SOIL\nWINES WITH MEMORY & SOUL",
                ],
                'benchmarks' => [
                    'tag' => '/ CELLAR BENCHMARKS',
                    'items' => [
                        ['num' => '120+', 'label' => ['en' => 'Curated Parcels', 'el' => 'Επιλεγμένα Αμπελοτόπια'], 'note' => ['en' => 'Across 14 Mediterranean microclimates', 'el' => 'Σε 14 μεσογειακά μικροκλίματα']],
                        ['num' => '100%', 'label' => ['en' => 'Low-Intervention', 'el' => 'Ήπιας Παρέμβασης'], 'note' => ['en' => 'Native wild yeasts & zero additives', 'el' => 'Αυτόχθονες ζύμες, χωρίς πρόσθετα']],
                        ['num' => '18 yrs', 'label' => ['en' => 'Cellar Archival Depth', 'el' => 'Βάθος Αρχειακής Κάβας'], 'note' => ['en' => 'Rare vintages dating back to 2008', 'el' => 'Σπάνιες σοδειές από το 2008']],
                        ['num' => '450+', 'label' => ['en' => 'Tastings Hosted', 'el' => 'Γευσιγνωσίες'], 'note' => ['en' => 'Private sommelier & pairing sessions', 'el' => 'Ιδιωτικές συνεδρίες sommelier']],
                    ],
                ],
                'values' => [
                    'tag' => '/ WHAT WE BELIEVE',
                    'headline' => 'OUR HOUSE PRINCIPLES',
                    'subtext' => 'NON-NEGOTIABLE STANDARDS',
                    'items' => [
                        [
                            'num' => '01',
                            'title' => ['en' => 'Small Makers & Living Soil', 'el' => 'Μικροί Παραγωγοί & Ζωντανό Έδαφος'],
                            'tag' => '/ ORIGIN',
                            'text' => ['en' => 'We champion independent families and small artisanal estates who prune their own ancient vines, harvest by hand, and honor the living biodiversity of their unique soils.', 'el' => 'Στηρίζουμε ανεξάρτητους αμπελουργούς που κλαδεύουν οι ίδιοι τα αρχαία κλήματά τους, τρυγούν με το χέρι και σέβονται τη βιοποικιλότητα του τόπου τους.'],
                        ],
                        [
                            'num' => '02',
                            'title' => ['en' => 'Stories Over Point Scores', 'el' => 'Ιστορίες Αντί για Βαθμολογίες'],
                            'tag' => '/ PHILOSOPHY',
                            'text' => ['en' => 'A bottle of wine is a specific landscape and vintage captured in glass. We would rather tell you its raw cultural story and human soul than assign an arbitrary number.', 'el' => 'Ένα κρασί είναι ένα συγκεκριμένο τοπίο και μια χρονιά κλεισμένα σε γυαλί. Προτιμούμε να μοιραστούμε την αληθινή ιστορία του παρά να του δώσουμε έναν αριθμό.'],
                        ],
                        [
                            'num' => '03',
                            'title' => ['en' => 'Slow Time & Cellar Patience', 'el' => 'Αργός Χρόνος & Υπομονή Κάβας'],
                            'tag' => '/ PATIENCE',
                            'text' => ['en' => 'Profound wine cannot be rushed. From patient cellar resting to long evenings around our tasting table, we believe the greatest conversations take time to unfold.', 'el' => 'Το σπουδαίο κρασί δεν βιάζεται. Από την υπομονετική παλαίωση στην κάβα μέχρι τις μακριές βραδιές στο τραπέζι, πιστεύουμε ότι οι καλύτερες συζητήσεις θέλουν χρόνο.'],
                        ],
                    ],
                ],
                'protocols' => [
                    'tag' => '/ THE CELLAR PROCESS',
                    'items' => [
                        ['num' => 'A', 'title' => ['en' => 'Direct Estate Allocation', 'el' => 'Απευθείας Κατανομή Κτημάτων'], 'desc' => ['en' => 'Securing rare, allocated bottles directly from cellar doors before international release.', 'el' => 'Εξασφάλιση σπάνιων φιαλών απευθείας από τα κτήματα πριν την ευρεία κυκλοφορία.']],
                        ['num' => 'B', 'title' => ['en' => 'Climate-Guaranteed Logistics', 'el' => 'Εγγυημένη Ψυχόμενη Μεταφορά'], 'desc' => ['en' => 'Pristine temperature-controlled storage and transit from the cellar straight to your table.', 'el' => 'Απόλυτος έλεγχος θερμοκρασίας και αποθήκευσης από το οινοποιείο στο τραπέζι σας.']],
                        ['num' => 'C', 'title' => ['en' => 'Bespoke Sommelier Advisory', 'el' => 'Προσωποποιημένη Συμβουλευτική'], 'desc' => ['en' => 'Personalized cellar curation, hospitality wine programs, and private event pairings.', 'el' => 'Εξατομικευμένη επιμέλεια ιδιωτικής κάβας και προτάσεις γευσιγνωσίας.']],
                    ],
                ],
                'cta' => [
                    'tape' => 'VISIT OR INQUIRE',
                    'headline' => 'CURIOUS? THIRSTY? BOTH?',
                    'subtext' => 'Come find us in our cellar space, or explore the current rare harvest allocations online.',
                    'button_shop_text' => 'Explore the e-Shop',
                    'button_contact_text' => 'Get in Touch',
                ],
            ],
            'shop_content' => [
                'hero' => [
                    'tag' => '/ THE CELLAR COLLECTION',
                    'badge' => 'LIMITED HARVEST ALLOCATIONS',
                    'headline' => 'CURATED HARVESTS & RARE ALLOCATIONS',
                    'subtext' => 'Bottles sourced directly from autonomous estate cellar doors, ungrafted volcanic hillsides, and micro-parcels.',
                ],
                'categories' => [
                    ['key' => 'ALL', 'label' => ['en' => 'ALL ALLOCATIONS', 'el' => 'ΟΛΕΣ ΟΙ ΕΤΙΚΕΤΕΣ']],
                    ['key' => 'VOLCANIC', 'label' => ['en' => 'VOLCANIC & ISLANDS', 'el' => 'ΗΦΑΙΣΤΕΙΑΚΑ & ΝΗΣΙΩΤΙΚΑ']],
                    ['key' => 'NATURAL', 'label' => ['en' => 'RAW & NATURAL', 'el' => 'ΦΥΣΙΚΑ & ΗΠΙΑΣ ΠΑΡΕΜΒΑΣΗΣ']],
                    ['key' => 'RESERVE', 'label' => ['en' => 'RESERVE ARCHIVE', 'el' => 'ΠΑΛΑΙΩΣΗΣ & ΣΠΑΝΙΑ']],
                    ['key' => 'INDIGENOUS', 'label' => ['en' => 'INDIGENOUS PARCELS', 'el' => 'ΑΥΤΟΧΘΟΝΕΣ ΠΟΙΚΙΛΙΕΣ']],
                ],
                'bottles' => [
                    [
                        'id' => 'ritual-2021',
                        'name' => 'RITUÁL',
                        'vintage' => '2021',
                        'region' => ['en' => 'Naoussa, Macedonia', 'el' => 'Νάουσα, Μακεδονία'],
                        'varietal' => ['en' => 'Xinomavro Old Vines', 'el' => 'Ξινόμαυρο Παλαιά Κλήματα'],
                        'category' => 'INDIGENOUS',
                        'price' => '€ 48.00',
                        'status' => ['en' => 'LIMITED 120 BOTTLES', 'el' => 'ΠΕΡΙΟΡΙΣΜΕΝΗ ΚΑΤΑΝΟΜΗ'],
                        'statusBg' => 'bg-[#922e1b]',
                        'tastingNote' => ['en' => 'Sundried tomato, wild rosehip, dark cherry, and tense mineral tannins. Pure northern elegance.', 'el' => 'Λιαστή ντομάτα, άγριο κυνόροδο, σκούρο κεράσι και έντονες ορυκτές τανίνες.'],
                        'img' => 'cellar_ritual.jpg',
                        'alcohol' => '13.5%',
                        'soil' => ['en' => 'Limestone & Clay Slopes', 'el' => 'Ασβεστολιθικές & Αργιλώδεις Πλαγιές'],
                    ],
                    [
                        'id' => 'aurea-2023',
                        'name' => 'AUREA',
                        'vintage' => '2023',
                        'region' => ['en' => 'Pyrgos, Santorini', 'el' => 'Πύργος, Σαντορίνη'],
                        'varietal' => ['en' => 'Ungrafted Assyrtiko', 'el' => 'Αυτόριζο Ασύρτικο'],
                        'category' => 'VOLCANIC',
                        'price' => '€ 62.00',
                        'status' => ['en' => 'NEW ALLOCATION', 'el' => 'ΝΕΑ ΕΣΟΔΕΙΑ'],
                        'statusBg' => 'bg-[var(--color-foreground)]',
                        'tastingNote' => ['en' => 'Razor-sharp salinity, crushed volcanic pumice, citrus blossom, and electrifying acidity.', 'el' => 'Κοφτερή αλατότητα, θρυμματισμένη κίσσηρη, άνθη εσπεριδοειδών και ηλεκτριστική οξύτητα.'],
                        'img' => 'cellar_aurea.jpg',
                        'alcohol' => '14.0%',
                        'soil' => ['en' => 'Volcanic Ash & Basalt', 'el' => 'Ηφαιστειακή Τέφρα & Βασάλτης'],
                    ],
                    [
                        'id' => 'nectar-2024',
                        'name' => 'NÉCTAR',
                        'vintage' => '2024',
                        'region' => ['en' => 'Heraklion Hills, Crete', 'el' => 'Ηράκλειο, Κρήτη'],
                        'varietal' => ['en' => 'Skin-Contact Vidiano', 'el' => 'Βιδιανό Orange 30 Ημερών'],
                        'category' => 'NATURAL',
                        'price' => '€ 39.00',
                        'status' => ['en' => 'LOW INTERVENTION', 'el' => 'ΗΠΙΑΣ ΠΑΡΕΜΒΑΣΗΣ'],
                        'statusBg' => 'bg-[#922e1b]',
                        'tastingNote' => ['en' => 'Bergamot peel, chamomile, dried apricot, and subtle amber tea tannins. Unfiltered soul.', 'el' => 'Φλούδα περγαμόντου, χαμομήλι, αποξηραμένο βερίκοκο και ήπιες τανίνες.'],
                        'img' => 'cellar_nectar.jpg',
                        'alcohol' => '13.0%',
                        'soil' => ['en' => 'Schist & Loam', 'el' => 'Σχιστόλιθος & Πηλός'],
                    ],
                    [
                        'id' => 'sable-2019',
                        'name' => 'SABLE',
                        'vintage' => '2019',
                        'region' => ['en' => 'Northern Aegean Terraces', 'el' => 'Βόρειο Αιγαίο'],
                        'varietal' => ['en' => 'Limnio & Mavrotragano', 'el' => 'Λημνιό & Μαυροτράγανο'],
                        'category' => 'RESERVE',
                        'price' => '€ 74.00',
                        'status' => ['en' => 'CELLAR RESERVE', 'el' => 'ΑΡΧΕΙΑΚΗ ΣΥΛΛΟΓΗ'],
                        'statusBg' => 'bg-[var(--color-foreground)]',
                        'tastingNote' => ['en' => 'Dark bramble fruit, crushed peppercorn, tobacco leaf, and structured deep Mediterranean warmth.', 'el' => 'Σκούρα φρούτα του δάσους, πιπέρι, καπνός και βαθιά μεσογειακή δομή.'],
                        'img' => 'cellar_sable.jpg',
                        'alcohol' => '14.5%',
                        'soil' => ['en' => 'Granitic Sandy Soil', 'el' => 'Γρανιτικό Αμμώδες Έδαφος'],
                    ],
                    [
                        'id' => 'anapnoi-2022',
                        'name' => 'ANAPNOÍ',
                        'vintage' => '2022',
                        'region' => ['en' => 'Slopes of Ainos, Cephalonia', 'el' => 'Πλαγιές Αίνου, Κεφαλονιά'],
                        'varietal' => ['en' => 'High-Altitude Robola', 'el' => 'Ρομπόλα Υψηλού Υψομέτρου'],
                        'category' => 'VOLCANIC',
                        'price' => '€ 44.00',
                        'status' => ['en' => 'ALLOCATED LOT', 'el' => 'ΣΠΑΝΙΑ ΠΑΡΤΙΔΑ'],
                        'statusBg' => 'bg-[var(--color-foreground)]',
                        'tastingNote' => ['en' => 'Flint smoke, green pear, mountain herbs, and an invigorating limestone crystalline finish.', 'el' => 'Καπνός πυρόλιθου, πράσινο αχλάδι, ορεινά βότανα και κρυστάλλινη επίγευση.'],
                        'img' => 'editorial_intro.jpg',
                        'alcohol' => '13.0%',
                        'soil' => ['en' => 'High Altitude Limestone', 'el' => 'Υψίπεδο Ασβεστολίθου'],
                    ],
                    [
                        'id' => 'vathos-2017',
                        'name' => 'VÁTHOS',
                        'vintage' => '2017',
                        'region' => ['en' => 'Santorini Caldera Terraces', 'el' => 'Καλντέρα, Σαντορίνη'],
                        'varietal' => ['en' => 'Centenarian Mavrotragano', 'el' => 'Υπεραιωνόβιο Μαυροτράγανο'],
                        'category' => 'RESERVE',
                        'price' => '€ 98.00',
                        'status' => ['en' => 'PRIVATE VAULT', 'el' => 'ΙΔΙΩΤΙΚΟ VAULT'],
                        'statusBg' => 'bg-[#922e1b]',
                        'tastingNote' => ['en' => 'Dried fig, graphite, cedarwood, wild rosemary, and massive velvety depth from 7 years cellar sleep.', 'el' => 'Αποξηραμένο σύκο, γραφίτης, κέδρος, δεντρολίβανο και βελούδινο βάθος.'],
                        'img' => 'hero_cellar.png',
                        'alcohol' => '14.5%',
                        'soil' => ['en' => 'Ungrafted Volcanic Soil', 'el' => 'Αυτόριζο Ηφαιστειακό Έδαφος'],
                    ],
                ],
                'concierge' => [
                    'tape' => 'PRIVATE SOMMELIER CONCIERGE',
                    'headline' => 'LOOKING FOR RARE ARCHIVES OR CELLAR SOURCING?',
                    'subtext' => 'We curate private collections, source museum-allocated verticals, and arrange custom delivery for private cellar cellars across Europe.',
                    'button_text' => 'Consult Our Sommelier →',
                    'kraft_note' => 'BESPOKE CELLAR CURATION',
                ],
            ],
            'contact_content' => [
                'hero' => [
                    'tag' => '/ DIRECT CORRESPONDENCE',
                    'headline' => 'WRITE TO US — WE ALWAYS WRITE BACK',
                    'subtext' => 'Tasting inquiries, cellar consultations, rare bottle allocations, or just to talk Mediterranean wine.',
                ],
                'form' => [
                    'subjects' => [
                        ['value' => 'Private Tasting', 'label' => 'PRIVATE TASTING & PAIRINGS'],
                        ['value' => 'Cellar Consulting', 'label' => 'CELLAR CONSULTING & SOURCING'],
                        ['value' => 'Event Hosting', 'label' => 'EVENT HOSTING & SOMMELIER'],
                        ['value' => 'Press & Collab', 'label' => 'PRESS & EDITORIAL INQUIRY'],
                        ['value' => 'General Inquiry', 'label' => 'GENERAL INQUIRY'],
                    ],
                    'button_text' => 'Send Message',
                ],
                'dispatch' => [
                    'tape' => 'CELLAR DISPATCH',
                    'kraft_note' => "TASTINGS BY APPOINTMENT\nWALK-INS WELCOME DURING CELLAR HOURS",
                ],
                'schedule' => [
                    'tag' => '/ CELLAR SCHEDULE & LOCATION',
                    'hours_title' => 'Cellar Door Hours',
                    'hours_tape' => 'WEEKLY SCHEDULE',
                    'hours_note' => 'Private tastings can be arranged outside regular hours upon request.',
                    'location_title' => 'Location & Access',
                    'location_tape' => 'ATHENS CELLAR',
                    'location_desc' => 'Situated in the historic heart of the city. Easily reachable by metro and private transit.',
                    'map_button_text' => 'Open in Google Maps',
                ],
            ],
            'maintenance_content' => [
                'tag' => '/ HOLDING STATE',
                'badge' => 'CELLAR CURATION',
                'headline' => 'THE CELLAR IS BEING RESTOCKED',
                'subtext' => 'Our allocations ledger and digital cellar space are undergoing seasonal curation.',
                'video_url' => 'maintenance.mp4',
                'video_badge' => 'REOPENING SOON',
                'inquiry_prefix' => 'Direct Inquiries:',
            ],
            'maintenance_mode' => true,
        ];
    }

    /**
     * Retrieve all settings merged with defaults.
     */
    public static function allSettings(): array
    {
        $defaults = self::defaults();
        $stored = self::pluck('value', 'key')->all();

        $result = $defaults;
        foreach ($stored as $key => $rawVal) {
            $decoded = json_decode($rawVal, true);
            $result[$key] = ($decoded !== null || $rawVal === 'null' || $rawVal === 'true' || $rawVal === 'false' || is_numeric($rawVal))
                ? $decoded
                : $rawVal;
        }

        return $result;
    }

    /**
     * Retrieve a specific setting value.
     */
    public static function get(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        if (! $setting) {
            $defaults = self::defaults();
            return $defaults[$key] ?? $default;
        }

        $decoded = json_decode($setting->value, true);
        return ($decoded !== null || $setting->value === 'null' || $setting->value === 'true' || $setting->value === 'false' || is_numeric($setting->value))
            ? $decoded
            : $setting->value;
    }

    /**
     * Update or insert a key-value setting.
     */
    public static function set(string $key, $value): void
    {
        $val = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        self::updateOrCreate(['key' => $key], ['value' => $val]);
    }

    /**
     * Bulk update settings from array.
     */
    public static function updateSettings(array $data): array
    {
        $allowedKeys = [
            'name',
            'tagline',
            'description',
            'legalName',
            'contact',
            'hours',
            'socials',
            'nav',
            'colors',
            'homepage_content',
            'about_content',
            'shop_content',
            'contact_content',
            'maintenance_content',
            'maintenance_mode',
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $allowedKeys, true)) {
                $val = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                self::updateOrCreate(['key' => $key], ['value' => $val]);
            }
        }

        return self::allSettings();
    }
}
