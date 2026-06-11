# PROJECT_SPECS.md — Detaillierte Projekt-Spezifikationen

> Verbindliche Vorlage für `/generate-project`. `PROJECTS.md` gibt den Überblick;
> **hier** steht je Projekt, *was genau* hineingehört. Vier Projekte sind voll
> ausgearbeitet (1, 2, 4, 11); die übrigen haben generierungsfertige Kurz-Specs,
> die der Generator nach demselben Muster ausdehnt (danach menschliche Stichprobe).

---

## Die Vorlage (jedes Projekt füllt genau diese Felder)

```
### <Nr>. <Name>  (id: <projekt-id>)
- Metadaten:           icon · durationMin · difficulty (1–5) · recommendedAfter
- Bau-Ergebnis:        was man am Ende physisch in der Hand hat
- Challenge:           reale Aufgabe mit messbarer Anforderung (das Briefing)
- Neue Konzepte:       hier ERSTMALS voll erklärt (sonst nur Chip + Popover)
- Formeln:             Formel-Bibliothek-IDs + Kurzform
- Mikro-Schritte:      je 5–15 min · kind · Ziel · Blöcke · Aufgabenart(en) · Canvas
- Schritt-Graph:       requires je Schritt (Äste des Projekt-Baums; ohne Angabe linear)
- Bau-Output:          CAD-Parameter → STL, Stückliste; build.constraints
- Meilenstein:         was die Engine am Ende verifiziert (Challenge-Check)
- Golden Tests:        Prüfaufgaben mit bekanntem Ergebnis (Pflicht!)
- Tiefen-Hinweis:      was verspielt / praxis / genau jeweils betonen
```

**Regeln für den Generator:**
1. Pro Schritt **ein** Lernziel; Schritt folgt dem Lern-Loop (`LERNMODELL.md` §2):
   Aufhänger (`text.variant:hook`) → Begreifen → Anwenden → Prüfen.
2. Jeder `lernen`-Schritt hat ≥ 1 `task` und ≥ 1 `interactive`/`calc`.
3. Jede neue Formel braucht ein Formel-Objekt mit Variablen-Erklärungen und
   ≥ 1 Golden Test, **bevor** sie im Content verwendet wird.
4. Jede Zahl im Content kommt aus `node tools/eval.mjs` (nie selbst rechnen);
   `numeric`-/`estimate`-Aufgaben tragen ihre `source`, `target`-Aufgaben ihr
   `proof`-Paar, `error-find` genau eine falsche Zeile.
5. Aufgabenarten nach Lernziel wählen (`LERNMODELL.md` §8); pro Projekt
   ≥ 4 verschiedene Arten, keine zwei gleiche Arten direkt hintereinander.
6. Genau **ein** `meilenstein`-Schritt, immer zuletzt — im Schritt-Graphen die
   einzige Senke: jeder Schritt mündet transitiv in ihn (Verifier-Regel 20).
   `requires` ist alles-oder-nichts je Projekt (Wurzeln mit `[]`); ein Konzept
   wird nur in Schritten verwendet, deren `requires`-Vorfahren es einführen
   (Regel 21 — gilt auch für `task.concepts`).
7. Bereits eingeführte Konzepte nur per `uses` referenzieren — nie neu erklären.
8. Jedes `conceptsIntroduced` wird von ≥ 1 `task.concepts` geprüft.

---

## ★ Voll ausgearbeitet

### 1. Hebel & Flaschenzug  (id: `hebel-flaschenzug`)
- **Metadaten:** icon `⚖` · 35 min · difficulty 1 · recommendedAfter: —
- **Bau-Ergebnis:** funktionierender Mini-Flaschenzug (3D-Druck: Rollen, Haken, Gestell).
- **Challenge:** „Hebe 2 kg mit höchstens 8 N Zugkraft — und erkläre, woher der Rabatt kommt."
- **Neue Konzepte:** kraft, hebelarm, drehmoment, gleichgewicht (intuitiv),
  lose/feste Rolle, mechanische Übersetzung, wirkungsgrad (qualitativ).
