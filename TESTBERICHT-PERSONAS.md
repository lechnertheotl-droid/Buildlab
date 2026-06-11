# Testbericht: Vollständiger Persona-Test (11.06.2026)

Manueller End-to-End-Test der gesamten App im echten Browser (Chromium via
Playwright, Dev-Server `pnpm dev`), mit visueller Prüfung jedes Screens per
Screenshot. **Nur Befundaufnahme — es wurde nichts am Code geändert.**

## Methodik

| Persona | Profil | Tiefe | Viewport | Schwerpunkt |
|---|---|---|---|---|
| **Mia, 14** | Schülerin, neugierig, tippt alles an | verspielt | 375×812 (Touch) | Onboarding, Popovers, falsche Antworten, Mobile-Layout |
| **Jonas, 19** | Azubi, will schnell bauen | praxis | 820×1180 (Tablet) | Hebel & Flaschenzug, CAD/STL, Rechner |
| **Sarah, 24** | MB-Studentin, prüft fachlich | genau | 1440×900 | Alle 8 Schritte Stirnradgetriebe, Formeln, Randfälle |
| **Robert, 45** | Quereinsteiger | praxis | 1280×800 | Training/Leitner, Backup, Konzeptseiten, Persistenz |
| **Alex** | Nur Tastatur, reduced motion | – | 1280×800 | Fokus, Tab-Reihenfolge, aria-live |

Abgedeckt: Onboarding (alle 3 Pfade), Dashboard (leer/mit Fortschritt/mit
Fälligem), Projektliste, Projektdetail (Soft-Lock), alle 8 Schritte
`stirnradgetriebe` (gelöst inkl. CAD-Build und STL-Download), `hebel-flaschenzug`
(Schritte 1, 3, 4, 6, 7), alle vorkommenden Aufgabenarten mit richtigen,
falschen und unsinnigen Eingaben, alle 4 Interactives, Skill-Map
(Desktop + Mobile), Konzeptseite, Training-Session komplett, Werkstatt
(leer/gefüllt), Einstellungen inkl. Backup-Export→Import und Lösch-Dialog,
Rechner (alle 3 Tabs, Verlauf, Reload), 404, Deep-Links, Reload-Persistenz.

Hinweis zur Testumgebung: Google-Fonts-CDN war blockiert (Sandbox), Screenshots
zeigen daher Fallback-Schriften. Das ist zugleich Befund B-26.

---

## 🔴 Fehler (funktional, sollte vor R7 behoben werden)

### B-01 · Projektabschluss geht durch Schreib-Race verloren — das Projekt wird nie „fertig“
**Status: ✅ behoben (11.06.2026)** — Writes in `src/db/repo.ts` laufen jetzt seriell über eine Promise-Kette.
**Screen:** Workspace Schritt 8 (Meilenstein) · **Persona:** Sarah (kompletter Durchlauf)
Beim Betreten des Meilensteins feuern `enterStep` (aus `Workspace.tsx`-Effect) und
`completeStep` (aus dem `stepDone`-Effect in `WorkspaceStep.tsx`, da der
Meilenstein keine Aufgaben hat) fast gleichzeitig. Beide machen ein
nicht-atomares Read-Modify-Write auf denselben `projectProgress`-Datensatz.
Per IDB-Protokoll nachgewiesen: `completeStep` schreibt
`{stepsDone:["meilenstein"], completedAt:…}`, direkt danach überschreibt
`enterStep` mit seinem **veralteten** gelesenen Stand `{stepsDone:[], …}`.
**Folge:** `completedAt` wird nie persistiert. Dashboard zeigt für immer
„Weiter bei: … Schritt 8/8 · noch ~10 min“, die Werkstatt bekommt nie einen
Abschluss (Laufzettel), die Challenge fühlt sich nie gewonnen an.
**Fix-Idee:** Beide Writes in eine IDB-Transaktion bzw. `completeStep`/`enterStep`
über eine Mutations-Queue serialisieren; `enterStep` sollte `stepsDone`/`completedAt`
nie anfassen (nur `currentStep`/`maxStepReached` mergen statt ganzen Record ersetzen).

