import { test } from "node:test";
import assert from "node:assert/strict";
import { findSiblingRail, type SiblingNode } from "./categorySiblings.ts";

const visible = (n: SiblingNode) => n.status !== "passive" && n.status !== "archived";

const tree: SiblingNode[] = [
  {
    name: "Özel Günler", slug: "ozel-gunler", children: [
      {
        name: "Öğretmenler Günü", slug: "ogretmenler-gunu", parent_slug: "ozel-gunler", children: [
          { name: "Orkide", slug: "ogretmenler-gunu-orkide", parent_slug: "ogretmenler-gunu" },
          { name: "Gül", slug: "ogretmenler-gunu-gul", parent_slug: "ogretmenler-gunu" },
          { name: "Pasif", slug: "ogretmenler-gunu-pasif", parent_slug: "ogretmenler-gunu", status: "passive" },
        ],
      },
    ],
  },
  { name: "Tekil", slug: "tekil" },
];

test("yaprak alt sayfa: üst + kendisi ve pasifler hariç kardeşler", () => {
  const r = findSiblingRail(tree, "ogretmenler-gunu-orkide", visible);
  assert.equal(r?.parent.slug, "ogretmenler-gunu");
  assert.deepEqual(r?.siblings.map((s) => s.slug), ["ogretmenler-gunu-gul"]);
});

test("görünür children'ı olan kategori: null (kendi alt rayı kalır)", () => {
  assert.equal(findSiblingRail(tree, "ogretmenler-gunu", visible), null);
});

test("üstü olmayan kök / bilinmeyen slug: null", () => {
  assert.equal(findSiblingRail(tree, "tekil", visible), null);
  assert.equal(findSiblingRail(tree, "yok", visible), null);
});

test("tek çocuklu üst: kardeş yok → null", () => {
  const t: SiblingNode[] = [{ name: "A", slug: "a", children: [{ name: "B", slug: "b", parent_slug: "a" }] }];
  assert.equal(findSiblingRail(t, "b", visible), null);
});
