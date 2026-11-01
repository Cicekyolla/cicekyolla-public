import { test } from "node:test";
import assert from "node:assert/strict";
import { findSiblingRail, type SiblingNode } from "./categorySiblings.ts";

const visible = (n: SiblingNode) => n.status !== "passive" && n.status !== "archived";

// Canlı hafif ağaç gibi: parent_slug YOK, yalnız iç içe children (+ parent_id).
const tree: SiblingNode[] = [
  {
    name: "Özel Günler", slug: "ozel-gunler", children: [
      {
        name: "Öğretmenler Günü", slug: "ogretmenler-gunu", children: [
          { name: "Orkide", slug: "ogretmenler-gunu-orkide" },
          { name: "Gül", slug: "ogretmenler-gunu-gul" },
          { name: "Pasif", slug: "ogretmenler-gunu-pasif", status: "passive" },
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
  const t: SiblingNode[] = [{ name: "A", slug: "a", children: [{ name: "B", slug: "b" }] }];
  assert.equal(findSiblingRail(t, "b", visible), null);
});

test("üst kökteyse de (iç içe children) bulunur — parent_slug gerekmez", () => {
  const t: SiblingNode[] = [{ name: "Hub", slug: "hub", parent_id: null, children: [
    { name: "X", slug: "x", parent_id: 1 }, { name: "Y", slug: "y", parent_id: 1 },
  ] }];
  const r = findSiblingRail(t, "x", visible);
  assert.equal(r?.parent.slug, "hub");
  assert.deepEqual(r?.siblings.map((s) => s.slug), ["y"]);
});