- **Formeln:** `torque_lever` M=F·r · `pulley_force` F=G/n · `torque_balance` F₁·r₁=F₂·r₂.
- **Mikro-Schritte:**
  1. *Was ist eine Kraft?* — lernen · hook („Du drückst die Tür am Griff, nicht am
     Scharnier — warum eigentlich?") · text · interactive `lever-slider` · task
     `estimate` („Wie viel leichter wird's am langen Hebel?").
  2. *Hebelarm & Drehmoment* — lernen · formula `torque_lever` · `lever-slider`
     als Canvas · task `target` („Bring den Hebel mit höchstens 20 N ins Gleichgewicht").
  3. *Das Hebelgesetz* — lernen · formula `torque_balance` · calc · task `numeric`.
  4. *Rollen: fest & lose* — lernen · text + formula `pulley_force` ·
     `value-slider` (n → F live) · task `single` (mit `why` je Option).
  5. *Wirkungsgrad in echt* — lernen · text (praxis/genau) · task `match`
     (Begriff ↔ Wirkung: Reibung, Seilsteifigkeit, Umlenkung).
  6. *Deinen Flaschenzug bauen* — bauen · build (Rollenzahl, Rollen-Ø, Haken) ·
     constraints: `G/n <= 8` (Zielzugkraft) und Baubarkeit der Rollengröße.
  7. *Meilenstein* — meilenstein · Engine prüft F ≤ 8 N bei G = 19,62 N ·
     Explosionsansicht · Produkt-Karte (Projektkarte) · Druck- und Testanleitung.
- **Schritt-Graph** (Content): Kraft → Hebelarm → Hebelgesetz → Rollen, dann
  zwei Äste {*Wirkungsgrad in echt* ∥ *Auslegung* → *Bauen*}; der Meilenstein
  vereint beide.
- **Bau-Output:** n, Rollen-Ø → Rollen/Gestell/Haken (OpenSCAD) → STL; Stückliste
  (2–4 Rollen, Gestell, Haken, Schnur als Zukauf).
- **Meilenstein:** `F = G/n ≤ 8 N` und gewählte Geometrie baubar.
- **Golden Tests:** M=F·r mit F=100 N, r=0,5 m → 50 N·m (vorhanden) ·
  F=G/n mit G=19,62 N, n=4 → 4,905 N · Balance 20·0,3 = 30·0,2.
- **Tiefen-Hinweis:** verspielt = Hebel kippen & fühlen; praxis = Faustregeln
  (Kraft × Weg bleibt gleich); genau = Momentengleichgewicht formal + η-Kette.

### 2. Fachwerkbrücke  (id: `fachwerkbruecke`)
- **Metadaten:** icon `⛁` · 50 min · difficulty 2 · recommendedAfter: —
- **Bau-Ergebnis:** Strebenmodell (Druck/Stäbchen), trägt definierte Last.
- **Challenge:** „Brücke über 30 cm Spannweite, trägt 5 kg mittig, möglichst wenig Material."
- **Neue Konzepte:** kraftvektor, gleichgewicht (formal: ΣF=0, ΣM=0),
  auflagerreaktion, zugdruckstab, knotenpunktverfahren, statische Bestimmtheit.
- **Formeln:** `beam_reaction` F_A=F/2 (vorhanden) · `sum_f` ΣF=0 ·
  `det_truss` 2k=s+r · Stabkräfte aus Knotengleichgewicht (Sim `truss-load`).
- **Mikro-Schritte:**
  1. *Kräfte haben Richtung* — lernen · hook · `vector-drag` · task `estimate`.
  2. *Gleichgewicht: nichts bewegt sich* — lernen · `force-balance` (Kräfte
     addieren bis Ruhe) · task `target` (ΣF ≈ 0 herstellen).
  3. *Auflagerreaktionen* — lernen · formula `beam_reaction` · calc · task `numeric`.
  4. *Zug oder Druck?* — lernen · `truss-load` (Stäbe färben sich blau/rot) ·
     task `multi` („Welche Stäbe stehen unter Druck?").
  5. *Knotenpunktverfahren* — lernen · text + calc · task `steps`
     (zwei Knoten nacheinander, `$prev`).
  6. *Statisch bestimmt?* — lernen · formula `det_truss` · task `error-find`
     (eine Abzähl-Rechnung mit einem falschen Wert).
  7. *Deine Brücke* — bauen · build (Knotenkoordinaten-Presets, Stabquerschnitt) ·
     constraints: kein Stab über zulässiger Kraft.
  8. *Meilenstein* — meilenstein · Lasttest-Verifikation · Explosionsansicht ·
     Produkt-Karte.
- **Bau-Output:** Geometrie-Preset + Querschnitt → Knoten/Streben (STL) + Stabliste.
- **Meilenstein:** alle |Stabkräfte| < zulässig bei F = 49,05 N mittig.
- **Golden Tests:** F_A=F/2 mit F=50 → 25 N (vorhanden) · symmetrisches
  Dreieck-Fachwerk mit bekannten Stabkräften · 2k=s+r für Beispiel-Topologie.
- **Tiefen-Hinweis:** verspielt = Kräfte schieben & Farben sehen; praxis =
  Knoten lösen mit Rezept; genau = vollständiges Gleichungssystem + Bestimmtheit.

### 4. Stirnradgetriebe  (id: `stirnradgetriebe`) — **das erste komplette Projekt**
- **Metadaten:** icon `⚙` · 45 min · difficulty 2 · recommendedAfter: `hebel-flaschenzug`
- **Bau-Ergebnis:** 3D-gedrucktes, drehbares Getriebe mit Ziel-Übersetzung i = 3.
- **Challenge:** „Ein Getriebe, das die Motordrehzahl auf 1/3 senkt — und das
  Drehmoment hebt." (n₁ = 3000 1/min → n₂ = 1000 1/min, M₂ ≥ 29 N·m bei M₁ = 10 N·m)
- **Neue Konzepte:** zahnrad, zaehnezahl, modul, teilkreisdurchmesser,
  uebersetzung, achsabstand, wirkungsgrad.
  (Verwendet: drehmoment, hebelarm — Auffrisch-Karten fangen Quereinsteiger.)
- **Formeln:** `ratio` i=z₂/z₁ · `pitch_d` d=m·z · `axis_dist` a=m(z₁+z₂)/2 ·
  `speed_out` n₂=n₁/i · `torque_out` M₂=M₁·i·η.
- **Mikro-Schritte (8):**
  1. *Warum Zahnräder?* — lernen · hook („Dein Motor ist schnell, aber schwach.
     Dein Rad braucht's andersrum.") · `gear-pair` frei spielen (Canvas) ·
     task `estimate` („Wie oft dreht das kleine Rad für eine Umdrehung des großen?",
     Log-Skala, source: ratio mit z₁=20, z₂=60).
  2. *Die Übersetzung i = z₂/z₁* — lernen · text · formula `ratio` ·
     `gear-pair` (z₁, z₂ → i live) · calc · task `numeric` (source: ratio).
  3. *Modul & Teilkreis* — lernen · text · formula `pitch_d` · `gear-pair`
     (m ändern → Räder wachsen) · task `error-find` (Beispielrechnung d=m·z,
     eine Zeile falsch).
  4. *Der Achsabstand* — lernen · formula `axis_dist` · calc · task `target`
     („Stell m so ein, dass a = 80 mm wird" — gekoppelt an `gear-pair`,
     proof.pass: m=2, z₁=20, z₂=60 / proof.fail: m=3).
  5. *Drehzahl & Drehmoment* — lernen · formulas `speed_out`, `torque_out` ·
     task `steps` (erst n₂, dann M₂ mit `$prev`) · task `numeric` mit
     `unitChoices` ["N·m","N","W"] (die Einheit ist Teil der Antwort).
  6. *Wirkungsgrad η* — lernen · text (praxis/genau) · merksatz · task `single`
     (mit `why` je Option) · task `match` (Größe ↔ Einheit).
  7. *Dein Getriebe bauen* — bauen · build (z₁, z₂, m → CAD → STL) ·
     constraints: `abs(z2/z1 - 3)/3 <= 0.05` (i trifft Ziel ±5 %) und
     `m*(z1+z2)/2 <= 90` (passt in die Kiste) · Stückliste (2 Räder, 2 Achsen).
  8. *Meilenstein* — meilenstein · Engine verifiziert i, a, M₂ gegen die
     Challenge · Explosionsansicht · Produkt-Karte (Projektkarte) · Druck-/Testanleitung.
- **Schritt-Graph** (Content): Warum → Übersetzung, dann zwei Stränge
  {Geometrie: *Modul/Teilkreis* → *Achsabstand* → *Bauen* ∥ Kinetik:
  *Drehzahl/Drehmoment* → *Wirkungsgrad*, das zusätzlich *Modul/Teilkreis*
  braucht (Match-Aufgabe prüft den Modul)}; der Meilenstein vereint beide.
- **Bau-Output:** z₁, z₂, m → parametrisches Zahnradpaar (`cad/gear.scad`) → STL.
- **Meilenstein:** |i−3|/3 ≤ 5 % · a baubar (≤ 90 mm) · M₂ = M₁·i·η ≥ 29 N·m (η=0,97).
- **Golden Tests:** z₁=20,z₂=60 → i=3 · m=2,z=20 → d=40 mm · (20,60,m=2) → a=80 mm ·
  n₂=3000/3=1000 1/min · M₂=10·3·0,97=29,1 N·m (alle vorhanden in `cases.json`).
- **Tiefen-Hinweis:** verspielt = Slider + drehende Räder („Tauschgeschäft");
  praxis = Auslegung mit Modul-Reihe und Bauraum; genau = Herleitung über gleiche
  Umfangsgeschwindigkeit, Leistungsbilanz P=M·ω, Verweis Profilverschiebung.

### 11. Modellrakete  (id: `modellrakete`) — **Flaggschiff**
- **Metadaten:** icon `🚀` · 70 min · difficulty 4 · recommendedAfter: `fachwerkbruecke`
- **Bau-Ergebnis:** druckbare, real flugfähige Rakete (Rohr, Nase, Finnen) als STL.
- **Challenge:** „Stabile Rakete mit Motor C6: steigt gerade und erreicht ≥ 100 m."
- **Neue Konzepte:** schub, gesamtimpuls, schwerpunkt (CG), druckpunkt (CP),
  stabilitaetsmass, luftwiderstand, flugphasen, barrowman (qualitativ).
- **Formeln:** `stability` (CP−CG)/d · `drag` F_w=½ρv²c_wA · `newton` F=m·a ·
  `impulse` I=∫F dt (diskret summiert) · Apogäum aus Flug-Sim (RK4).
- **Mikro-Schritte (9):**
  1. *Wie fliegt eine Rakete?* — lernen · hook · interactive (Schub vs. Gewicht)
     · task `single`.
  2. *Schwerpunkt finden* — lernen · `rocket-stability` (Massen-Slider → CG
     wandert) · task `target` (CG vor eine Marke bringen).
  3. *Druckpunkt & Finnen* — lernen · `rocket-stability` (Finnenfläche → CP) ·
     task `multi`.
  4. *Das Stabilitätsmaß* — lernen · formula `stability` · calc · task `numeric`
     (source: stability) · merksatz „1–2 Kaliber".
  5. *Luftwiderstand* — lernen · formula `drag` · `value-slider` (v → F_w) ·
     task `estimate` (F_w bei doppelter Geschwindigkeit — quadratisch!).
  6. *Die Schubkurve* — lernen · text + calc (Gesamtimpuls aus .eng-Daten) ·
     task `order` (Flugphasen sortieren: Boost → Coast → Apogäum → Sinken).
  7. *Finnen & Nase bauen* — bauen · build (Rohr-Ø, Länge, Finnengeometrie,
     Nasenform) · constraints: Stabilitätsmaß 1–2 Kaliber.
  8. *Flug simulieren* — lernen · `flight-sim` (RK4: h(t), v_max, Apogäum) ·
     task `steps` (Impuls → Brennschluss-Geschwindigkeit grob).
  9. *Meilenstein* — meilenstein · Engine prüft Stabilität ∧ Apogäum ≥ 100 m ·
     Explosionsansicht · Produkt-Karte · Sicherheits- und Startplatz-Hinweise.
- **Bau-Output:** Parameter → parametrisches Modell (Rohr/Nase/Finnen) → STL;
  Stückliste (+ Motor/Zündung als Zukauf, Sicherheitshinweis).
- **Meilenstein:** Stabilitätsmaß ∈ [1, 2] Kaliber **und** Apogäum ≥ 100 m.
- **Golden Tests:** F_w bei ρ=1,225, v=50, c_w=0,75, A=0,001963 → 1,53125 N
  (vorhanden, gerundete Eingaben) · Stabilitätsmaß (CP=450, CG=410, d=24) →
  1,667 Kaliber (vorhanden) · Apogäum einer dokumentierten Beispielrakete (Toleranz 5 %).
- **Tiefen-Hinweis:** verspielt = „stabil?"-Ampel + Slider; praxis = Faustregel
  1–2 Kaliber + Checkliste; genau = Barrowman-Beiträge + Flug-ODE (RK4) skizziert.

---

## Generierungsfertige Kurz-Specs

Format: *recommendedAfter · neue Konzepte · Formeln · Bau-Output · Meilenstein.*

**3. Material-Biegeprobe** (id `biegeprobe`, icon `▤`, 40 min, diff 2) — nach 1 ·
spannung σ=F/A, dehnung, e-modul, elastisch/plastisch · `stress_axial` σ=F/A,
`strain` ε=ΔL/L, `hooke` E=σ/ε · Probenhalter → STL · vorhergesagte Steifigkeit
±10 % zur Messung; Aufgaben-Mix: estimate (Bruchkraft), error-find (σ-Rechnung),
match (Größe↔Einheit).

**5. Welle auslegen** (id `welle`, icon `―`, 55 min, diff 3) — nach 3, 4 ·
biegemoment, torsionsmoment, widerstandsmoment, vergleichsspannung, sicherheit ·
`sigma_b` σ_b=M_b/W_b, `tau_t` τ_t=M_t/W_t, `sigma_v` σ_v=√(σ²+3τ²),
`w_b` W_b=πd³/32 · Wellendurchmesser → STL · σ_v < σ_zul mit S ≥ 1,5;
Aufgaben-Mix: steps (σ_b → τ_t → σ_v), target (d so wählen, dass S ≥ 1,5).

**6. Schraubverbindung** (id `schraube`, icon `⌖`, 40 min, diff 3) — nach 4 ·
vorspannkraft, anziehmoment, reibung, festigkeitsklasse · `tighten` M_A=k·F_V·d ·
verschraubte Baugruppe → STL · Vorspannung hält Last ohne Überlastung.

**7. Wälzlagerung** (id `lager`, icon `◎`, 40 min, diff 3) — nach 5 ·
lagertyp, tragzahl, äquivalente last, l10 · `l10` L10=(C/P)^p, `eq_load`
P=X·F_r+Y·F_a · Lagersitz → STL · L10 ≥ Soll-Lebensdauer.

**8. Kurbelschwinge** (id `kurbelschwinge`, icon `↻`, 45 min, diff 3) — nach 4 ·
gelenk, freiheitsgrad, totlage, übertragungswinkel · `gruebler` F=3(n−1)−2g,
Grashof-Bedingung · bewegliches Gestänge → STL · läuft durch, Grashof erfüllt;
Kern-Interactive `linkage-anim`.

**9. Kragträger-Leichtbau** (id `kragtraeger`, icon `⌐`, 50 min, diff 4) — nach
3, 5 · biegelinie, durchbiegung, flächenträgheitsmoment, leichtbau · `deflect`
f=FL³/(3EI), `i_rect` I=bh³/12 · optimiertes Profil → STL · f < Grenze bei
minimaler Masse; Aufgaben-Mix: target (Profil tunen), estimate (f bei doppelter Länge — kubisch!).

**10. Schwungrad** (id `schwungrad`, icon `◉`, 40 min, diff 3) — nach 5, 8 ·
massenträgheitsmoment, rotationsenergie, drehimpuls · `e_rot` E=½Jω²,
`j_disk` J=½mr² · Schwungrad → STL · gespeicherte Energie wie berechnet.

**12. Antriebsstrang** (id `antriebsstrang`, icon `⛓`, 80 min, diff 5) — nach
4, 5, 7 · leistungsfluss, wirkungsgradkette, auslegungs-methodik · `power`
P=M·ω, `eta_chain` η_ges=∏η_i · Baugruppe → STL/Stückliste · Soll-Abtrieb
(n, M) erreicht; Meisterstück: kombiniert die Interactives aus 4/5/7,
Aufgaben-Mix: steps über die ganze Kette.

---

## Reihenfolge der Erstellung

1. **4 Stirnradgetriebe** — fertig, der Gold-Standard (`content/stirnradgetriebe.json`).
2. **1 Hebel & Flaschenzug** und **2 Fachwerkbrücke** — die beiden anderen Türen.
3. **11 Modellrakete** — das Schaustück (braucht `rocket-stability` + `flight-sim`).
4. Übrige nach Bedarf, eins nach dem anderen, jeweils erst nach grünem `pnpm verify`.

Projekte, deren Kern-Interactives noch `status: "geplant"` in der Registry haben,
werden mit `draft: true` angelegt und erscheinen nicht in der Projektliste
(Verifier erzwingt das, siehe `VERIFICATION.md`).
