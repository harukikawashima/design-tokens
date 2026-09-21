// design-tokens.json の値を、買取案件管理(anken)の index.html の :root に反映する同期スクリプト。
//
// 【廃止予定】買取案件管理は anken-react に移行済み(2026-09-21時点)。
// anken-react はこのスクリプトを使わず、tailwind.config.js で design-tokens.json を直接読み込む。
// このスクリプトは旧PHP版anken(停止予定)が完全に廃止されるまでの保守用として残している。
//
// 使い方:
//   node sync-to-anken.mjs                  ← デフォルトパスのanken/index.htmlを更新
//   node sync-to-anken.mjs "path\to\index.html"   ← 別の場所を指定したい場合
//
// このスクリプトが上書きするのは design-tokens.json に載っている「共通トークン」だけです。
// anken独自の値(買取/仲介バッジの色、ステージバッジの色など、design-tokens.jsonに存在しない変数)は
// 一切変更されず、そのまま残ります。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.join(__dirname, 'design-tokens.json');

const DEFAULT_ANKEN_PATH =
  'C:\\Users\\hkawa\\OneDrive\\【管理】\\アプリ関係\\買取案件管理\\anken\\index.html';
const ankenPath = process.argv[2] || DEFAULT_ANKEN_PATH;

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// 全カテゴリを { 変数名: 値 } のフラットな1つのマップにする
const flat = {};
for (const [key, entry] of Object.entries(tokens.colors)) flat[key] = entry.value;
for (const [key, value] of Object.entries(tokens.shadowTints)) {
  if (key === 'note') continue;
  flat[key] = value;
}
for (const [key, value] of Object.entries(tokens.radius)) flat[key] = value;
for (const [key, value] of Object.entries(tokens.fontSize)) flat[key] = value;
for (const [key, value] of Object.entries(tokens.spacing)) {
  if (key === 'note') continue;
  flat[key] = value;
}
for (const [key, value] of Object.entries(tokens.borderWidth)) flat[key] = value;
for (const [key, value] of Object.entries(tokens.duration)) flat[key] = value;
for (const [key, value] of Object.entries(tokens.zIndex)) flat[key] = value;
for (const [key, value] of Object.entries(tokens.easing)) {
  if (key === 'note') continue;
  flat[key] = value;
}

const src = fs.readFileSync(ankenPath, 'utf8');
const startIdx = src.indexOf(':root{');
if (startIdx === -1) {
  console.error('ERROR: :root not found in', ankenPath);
  process.exit(1);
}
const endIdx = src.indexOf('}', startIdx);
const rootBody = src.slice(startIdx + ':root{'.length, endIdx);

// 既存の :root 宣言を { name: value } にパース(順序を保つため配列も保持)
const declOrder = [];
const declMap = {};
for (const decl of rootBody.split(';')) {
  if (!decl.trim()) continue;
  const i = decl.indexOf(':');
  const name = decl.slice(0, i).trim();
  const value = decl.slice(i + 1).trim();
  declOrder.push(name);
  declMap[name] = value;
}

let changed = 0, added = 0, unchanged = 0;
for (const [name, value] of Object.entries(flat)) {
  const varName = `--${name}`;
  if (!(varName in declMap)) {
    declOrder.push(varName);
    declMap[varName] = value;
    added++;
  } else if (declMap[varName] !== value) {
    declMap[varName] = value;
    changed++;
  } else {
    unchanged++;
  }
}

const newRootBody = declOrder.map((name) => `${name}:${declMap[name]}`).join(';');
const out = src.slice(0, startIdx) + ':root{' + newRootBody + '}' + src.slice(endIdx + 1);
fs.writeFileSync(ankenPath, out, 'utf8');

console.log(`Synced ${Object.keys(flat).length} shared tokens into`, ankenPath);
console.log(`  changed: ${changed}, added: ${added}, unchanged: ${unchanged}`);
if (changed > 0) {
  console.log('  -> anken has local overrides that just got reverted to the shared source. Review the diff.');
}