### B-02 · Ein einziger Deep-Link-Versuch hebelt das Schritt-Gating dauerhaft aus
**Status: ✅ behoben (11.06.2026)** — `enterStep` feuert erst nach geladenem Fortschritt und nur ohne anstehenden Redirect; `getProgress` unterscheidet jetzt „lädt" von „existiert nicht".
**Screen:** Workspace · **Repro:** Frisches Profil, URL `#/projekt/stirnradgetriebe/schritt/8` aufrufen.
Der `enterStep`-Effect in `src/screens/Workspace.tsx` läuft **vor** der
„Kein Vorspulen per URL“-Prüfung und schreibt `maxStepReached = 7` in die DB.
Der Nutzer wird zwar (beim ersten Mal) auf Schritt 1 umgeleitet, aber ab sofort
gilt `allowed = 8`: Der zweite Aufruf derselben URL landet direkt auf dem
Meilenstein, und die Schritt-Punkte in der Fußleiste sind alle freigeschaltet.
**Fix-Idee:** `enterStep` erst nach bestandener Vorspul-Prüfung aufrufen bzw. den
geclampten `stepIndex` verwenden.

### B-03 · Der Rechner versteht keine Komma-Eingaben — in einer deutschen Lern-App
**Status: ✅ behoben (11.06.2026)** — Eingaben werden vor dem Parsen normalisiert (Komma→Punkt), die Komma-Taste schreibt „,", Einheiten-Ergebnisse werden deutsch formatiert.
**Screen:** Rechner (global) · **Persona:** Jonas
- Getippt `120*0,3/0,18` → „Das kann ich so nicht rechnen.“
- Die **Komma-Taste des eigenen Keypads** fügt einen Punkt ein (Anzeige „1.5“).
- Der Verlauf zeigt englisches Format („1.5*2 = 3“), während die restliche App
  konsequent deutsch formatiert („29,1“, „3.000 1/min“).
Die Aufgaben versprechen ausdrücklich „Komma oder Punkt sind beide ok“ — der
Rechner bricht dieses Versprechen. **Fix-Idee:** Eingabe vor mathjs-Parse
deutsch normalisieren (Komma→Punkt, außer in Funktionsargumenten) und Ausgabe
über die vorhandene deutsche Formatierung rendern.

### B-04 · Target- und Bau-Aufgaben sind mit den Default-Werten bereits erfüllt
**Status: ✅ behoben (11.06.2026)** — Schritt 4 startet bei m = 3, der Bau-Schritt bei z₂ = 40; die Bühne remountet je Schritt, sodass „aktuell:" sofort den Live-Wert zeigt (mit Live-Store-Nachprüfung gegen veraltete Treffer des Vorschritts). Bau-Schritte gelten außerdem erst als erledigt, wenn alle Build-Anforderungen grün sind (CadBuild publiziert den Constraint-Stand ins Schritt-Gating).
**Screens:** Schritt 4 und Schritt 7 (stirnradgetriebe) · **Personas:** Sarah, Jonas
- Schritt 4: Ziel a = 80 mm — der m-Slider steht **schon auf m = 2 → a = 80 mm**.
  Die Aufgabe sagt „Stell den Modul so ein …“, zeigt aber „aktuell: — stell die
  Regler in der Ansicht rechts“. Der Lernende muss den Regler **weg- und wieder
  zurückschieben**, damit die Aufgabe es merkt. Doppelt verwirrend.
- Schritt 7 (Bauen): Beide Constraints sind mit den Defaults ab Werk grün —
  „Schritt 7 ✓“ erscheint ohne jede Interaktion. Der einzige Bau-Schritt des
  Projekts verlangt damit effektiv nichts.
**Fix-Idee:** Startwerte bewusst neben das Ziel legen (z. B. m = 3) **und** die
Target-Kopplung beim Mount mit dem aktuellen Canvas-Stand initialisieren statt
mit „—“.

