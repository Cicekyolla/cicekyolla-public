// GLOBAL VERSION 80 — kayan şerit (yalnız doğru sözler; sipariş sayısı YOK).
export function V80Ticker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const loop = [0, 1, 2, 3, 4, 5];
  return (
    <div style={{ background: "var(--v80-bg2)", borderTop: "1px solid var(--v80-border)", borderBottom: "1px solid var(--v80-border)", overflow: "hidden", height: 32, display: "flex", alignItems: "center" }} aria-hidden="true">
      <div className="v80-ticker">
        {loop.map((k) => (
          <span key={k} style={{ display: "flex", alignItems: "center" }}>
            {items.map((it, i) => (
              <span key={`${k}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 20, paddingInlineEnd: 20 }}>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--v80-ink-subtle)", flexShrink: 0 }} />
                <span data-ticker-text style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--v80-ink-subtle)", whiteSpace: "nowrap" }}>{it}</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
