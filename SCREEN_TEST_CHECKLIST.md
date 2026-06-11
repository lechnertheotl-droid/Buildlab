# ✅ Screen Test Checklist — Buildlab

**Quick Reference für schnelle Screen-Tests**

---

## 🖥️ Desktop (1920x1080)

### Homepage / Projektkarte
- [ ] App lädt (`http://localhost:5173`)
- [ ] Mindestens 2 Projekte sichtbar
- [ ] Stirnradgetriebe anklickbar

### Projekt-Baum
- [ ] DAG rendert (Schritte mit Kanten)
- [ ] Wurzel-Schritte aktivierbar
- [ ] Gesperrte Schritte grau/deaktiviert
- [ ] Soft-Lock Warnung beim Klick auf gesperrte Schritte

### Workspace - Text & Tiefen
- [ ] Text lädt
- [ ] Tiefen-Umschalter (verspielt/praxis/genau) funktioniert
- [ ] Content ändert sich pro Tiefe
- [ ] Konzepte antippbar → Popover

### Workspace - Formeln
- [ ] Formeln mit Einheiten rendern
- [ ] Variablen antippbar
- [ ] Beispiele (calc-Blöcke) mit Werten
- [ ] Live-Berechnung bei Schieber-Änderungen

### Workspace - Aufgaben

**Single-Choice**
- [ ] Radio-Buttons sichtbar
- [ ] Option klickbar
- [ ] Feedback angezeigt (heuristisch → gezielt → Lösung)

**Multi-Choice**
- [ ] Checkboxes sichtbar
- [ ] Mehrere gleichzeitig wählbar
- [ ] Feedback für teil-richtig

**Numeric**
- [ ] Zahleneingabe + Einheit-Dropdown
- [ ] Deutsche Dezimalschreibweise (3,14) akzeptiert
- [ ] Toleranzbereich beachtet (±%)

**Target (Zielbereich)**
- [ ] Schieber vorhanden
- [ ] Zielbereich visuell markiert
- [ ] Feedback wenn im/außerhalb Bereich

**Estimate / Order / Match / Error-Find / Steps**
- [ ] Aufgabe lädt
- [ ] Interaktion möglich
- [ ] Feedback beim Absenden

### 3D/CAD
- [ ] Canvas/SVG rendert
- [ ] Live-Update bei Parameter-Änderung
- [ ] Download STL funktioniert

### Konzept-Seite
- [ ] Konzept-Popover: „Tiefer eintauchen" Link
- [ ] `/konzept/:id` öffnet sich
- [ ] Zurück funktioniert

### Einstellungen
- [ ] Backup-Export funktioniert
- [ ] Keine Fehler

### Performance
- [ ] Page Load < 3s (Dev), < 1s (Prod)
- [ ] Keine Console-Fehler (F12 → Console)
- [ ] Keine Netzwerk-Fehler (F12 → Network)

---

## 📱 Mobile (375x812)

### Dev Tools: Responsive Design Mode
- [ ] Viewport: 375 × 812
- [ ] Touch-Emulation aktivieren (F12 → ⋯ → Touch)

### Homepage
- [ ] Text lesbar (keine Overflow)
- [ ] Buttons ≥ 44×44px
- [ ] Vertikal gestapelt (kein horizontales Scrollen)

### Projekt-Baum
- [ ] DAG passt auf Screen
- [ ] Zoombar ohne Verzerrung

### Workspace
- [ ] Text lesbar
- [ ] Formeln lesbar (Math)
- [ ] Inputs zugänglich
- [ ] Task-Optionen vertikal gestapelt
- [ ] Scroll smooth (kein Lag)

### Aufgaben
- [ ] Radio/Checkboxes touch-sized (≥44px)
- [ ] Input-Feld unter Tastatur nicht versteckt
- [ ] Feedback lesbar

### 3D
- [ ] Canvas responsive
- [ ] Nicht zu klein zum Lesen

---

## 🔄 Persistenz

- [ ] Workspace öffnen → Aufgabe lösen
- [ ] F5 (Reload) → Aufgabe bleibt gelöst ✅
- [ ] Zu Projekt-Baum navigieren → Schritt erneut öffnen → Aufgabe gelöst
- [ ] DevTools → Network → Offline → App funktioniert

---

## 🎨 Design

- [ ] Fonts korrekt (Bricolage, Hanken, IBM Plex)
- [ ] Farben konsistent (Beige, Accent)
- [ ] Spacing ok (16-24px zwischen Sections)
- [ ] Icons sichtbar

---

## ⌨️ Accessibility

- [ ] Tab-Navigation funktioniert
- [ ] Enter in Input sendet Form
- [ ] Contrast ok (visuell prüfen)
- [ ] DevTools → Accessibility Tree zeigt Structure

---

## 📊 Issues Found

### Critical (🔴)
- [ ] (none found?)

### Warning (🟡)
- [ ] (none found?)

### Info (🔵)
- [ ] (none found?)

---

## ✅ Overall Status

- [ ] Desktop Tests: ✅ PASS
- [ ] Mobile Tests: ✅ PASS
- [ ] Persistenz: ✅ PASS
- [ ] Design: ✅ PASS
- [ ] Accessibility: ✅ PASS

**Verdict**: ✅ **READY FOR PRODUCTION**

---

## 📸 Screenshots Captured

**Desktop:**
- [ ] 01-homepage
- [ ] 02-project-tree
- [ ] 03-workspace-text
- [ ] 04-formulas
- [ ] 05-single-choice
- [ ] 06-numeric-input
- [ ] 07-3d-preview
- [ ] 08-concept-popover
- [ ] 09-settings

**Mobile:**
- [ ] 10-homepage-mobile
- [ ] 11-project-tree-mobile
- [ ] 12-workspace-mobile
- [ ] 13-task-mobile
- [ ] 14-3d-mobile

---

**Test Date**: ___________  
**Tester**: ___________  
**Duration**: ___________  
**Notes**: ___________

---

Für ausführliches Guide siehe: [INTERACTIVE_SCREEN_TEST_GUIDE.md](INTERACTIVE_SCREEN_TEST_GUIDE.md)
