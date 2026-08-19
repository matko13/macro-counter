/* Wspólne wejście dla wszystkich zestawów: skąd wziąć Playwrighta, gdzie leży
   apka i gdzie zrzucać obrazki. Dzięki temu żaden zestaw nie zna ścieżek
   konkretnej maszyny i da się je puścić z dowolnego katalogu. */
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
import { tmpdir } from "os";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const APP = "file://" + join(ROOT, "index.html");

/* Playwright bywa zainstalowany globalnie albo lokalnie — bierzemy to,
   co jest, zamiast wpisywać jedną ścieżkę na sztywno. */
let pw;
try {
  pw = await import("playwright");
} catch (e) {
  pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
}
export const chromium = pw.chromium;
export const devices = pw.devices;

/* Katalog roboczy: zrzuty ekranu i atrapy serwowane po HTTP. Pierwszy argument
   albo katalog tymczasowy — zestawy serwerowe dostają go z run.sh. */
export const WORK = process.argv[2] || join(tmpdir(), "makro-testy");
export const SHOTS = WORK;
try { mkdirSync(SHOTS, { recursive: true }) } catch (e) {}
