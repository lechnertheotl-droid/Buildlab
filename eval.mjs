// tools/eval.mjs — Die einzige Quelle für Zahlen.
// Wertet eine Formel aus content/formulas.json deterministisch aus, damit weder
// der Generator noch ein Mensch jemals selbst rechnen muss.
//
// Aufruf:  node tools/eval.mjs <formulaId> '{"z2":60,"z1":20}'
// Ausgabe: {"id":"ratio","value":3,"unit":"-"}

import { readFileSync } from 'node:fs';
import { evaluate } from 'mathjs';

const [, , id, inputsJson] = process.argv;

if (!id || !inputsJson) {
  console.error('Aufruf: node tools/eval.mjs <formulaId> \'{"var":wert,...}\'');
  process.exit(1);
}

const formulas = JSON.parse(
  readFileSync(new URL('../content/formulas.json', import.meta.url), 'utf8')
);
const formula = formulas.find((f) => f.id === id);

if (!formula) {
  console.error(`Formel '${id}' nicht in content/formulas.json gefunden.`);
  process.exit(1);
}

let inputs;
try {
  inputs = JSON.parse(inputsJson);
} catch {
  console.error('Eingaben sind kein gültiges JSON.');
  process.exit(1);
}

// Prüfen, dass alle im expr genutzten Variablen geliefert wurden.
const needed = formula.variables.map((v) => v.var);
const missing = needed.filter((v) => !(v in inputs));
if (missing.length) {
  console.error(`Fehlende Eingaben: ${missing.join(', ')}`);
  process.exit(1);
}

const value = evaluate(formula.expr, inputs);
console.log(JSON.stringify({ id, value, unit: formula.result.unit }));
