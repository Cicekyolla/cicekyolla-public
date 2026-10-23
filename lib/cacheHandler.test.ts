// lib/cacheHandler.test.ts — boyut sınırlı ISR / Data Cache (cache-handler.js). Gerçek dosya sistemi,
// geçici klasör; ağ YOK. Çalıştırma: node --test lib/cacheHandler.test.ts   (npm run test:unit)
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, readFileSync, promises as fsp } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.CY_ISR_CACHE_MAX_MB = "1"; // modül yüklenmeden ÖNCE: 1 MB sınır
const require = createRequire(import.meta.url);
const Handler = require("../cache-handler.js");
const { BoundedIndex } = Handler;

test("dizin: sınır aşılınca EN ESKİ kayıt çıkar; dokunulan (okunan) kayıt sona taşınır", () => {
  const ix = new BoundedIndex(100);
  ix.put("a", ["a1"], 40);
  ix.put("b", ["b1"], 40);
  ix.touch("a"); // a artık en yeni
  ix.put("c", ["c1"], 40); // toplam 120 > 100
  const out = ix.evict();
  assert.deepEqual(out.map((e: { key: string }) => e.key), ["b"]);
  assert.equal(ix.total, 80);
  ix.put("a", ["a1"], 10); // aynı anahtar yeniden yazılınca boyut güncellenir, çift sayılmaz
  assert.equal(ix.total, 50);
});

function nextFs() {
  return {
    readFile: (f: string, enc?: BufferEncoding) => fsp.readFile(f, enc as BufferEncoding),
    readFileSync: (f: string, enc?: BufferEncoding) => readFileSync(f, enc as BufferEncoding),
    writeFile: (f: string, d: string | Buffer) => fsp.writeFile(f, d),
    mkdir: (d: string) => fsp.mkdir(d, { recursive: true }),
    stat: (f: string) => fsp.stat(f),
  };
}

test("handler: Next'in biçimiyle yazar/okur; 1 MB aşılınca en eski sayfanın dosyaları diskten silinir, derleme dosyası kalır", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "cy-isr-"));
  const serverDistDir = path.join(root, ".next", "server");
  mkdirSync(path.join(serverDistDir, "app"), { recursive: true });
  writeFileSync(path.join(root, ".next", "BUILD_ID"), "test");
  // Derleme çıktısı (dizine girmez, asla silinmez).
  writeFileSync(path.join(serverDistDir, "app", "index.html"), "x".repeat(600_000));
  const h = new Handler({ fs: nextFs(), flushToDisk: true, serverDistDir, _appDir: true, revalidatedTags: [], experimental: {} });
  const page = (n: number) => ({ kind: "PAGE", html: `<p>${n}</p>` + "h".repeat(300_000), pageData: "r".repeat(100_000), headers: {}, status: 200 });
  for (let i = 1; i <= 4; i++) await h.set(`/istanbul/mahalle-${i}`, page(i), {});
  await new Promise((r) => setTimeout(r, 50)); // unlink arka planda
  const file = (i: number, ext: string) => path.join(serverDistDir, "app", "istanbul", `mahalle-${i}.${ext}`);
  // 4 × ~400 KB = 1,6 MB > 1 MB → en eski ikisi (1, 2) silinir.
  assert.equal(existsSync(file(1, "html")), false);
  assert.equal(existsSync(file(1, "rsc")), false);
  assert.equal(existsSync(file(2, "html")), false);
  assert.equal(existsSync(file(3, "html")), true);
  assert.equal(existsSync(file(4, "rsc")), true);
  assert.equal(existsSync(path.join(serverDistDir, "app", "index.html")), true, "derleme çıktısı silinmez");
  const got = await h.get("/istanbul/mahalle-4", { kindHint: "app" });
  assert.equal(got?.value?.kind, "PAGE");
  assert.match(String(got?.value?.html), /<p>4<\/p>/);
  assert.equal(await h.get("/istanbul/mahalle-1", { kindHint: "app" }), null, "silinen sayfa yeniden üretilmek üzere boş döner");
});

test("handler: FETCH kaydı .next/cache/fetch-cache altına yazılır ve sınıra dahildir", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "cy-fetch-"));
  const serverDistDir = path.join(root, ".next", "server");
  mkdirSync(path.join(serverDistDir, "app"), { recursive: true });
  writeFileSync(path.join(root, ".next", "BUILD_ID"), "test");
  const h = new Handler({ fs: nextFs(), flushToDisk: true, serverDistDir, _appDir: true, revalidatedTags: [], experimental: {} });
  await h.set("abc123", { kind: "FETCH", data: { headers: {}, body: "e30=", status: 200, url: "x" }, revalidate: 60 }, { tags: [] });
  assert.equal(existsSync(path.join(root, ".next", "cache", "fetch-cache", "abc123")), true);
});

test("kaynak nöbeti: next.config cacheHandler olarak cache-handler.js'i kullanır", () => {
  const src = readFileSync(new URL("../next.config.js", import.meta.url), "utf8");
  assert.match(src, /cacheHandler: require\.resolve\("\.\/cache-handler\.js"\)/);
});
