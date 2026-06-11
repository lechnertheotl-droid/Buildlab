# 📱 Interactive Screen Test Guide für Buildlab

**Ziel**: Alle Screens und Funktionen durch echte Browser-Interaktion testen  
**Plattformen**: Desktop (1920x1080) + Mobile (375x812)  
**Duration**: ~30-45 Minuten  
**App URL**: http://localhost:5173

---

## 🚀 Setup

### Voraussetzungen
```bash
# App starten (falls nicht läuft)
pnpm dev

# In separatem Terminal: Dev Server läuft auf
http://localhost:5173
```

### Browser DevTools Responsive Design
- **Chrome/Chromium**: F12 → Device Toolbar (Ctrl+Shift+M)
- **Firefox**: F12 → Responsive Design Mode (Ctrl+Shift+M)
- **Desktop**: 1920 × 1080
- **Mobile**: 375 × 812 (iPhone SE/13)

---

## 📋 Screen-Checkliste

### Screen 0: Startseite / Projektkarte
**Route**: `/#/`  
**Purpose**: Projektauswahl & Hub

#### Auf Desktop (1920x1080) testen:
- [ ] **Ladet die App?** Browser zeigt „Buildlab — Maschinenbau zum Anfassen" als Title
- [ ] **Projektliste sichtbar?** Mindestens 2 Projekte:
  - ✅ Stirnradgetriebe (1. Projekt, erstes MVP)
  - ✅ Hebel-Flaschenzug (2. Projekt)
- [ ] **Projekt-Cards**: Titel, Beschreibung, Thumbnail/Icon sichtbar
- [ ] **Click Stirnradgetriebe** → navigiert zu `/#/projekt/stirnradgetriebe/schritt/1`

#### Auf Mobile (375x812) testen:
- [ ] **Layout responsive?** Projekte stapeln sich vertikal, keine horizontales Scrollen
- [ ] **Text lesbar?** Keine übergroßen Buttons oder abgeschnittener Text
- [ ] **Touch-freundlich?** Buttons sind mindestens 44×44px

#### Design & Ästhetik
- [ ] **Fonts**: Bricolage Grotesque (Body), Hanken Grotesk (Buttons/UI)
- [ ] **Farben**: Warmes Beige/Creme Hintergrund, technisches Accent-Farbschema
- [ ] **Spacing**: Großzügige Abstände zwischen Elementen

---

### Screen 1: Projekt-Baum (ProjectTree)
**Route**: `/#/projekt/:id`  
**Purpose**: Visualisierung der Schritt-Abhängigkeiten als DAG

#### Auf Desktop (1920x1080) testen:
- [ ] **Projekt-Baum rendert?** Isometrisch oder strukturiert angeordnete Schritte sichtbar
  - Root-Schritte oben (z.B. "warum")
  - Abhängige Schritte darunter (z.B. "über" ← "warum")
  - Meilenstein ganz unten ("ms")
- [ ] **Schritt-Nodes haben Icons/Labels?** z.B. 📖 für Lernen, 🔨 für Bauen, 🏁 für Meilenstein
- [ ] **Kanten zwischen Schritten sichtbar?** Abhängigkeitslinien zeichnen den Graphen
- [ ] **Erste Klickable Schritte**: Nur Wurzeln sind aktivierbar (z.B. "warum")
- [ ] **Soft-Lock für gesperrte Schritte**: 
  - Gesperrte Schritte sind grau/deaktiviert
  - Hover zeigt Tooltip: „Erfordert: X abgeschlossen"

#### Auf Mobile (375x812) testen:
- [ ] **Baum passt auf Screen?** Ggf. zoombar/scrollbar, aber nicht abgeschnitten
- [ ] **Touch-Interaktion**: Schritte antippbar, keine Hover-abängigen Controls
- [ ] **Zurück-Button**: Sichtbar oben links oder in Header

#### Interaktionen
- [ ] **Klick auf erlaubten Schritt** (z.B. "warum") → navigiert zu `/#/projekt/stirnradgetriebe/schritt/1`
- [ ] **Klick auf gesperrten Schritt** → Soft-Lock Warnung: „Vorher müssen diese Schritte erledigt sein: X, Y"
  - Warnung ist nicht blockierend (User kann fortfahren, aber wird gewarnt)

---

