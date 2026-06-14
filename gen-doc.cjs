const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx');
const fs = require('fs');

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 }, // 11pt default
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1a4a6e" },
        paragraph: { spacing: { before: 360, after: 180 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2a5a7e" },
        paragraph: { spacing: { before: 280, after: 120 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "3a6a8e" },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      // Titel
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "Mineralien \u2013 Cabinet & Tagebuch",
            bold: true,
            size: 40,
            color: "1a4a6e",
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: "Professionelle Sammlungsverwaltung mit KI-Unterst\u00fctzung",
            size: 24,
            color: "4a6a8e",
            font: "Arial",
          }),
        ],
      }),

      // Zusammenfassung
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Zusammenfassung")],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun(
            "Mineralien \u2013 Cabinet & Tagebuch ist eine moderne Web-App zur digitalen Verwaltung privater Sammlungen von Mineralien, Fossilien und Gesteinen. Die Anwendung kombiniert eine benutzerfreundliche Oberfl\u00e4che mit leistungsstarken KI-Funktionen und professionellen Export-M\u00f6glichkeiten \u2013 von automatischer Etikettenerkennung bis hin zu druckfertigen Museumsetiketten."
          ),
        ],
      }),

      // Kernfunktionen
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Kernfunktionen")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Drei Sammlungskategorien")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Die App unterst\u00fctzt die Verwaltung von drei Kategorien: Mineralien, Fossilien und Gesteine. Jede Kategorie verf\u00fcgt \u00fcber spezialisierte Felder und eine eigene Sammlungsnummerierung (M f\u00fcr Mineralien, F f\u00fcr Fossilien, G f\u00fcr Gesteine)."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Benutzer-Authentifizierung")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Sichere Anmeldung und Registrierung \u00fcber Supabase Auth. Jeder Benutzer verwaltet seine eigene Sammlung \u2013 die Daten sind durch Row-Level Security (RLS) vor anderen Nutzern gesch\u00fctzt."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Eintragsverwaltung (CRUD)")],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun(
            "Vollst\u00e4ndige Verwaltung aller Sammlungseintr\u00e4ge:"
          ),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Anlegen neuer Funde mit umfassenden Detailfeldern")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Bearbeiten bestehender Eintr\u00e4ge")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  L\u00f6schen mit Best\u00e4tigungsdialog")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Detaillierte Einzelansicht mit allen Informationen")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. Multimedia-Unterst\u00fctzung")],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun(
            "Jeder Eintrag kann mit folgenden Medien angereichert werden:"
          ),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Mehrere Fotos pro Eintrag mit Zoom-Funktion")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Video-Uploads mit Inline-Wiedergabe")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Automatische Thumbnail-Generierung")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5. GPS-Standorterfassung")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Integrierte Standortbestimmung: \u00dcbernahme der aktuellen GPS-Koordinaten per Knopfdruck oder manuelle Eingabe im Format Breite, L\u00e4nge (kompatibel mit Google Maps). Koordinaten werden in der Detailansicht auf einer interaktiven Leaflet-Karte visualisiert."
          ),
        ],
      }),

      // KI-Funktionen
      new Paragraph({
        children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("KI-gest\u00fctzte Funktionen")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Intelligenter Etikettenscan")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Fotografiere ein gedrucktes oder handgeschriebenes Etikett \u2013 die KI erkennt automatisch alle relevanten Felder (Name, Fundort, Land, chemische Formel, H\u00e4rte, Begleitmineralien, Sammlung, Wert, Gr\u00f6\u00dfe, Zeitalter, Besonderheiten). Die erkannten Daten werden direkt in das Formular \u00fcbernommen und k\u00f6nnen vor dem Speichern gepr\u00fcft werden."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Automatische Formelerkennung")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Gibt man den Namen eines Minerals ein, ermittelt die KI automatisch die chemische Summenformel. Die Formel wird mit korrekter Tiefgestellung angezeigt (z. B. SiO\u2082, CaCO\u2083). Unterst\u00fctzt werden auch Ladungen (Ca^2+) und Hydrate (CuSO4\u00b75H2O)."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Automatische H\u00e4rteermittlung")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Basierend auf dem Mineralnamen wird die Mohs-H\u00e4rte automatisch recherchiert und erg\u00e4nzt \u2013 inklusive Bereichsangaben wie \u201e6,5\u20137\u201c."
          ),
        ],
      }),

      // Felder pro Kategorie
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Detailfelder pro Kategorie")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Alle Kategorien (Mineralien, Fossilien, Gesteine)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Name (Pflichtfeld)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Land")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Fundort (Ort, Region)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Sammlungsname")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Wert in Euro")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Gr\u00f6\u00dfe / Abmessungen")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Besonderheiten / Anmerkungen")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  GPS-Koordinaten")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Fotos und Videos")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Zus\u00e4tzlich f\u00fcr Mineralien")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Chemische Formel")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Mohs-H\u00e4rte")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Begleitmineralien")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Zus\u00e4tzlich f\u00fcr Fossilien")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Weitere Fossilien & Besonderheiten")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Geologisches Zeitalter (z. B. Oberjura, ca. 150 Mio. Jahre)")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Zus\u00e4tzlich f\u00fcr Gesteine")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Ursprung / Entstehung (z. B. Vulkanisch, Sediment\u00e4r, Metamorph)")],
      }),

      // Export-Funktionen
      new Paragraph({
        children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Export- & Druckfunktionen")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. JSON-Backup")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Vollst\u00e4ndiger Datenexport als JSON-Datei mit allen Eintr\u00e4gen, Zeitstempel und Versionsangabe. Fotos sind als Referenzen enthalten."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Gesamt-PDF")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "A4-PDF mit Deckblatt, \u00dcbersichtstabelle und Detailseiten f\u00fcr jeden Eintrag. Enth\u00e4lt Fotos, alle Details und Seitenzahlen. Ideal als gedrucktes Sammlungsverzeichnis."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Museumsetiketten (A6, dekorativ)")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Einzelne Etiketten im Landschafts-A6-Format mit dekorativen blauen Rahmen, Foto, Sammlungsnummer, Name, chemischer Formel, Fundort und \u201eColl: Arco Boehme\u201d. Im klassischen Museumsstil mit Cremefarbenem Hintergrund und geometrischen Ornamenten."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. QR-Code-Bogen")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Druckbarer A4-Bogen mit 5 \u00d7 5 mm QR-Codes f\u00fcr alle Funde \u2013 ideal zum Aufkleben am Stein oder Sch\u00e4chtelchen. Jeder Code enth\u00e4lt einen Link zur Detailansicht."
          ),
        ],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5. Nummern-Bogen")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun(
            "Sehr kompakter A4-Bogen mit ca. 8 \u00d7 5 mm Etiketten \u2013 jede Sammlungsnummer 3\u00d7 gedruckt (f\u00fcr Stein, Reserve und Sch\u00e4chtelchen). Klassische Museumsmethode: kleiner Lackpunkt auf den Stein, Etikett draufkleben, mit Klarlack versiegeln."
          ),
        ],
      }),

      // Listenansicht
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Listenansicht & Suche")],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun("Die Startseite bietet eine \u00fcbersichtliche Listenansicht mit folgenden Funktionen:"),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Filter-Tabs: Mineralien, Fossilien, Gesteine oder Alle")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Freitext-Suche \u00fcber Name, Fundort, Land, Sammlung")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Filter nach Name und Fundort")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Sortierung: Neueste, Land, Ort, Alphabetisch, Preis")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Auf- / Absteigende Sortierung")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Statistik: Anzeige der Gesamtst\u00fcckzahl und Gesamtwert")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Wert-Anzeige l\u00e4sst sich aus- und einschalten (Privatsph\u00e4re)")],
      }),

      // Technische Details
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Technische Details")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Technologie-Stack")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Frontend: React 19 + TypeScript + Tailwind CSS v4")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Framework: TanStack Start v1 (Full-Stack mit SSR)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Router: TanStack Router (file-based routing)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  State Management: TanStack Query (React Query)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  UI-Komponenten: Radix UI + shadcn/ui Design System")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Backend & Auth: Supabase (PostgreSQL + Auth + Storage)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Karten: Leaflet mit OpenStreetMap")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  PDF-Generierung: jsPDF")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  KI-Anbindung: Lovable AI Gateway (Gemini 2.5 Flash)")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Plattform-Unterst\u00fctzung")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Web-App: Voll funktionsf\u00e4hig in allen modernen Browsern")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  PWA: Installierbar als Progressive Web App (manifest.json konfiguriert)")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Desktop-App: Electron-Unterst\u00fctzung f\u00fcr Windows/Mac vorhanden")],
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Sicherheit")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Row-Level Security (RLS) auf allen Datenbanktabellen")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  JWT-basierte Authentifizierung")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Jeder Benutzer sieht nur seine eigenen Daten")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Service-Role-Key nur serverseitig verwendbar")],
      }),

      // Design
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Design & Benutzerfreundlichkeit")],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun("Das Design folgt einem eleganten, minimalistischen Ansatz:"),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Serifen-Schrift (\u00e4hnlich Times) f\u00fcr \u00dcberschriften")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Monospace-Schrift f\u00fcr Sammlungsnummern")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Warmes Blau als Prim\u00e4rfarbe (#1a4a6e)")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Responsive Design f\u00fcr Mobile und Desktop")],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun("\u2022  Gro\u00dfe Touch-freundliche Bedienelemente (h=12, h-14 Buttons)")],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun("\u2022  Toast-Benachrichtigungen f\u00fcr alle Aktionen")],
      }),

      // Fazit
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Fazit")],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun(
            "Mineralien \u2013 Cabinet & Tagebuch ist eine durchdachte, professionelle L\u00f6sung f\u00fcr Sammler, die ihre Mineralien, Fossilien und Gesteine digital erfassen m\u00f6chten. Besondere Highlights sind die KI-gest\u00fctzte Etikettenerkennung, die automatische Formel- und H\u00e4rte-Ermittlung sowie die vielf\u00e4ltigen Druck-Exporte im Museumsetiketten-Stil. Die App eignet sich sowohl f\u00fcr den t\u00e4glichen Gebrauch als auch als Verkaufsprodukt dank der PWA- und Desktop-App-Unterst\u00fctzung."
          ),
        ],
      }),

      // Footer
      new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "\u00a9 2026 \u2013 Mineralien Cabinet & Tagebuch",
            size: 18,
            color: "888888",
            italics: true,
          }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/mnt/documents/Mineralien-App-Beschreibung.docx", buffer);
  console.log("Dokument erstellt: /mnt/documents/Mineralien-App-Beschreibung.docx");
});