### B-05 · Explosionsansicht im Meilenstein ist hartkodiert und beim Flaschenzug schlicht falsch
**Status: ✅ behoben (11.06.2026)** — Teile-Labels kommen jetzt aus dem Content (`step.finaleParts`, neues optionales Schema-Feld); ohne Labels rendert das Finale unbeschriftet. Werkstatt-Satz unterscheidet Bau-Projekte („Dein Bauteil wartet…") von reinen Abschlüssen („Dein Abschluss steht…").
**Screen:** Meilenstein beider Projekte · **Persona:** Jonas
Das Finale zeigt immer denselben Scheiben-Stapel mit den Labels
„Grundplatte / Rad 1 / Rad 2 / Deckel“ — auch beim **Flaschenzug**, der weder
Räder noch Grundplatte hat. Zusätzlich behauptet der Text „Dein Bauteil wartet
in der Werkstatt“, obwohl `hebel-flaschenzug` keinen Bau-Schritt/STL-Export hat
und die Werkstatt leer bleibt. Beim Stirnradgetriebe heißt das oberste Teil
generisch „Bauteil“.
**Fix-Idee:** Teile-Labels aus dem Projekt-Content speisen; Werkstatt-Satz nur
zeigen, wenn das Projekt tatsächlich Bau-Einträge erzeugt.

### B-06 · Stufen-Aufgabe: Fehlermeldung aus Stufe 1 bleibt unter Stufe 2 stehen
**Status: ✅ behoben (11.06.2026)** — `useFlow.clearMessage()` räumt die ✗-Meldung beim Stufen-Aufstieg.
**Screen:** Schritt 5 (steps-Aufgabe) · **Persona:** Sarah
Antwortet man in Stufe 1 falsch (✗-Meldung) und dann richtig, erscheint Stufe 2 —
aber die alte ✗-Meldung („Noch nicht ganz …“) bleibt sichtbar, als hätte man in
Stufe 2 schon gefehlt. In `TaskView.tsx` wird beim Stufenwechsel `stageMsg`
zurückgesetzt, der task-weite `fail()`-Status aber nicht.

### B-07 · Studium-Persona bekommt stillschweigend ein Fallback-Projekt empfohlen
**Status: ✅ behoben (11.06.2026)** — `personaStart()` liefert ein Fallback-Flag; das Onboarding sagt jetzt dazu, dass das maßgeschneiderte Projekt noch in Arbeit ist.
**Screen:** Onboarding Schritt 3 · **Persona:** Sarah
`PERSONA_START.studium = 'fachwerkbruecke'` — das Projekt existiert noch nicht,
also fällt `personaStartProject` kommentarlos auf `projects[0]` zurück: Wer
„Studium verstehen (Klausuren, **Statik** & Co.)“ wählt, bekommt „Hebel &
Flaschenzug“ präsentiert, als wäre es die kuratierte Empfehlung. Kein Hinweis,
dass das eigentliche Statik-Projekt noch fehlt.

---

## 🟡 UX & Inhalt (stört den Lernfluss)

### B-08 · „Antippen erklärt“ führt nirgendwo hin — genau im Workspace fehlt „tiefer eintauchen“
**Status: ✅ behoben (11.06.2026)** — Der Workspace-`ContentProvider` reicht `onOpenConcept` durch; „tiefer eintauchen →" navigiert zur Konzeptseite.
Der Popover hat laut Spec (LERNMODELL) einen Link zur Konzeptseite. Der existiert
in `TapExplain.tsx` auch — wird aber nur gerendert, wenn `onOpenConcept` im
Context steckt. `src/screens/Workspace.tsx` erzeugt einen **eigenen**
`ContentProvider` ohne `onOpenConcept`. Ergebnis: Auf dem Screen, auf dem 80 %
der Zeit stattfindet, enden alle Begriffs-Popovers blind; Konzeptseiten sind
praktisch nur über die Skill-Map erreichbar.

