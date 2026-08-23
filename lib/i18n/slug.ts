/** href ("/kategori/guller", "/guller?..." vb.) → slug (son path parçası, küçük harf). URL değişmez; yalnız etiket eşlemesi. */
export function slugFromHref(href: string | null | undefined): string {
  if (!href) return "";
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return (path.split("/").pop() ?? "").toLowerCase();
}
