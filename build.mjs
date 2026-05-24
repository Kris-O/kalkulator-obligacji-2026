/**
 * build.mjs — Skrypt budowania wersji release
 *
 * Uruchom: node build.mjs
 *
 * Co robi:
 *  1. Czyta html/standalone/kalkulator-obligacji.html
 *  2. Kopiuje do standalone/kalkulator-obligacji.html
 *  3. Tworzy dist/kalkulator-obligacji-v{VERSION}.zip (jeśli dostępne `zip`)
 *
 * Zależności: tylko Node.js ≥ 18 (built-ins: fs, child_process, path)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VERSION = '1.0.1';
const SRC     = resolve(__dirname, 'html/standalone/kalkulator-obligacji.html');
const DEST    = resolve(__dirname, 'standalone/kalkulator-obligacji.html');
const DIST    = resolve(__dirname, 'dist');
const ZIP     = resolve(DIST, `kalkulator-obligacji-v${VERSION}.zip`);

// ── Skopiuj standalone HTML ───────────────────────────────────────────────────
if (!existsSync(resolve(__dirname, 'standalone'))) {
  mkdirSync(resolve(__dirname, 'standalone'), { recursive: true });
}

const html = readFileSync(SRC, 'utf8');
writeFileSync(DEST, html, 'utf8');
console.log(`✅ Skopiowano: ${DEST}`);

// ── Utwórz ZIP jeśli dostępny zip (Linux/macOS) ───────────────────────────────
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true });
}

try {
  // Na Windows: użyj PowerShell lub 7zip
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    execSync(
      `powershell -Command "Compress-Archive -Path standalone -DestinationPath '${ZIP}' -Force"`,
      { cwd: __dirname, stdio: 'inherit' }
    );
  } else {
    execSync(`zip -r "${ZIP}" standalone/`, { cwd: __dirname, stdio: 'inherit' });
  }
  console.log(`📦 ZIP: ${ZIP}`);
} catch (e) {
  console.warn('⚠️  Nie udało się utworzyć ZIP (brak zip/PowerShell). Skopiowany plik standalone jest gotowy.');
}

console.log('\nGotowe. Otwórz w przeglądarce:');
console.log(`  ${DEST}`);
