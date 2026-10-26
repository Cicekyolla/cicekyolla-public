// İstanbul link ağı: ilçe linkleri 301 hop'u taşımamalı, tekrar etmemeli,
// kartı olan ilçe ek listede ikinci kez çıkmamalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { districtLinks, districtsWithout } from "./istanbulLinkAgi.ts";

const slugify = (v: string) =>
  v.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

test("taşınmış ilçe gerçek adresini korur", () => {
  const out = districtLinks("istanbul", [{ slug: "maltepe", name: "Maltepe", href: "/maltepe-cicek-siparisi" }]);
  assert.deepEqual(out, [{ slug: "maltepe", name: "Maltepe", href: "/maltepe-cicek-siparisi" }]);
});

test("href yoksa hiyerarşik adres 301 hedefine çözülür", () => {
  const redirects = new Map([["/istanbul/kartal", "/kartal-cicek-siparisi"]]);
  const out = districtLinks("istanbul", [{ slug: "kartal", name: "Kartal" }, { slug: "adalar", name: "Adalar" }], (p) => redirects.get(p) ?? p);
  assert.equal(out[0].href, "/kartal-cicek-siparisi");
  assert.equal(out[1].href, "/istanbul/adalar");
});

test("çift slug tek link olur", () => {
  const out = districtLinks("istanbul", [{ slug: "fatih", name: "Fatih" }, { slug: "fatih", name: "Fatih" }]);
  assert.equal(out.length, 1);
});

test("kartı olan ilçe (Türkçe adla) ek listeden düşer", () => {
  const links = districtLinks("istanbul", [
    { slug: "kadikoy", name: "Kadıköy" },
    { slug: "uskudar", name: "Üsküdar" },
    { slug: "sile", name: "Şile" },
  ]);
  const rest = districtsWithout(links, ["Kadıköy", "Üsküdar"], slugify);
  assert.deepEqual(rest.map((l) => l.slug), ["sile"]);
});