### B-09 · Deaktivierter „Weiter“-Button erklärt sich nur per Hover-title
**Status: ✅ behoben (11.06.2026)** — "Weiter" nutzt aria-disabled: ein Tap auf den gesperrten Knopf zeigt den Grund sichtbar an (mobil als kleine Karte über der Leiste).
Der Grund („Noch eine Aufgabe offen — sie ist direkt über mir.“) steckt
ausschließlich im `title`-Attribut — auf Touch-Geräten (Mia!) gibt es kein
Hover, sie sieht nur einen blassen Button (opacity-40) ohne Erklärung.
**Fix-Idee:** Hinweis als sichtbaren Text/Tooltip-on-tap, und den
Disabled-Zustand kontrastreicher gestalten.

### B-10 · STL-Export liefert kommentarlos nur das aktive Rad
**Status: ✅ behoben (11.06.2026)** — Mikrotext unter dem Download-Button: "Fürs Getriebe brauchst du beide Räder — wechsle oben auf Rad 2 und lade nochmal."
Der Button „⤓ STL herunterladen“ exportiert nur das im Rad-1/Rad-2-Umschalter
aktive Rad (`stirnrad_rad1_z20_m2.stl`). Dass man für das Getriebe **zwei**
Dateien braucht (Rad 2 erst umschalten, nochmal laden), sagt einem nichts.
**Fix-Idee:** „Beide Räder laden (2 Dateien)“ oder Hinweistext unter dem Button.

### B-11 · Dashboard: Fälliges Training fehlt, Empfehlung widerspricht sich
**Status: ✅ behoben (11.06.2026)** — Auffrisch-Karte ab 1 fälligem Konzept (SCREENS.md angepasst); Empfehlungs-Fallback bei laufendem Projekt ("Mach erst … fertig"); leeres Dashboard empfiehlt nicht mehr doppelt; Werkstatt-CTA sagt "weitermachen", wenn begonnen.
- Ein fälliges Konzept (Leitner-due) erzeugt **keine** Auffrisch-Karte auf dem
  Dashboard (laut SCREENS.md vorgesehen) — man entdeckt das Training nur zufällig.
- Während `hebel-flaschenzug` läuft, zeigt „Als Nächstes“: „Noch keine
  Empfehlung — **starte ein Projekt**.“ Es läuft aber eins.
- Frisches Profil („Erstmal umsehen“): Hero „Dein erstes Projekt: Hebel &
  Flaschenzug“ **und direkt darunter** „Als Nächstes: Hebel & Flaschenzug ·
  EMPFOHLEN“ — dieselbe Empfehlung doppelt.
- Werkstatt-Empty-State sagt „Stirnradgetriebe **starten** →“, auch wenn das
  Projekt längst begonnen ist.

### B-12 · Training ignoriert fällige Konzepte ohne Aufgaben-Pool stillschweigend
**Status: ✅ behoben (11.06.2026)** — Training zeigt ehrlich, welche fälligen Konzepte noch keine Übungen haben, statt sie zu verschlucken.
3 Konzepte fällig (kraft, hebelarm, drehmoment) → Training zeigt „1 von 1“
(nur Drehmoment, weil nur `training/maschinenelemente.json` existiert). Die
Statik-Konzepte bleiben unsichtbar fällig — der Nutzer kann sie nie abbauen,
die Skill-Map zeigt aber weiter „auffrischen“. Mindestens ein Hinweis
(„2 weitere fällige Konzepte haben noch keine Übungen“) wäre ehrlich.

### B-13 · Zahlenformatierung: vierstellige Nachkommastellen im verspielten Kontext
**Status: ✅ behoben (11.06.2026)** — Schätzwert und Faktor-Feedback runden auf eine Nachkommastelle („≈ 4,5", „Faktor 1,5").
- Schätz-Slider zeigt „≈ 4,4721“ bzw. „≈ 282,8427“ (geometrische Mitte) — für
  ein „Bauchgefühl“ absurd präzise.
- Feedback: „Richtung stimmt (Faktor **2,8255** daneben)“, „du lagst um Faktor
  **1,1314** daneben“. Eine Dezimale reicht („~2,8×“).

### B-14 · Einheiten-Hinweis bei einheitenloser Größe
**Status: ✅ behoben (11.06.2026)** — Heuristik-Text ohne Einheiten-Irreführung: „… da ist eine Zehnerpotenz verrutscht. Prüf den Faktor 10."
Numeric-Heuristik bei i = 3, Antwort 30: „Die Ziffern stimmen — **prüf die
Einheiten**, da ist eine Zehnerpotenz verrutscht.“ Die Übersetzung i hat keine
Einheit — der erste Halbsatz führt in die Irre (Zehnerpotenz-Teil ist gut).

