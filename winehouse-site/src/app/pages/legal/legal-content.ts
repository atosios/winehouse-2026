export interface LegalSection {
  id: string;
  badge: { en: string; el: string };
  title: { en: string; el: string };
  summary: { en: string; el: string };
  paragraphs: {
    heading?: { en: string; el: string };
    content: { en: string; el: string };
    highlight?: boolean;
  }[];
}

export const LEGAL_METADATA = {
  lastUpdated: {
    en: 'August 19, 2026',
    el: '19 Αυγούστου 2026',
  },
  regulatoryJurisdiction: {
    en: 'Hellenic Republic (Greece) & European Union Law',
    el: 'Ελληνική Δημοκρατία & Δίκαιο Ευρωπαϊκής Ένωσης',
  },
};

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'terms-age',
    badge: { en: '01. GENERAL TERMS & 18+ AGE LIMIT', el: '01. ΓΕΝΙΚΟΙ ΟΡΟΙ & ΟΡΙΟ ΗΛΙΚΙΑΣ 18+' },
    title: {
      en: 'Terms of Use & Mandatory 18+ Age Restriction',
      el: 'Όροι Χρήσης & Υποχρεωτικό Όριο Ηλικίας 18+',
    },
    summary: {
      en: 'The Winehouse provides artisanal wine curation, boutique e-commerce, and tasting experiences strictly to adult consumers of legal drinking age.',
      el: 'Η The Winehouse προσφέρει επιλεγμένα χειροποίητα κρασιά, ηλεκτρονικό κατάστημα και εμπειρίες γευσιγνωσίας αποκλειστικά σε ενήλικες καταναλωτές.',
    },
    paragraphs: [
      {
        heading: {
          en: '1.1 Strict 18+ Age Restriction (Greek Law 3730/2008 & 4410/2016)',
          el: '1.1 Αυστηρό Όριο Ηλικίας 18+ (Ν. 3730/2008 & Ν. 4410/2016)',
        },
        content: {
          en: 'In compliance with Greek and European legislation regarding the sale of alcoholic beverages, access to our online boutique and the purchase of any alcoholic product is strictly permitted only to individuals who are at least 18 years of age. By navigating this website or placing an order, you solemnly certify and declare that you are at least 18 years old. Deliveries may require signature and proof of legal age upon receipt.',
          el: 'Σε πλήρη συμμόρφωση με την ελληνική και ευρωπαϊκή νομοθεσία περί διάθεσης οινοπνευματωδών ποτών, η πρόσβαση στην κάβα μας και η αγορά οποιουδήποτε αλκοολούχου προϊόντος επιτρέπεται αυστηρά και αποκλειστικά σε άτομα άνω των 18 ετών. Με την πλοήγηση στον ιστότοπο ή την υποβολή παραγγελίας, δηλώνετε ρητά και υπεύθυνα ότι έχετε συμπληρώσει το 18ο έτος της ηλικίας σας. Οι παραδόσεις ενδέχεται να υπόκεινται σε έλεγχο ταυτοπροσωπίας κατά την παράδοση.',
        },
        highlight: true,
      },
      {
        heading: {
          en: '1.2 Acceptance of Terms & Scope of Atelier Services',
          el: '1.2 Αποδοχή Όρων & Πεδίο Εφαρμογής',
        },
        content: {
          en: 'These Terms and Conditions govern all sales, reservations, tasting sessions, and digital interactions conducted through thewinehouse.gr. By utilizing our services or confirming an order, you agree to be bound by these provisions without reservation.',
          el: 'Οι παρόντες Όροι και Προϋποθέσεις διέπουν όλες τις παραγγελίες, αγορές, κρατήσεις γευσιγνωσιών και ψηφιακές υπηρεσίες μέσω του thewinehouse.gr. Η χρήση των υπηρεσιών μας και η επιβεβαίωση παραγγελίας συνεπάγεται την πλήρη και ανεπιφύλακτη αποδοχή των παρόντων όρων.',
        },
      },
      {
        heading: {
          en: '1.3 Intellectual Property & Sommelier Curation Content',
          el: '1.3 Πνευματική Ιδιοκτησία & Περιεχόμενο Curation',
        },
        content: {
          en: 'All photography, sommelier tasting notes, vintage descriptions, brand graphics, and editorial texts published on this platform are the intellectual property of The Winehouse and protected under intellectual property laws. Unauthorized reproduction is strictly prohibited.',
          el: 'Το σύνολο του φωτογραφικού υλικού, οι σημειώσεις γευσιγνωσίας sommelier, τα κείμενα των εσοδειών, τα γραφικά και η εμπορική ταυτότητα αποτελούν πνευματική ιδιοκτησία της The Winehouse και προστατεύονται από τις οικείες διατάξεις περί πνευματικής ιδιοκτησίας. Απαγορεύεται οποιαδήποτε αναπαραγωγή χωρίς έγγραφη συναίνεση.',
        },
      },
    ],
  },
  {
    id: 'orders-payments',
    badge: { en: '02. ORDERS & PAYMENT SECURITY', el: '02. ΠΑΡΑΓΓΕΛΙΕΣ & ΑΣΦΑΛΕΙΑ ΠΛΗΡΩΜΩΝ' },
    title: {
      en: 'Orders, Pricing, Vintages & Payment Methods',
      el: 'Παραγγελίες, Τιμές, Εσοδείες & Τρόποι Πληρωμής',
    },
    summary: {
      en: 'Transparent pricing, authentic vintage allocations, and high-security payment processing.',
      el: 'Διαφανείς τιμές, αυθεντικές κατανομές εσοδειών και ασφαλείς συναλλαγές.',
    },
    paragraphs: [
      {
        heading: {
          en: '2.1 Pricing, Taxes & Vintage Accuracy',
          el: '2.1 Τιμές, Φόροι & Διαθεσιμότητα Εσοδειών',
        },
        content: {
          en: 'All displayed product prices are in Euros (€) and include statutory Value Added Tax (VAT 24%) as well as applicable excise taxes on wine. Due to the limited allocations and artisanal nature of our estate partners, vintage years (εσοδείες) are subject to cellaring availability. Should an allocated vintage transition to the subsequent estate harvest, we will notify you prior to dispatch.',
          el: 'Όλες οι αναγραφόμενες τιμές είναι σε Ευρώ (€) και περιλαμβάνουν τον νόμιμο Φόρο Προστιθέμενης Αξίας (ΦΠΑ 24%) και τον Ειδικό Φόρο Κατανάλωσης όπου εφαρμόζεται. Λόγω του χειροποίητου και περιορισμένου χαρακτήρα των παραγωγών μας, οι εσοδείες υπόκεινται στη διαθεσιμότητα της κάβας. Σε περίπτωση αλλαγής εσοδείας από το οινοποιείο, ενημερώνεστε άμεσα πριν την αποστολή.',
        },
      },
      {
        heading: {
          en: '2.2 Accepted Payment Methods',
          el: '2.2 Τρόποι Πληρωμής',
        },
        content: {
          en: 'We accept payments via: (a) Direct Bank Wire Transfer / SEPA to our institutional business account at the National Bank of Greece, (b) Major Credit / Debit Cards (Visa, Mastercard, Maestro) processed through encrypted banking gateways with 3D-Secure protocol, and (c) Cash / Card upon in-person pickup at our Athens atelier.',
          el: 'Υποστηρίζονται οι εξής τρόποι πληρωμής: (α) Τραπεζική Κατάθεση / Έμβασμα SEPA στον επίσημο εταιρικό λογαριασμό της Εθνικής Τράπεζας της Ελλάδος, (β) Πιστωτικές / Χρεωστικές Κάρτες (Visa, Mastercard, Maestro) μέσω κρυπτογραφημένης πύλης πληρωμών με πρωτόκολλο 3D-Secure, και (γ) Πληρωμή κατά την παραλαβή από το atelier μας στην Αθήνα κατόπιν συνεννόησης.',
        },
      },
      {
        heading: {
          en: '2.3 Invoicing & Commercial Receipts',
          el: '2.3 Έκδοση Παραστατικών (Απόδειξη / Τιμολόγιο)',
        },
        content: {
          en: 'Every dispatched order is accompanied by a legal retail sales receipt or commercial sales invoice (Article 39a / Tax Code) transmitted electronically and physically alongside the delivery docket.',
          el: 'Κάθε παραγγελία συνοδεύεται υποχρεωτικά από νόμιμη Απόδειξη Λιανικής Πώλησης ή Τιμολόγιο Πώλησης (βάσει των φορολογικών διατάξεων), το οποίο αποστέλλεται ηλεκτρονικά και συνοδεύει το δέμα.',
        },
      },
    ],
  },
  {
    id: 'shipping-breakage',
    badge: { en: '03. SHIPPING & BREAKAGE GUARANTEE', el: '03. ΑΠΟΣΤΟΛΕΣ & ΕΓΓΥΗΣΗ ΘΡΑΥΣΗΣ' },
    title: {
      en: 'Shipping, Climate Care & Breakage Warranty',
      el: 'Αποστολές, Φροντίδα Μεταφοράς & Εγγύηση Θραύσης',
    },
    summary: {
      en: 'Specialized protective bottle packaging, prompt courier dispatch, and complete transit insurance.',
      el: 'Ειδικές πιστοποιημένες προστατευτικές συσκευασίες γυάλινων φιαλών και πλήρης ασφάλεια μεταφοράς.',
    },
    paragraphs: [
      {
        heading: {
          en: '3.1 Protective Bottle Packaging & Transit Safety',
          el: '3.1 Πιστοποιημένη Συσκευασία Προστασίας Φιαλών',
        },
        content: {
          en: 'Glass bottles are fragile and sensitive to physical impact. All orders are packed using certified, shock-absorbent multi-layer pulp packaging engineered specifically for the safe shipment of fine wines. During extreme summer heatwaves, we may coordinate dispatch timing to protect bottles from thermal shock.',
          el: 'Οι γυάλινες φιάλες είναι ευπαθείς και ευαίσθητες σε κραδασμούς. Όλες οι αποστολές πραγματοποιούνται σε ειδικές, πιστοποιημένες αντικραδασμικές συσκευασίες πολλαπλών στρωμάτων, κατασκευασμένες αποκλειστικά για ασφαλή μεταφορά εκλεκτών οίνων. Σε περιόδους ακραίων καλοκαιρινών θερμοκρασιών, συντονίζουμε τον χρόνο αποστολής ώστε να αποφευχθεί η θερμική καταπόνηση.',
        },
      },
      {
        heading: {
          en: '3.2 Delivery Zones, Times & Free Shipping',
          el: '3.2 Χρόνοι Παράδοσης & Δωρεάν Μεταφορικά',
        },
        content: {
          en: 'Orders within Attica are typically delivered within 1–2 business days. Deliveries to Mainland Greece & Greek Islands are fulfilled within 2–4 business days via our verified courier partners. Orders exceeding €150.00 qualify for complimentary Free Standard Shipping.',
          el: 'Οι παραδόσεις εντός Αττικής ολοκληρώνονται σε 1–2 εργάσιμες ημέρες. Για την ηπειρωτική και νησιωτική Ελλάδα, η παράδοση διαρκεί 2–4 εργάσιμες ημέρες μέσω συνεργαζόμενων εταιρειών ταχυμεταφορών. Παραγγελίες άνω των 150,00€ αποστέλλονται με Δωρεάν Μεταφορικά.',
        },
      },
      {
        heading: {
          en: '3.3 Glass Breakage Transit Guarantee (100% Replacement)',
          el: '3.3 Εγγύηση Θραύσης κατά τη Μεταφορά (100% Αντικατάσταση)',
        },
        content: {
          en: 'If any bottle is damaged, cracked, or broken during transport, The Winehouse guarantees a 100% free immediate replacement or full refund. Simply take a clear photograph of the damaged package/bottle upon arrival and email it to info@thewinehouse.gr within 48 hours of delivery. We will immediately dispatch a fresh bottle or process a full refund.',
          el: 'Στη σπάνια περίπτωση που κάποια φιάλη υποστεί ράγισμα ή θραύση κατά τη μεταφορά, η The Winehouse εγγυάται άμεση και δωρεάν αντικατάσταση ή πλήρη επιστροφή χρημάτων. Αρκεί να αποστείλετε μία ευκρινή φωτογραφία του κατεστραμμένου δέματος/φιάλης στο info@thewinehouse.gr εντός 48 ωρών από την παραλαβή, και αποστέλλουμε αμέσως νέα φιάλη χωρίς καμία επιπλέον επιβάρυνση.',
        },
        highlight: true,
      },
    ],
  },
  {
    id: 'returns-withdrawal',
    badge: { en: '04. RETURNS & RIGHT OF WITHDRAWAL', el: '04. ΕΠΙΣΤΡΟΦΕΣ & ΔΙΚΑΙΩΜΑ ΥΠΑΝΑΧΩΡΗΣΗΣ' },
    title: {
      en: 'Returns Policy & 14-Day Right of Withdrawal',
      el: 'Πολιτική Επιστροφών & Δικαίωμα Υπαναχώρησης 14 Ημερών',
    },
    summary: {
      en: 'Statutory 14-day EU right of withdrawal, accompanied by essential quality and food-safety hygiene seals.',
      el: 'Νόμιμο δικαίωμα υπαναχώρησης 14 ημερών, με τις απαραίτητες εγγυήσεις υγιεινής και σφραγίδας φιαλών.',
    },
    paragraphs: [
      {
        heading: {
          en: '4.1 14-Day Statutory Right of Withdrawal (EU Directive 2011/83 & Greek Law 2251/1994)',
          el: '4.1 Νόμιμο Δικαίωμα Υπαναχώρησης 14 Ημερών (Οδηγία 2011/83/ΕΕ & Ν. 2251/1994)',
        },
        content: {
          en: 'Under consumer protection law, you have the right to withdraw from the online purchase contract within 14 calendar days from the date of physical receipt of your goods without stating any reason.',
          el: 'Σύμφωνα με τη νομοθεσία προστασίας καταναλωτή, έχετε το δικαίωμα να υπαναχωρήσετε από τη σύμβαση εξ αποστάσεως αγοράς εντός 14 ημερολογιακών ημερών από την ημερομηνία παραλαβής των προϊόντων, χωρίς να απαιτείται αιτιολόγηση.',
        },
      },
      {
        heading: {
          en: '4.2 Quality Conditions & Sealed Bottle Exception (Health & Food Safety)',
          el: '4.2 Προϋποθέσεις & Εξαίρεση Αποσφραγισμένων Φιαλών (Υγειονομική Ασφάλεια)',
        },
        content: {
          en: 'Due to the nature of wine as a perishable food/beverage product sensitive to temperature and oxygen exposure, returns under the right of withdrawal are strictly accepted ONLY if: (a) The bottles are completely unopened and uncompromised, (b) The security capsule, wax seal, wire hood, and labels are intact, and (c) The bottles have been stored in a cool, dark environment away from direct sunlight and heat sources. Unsealed, opened, or partially consumed bottles cannot be returned or refunded pursuant to Article 3l paragraph (e) of Law 2251/1994.',
          el: 'Λόγω της φύσης του κρασιού ως ευπαθούς διατροφικού αγαθού ευαίσθητου στο οξυγόνο και τη θερμοκρασία, η επιστροφή στο πλαίσιο της υπαναχώρησης γίνεται δεκτή ΑΠΟΚΛΕΙΣΤΙΚΑ εφόσον: (α) Οι φιάλες είναι εντελώς άθικτες και κλειστές, (β) Το καψύλλιο ασφαλείας, το βουλοκέρι, το πώμα και οι ετικέτες βρίσκονται στην αρχική τους άψογη κατάσταση, και (γ) Οι φιάλες έχουν διατηρηθεί σε κατάλληλες συνθήκες θερμοκρασίας και σκιερό μέρος. Αποσφραγισμένες, ανοιγμένες ή εν μέρει καταναλωμένες φιάλες ΔΕΝ επιστρέφονται για λόγους προστασίας της δημόσιας υγείας (άρθρο 3ιβ παρ. ε του Ν. 2251/1994).',
        },
        highlight: true,
      },
      {
        heading: {
          en: '4.3 Defective Bottle / Cork Taint (TCA) Protocol',
          el: '4.3 Διαχείριση Ελαττωματικής Φιάλης (Φελλός / TCA)',
        },
        content: {
          en: 'While our sommelier team rigorously inspects provenance, natural cork closures carry an inherent microscopic risk of cork taint (TCA). If you believe a bottle opened within reasonable time is defective, re-insert the cork securely with at least 80% of the wine remaining and contact us within 48 hours so our team can evaluate the batch and offer an appropriate resolution.',
          el: 'Παρότι η ομάδα των sommelier μας επιθεωρεί σχολαστικά κάθε παρτίδα, το φυσικό πώμα φελλού ενέχει σπάνιο φυσικό κίνδυνο αστοχίας (οσμή φελλού / TCA). Εάν διαπιστώσετε ότι μια φιάλη παρουσιάζει ελάττωμα, επανατοποθετήστε το πώμα διατηρώντας τουλάχιστον το 80% του περιεχομένου και επικοινωνήστε μαζί μας εντός 48 ωρών για την αξιολόγηση και αντικατάστασή της.',
        },
      },
    ],
  },
  {
    id: 'privacy-cookies',
    badge: { en: '05. PRIVACY, GDPR & COOKIES', el: '05. ΑΠΟΡΡΗΤΟ, GDPR & COOKIES' },
    title: {
      en: 'Data Protection, GDPR & Cookie Transparency',
      el: 'Προστασία Προσωπικών Δεδομένων, GDPR & Cookies',
    },
    summary: {
      en: 'Strict compliance with European Regulation (EU) 2016/679 (GDPR) and transparent cookie usage.',
      el: 'Απόλυτη συμμόρφωση με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) και διαφάνεια στη χρήση cookies.',
    },
    paragraphs: [
      {
        heading: {
          en: '5.1 Data Controller & Information We Collect',
          el: '5.1 Υπεύθυνος Επεξεργασίας & Συλλογή Δεδομένων',
        },
        content: {
          en: 'The Winehouse acts as the Data Controller. We collect only necessary personal data provided by you during order checkout, newsletter subscription, or contact requests (Full Name, Delivery Address, Contact Telephone, Email Address, and Invoicing details where applicable). We never store raw credit card credentials on our servers.',
          el: 'Η The Winehouse λειτουργεί ως Υπεύθυνος Επεξεργασίας. Συλλέγουμε μόνο τα απολύτως αναγκαία προσωπικά δεδομένα που καταχωρείτε κατά την παραγγελία, την εγγραφή στο newsletter ή τη φόρμα επικοινωνίας (Ονοματεπώνυμο, Διεύθυνση Παράδοσης, Τηλέφωνο, Email, και Φορολογικά Στοιχεία σε περίπτωση τιμολογίου). Δεν αποθηκεύουμε ποτέ στοιχεία τραπεζικών καρτών στους διακομιστές μας.',
        },
      },
      {
        heading: {
          en: '5.2 Purpose of Processing & Data Rights (GDPR)',
          el: '5.2 Σκοπός Επεξεργασίας & Δικαιώματα Χρήστη (GDPR)',
        },
        content: {
          en: 'Your data is processed strictly for: (1) Order execution, billing, and courier delivery, (2) Customer support inquiries, and (3) Editorial cellar dispatches when you explicitly opt-in. Under GDPR, you have the right to access, rectify, restrict, export, or request permanent erasure of your personal data at any time by emailing info@thewinehouse.gr.',
          el: 'Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για: (1) Την εκτέλεση και παράδοση της παραγγελίας σας και την έκδοση παραστατικών, (2) Την εξυπηρέτηση πελατών, και (3) Την αποστολή ενημερώσεων (newsletter) εφόσον έχετε δώσει ρητή συγκατάθεση. Βάσει του GDPR, διατηρείτε το δικαίωμα πρόσβασης, διόρθωσης, φορητότητας και οριστικής διαγραφής των δεδομένων σας ανά πάσα στιγμή με ένα απλό email στο info@thewinehouse.gr.',
        },
      },
      {
        heading: {
          en: '5.3 Cookie Policy & Local Storage',
          el: '5.3 Πολιτική Cookies & Τοπική Αποθήκευση',
        },
        content: {
          en: 'Our website uses strictly necessary cookies and local storage tokens to preserve your active shopping bag, language preferences (EN/EL), and administrative security sessions. Anonymized statistical analytics help us refine cellar navigation without profiling individual customers. You can adjust your browser cookie settings at any time.',
          el: 'Ο ιστότοπός μας χρησιμοποιεί απολύτως απαραίτητα τεχνικά cookies και τοπική αποθήκευση για τη διατήρηση του καλαθιού αγορών, των γλωσσικών προτιμήσεων (EN/EL) και της ασφάλειας συνεδρίας. Τυχόν στατιστικά δεδομένα επισκεψιμότητας είναι ανωνυμοποιημένα. Μπορείτε να ρυθμίσετε την αποδοχή cookies μέσω του περιηγητή σας.',
        },
      },
    ],
  },
  {
    id: 'company-odr',
    badge: { en: '06. LEGAL ENTITY & DISPUTE RESOLUTION', el: '06. ΕΤΑΙΡΙΚΗ ΤΑΥΤΟΤΗΤΑ & ΕΠΙΛΥΣΗ ΔΙΑΦΟΡΩΝ' },
    title: {
      en: 'Company Identity, GEMI & Online Dispute Resolution',
      el: 'Εταιρική Ταυτότητα, Γ.Ε.ΜΗ. & Επίλυση Διαφορών (ODR)',
    },
    summary: {
      en: 'Official company registration, tax credentials, and European Out-of-Court Dispute Resolution framework.',
      el: 'Επίσημα φορολογικά στοιχεία, αριθμός Γ.Ε.ΜΗ. και ευρωπαϊκό πλαίσιο εξωδικαστικής επίλυσης διαφορών.',
    },
    paragraphs: [
      {
        heading: {
          en: '6.1 Official Merchant Identification (Mandatory Legal Data)',
          el: '6.1 Επίσημα Στοιχεία Εταιρείας (Υποχρεωτικά Στοιχεία)',
        },
        content: {
          en: 'Corporate Entity: The Winehouse Fine Terroirs Single Member P.C. • Commercial Name: The Winehouse • GEMI No. (Αρ. Γ.Ε.ΜΗ.): 182394001000 • VAT No. (ΑΦΜ): EL802495810 • Tax Office (ΔΟΥ): D Athens • Registered Seat: 14 Vasilissis Sofias Ave, Athens 106 74, Greece • Contact Tel: +30 210 000 0000 • Official Email: info@thewinehouse.gr.',
          el: 'Εταιρική Επωνυμία: The Winehouse Fine Terroirs Μονοπρόσωπη Ι.Κ.Ε. • Διακριτικός Τίτλος: The Winehouse • Αριθμός Γ.Ε.ΜΗ.: 182394001000 • Α.Φ.Μ.: 802495810 • Δ.Ο.Υ.: Δ’ Αθηνών • Έδρα: Βασιλίσσης Σοφίας 14, Αθήνα 106 74 • Τηλέφωνο Επικοινωνίας: +30 210 000 0000 • Email: info@thewinehouse.gr.',
        },
        highlight: true,
      },
      {
        heading: {
          en: '6.2 European Online Dispute Resolution (ODR Platform) & Consumer Ombudsman',
          el: '6.2 Ευρωπαϊκή Ηλεκτρονική Επίλυση Διαφορών (ODR) & Συνήγορος Καταναλωτή',
        },
        content: {
          en: 'Pursuant to EU Regulation No 524/2013, the European Commission provides an Online Dispute Resolution (ODR) platform for out-of-court settlements of consumer disputes. Consumers may access the platform at: https://ec.europa.eu/consumers/odr. For domestic disputes in Greece, consumers may also contact the Hellenic Consumer Ombudsman (Συνήγορος του Καταναλωτή, www.synigoroskatanaloti.gr).',
          el: 'Σύμφωνα με τον Κανονισμό (ΕΕ) αριθ. 524/2013, η Ευρωπαϊκή Επιτροπή διαθέτει πλατφόρμα Ηλεκτρονικής Επίλυσης Διαφορών (ODR) για εξωδικαστική διευθέτηση καταναλωτικών διαφορών. Μπορείτε να επισκεφθείτε την πλατφόρμα στον σύνδεσμο: https://ec.europa.eu/consumers/odr. Για την Ελλάδα, αρμόδιος φορέας είναι επίσης η Ανεξάρτητη Αρχή «Συνήγορος του Καταναλωτή» (www.synigoroskatanaloti.gr).',
        },
      },
    ],
  },
];
