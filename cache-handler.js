// =============================================================================
// cache-handler.js — boyut sınırlı ISR / Data Cache (Next 14.2 `cacheHandler`)
// -----------------------------------------------------------------------------
// SORUN (Skyversal, 23 Eki 2026): `next start` her ISR sayfası için diske HTML + RSC
// + meta, her önbellekli fetch için bir dosya yazar ve HİÇBİRİNİ silmez. 71.406
// lokasyon adresi tarandıkça disk ~40 GB'a çıkar (36.048 sayfa = 20 GB; plan 15 GB).
//
// ÇÖZÜM: Next'in kendi FileSystemCache'i AYNEN kullanılır (okuma/yazma biçimi, derleme
// çıktısı, etiketler değişmez); üstüne yalnız SINIR eklenir. Çalışma anında yazılan
// her kaydın dosyaları ve boyutu süreç içi bir sıralı dizinde tutulur; toplam sınırı
// (CY_ISR_CACHE_MAX_MB, varsayılan 2048 MB) aşınca EN UZUN SÜREDİR KULLANILMAYAN kayıt
// diskten silinir. Silinen sayfa bir sonraki istekte yeniden üretilir (bugünkü ISR).
// Derleme sırasında üretilen dosyalar dizine girmez → asla silinmez.
//
// EK ETKİ: özel handler'da Next, 2 MB üstü fetch yanıtlarını da saklar (incremental-cache
// index.js) → 3,5 MB'lık tam kategori ağacı artık her üretimde API'den çekilmez.
// =============================================================================
const fs = require("node:fs");
const path = require("node:path");
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;

const MB = 1024 * 1024;
const capBytes = () => Math.max(1, Number(process.env.CY_ISR_CACHE_MAX_MB) || 2048) * MB;

/** Sıralı dizin: Map ekleme sırası = kullanım sırası (en eski başta). */
class BoundedIndex {
  constructor(cap) {
    this.cap = cap;
    this.entries = new Map(); // key -> { files: string[], bytes: number }
    this.total = 0;
  }
  touch(key) {
    const e = this.entries.get(key);
    if (!e) return;
    this.entries.delete(key);
    this.entries.set(key, e);
  }
  put(key, files, bytes) {
    const old = this.entries.get(key);
    if (old) {
      this.total -= old.bytes;
      this.entries.delete(key);
    }
    this.entries.set(key, { files, bytes });
    this.total += bytes;
  }
  /** Sınır aşılıyorsa silinecek kayıtları (en eskiden) dizinden çıkarıp döndürür. */
  evict() {
    const out = [];
    for (const [key, e] of this.entries) {
      if (this.total <= this.cap) break;
      this.entries.delete(key);
      this.total -= e.bytes;
      out.push({ key, files: e.files });
    }
    return out;
  }
}

const index = new BoundedIndex(capBytes());
let seeded = null;

function statSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function unlinkQuiet(file) {
  fs.promises.unlink(file).catch(() => undefined);
}

/** Aynı konteynerde yeniden başlatmada önceki çalışmanın yazdıklarını dizine alır
 *  (derlemeden SONRA değişen dosyalar; derleme çıktısı dokunulmaz). Arka planda, bir kez. */
function seedFromDisk(serverDistDir) {
  if (seeded) return seeded;
  seeded = (async () => {
    let buildTime = 0;
    try {
      buildTime = fs.statSync(path.join(serverDistDir, "..", "BUILD_ID")).mtimeMs;
    } catch {
      return;
    }
    const groups = new Map(); // key -> { files, bytes, at }
    const add = (key, file, st) => {
      const g = groups.get(key) || { files: [], bytes: 0, at: 0 };
      g.files.push(file);
      g.bytes += st.size;
      g.at = Math.max(g.at, st.mtimeMs);
      groups.set(key, g);
    };
    const walk = async (dir, onFile) => {
      let list;
      try {
        list = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const d of list) {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) await walk(p, onFile);
        else await onFile(p);
      }
    };
    const appDir = path.join(serverDistDir, "app");
    await walk(appDir, async (p) => {
      const m = /\.(html|rsc|meta|body)$/.exec(p);
      if (!m) return;
      const st = await fs.promises.stat(p).catch(() => null);
      if (!st || st.mtimeMs <= buildTime + 1000) return;
      add("app:" + p.slice(0, -m[0].length), p, st);
    });
    const fetchDir = path.join(serverDistDir, "..", "cache", "fetch-cache");
    await walk(fetchDir, async (p) => {
      if (p.endsWith("tags-manifest.json")) return;
      const st = await fs.promises.stat(p).catch(() => null);
      if (st) add("fetch:" + p, p, st);
    });
    const sorted = [...groups.entries()].sort((a, b) => a[1].at - b[1].at);
    for (const [key, g] of sorted) if (!index.entries.has(key)) index.put(key, g.files, g.bytes);
    for (const e of index.evict()) e.files.forEach(unlinkQuiet);
  })().catch(() => undefined);
  return seeded;
}

class BoundedFileSystemCache extends FileSystemCache {
  constructor(ctx) {
    super(ctx);
    this.cyEnabled = Boolean(this.flushToDisk && this.serverDistDir && process.env.NEXT_RUNTIME !== "edge");
    if (this.cyEnabled) seedFromDisk(this.serverDistDir);
  }

  /** Bir kaydın diskteki dosyaları — FileSystemCache.set'in yazdığı yolların aynısı. */
  cyFilesFor(key, data) {
    if (!data) return [];
    if (data.kind === "FETCH") return [this.getFilePath(key, "fetch")];
    if (data.kind === "ROUTE") {
      const body = this.getFilePath(`${key}.body`, "app");
      return [body, body.replace(/\.body$/, ".meta")];
    }
    if (data.kind === "PAGE" && typeof data.pageData === "string") {
      const html = this.getFilePath(`${key}.html`, "app");
      return [html, html.replace(/\.html$/, ".rsc"), html.replace(/\.html$/, ".meta")];
    }
    return [];
  }

  cyKey(key, data) {
    return data && data.kind === "FETCH" ? "fetch:" + this.getFilePath(key, "fetch") : "app:" + this.getFilePath(key, "app");
  }

  async get(...args) {
    const data = await super.get(...args);
    if (this.cyEnabled && data && data.value) index.touch(this.cyKey(args[0], data.value));
    return data;
  }

  async set(...args) {
    await super.set(...args);
    if (!this.cyEnabled) return;
    const [key, data] = args;
    const files = this.cyFilesFor(key, data);
    if (files.length === 0) return;
    const bytes = files.reduce((n, f) => n + statSize(f), 0);
    index.put(this.cyKey(key, data), files, bytes);
    for (const e of index.evict()) e.files.forEach(unlinkQuiet);
  }
}

module.exports = BoundedFileSystemCache;
module.exports.BoundedIndex = BoundedIndex;