### B-15 · Auslegungs-Ziel verwirrend formuliert
**Status: ✅ behoben (11.06.2026)** — Toleranzen > 5 % werden als Korridor angezeigt ("Ziel: F zwischen 2,5 und 7,4 N").
Flaschenzug Schritt 6: Aufgabe sagt „höchstens 8 N“, die Zielzeile zeigt aber
„Ziel: F = 4,905 N (±50 %)“ — ein exakter Wert mit Riesentoleranz statt der
eigentlichen Bedingung „F ≤ 8 N“. Sarah rechnet nach und wundert sich.

### B-16 · Onboarding hat keinen Weg zurück
**Status: ✅ behoben (11.06.2026)** — "‹ Zurück" in Onboarding-Schritt 2 und 3.
Wer in Schritt 1 die falsche Tür erwischt, kann nur „Erstmal umsehen“ (= raus)
oder weiter. Ein „‹ Zurück“ zwischen den drei Schritten fehlt.

### B-17 · Soft-Lock sieht aus wie Hard-Lock
**Status: ✅ behoben (11.06.2026)** — Karte nicht mehr ausgegraut, Hinweis-Dreieck statt Schloss (Soft-Lock liest sich wieder als Empfehlung).
In der Projektliste ist die Stirnradgetriebe-Karte ausgegraut mit
**Schloss-Symbol** „🔒 Voraussetzung offen“. Die Philosophie ist „Soft-Lock,
nie Sperren“ — die abgeblendete Karte + Schloss kommuniziert das Gegenteil.
(Im Projektdetail ist es mit „Trotzdem starten“ gut gelöst.)

### B-18 · Rechner-Details
**Status: ✅ behoben (11.06.2026)** — Autofokus aufs Ausdrucksfeld (ab md); Keypad mobil kompakter + Safe-Area ("=" sichtbar); "Formelsammlung" mit Formelnamen; Aktiv-Label = Formelname statt Bühnen-Caption; Werte-Vorschau deutsch formatiert.
- Nach dem Öffnen hat das Eingabefeld **keinen Fokus** — Lostippen verpufft.
- Mobil (375×812) ragt der „=“-Button unten **aus dem Viewport**.
- Tab „Σ FORMELN“ ist mit „PROJEKTFORMELN“ überschrieben, listet aber **alle**
  Formeln global — inklusive Raketen-Formeln (F_w, S), deren Projekt noch gar
  nicht existiert, ohne Namen/Beschreibung.
- Das „AKTIV:“-Label übernimmt die komplette Bühnen-Caption in Großbuchstaben
  („AKTIV: SPIEL EINFACH: SCHIEBE KRAFT UND ABSTAND — …“) statt z. B. „Drehmoment“.
- Werte-Vorschau „F = 100 · r = 0.5“ mit Dezimal**punkt**.

### B-19 · Versprochene Aufgabenarten existieren nicht im Content
**Status: ✅ behoben (11.06.2026)** — `multi`-Aufgabe in „Die Übersetzung" (i = 4-Aussagen) und `order`-Aufgabe im neuen Bau-Schritt des Flaschenzugs (Aufbau-Reihenfolge); damit kommen alle 9 Aufgabenarten im Content vor. Korrektur am Befund: `fill` existiert als Aufgabenart nicht (Berichtsfehler) — die neunte Art ist `order`.
CLAUDE.md/BUILD_PLAN: 9 Aufgabenarten, Gold-Standard deckt alle ab. Tatsächlich
nutzen beide Projekte zusammen nur 7 — `multi`, `order`/`fill` kommen in keinem
Content vor (Renderer existieren). Doku und Realität auseinander.

