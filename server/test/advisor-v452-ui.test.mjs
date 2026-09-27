import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../../client/src/main.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../../client/src/advisor-ai-v395.css',import.meta.url),'utf8');
test('V45.2 required phone and no redundant tuning form',()=>{
 assert.match(ui,/Kontakt telefon \(obavezno\)/);assert.ok(!ui.includes('Promeni izgled ili predlog Advisora'));
});
test('V45.2 has a conversational clarification, no huge select',()=>{
 assert.ok(ui.includes('rmc-ai-clarify-options'));
 assert.ok(!ui.includes('rmc-ai-business-select'));
});
test('V45.2 generation action is not sticky on modal content',()=>{
 assert.match(css,/position:relative;bottom:auto/);
});
