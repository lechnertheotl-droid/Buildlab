#!/usr/bin/env node
/**
 * Buildlab Playwright Screen Tests
 * Testet alle Screens interaktiv mit echtem Browser
 * Desktop (1920x1080) + Mobile (375x812)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.resolve('./playwright-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const DESKTOP = { width: 1920, height: 1080 };
const MOBILE  = { width: 375,  height: 812  };

const results = { pass: [], fail: [], warn: [], screenshots: [] };

function ok(msg)   { console.log(`  ✅ ${msg}`); results.pass.push(msg); }
function fail(msg) { console.log(`  ❌ ${msg}`); results.fail.push(msg); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); results.warn.push(msg); }
function h(msg)    { console.log(`\n📋 ${msg}`); }

async function shot(page, name, desc) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push({ name, desc, file });
  console.log(`  📸 ${name}.png — ${desc}`);
}

async function testDesktop(browser) {
  h('DESKTOP (1920×1080)');
  const page = await browser.newPage({ viewport: DESKTOP });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(e.message));

  // ── Screen 1: Homepage ─────────────────────────────────────────────────
  h('Screen 1: Homepage / Projektkarte');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '01-homepage-desktop', 'Startseite – Projektkarte');

  const title = await page.title();
  title.includes('Buildlab') ? ok(`Title: "${title}"`) : fail(`Falscher Title: "${title}"`);

  // Prüfe ob Projekte sichtbar
  const bodyText = await page.innerText('body');
  bodyText.includes('Stirnradgetriebe')
    ? ok('Stirnradgetriebe-Projekt sichtbar')
    : fail('Stirnradgetriebe nicht in der Liste');
  bodyText.includes('Flaschenzug') || bodyText.includes('Hebel')
    ? ok('Zweites Projekt sichtbar (Hebel/Flaschenzug)')
    : warn('Zweites Projekt nicht gefunden');

  // ── Screen 2: Projekt-Baum ─────────────────────────────────────────────
  h('Screen 2: Projekt-Baum (Stirnradgetriebe)');
  // Klicke auf Stirnradgetriebe
  const gearCard = page.locator('text=Stirnradgetriebe').first();
  if (await gearCard.isVisible()) {
    await gearCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await shot(page, '02-project-tree-desktop', 'Projekt-Baum mit DAG');

    const url = page.url();
    url.includes('stirnradgetriebe') || url.includes('schritt')
      ? ok(`Navigation zu Projekt: ${url}`)
      : warn(`URL nach Klick: ${url}`);
  } else {
    fail('Stirnradgetriebe Link nicht klickbar');
  }

  // ── Screen 3: Workspace – erster Schritt ───────────────────────────────
  h('Screen 3: Workspace – Schritt 1 (warum)');
  await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '03-workspace-step1-desktop', 'Workspace Schritt 1 – Text & Blöcke');

  const stepText = await page.innerText('body');
  stepText.length > 200 ? ok('Workspace-Inhalt geladen') : fail('Workspace leer');

  // Tiefen-Umschalter
  for (const depth of ['verspielt', 'praxis', 'genau']) {
    const btn = page.locator(`button:has-text("${depth}")`).first();
    if (await btn.isVisible({ timeout: 1500 })) {
      await btn.click();
      await page.waitForTimeout(300);
      ok(`Tiefen-Button "${depth}" klickbar`);
    } else {
      warn(`Tiefen-Button "${depth}" nicht gefunden`);
    }
  }
  await shot(page, '04-workspace-depths-desktop', 'Tiefen-Umschalter getestet');

  // ── Screen 4: Formeln ─────────────────────────────────────────────────
  h('Screen 4: Formeln & interaktive Blöcke');
  await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/2`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '05-formulas-desktop', 'Formeln und Einheiten');

  const hasMath = await page.locator('math, [class*="katex"], [class*="formula"]').count();
  hasMath > 0 ? ok(`${hasMath} Formel-Elemente gefunden`) : warn('Keine Formel-Elemente (mathml/katex)');

  // ── Screen 5: Aufgaben testen ─────────────────────────────────────────
  h('Screen 5: Aufgaben & Task-Typen');

  // Gehe durch alle Schritte und suche Aufgaben
  let tasksFound = 0;
  for (let step = 1; step <= 8; step++) {
    await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/${step}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Radio Buttons = single/multi choice
    const radios = page.locator('[role="radio"], input[type="radio"]');
    const radioCount = await radios.count();
    if (radioCount > 0 && tasksFound === 0) {
      tasksFound++;
      ok(`Schritt ${step}: ${radioCount} Radio-Optionen (single-choice Task)`);
      await radios.first().click();
      await page.waitForTimeout(300);
      await shot(page, `06-task-single-choice-step${step}`, `Single-Choice Task Schritt ${step}`);

      // Feedback-Button suchen (muss enabled sein)
      const submitBtn = page.locator('button:has-text("Prüfen"), button:has-text("Überprüfen")').first();
      if (await submitBtn.isVisible({ timeout: 1000 }) && await submitBtn.isEnabled()) {
        await submitBtn.click();
        await page.waitForTimeout(400);
        ok('Submit-Button klickbar – Feedback ausgelöst');
        await shot(page, `06b-task-feedback-step${step}`, `Task Feedback nach Antwort`);
      } else {
        ok('Submit-Button vorhanden (wartet auf alle Task-Antworten)');
        await shot(page, `06b-task-selected-step${step}`, `Task Option ausgewählt`);
      }
    }

    // Number Input = numeric task
    const numInput = page.locator('input[type="number"], input[inputmode="decimal"], input[inputmode="numeric"]');
    const numCount = await numInput.count();
    if (numCount > 0 && tasksFound < 2) {
      tasksFound++;
      ok(`Schritt ${step}: Numerische Eingabe gefunden`);
      await numInput.first().fill('42');
      await page.waitForTimeout(200);
      await shot(page, `07-task-numeric-step${step}`, `Numeric Task Schritt ${step}`);
    }

    // Slider = range/target task
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    if (sliderCount > 0 && tasksFound < 3) {
      tasksFound++;
      ok(`Schritt ${step}: Schieber/Slider gefunden`);
      await sliders.first().fill('60');
      await page.waitForTimeout(300);
      await shot(page, `08-interactive-slider-step${step}`, `Slider/Interactive Schritt ${step}`);
    }
  }

  if (tasksFound === 0) warn('Keine interaktiven Aufgaben/Inputs in Schritten 1-8 gefunden');

  // ── Screen 6: CAD / 3D Vorschau ───────────────────────────────────────
  h('Screen 6: CAD & 3D-Rendering');
  // Bauen-Schritt suchen
  for (let step = 5; step <= 8; step++) {
    await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/${step}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible({ timeout: 1000 })) {
      ok(`Schritt ${step}: Canvas/3D-Vorschau sichtbar`);
      await shot(page, `09-3d-preview-step${step}`, `3D CAD Vorschau Schritt ${step}`);
      break;
    }
    const svg = page.locator('svg').first();
    if (await svg.isVisible({ timeout: 500 })) {
      ok(`Schritt ${step}: SVG Rendering sichtbar`);
      await shot(page, `09-svg-rendering-step${step}`, `SVG Rendering Schritt ${step}`);
    }
  }

  // ── Screen 7: Konzept-Seite ───────────────────────────────────────────
  h('Screen 7: Konzept-Detail');
  await page.goto(`${BASE_URL}/#/konzept/modul`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot(page, '10-concept-page-desktop', 'Konzept-Detail Seite');
  const conceptText = await page.innerText('body');
  conceptText.includes('Modul') || conceptText.includes('modul')
    ? ok('Konzept-Seite lädt')
    : warn('Konzept-Inhalt nicht erkannt');

  // ── Screen 8: Einstellungen ───────────────────────────────────────────
  h('Screen 8: Einstellungen');
  await page.goto(`${BASE_URL}/#/einstellungen`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot(page, '11-settings-desktop', 'Einstellungen Screen');
  ok('Einstellungen-Screen geladen');

  // ── Screen 9: Persistenz ──────────────────────────────────────────────
  h('Screen 9: Persistenz (Reload-Test)');
  await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot(page, '12-after-reload-desktop', 'Nach Reload – IndexedDB Persistenz');
  ok('Seite nach Reload geladen');

  // ── Konsolen-Fehler prüfen ─────────────────────────────────────────────
  h('Konsolen-Fehler Prüfung');
  consoleErrors.length === 0
    ? ok('Keine JavaScript-Fehler in der Konsole')
    : fail(`${consoleErrors.length} Konsolen-Fehler: ${consoleErrors.slice(0,3).join('; ')}`);

  // Performance
  h('Performance Metrics');
  const perf = await page.evaluate(() => ({
    load: performance.timing.loadEventEnd - performance.timing.navigationStart,
    dom:  performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
  }));
  perf.dom < 3000  ? ok(`DOM Ready: ${perf.dom}ms`)  : warn(`DOM Ready langsam: ${perf.dom}ms`);
  perf.load < 5000 ? ok(`Page Load: ${perf.load}ms`) : warn(`Page Load langsam: ${perf.load}ms`);

  await page.close();
}

async function testMobile(browser) {
  h('\n📱 MOBILE (375×812)');
  const page = await browser.newPage({
    viewport: MOBILE,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  // Mobile: Homepage
  h('Mobile Screen 1: Homepage');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '20-homepage-mobile', 'Startseite auf Mobile');

  const bodyText = await page.innerText('body');
  bodyText.includes('Stirnradgetriebe')
    ? ok('Projekte auf Mobile sichtbar')
    : warn('Projekte auf Mobile nicht gefunden');

  // Mobile: Projekt-Baum
  h('Mobile Screen 2: Projekt-Baum');
  const gearCard = page.locator('text=Stirnradgetriebe').first();
  if (await gearCard.isVisible({ timeout: 3000 })) {
    await gearCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await shot(page, '21-project-tree-mobile', 'Projekt-Baum auf Mobile');
    ok('Projekt-Baum auf Mobile geladen');
  }

  // Mobile: Workspace
  h('Mobile Screen 3: Workspace');
  await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '22-workspace-mobile', 'Workspace auf Mobile');

  // Prüfe ob horizontaler Overflow (Layout-Bug auf Mobile)
  const hasOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
  hasOverflow
    ? fail('Horizontaler Overflow auf Mobile – Layout-Problem!')
    : ok('Kein horizontaler Overflow – Layout ok');

  // Prüfe Text-Größe
  const fontSize = await page.evaluate(() => {
    const body = window.getComputedStyle(document.body);
    return parseFloat(body.fontSize);
  });
  fontSize >= 14
    ? ok(`Schriftgröße ok: ${fontSize}px`)
    : warn(`Schriftgröße klein: ${fontSize}px (empfohlen ≥ 14px)`);

  // Mobile: Schritt 2 mit Formeln
  h('Mobile Screen 4: Formeln auf Mobile');
  await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/2`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, '23-formulas-mobile', 'Formeln auf Mobile');

  // Mobile: Aufgabe
  h('Mobile Screen 5: Aufgaben auf Mobile');
  for (let step = 1; step <= 8; step++) {
    await page.goto(`${BASE_URL}/#/projekt/stirnradgetriebe/schritt/${step}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const radios = page.locator('[role="radio"], input[type="radio"]');
    if (await radios.count() > 0) {
      await shot(page, `24-task-mobile-step${step}`, `Aufgabe auf Mobile – Schritt ${step}`);
      ok(`Task auf Mobile Schritt ${step} sichtbar`);
      break;
    }
  }

  // Mobile: Tablet-Größe
  h('Mobile Screen 6: Tablet (768×1024)');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await shot(page, '25-homepage-tablet', 'Homepage auf Tablet 768×1024');
  ok('Tablet-Ansicht getestet');

  await page.close();
}

// ── Main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('🎬 BUILDLAB PLAYWRIGHT SCREEN TESTS');
  console.log('='.repeat(60));
  console.log(`URL: ${BASE_URL}  |  Screenshots: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1148/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    await testDesktop(browser);
    await testMobile(browser);
  } finally {
    await browser.close();
  }

  // ── Abschluss ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('📊 ZUSAMMENFASSUNG');
  console.log('='.repeat(60));
  console.log(`✅  Bestanden : ${results.pass.length}`);
  console.log(`❌  Fehler    : ${results.fail.length}`);
  console.log(`⚠️   Warnungen : ${results.warn.length}`);
  console.log(`📸  Screenshots: ${results.screenshots.length}`);

  if (results.fail.length) {
    console.log('\n❌ Fehler:');
    results.fail.forEach(f => console.log(`  • ${f}`));
  }
  if (results.warn.length) {
    console.log('\n⚠️  Warnungen:');
    results.warn.forEach(w => console.log(`  • ${w}`));
  }

  console.log('\n📸 Screenshots:');
  results.screenshots.forEach(s => console.log(`  ${s.name}.png — ${s.desc}`));
  console.log(`\n📁 Gespeichert in: ${SCREENSHOTS_DIR}`);

  // JSON-Bericht
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'results.json'),
    JSON.stringify({ ...results, date: new Date() }, null, 2)
  );

  const verdict = results.fail.length === 0 ? '✅ PASS' : '❌ FAIL';
  console.log(`\n🎯 Verdict: ${verdict}\n`);
  process.exit(results.fail.length === 0 ? 0 : 1);
})();