### B-20 · „Hebel & Flaschenzug“ baut nichts
**Status: ✅ behoben (11.06.2026)** — neuer Schritt „Deine Umlenkrolle drucken": parametrische Rolle (cad/rolle.scad, OpenSCAD-WASM, eigene Pipeline `compilePulley`), Engine-Formel `groove_min` mit Golden Test, drei Constraints mit Beweis-Paaren (Rille startet bewusst zu eng), STL-Export, Werkstatt-Eintrag + Re-Export. Der Meilenstein-Satz „Dein Bauteil wartet in der Werkstatt" stimmt jetzt auch hier.
Das Projekt hat keinen `bauen`-Schritt und keinen build-Block — die App
verspricht „Lernende bauen echte Projekte“, der Meilenstein heißt
„Challenge-Check“ und verweist auf die Werkstatt (siehe B-05). Die Bauanleitung
(Schnur/Karabiner) ist gut, aber als HINWEIS-Block im Meilenstein versteckt.

### B-21 · Aufgabe „aktuell: — stell die Regler in der Ansicht **rechts**“
**Status: ✅ behoben (11.06.2026)** — ortsneutral: "beweg die Regler in der Ansicht".
Auf Mobile ist die Ansicht **oben**, nicht rechts. Ortsangabe stimmt nur auf
Desktop.

---

## 🔵 Visuell / Politur

### B-22 · RECHNER-Lasche überlappt Inhalte auf Mobile (mehrfach)
**Status: ✅ behoben (11.06.2026)** — Mobil ist die Lasche jetzt ein kompakter runder Knopf in der Ecke (48 px) statt einer hohen Leiste; Desktop unverändert.
Auf 375 px schwebt die Lasche über dem Content und verdeckt:
die Ziel-Überschrift in Schritt 1 („…Tempo gegen Kraft **tau‌schen**“ ist
angeschnitten), das Slider-Maximum „20“ der Schätzaufgabe, in der Skill-Map-Liste
die Status-Spalte („angewende‌t“ → „angewende“, „neu“ → „ne“). Auf dem leeren
Dashboard hängt sie zudem verloren im Leerraum.
**Fix-Idee:** Content-Spalte rechts Padding in Laschenbreite geben oder Lasche
mobil an die Bottom-Bar koppeln.

### B-23 · Begriffs-Popover läuft mobil aus dem Viewport
**Status: ✅ behoben (11.06.2026)** — Popover klappt am rechten Rand nach links auf und ist auf Viewport-Breite begrenzt.
„Zahnrad“-Popover in Schritt 1 (375 px): Text wird am rechten Bildschirmrand
abgeschnitten. Kollisionserkennung/Flip fehlt.

### B-24 · `N*m`, `m/s^2`, `deg` — rohe mathjs-Notation sickert in die UI
**Status: ✅ behoben (11.06.2026)** — zentrale `formatUnit()`-Hilfe (`N*m`→`N·m`, `^2`→`²`, `deg`→`°`) an allen Render-Stellen (Canvas, Aufgaben, Meilenstein, Skill-Map, Rechner-Tab & -Ergebnis, Popover).
Überall, wo Werte „aus der Engine“ kommen: Canvas („M = 50 **N*m**“),
Meilenstein-Checks („M₂ = 29,1 **N*m**“ direkt über dem korrekt gesetzten
„29,1 N·m“ im Fließtext), Skill-Map-Vorschau („[N*m]“), Einheiten-Tab des
Rechners („N*m“, „m/s^2“, englisches „deg“). Eine zentrale Unit-Format-Funktion
(`·`, hochgestellte Exponenten, „°“) würde alle Stellen heilen.

### B-25 · PulleySystem-Beschriftungen
**Status: ✅ behoben (11.06.2026)** — Einheiten formatiert; das F-Label sitzt bei n = 1 jetzt über der Last und neben dem Seil (keine Kollision mehr).
- „F = 19,62 N**aus der Engine**“ — fehlendes Leerzeichen zwischen Einheit und
  Hinweistext (nur bei dieser Komponente).
- Bei n = 1 überlappt das rote „F = 19,62 N“-Label den „2 kg“-Schriftzug auf der
  Kiste; bei n = 6 berührt es die Kistenkante.

