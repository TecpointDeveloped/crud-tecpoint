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