### Screen 2: Workspace (Hauptlern-Screen)
**Route**: `/#/projekt/:id/schritt/:n`  
**Purpose**: Schritt-Inhalt mit Blöcken (Text, Formeln, Tasks, CAD)

#### Phase A: Text-Blöcke & Tiefen-Umschalter
**Auf Desktop testen:**
- [ ] **Text lädt?** Erste Textsektion sichtbar (z.B. „Was ist ein Zahnrad?")
- [ ] **Tiefen-Umschalter vorhanden?** 3 Buttons oben:
  - 🎮 verspielt (spielerisch, einfach)
  - ⚙️ praxis (praktisch, mittelschwer)
  - 📐 genau (exakt, akademisch)
- [ ] **Tiefenwechsel funktioniert?** Klick → Text ändert sich, Level-appropriate Erklärung
  - **verspielt**: Analogien, vereinfacht (z.B. „wie eine Dose-Deckel-Verbindung")
  - **praxis**: Anwendungsnah, realistische Details
  - **genau**: Formale Definition, mathematische Präzision

#### Phase B: Formeln & Variablen
- [ ] **Formel rendert mit Einheiten?** z.B. 
  ```
  Z₁ = 20 Zähne
  Z₂ = 60 Zähne
  Übersetzung i = Z₂ / Z₁ = 3
  ```
- [ ] **Variablen antippbar?** (z.B. „Z₁") → Popover mit Kurzerklärung
  ```
  Kleine Zahnrad: Ritzel
  Einheit: Zähne
  [Tiefer eintauchen →]
  ```
- [ ] **„Tiefer eintauchen" Link** → navigiert zu `/konzept/zahnzahl` oder ähnlich

#### Phase C: Numerische Beispiele (calc-Blöcke)
- [ ] **Berechnete Beispiele zeigen**? z.B. wenn m=2, Z₁=20:
  ```
  Teilkreisdurchmesser: d₁ = m × Z₁ = 2 × 20 = 40 mm
  ```
  - ✅ Wert ist Engine-berechnet (nicht hard-coded)
  - Toleranz: 1e-6

#### Phase D: Interaktive Blöcke (Schieber, Eingaben)
- [ ] **Interactive Block lädt?** (z.B. GearPair-Schieber)
  - Schieber für Z₁, Z₂
  - Live-Berechnung: Übersetzung, Durchmesser, Achsabstand aktualisieren sich
- [ ] **Eingabefelder funktionieren?**
  - Text-Input oder Number-Input
  - Abhängige Werte berechnen sich live
  - Keine Lag/Freeze

#### Phase E: Aufgaben (alle 9 Typen testen)

**7.1. Single-Choice (Einzelauswahl)**
- [ ] **Aufgabe lädt?** Text: „Welche Aussage trifft zu?"
- [ ] **3-4 Optionen angezeigt?** Radio-Buttons oder Buttons
- [ ] **Option klicken** → wird als „selected" markiert (Highlight/Checkmark)
- [ ] **Submit/Überprüfen klicken** → Feedback:
  - ✅ Richtig: „Exakt! Das ist korrekt."
  - ❌ Falsch (1. Mal): Heuristik-Hinweis (z.B. „Überlege: Zahnräder drehen sich...")
  - ❌ Falsch (2. Mal): Gezielter Hinweis (z.B. „Das ist falsch weil Z₂/Z₁ = 60/20 = 3")
  - ❌ Falsch (3. Mal): Lösungsweg anzeigen

**7.2. Multi-Choice (Mehrauswahl)**
- [ ] **2-3 richtige + 1-2 falsche Optionen**
- [ ] **Checkboxes anklickbar** (nicht Radio-Buttons)
- [ ] **Mehrere gleichzeitig wählbar**
- [ ] **Submit** → erkennt teil-richtig, teil-falsch
  - „Fast! Noch eine Option fehlt" oder „Eine Option ist zu viel"

**7.3. Numeric (Zahleneingabe)**
- [ ] **Eingabefeld mit Einheit-Dropdown?** z.B. `[42] [mm]`
- [ ] **Deutsche Zahlenschreibweise akzeptiert?** 
  - ✅ „3,14" (Komma als Dezimaltrennzeichen)
  - ✅ „3.14" (Punkt auch ok)
- [ ] **Toleranz beachtet?** Wenn Antwort 40 mm ±2%:
  - ✅ 39-41 mm akzeptiert
  - ❌ 38.9 mm abgelehnt
- [ ] **Feedback korrekt**: "Richtig! 40 ± 0,8 mm ist im Bereich"

**7.4. Estimate (Schätzung)**
- [ ] **Größenordnung eingeben?** z.B. Slider 1-10 oder Zahleneingabe
- [ ] **Range-Check**: wenn Antwort zwischen 10-100 akzeptiert:
  - ✅ 50 → „Richtig!"
  - ❌ 5 → „Zu niedrig, wir brauchen mindestens 10"

**7.5. Target (Zielbereich)**
- [ ] **Schieber auf Zielbereich bringen?** z.B. „Stelle die Übersetzung auf 3 ± 0,5 ein"
  - Schieber rendert
  - Bereich ist visuell markiert (Grün-Zone)
- [ ] **Schieber bewegen** → Live-Anzeige aktualisiert sich
- [ ] **Im Bereich**: Grün, „Ziel erreicht!"
- [ ] **Außerhalb**: Rot, „Zu niedrig/hoch"

**7.6. Error-Find (Fehler finden)**
- [ ] **Mehrere Zeilen Code/Text angezeigt**
- [ ] **Eine Zeile hat Fehler** (z.B. falsche Formel)
- [ ] **Zeile anklickbar?** Markierung erscheint
- [ ] **Richtig** → „Genau, hier ist der Fehler: ..."
- [ ] **Falsch** → „Nein, das ist korrekt"

**7.7. Order (Reihenfolge)**
- [ ] **3-5 Elemente nebeneinander/gestapelt**
- [ ] **Drag-Drop oder Buttons?** (Design abhängig)
- [ ] **Richtige Reihenfolge bringen** → „Richtig!"
- [ ] **Falsche Reihenfolge** → Hinweis welche Schritte verwechselt sind

**7.8. Match (Zuordnung)**
- [ ] **2 Spalten**: Linke Seite (3 Items) + Rechte Seite (3 Items)
- [ ] **Verbinden** via Drag-Drop oder Klick-Paaren
- [ ] **Alle Paare korrekt** → „Alle Zuordnungen richtig!"
- [ ] **Falsche Paarung** → wird rot markiert, Hinweis

**7.9. Steps (Mehrteilige Aufgabe)**
- [ ] **mehrere Teile nacheinander**
- [ ] **Abhängigkeiten**: Teil 2 nur unlock wenn Teil 1 richtig
- [ ] **Alle Teile korrekt** → Komplette Aufgabe bestanden

#### Auf Mobile (375x812) testen:
- [ ] **Text ist lesbar?** Keine abgeschnittenen Absätze
- [ ] **Formeln sind lesbar?** Mathml/MathTeX responsiv
- [ ] **Input-Felder sind touch-freundlich?** ≥ 44px hoch
- [ ] **Task-Optionen stapeln sich vertikal** (keine 2-spaltige Layout)
- [ ] **Scroll-Performance**: Kein Lag wenn Text scrollen

---

### Screen 3: CAD & 3D-Vorschau
**Auf Bauen-Schritten testen** (z.B. Schritt 5-6 bei Stirnradgetriebe)

#### Desktop:
- [ ] **Canvas/3D-Vorschau rendert?** (SVG oder Canvas2D Isometric)
  - Zahnrad-Geometrie sichtbar
  - Keine schwarze Box / Fehler
- [ ] **3D-Rendering aktualisiert sich live?** Wenn Schieber ändert (Zahnzahl, Modul):
  - Räder werden größer/kleiner
  - Zähne erhöhen/senken sich
  - Schnell (< 500ms)
- [ ] **Download STL Button?** 
  - Klick → `.stl` Datei wird heruntergeladen
  - Datei ist nicht leer (>1KB)

#### Mobile:
- [ ] **3D passt auf Screen?** Responsive Viewport
- [ ] **Touch-Rotation?** (falls implementiert) Zwei-Finger-Geste oder Button zum Rotieren

---

### Screen 4: Konzept-Detail (ConceptPage)
**Route**: `/#/konzept/:id`

#### Öffnungsweg:
1. Irgendwo im Workspace: Concept-Term antipp (z.B. „Modul")
2. Popover erscheint mit „Tiefer eintauchen" Link
3. Klick → navigiert zu `/konzept/modul`

#### Auf Screen:
- [ ] **Konzept-Name als Title** (z.B. „Modul")
- [ ] **Tiefe Definition** (vespielt/praxis/genau Levels)
- [ ] **Voraussetzungen** (falls definiert): „Setzt voraus: X, Y"
- [ ] **Verwandte Konzepte**: Links zu anderen Konzepten
- [ ] **Wo wird dieses Konzept verwendet?** Auflistung von Schritten
- [ ] **Zurück** → navigiert zum Workspace zurück (History)

---

### Screen 5: Einstellungen (Settings)
**Route**: `/#/einstellungen`

#### Öffnungsweg:
- Top-Navigation: ⚙️ oder „Einstellungen"

#### Auf Desktop:
- [ ] **Einstellungen-Optionen angezeigt**:
  - 🌙 Dark Mode (Toggle) [evtl. für später]
  - 🔔 Notifications
  - 📊 Daten-Backup/Export
  - 🔄 Fortschritt zurücksetzen
- [ ] **Backup exportieren**:
  - Klick → `.json` Datei mit aktuellem Fortschritt
  - Format: `{ projects: { [id]: { stepsDone, taskStates, ... } } }`

#### Auf Mobile:
- [ ] **Layout responsive** (Optionen stapeln sich)
- [ ] **Buttons touch-freundlich**

---

## 🔄 Persistenz-Test

**Wichtig**: Fortschritt wird in IndexedDB gespeichert!

### Szenario 1: Seite neu laden
1. **Workspace**: Öffne Schritt 1 von Stirnradgetriebe
2. **Löse eine Aufgabe**: wähle eine Option
3. **Refresh**: F5 oder Cmd+R
4. **Ergebnis**:
   - ✅ Fortschritt bleibt (Aufgabe als gelöst markiert)
   - ✅ Keine Fehlermeldungen in DevTools

### Szenario 2: Navigation weg und zurück
1. **Workspace**: Schritt 2 geöffnet, Aufgabe gelöst
2. **Klick Zurück** → Projekt-Baum
3. **Klick derselbe Schritt erneut**
4. **Ergebnis**:
   - ✅ Aufgabe zeigt sich als gelöst (kann nicht nochmal gelöst werden)
   - ✅ Progress-Bar/Fortschritts-Anzeige updated

### Szenario 3: Offline (DevTools)
1. **DevTools → Network → Offline**
2. **App funktioniert trotzdem?** (kein Fehler)
3. **Kann neue Aufgaben lösen?** (localstorage ok)
4. **Wieder Online** → Keine Konflikte

---

## 🎨 Design & Accessibility

### Desktop (1920x1080):
- [ ] **Fonts laden?** Keine „missing font" Fallbacks
  - Bricolage Grotesque für Body
  - Hanken Grotesk für Buttons
- [ ] **Farben konsistent?** 
  - Warm Beige (#FFFAF0 oder ähnlich)
  - Accent (z.B. Orange/Terracotta für Buttons)
  - Dark Text (#333 oder #1a1a1a)
- [ ] **Spacing/Padding**:
  - ~16-24px zwischen Major Sections
  - ~8-12px zwischen Items
- [ ] **Icons** (falls vorhanden): sichtbar, lesbar

### Mobile:
- [ ] **Text nicht abgeschnitten**
- [ ] **Buttons klickbar** (mindestens 44×44px nach WCAG)
- [ ] **Inputs im sichtbaren Bereich** (nicht unter Tastatur versteckt)

### Accessibility:
- [ ] **Keyboard Navigation**: Tab durch Buttons/Links funktioniert
- [ ] **Enter Submit**: Text-Input + Enter sendet Form (nicht nur Button)
- [ ] **ARIA**: DevTools Accessibility Tree zeigt sinnvolle Struktur
  - Headings (`<h1>`, `<h2>`)
  - Form Labels (`<label>` oder aria-label)
  - Live regions für Feedback

---

## ⚠️ Edge Cases

### Fehlerhafte Eingaben:
- [ ] **Text in Zahleneingabe**: z.B. „abc" → Error oder Ignorieren?
- [ ] **Leeres Feld senden**: z.B. Numeric-Task mit leerem Input → Error?
- [ ] **Sehr lange Namen**: Projekt/Konzept-Namen mit 100+ Zeichen → keine UI-Breakage?

### Netzwerk:
- [ ] **DevTools → Throttle "Slow 3G"**:
  - App lädt (evtl. langsam, aber nicht broken)
  - Keine Timeouts

---

## 📊 Performance Checks

```javascript
// In Browser Console (F12 → Console Tab):

// 1. Page Load Time
performance.timing.loadEventEnd - performance.timing.navigationStart

// 2. DOM Ready Time
performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart

// 3. First Paint
performance.getEntriesByName("first-paint")[0]?.duration

// Erwartet:
// - Page Load: < 3s (Dev Server), < 1s (Production)
// - DOM Ready: < 2s
// - No console errors (sollte leer sein)
```

---

## 📸 Screenshots to Capture

Folgende Views als Screenshots dokumentieren:

**Desktop (1920x1080):**
1. Homepage (Projektkarte)
2. Projekt-Baum
3. Workspace mit Text
4. Workspace mit Formeln
5. Single-Choice Aufgabe (vor/nach Lösen)
6. Numeric Input Aufgabe
7. CAD/3D-Vorschau
8. Konzept-Popover
9. Einstellungen

**Mobile (375x812):**
1. Homepage
2. Projekt-Baum (responsive)
3. Workspace mit Text
4. Aufgabe Lösen (stackelayout)
5. 3D-Vorschau responsive

---

## ✅ Success Criteria

**PASS wenn alle dieser Punkte erfüllt sind:**
- ✅ Homepage lädt, Projekte sichtbar
- ✅ Projekt-Baum rendert mit Schritten
- ✅ Workspace öffnet und zeigt Inhalte
- ✅ Mindestens 3 verschiedene Task-Typen getestet & lösbar
- ✅ Persistenz funktioniert (Reload = Fortschritt bleibt)
- ✅ Desktop Layout ok (1920x1080)
- ✅ Mobile Layout responsive (375x812, kein Overflow)
- ✅ Keine kritischen Fehler in Browser Console
- ✅ Keine 404s oder Netzwerkfehler

**FAIL wenn:**
- ❌ App crashes beim Laden
- ❌ Main Screens nicht erreichbar
- ❌ Task-System broken (Aufgaben nicht lösbar)
- ❌ Persistenz nicht funktioniert
- ❌ Mobile Layout komplett broken

---

## 🛠️ Troubleshooting

| Problem | Lösung |
|---------|--------|
| App lädt nicht | Dev Server läuft? `pnpm dev` | 
| White screen | DevTools → Console (F12) auf Fehler prüfen |
| Formeln zeigen keine Werte | Engine nicht compiliert? `pnpm build` |
| Tasks nicht lösbar | Content geladen? `pnpm verify:content` |
| Mobile zu klein | Browser-Zoom: 75% oder kleineres Device Viewport |
| LocalStorage voll | Settings → Daten zurücksetzen |

---

## 📝 Test-Report Template

Nach Abschluss aller Tests ein Report schreiben mit:

```markdown
# Screen Test Report — Buildlab [Datum]

## Summary
- ✅ Alle X Screens getestet
- ✅ Alle 9 Task-Typen gelöst
- ✅ Desktop + Mobile Layout ok
- ⚠️ N Issues gefunden (Severity)

## Desktop Tests (1920x1080)
### Screen 1: Homepage
- ✅ Projekte laden
- ✅ Stirnradgetriebe auffindbar
- [Screenshot: homepage-desktop.png]

### Screen 2: Projekt-Baum
- ✅ DAG rendert
- ✅ Schritte antippbar
- [Screenshot: tree-desktop.png]

...

## Mobile Tests (375x812)
### Screen 1: Homepage
- ✅ Responsive layout
- ✅ Text lesbar
- [Screenshot: homepage-mobile.png]

...

## Persistenz
- ✅ Reload: Fortschritt bleibt
- ✅ Navigation: State konsistent

## Issues Found
### 🔴 Critical
- (none)

### 🟡 Warning
- (none)

### 🔵 Info
- (none)

## Conclusion
✅ **READY FOR PRODUCTION**
```

---

**Estimated Time**: 30-45 Min  
**Notes**: Dieser Guide kann offline (ohne Browser-Automation) durchgeführt werden, indem man die App manuell im Browser öffnet und interaktiv testet.

---

*Zuletzt aktualisiert: 2026-06-11*