### B-26 · Schriften kommen zur Laufzeit von Google
**Status: ✅ behoben (11.06.2026)** — Schriften werden lokal gebündelt (@fontsource, variable Fonts); index.html lädt nichts mehr von Google. Verifiziert: 0 externe Font-Requests, Konsole komplett sauber.
`index.html` lädt Bricolage Grotesque/Hanken Grotesk/IBM Plex Mono vom
Google-CDN. Für eine bewusst lokale, kontofreie App: offline (erster Besuch)
bricht die komplette Typo auf Fallbacks zusammen, plus DSGVO-Thema
(IP-Übertragung an Google). **Fix-Idee:** Fonts selbst hosten (`@fontsource/*`).

### B-27 · Verwaistes „η“ unter der Formel
**Status: ✅ behoben (11.06.2026)** — Variablen-Reihe trägt die Caption "antippbar"; Trigger haben sprechende Accessible Names ("Wirkungsgrad — erklären").
Unter „M₂ = M₁·i·η“ hängt ein einzelnes, unscheinbares „η“ — der antippbare
Variablen-Button ohne jede Chip-Optik (i und M₂ haben Konzept-Chips, η nicht).
Accessible Name ist obendrein „η\etaη“ (KaTeX-Annotation landet im Namen) —
für Screenreader Kauderwelsch.

### B-28 · Leere Bühne in Schritt 5/6 wirkt unfertig
**Status: ✅ behoben (11.06.2026)** — Platzhalter-Bühne zeigt zusätzlich die Formeln des Schritts ("In diesem Schritt").
Schritte ohne Interactive zeigen rechts nur eine große, fast leere Karte mit
„⚙ Stirnradgetriebe“. Platz für die Formel-Karte, das aktuelle Getriebe aus
Schritt 4 oder eine Mini-Illustration.

### B-29 · Eingeklappte Ansicht zeigt verwaistes „a = 80 mm“
**Status: ✅ behoben (11.06.2026)** — Eingeklappte Ansicht zeigt Klarname + Symbol + Wert ("Achsabstand · a = 80 mm"), Einheit formatiert.
Mobil klappt die Bühne auf eine einzelne Kennwert-Zeile zusammen — es erscheint
aber nur der **letzte** Wert (a), ohne Label-Kontext. „i = 3 · a = 80 mm“ wäre
informativer.

### B-30 · Doppeltes Häkchen und Doppel-Label
**Status: ✅ behoben (11.06.2026)** — Doppeltes ✓ entfernt (Message-Komponente setzt das Symbol); „Stufe 1 · Stufe 1:"-Doppellabel aus den Content-Prompts gestrichen.
- Erfolgsmeldung numerisch: „**✓** 3 **✓** · Sitzt.“ — zwei Häkchen.
- Stufen-Aufgabe: „Stufe 1 · **Stufe 1:** Die Räder haben …“ — das UI-Label
  doppelt den Prompt-Text aus dem Content (`steps[].prompt` beginnt selbst mit
  „Stufe n:“).

### B-31 · Skill-Map-Detailpflege
**Status: ✅ behoben (11.06.2026)** — Labels klickbar, lange Namen zweizeilig/kleiner; Kanten laufen jetzt als sanfte Bögen (keine Kante mehr durch fremde Knoten, zahnrad→modul nicht mehr kollinear durch zaehnezahl), gruppenfremde Kanten abgeblendet, die zwei 835/849-px-Diagonalen durch Umpositionierung der Brücken-Konzepte (Feste & lose Rolle, Kraftübersetzung) halbiert. Skill-Map V2 (Pan/Zoom) bleibt R8.
- Lange Labels werden hart abgeschnitten („Teilkreisdurchmes…“, „Übersetzungsverhä…“).
- Klick aufs **Label** tut nichts — nur der Kreis (r = 22) ist Klickfläche.
- Lange Kanten (Kraft→Kraftübersetzung, →Stabilitätsmaß) queren quer durchs Bild
  und unter fremden Gruppen durch.

