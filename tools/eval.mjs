// tools/eval.mjs — Die einzige Quelle für Zahlen (dünne Hülle um die Engine).
// Wertet eine Formel aus content/formulas.json deterministisch über
// packages/engine aus, damit weder der Generator noch ein Mensch je selbst rechnet.
//
// Aufruf:  node tools/eval.mjs <formulaId> '{"z2":60,"z1":20}'
// Ausgabe: {"id":"ratio","value":3,"unit":"-"}

import { readFileSync } from 'node:fs';
import { evaluateById } from '@buildlab/engine';

const [, , id, inputsJson] = process.argv;

if (!id || !inputsJson) {
  console.error('Aufruf: node tools/eval.mjs <formulaId> \'{"var":wert,...}\'');
  process.exit(1);
}

const formulas = JSON.parse(
  readFileSync(new URL('../content/formulas.json', import.meta.url), 'utf8'),
);

let inputs;
try {
  inputs = JSON.parse(inputsJson);
} catch {
  console.error('Eingaben sind kein gültiges JSON.');
  process.exit(1);
}

try {
  console.log(JSON.stringify(evaluateById(formulas, id, inputs)));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
