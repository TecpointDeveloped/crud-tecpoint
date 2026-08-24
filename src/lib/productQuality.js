const imageUrls = (product) => Object.values(product.imagenes || {})
  .map((item) => item?.img?.trim())
  .filter((url) => url && !/default-product|placeholder|sin-imagen/i.test(url));

export function qualityIssues(product) {
  const issues = [];
  if (!String(product.sku || "").trim()) issues.push("SKU");
  if (!String(product.extradata?.upc || "").trim()) issues.push("UPC");
  if (!String(product.producto || "").trim()) issues.push("nombre");
  if (!String(product.slug || "").trim()) issues.push("slug");
  if (String(product.descripcion || "").trim().length < 20) issues.push("descripción");
  if (!Array.isArray(product.categorias) || !product.categorias.some(Boolean)) issues.push("categoría");
  if (!String(product.marca_producto?.marca || "").trim()) issues.push("marca");
  if (!(Number(product.precio?.detalle) > 0)) issues.push("precio");
  if (!imageUrls(product).length) issues.push("foto");
  return issues;
}

export function duplicateKeys(products) {
  const buckets = { sku: new Map(), upc: new Map() };
  products.forEach((product) => {
    const sku = String(product.sku || "").trim().toLowerCase();
    const upc = String(product.extradata?.upc || "").replace(/\s+/g, "");
    if (sku) buckets.sku.set(sku, [...(buckets.sku.get(sku) || []), product.id]);
    if (upc) buckets.upc.set(upc, [...(buckets.upc.get(upc) || []), product.id]);
  });
  return {
    sku: new Set([...buckets.sku.values()].filter((ids) => ids.length > 1).flat()),
    upc: new Set([...buckets.upc.values()].filter((ids) => ids.length > 1).flat()),
  };
}

const normalizedSku = (product) => String(product.sku || "").trim().toLowerCase();
const normalizedUpc = (product) => String(product.extradata?.upc || "").replace(/\s+/g, "");

const contentScore = (product) => {
  const issues = qualityIssues(product).length;
  const images = imageUrls(product).length;
  const description = String(product.descripcion || "").trim().length;
  const specifications = Array.isArray(product.especificaciones)
    ? product.especificaciones.length
    : Object.keys(product.especificaciones || {}).length;
  return ((9 - issues) * 100000) + (images * 1000) + Math.min(description, 999) + (specifications * 10);
};

export function duplicateResolutionGroups(products) {
  const parent = new Map(products.map((product) => [product.id, product.id]));
  const find = (id) => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  const connectDuplicates = (valueOf) => {
    const buckets = new Map();
    products.forEach((product) => {
      const value = valueOf(product);
      if (!value) return;
      buckets.set(value, [...(buckets.get(value) || []), product.id]);
    });
    buckets.forEach((ids) => {
      if (ids.length < 2) return;
      ids.slice(1).forEach((id) => union(ids[0], id));
    });
  };
  connectDuplicates(normalizedSku);
  connectDuplicates(normalizedUpc);

  const components = new Map();
  products.forEach((product) => {
    const root = find(product.id);
    components.set(root, [...(components.get(root) || []), product]);
  });

  return [...components.values()]
    .filter((members) => members.length > 1)
    .map((members) => {
      const ranked = [...members].sort((left, right) =>
        contentScore(right) - contentScore(left) || String(left.id).localeCompare(String(right.id)));
      const skuCounts = new Map();
      const upcCounts = new Map();
      members.forEach((product) => {
        const sku = normalizedSku(product);
        const upc = normalizedUpc(product);
        if (sku) skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);
        if (upc) upcCounts.set(upc, (upcCounts.get(upc) || 0) + 1);
      });
      return {
        keeper: ranked[0],
        removals: ranked.slice(1),
        duplicateSkus: [...skuCounts.entries()].filter(([, count]) => count > 1).map(([value]) => value),
        duplicateUpcs: [...upcCounts.entries()].filter(([, count]) => count > 1).map(([value]) => value),
      };
    });
}