### B-32 · Werkstatt-Karte zeigt rohe Parameter-Keys
**Status: ✅ behoben (11.06.2026)** — Parameter heißen jetzt "Breite"/"Bohrung"/"z₁" statt thickness/bore.
„m = 2 · z1 = 20 · z2 = 60 · **thickness** = 8 · **bore** = 5“ — englische
Interna in der deutschen UI (in den Slidern heißt es korrekt „Breite“/„Bohrung“).

### B-33 · „Dauerhafter Speicher: nicht gewährt“ ohne Handlungsangebot
**Status: ✅ behoben (11.06.2026)** — Button "erneut anfragen" + Erklärung, warum Browser das anfangs ablehnen.
Die Settings melden den Zustand, bieten aber keinen Knopf, `navigator.storage.persist()`
anzufragen — der Nutzer kann nichts tun außer Backups ziehen.

### B-34 · Kleinigkeiten
**Status: ✅ behoben (11.06.2026)** — Rechner-Icon als Linien-SVG; Settings-Icon ist jetzt ein klares Zahnrad; SegmentedControl-Fokusring wird nicht mehr verdeckt; "Ansicht drehen" zeigt Grad; Match-Selects einheitlich breit.
- Settings-Icon (Zahnrad) liest sich in der Topbar leicht als „Sonne/Helligkeit“.
- Rechner-Lasche nutzt das Abakus-**Emoji** 🧮 statt der Linien-Ikonografie der App.
- SegmentedControl: Tastatur-Fokus ist optisch nicht vom Aktiv-Zustand
  unterscheidbar.
- „Ansicht drehen“-Slider im CAD-Build zeigt nackt „0“ ohne Einheit (°).
- Match-Selects haben unterschiedliche Breiten je Inhalt (unruhiges Raster).

---

## ✅ Was bereits richtig gut ist

- **Feedback-Heuristiken treffen:** Kehrwert (0,33 → „Du hast den Kehrwert
  erwischt“) und Zehnerpotenz (30 → „Zehnerpotenz verrutscht“) werden erkannt;
  Eskalation Hinweis → gezielter Hinweis → „Gut gescheitert — hier ist der Weg“
  funktioniert wie spezifiziert.
- **Einheiten-Pflicht** in der M₂-Aufgabe („Wähle auch die Einheit — sie ist
  Teil der Antwort“) ist didaktisch stark.
- **Folgefehler-Logik** der Stufen-Aufgabe rechnet mit dem eigenen i weiter.
- **Tastatur & A11y:** Fokus-Ringe sichtbar, SegmentedControl als echte
  Radio-Group mit Pfeiltasten, `aria-live` auf Ergebnis und Schritt-Quittung,
  ←/→ navigiert Schritte, Match nutzt native Selects, 44-px-Targets.
- **Backup-Roundtrip** sauber: valides JSON, Import mit verständlicher
  Zusammenfassung; Lösch-Dialog verlangt getipptes „LÖSCHEN“.
- **Training/Leitner** korrekt (Box 1→2, due +3 Tage, Zusammenfassung
  „Box rauf“).
- **CAD-Pipeline:** Vorschau und STL aus demselben Modell, Constraints sperren
  den Export live, sprechende Dateinamen, Stückliste.
- **Deutsche Zahlformate** in Calc-Blöcken (3.000 1/min · 29,1) — außer im
  Rechner (B-03).
- **404-Seite** („Hier ist nichts gezeichnet.“) und Soft-Lock-Kasten im
  Projektdetail sind Microcopy-Highlights; der Ton (VOICE.md) trägt durchgehend.

## Empfohlene Reihenfolge

1. **B-01/B-02** (Persistenz-Race + Gating) — Datenverlust, kleiner Fix, größter Effekt.
2. **B-03** (Rechner-Komma) — bricht das Kernversprechen der deutschen App.
3. **B-04** (Defaults = Ziel) — Content-Fix in JSON, didaktisch wichtig.
4. **B-08** (tiefer eintauchen im Workspace) — Einzeiler (`onOpenConcept` durchreichen).
5. **B-24** (Unit-Formatter) — eine Funktion, viele Stellen.
6. Rest nach Gusto; B-22 (Lasche) vor dem nächsten Mobile-Test.
