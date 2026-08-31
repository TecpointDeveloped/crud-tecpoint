import { useEffect, useMemo, useState } from "react";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, Copy, Database, Download, ImageOff, Search, Trash2 } from "lucide-react";
import { db } from "../firebaseConfig";
import { duplicateKeys, duplicateResolutionGroups, qualityIssues } from "../lib/productQuality";
import { fetchCatalogFromServer } from "../lib/firestoreRest";
import w35Catalog from "../data/current-catalog-w35.json";

const safeDocumentId = (sku) => `w35-${String(sku || "").trim().replace(/[^a-z0-9_-]+/gi, "-")}`;
const nonBlockingIssues = new Set(["UPC", "foto", "descripción"]);
const blockingIssues = (product) => qualityIssues(product).filter((issue) => !nonBlockingIssues.has(issue));

function w35Payload(record, existing) {
  const hasExistingImages = Object.values(existing?.imagenes || {}).some((image) => image?.img && !/default-product|placeholder|sin-imagen|brand\/isologo/i.test(image.img));
  const images = hasExistingImages ? existing.imagenes : { imagen_01: { id: "imagen_01", img: "/brand/isologo.svg" } };
  const base = {
    sku: record.sku,
    producto: record.description,
    slug: record.slug,
    descripcion: record.description,
    categorias: [record.category],
    Subcategorias: record.subcategory,
    marca_producto: { ...(existing?.marca_producto || {}), marca: record.brand },
    precio: { detalle: record.detailPrice, mayoreo: record.bronzePrice },
    imagenes: images,
    extradata: {
      ...(existing?.extradata || {}),
      upc: record.upc,
      stock: Number(record.stock) > 0,
      inventoryQuantity: Number(record.stock) || 0,
      inTransitQuantity: Number(record.inTransit) || 0,
      imagePending: !hasExistingImages,
      wholesaleEnabled: Number(record.bronzePrice) > 0,
      wholesaleCategory: record.category,
    },
    fecha_agregado: existing?.fecha_agregado || "2026-08-31T00:00:00.000Z",
    sourceCatalog: "W35",
    sourceRow: record.sourceRow,
    updatedAt: serverTimestamp(),
  };
  return {
    ...base,
    publication_status: blockingIssues(base).length ? "draft_incomplete" : "ready",
    publication_issues: qualityIssues(base),
  };
}

export default function ProductQuality() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("incompletos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState("");
  const [pendingCleanup, setPendingCleanup] = useState(null);
  const [syncingW35, setSyncingW35] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  useEffect(() => { fetchCatalogFromServer()
    .then(setProducts)
    .catch(() => setError("No fue posible cargar la auditoría del catálogo."))
    .finally(() => setLoading(false)); }, []);
  const duplicates = useMemo(() => duplicateKeys(products), [products]);
  const rows = useMemo(() => products.map((product) => ({
    product,
    issues: qualityIssues(product),
    duplicateSku: duplicates.sku.has(product.id),
    duplicateUpc: duplicates.upc.has(product.id),
  })).filter((row) => {
    const matchesSearch = `${row.product.producto} ${row.product.sku} ${row.product.extradata?.upc}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "duplicados") return row.duplicateSku || row.duplicateUpc;
    if (filter === "publicables") return !blockingIssues(row.product).length && !row.duplicateSku && !row.duplicateUpc;
    return row.issues.length > 0;
  }), [products, duplicates, filter, search]);
  const incomplete = products.filter((product) => blockingIssues(product).length).length;
  const duplicateCount = new Set([...duplicates.sku, ...duplicates.upc]).size;
  const resolutionGroups = useMemo(() => duplicateResolutionGroups(products), [products]);
  const removalCandidates = useMemo(() => resolutionGroups.flatMap((group) => group.removals), [resolutionGroups]);
  const nonPublishableCandidates = useMemo(() => {
    const removalIds = new Set(removalCandidates.map((product) => product.id));
    return products.filter((product) => blockingIssues(product).length || removalIds.has(product.id));
  }, [products, removalCandidates]);

  const syncW35 = async () => {
    setSyncingW35(true);
    setError("");
    setSyncNotice("");
    try {
      const current = await fetchCatalogFromServer();
      const existingBySku = new Map(current.map((product) => [String(product.sku || "").trim().toLowerCase(), product]));
      const records = w35Catalog.records;
      for (let index = 0; index < records.length; index += 400) {
        const batch = writeBatch(db);
        records.slice(index, index + 400).forEach((record) => {
          const existing = existingBySku.get(String(record.sku || "").trim().toLowerCase());
          batch.set(doc(db, "Products", existing?.id || safeDocumentId(record.sku)), w35Payload(record, existing), { merge: true });
        });
        await batch.commit();
      }
      const refreshed = await fetchCatalogFromServer();
      setProducts(refreshed);
      setSyncNotice(`W35 sincronizado: ${records.length} SKU revisados y precios/existencias actualizados.`);
    } catch (syncError) {
      setError(`No se completó la sincronización W35: ${syncError.message}`);
    } finally {
      setSyncingW35(false);
    }
  };

  const downloadBackup = (candidates = removalCandidates, reason = "Respaldo previo a limpieza de SKU/UPC duplicados") => {
    const payload = {
      exportedAt: new Date().toISOString(),
      reason,
      collection: "Products",
      keepers: resolutionGroups.map((group) => group.keeper),
      removals: candidates,
      groups: resolutionGroups.map((group) => ({
        keeperId: group.keeper.id,
        removalIds: group.removals.map((product) => product.id),
        duplicateSkus: group.duplicateSkus,
        duplicateUpcs: group.duplicateUpcs,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tecpoint-respaldo-catalogo-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const executeRemoveDuplicates = async () => {
    if (!removalCandidates.length) return;
    setPendingCleanup(null);
    setCleaning(true);
    setError("");
    downloadBackup(removalCandidates);
    try {
      for (let index = 0; index < removalCandidates.length; index += 400) {
        const batch = writeBatch(db);
        removalCandidates.slice(index, index + 400).forEach((product) => batch.delete(doc(db, "Products", product.id)));
        await batch.commit();
      }
      const removed = new Set(removalCandidates.map((product) => product.id));
      setProducts((current) => current.filter((product) => !removed.has(product.id)));
      alert(`Limpieza completada: ${removed.size} copias eliminadas y ${resolutionGroups.length} fichas principales conservadas.`);
    } catch (cleanError) {
      setError(`No se completó la limpieza: ${cleanError.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const removeDuplicates = () => {
    if (!removalCandidates.length) return;
    setPendingCleanup({
      title: "Eliminar copias duplicadas",
      message: `Se conservarán ${resolutionGroups.length} fichas principales y se eliminarán ${removalCandidates.length} copias inferiores. Antes de eliminar se descargará el respaldo completo.`,
      confirmLabel: `Eliminar ${removalCandidates.length} copias`,
      action: executeRemoveDuplicates,
    });
  };

  const executeRemoveNonPublishable = async () => {
    if (!nonPublishableCandidates.length) return;
    const retained = products.length - nonPublishableCandidates.length;
    setPendingCleanup(null);
    setCleaning(true);
    setError("");
    downloadBackup(nonPublishableCandidates, "Respaldo previo a depuración total de fichas no publicables");
    try {
      for (let index = 0; index < nonPublishableCandidates.length; index += 400) {
        const batch = writeBatch(db);
        nonPublishableCandidates.slice(index, index + 400).forEach((product) => batch.delete(doc(db, "Products", product.id)));
        await batch.commit();
      }
      const removed = new Set(nonPublishableCandidates.map((product) => product.id));
      setProducts((current) => current.filter((product) => !removed.has(product.id)));
      alert(`Depuración completada: ${removed.size} fichas eliminadas y ${retained} productos publicables conservados.`);
    } catch (cleanError) {
      setError(`No se completó la depuración: ${cleanError.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const removeNonPublishable = () => {
    if (!nonPublishableCandidates.length) return;
    const retained = products.length - nonPublishableCandidates.length;
    setPendingCleanup({
      title: "Eliminar fichas no publicables",
      message: `Se eliminarán ${nonPublishableCandidates.length} fichas incompletas o duplicadas y se conservarán ${retained} productos publicables. Antes de eliminar se descargará el respaldo completo.`,
      confirmLabel: `Eliminar ${nonPublishableCandidates.length} fichas`,
      action: executeRemoveNonPublishable,
    });
  };

  return <div className="space-y-6">
    {pendingCleanup && <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/70 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="cleanup-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Confirmación requerida</p>
        <h2 id="cleanup-title" className="mt-2 text-2xl font-bold text-gray-950">{pendingCleanup.title}</h2>
        <p className="mt-3 leading-7 text-gray-700">{pendingCleanup.message}</p>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Esta acción elimina registros de Firebase y no se puede deshacer desde el panel.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setPendingCleanup(null)} className="rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-800">Cancelar</button>
          <button type="button" onClick={pendingCleanup.action} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white">{pendingCleanup.confirmLabel}</button>
        </div>
      </section>
    </div>}
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold tracking-[.2em] text-red-600">CONTROL DE PUBLICACIÓN</p><h1 className="text-3xl font-bold text-gray-950">Calidad del catálogo</h1><p className="mt-2 text-gray-600">W35 conserva todos los SKU en el CRUD. La cantidad de existencia es interna; los productos sin foto usan temporalmente el isologo.</p></div><button type="button" onClick={syncW35} disabled={syncingW35} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c8102e] px-5 font-bold text-white disabled:opacity-50"><Database size={18}/>{syncingW35 ? "Sincronizando W35…" : "Sincronizar catálogo W35"}</button></header>
    {syncNotice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{syncNotice}</p>}
    <div className="grid gap-4 md:grid-cols-3">
      <Stat icon={AlertTriangle} label="Incompletos" value={incomplete} tone="text-amber-600" />
      <Stat icon={Copy} label="Con duplicidad" value={duplicateCount} tone="text-red-600" />
      <Stat icon={CheckCircle2} label="Listos para publicar" value={products.length - new Set(products.filter(p => blockingIssues(p).length || duplicates.sku.has(p.id) || duplicates.upc.has(p.id)).map(p => p.id)).size} tone="text-emerald-600" />
    </div>
    {!loading && <section className="rounded-xl border border-red-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Depuración protegida</p><h2 className="mt-1 text-xl font-bold">Eliminar solo fichas realmente no publicables</h2><p className="mt-2 max-w-3xl text-sm text-gray-700">Conserva productos sin foto, UPC o descripción extensa. Solo propone eliminar fichas sin precio válido o copias con el mismo SKU. El respaldo JSON se descarga antes de ejecutar el borrado.</p></div>
        <button type="button" onClick={removeNonPublishable} disabled={!nonPublishableCandidates.length || cleaning} className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 py-3 font-bold text-white disabled:opacity-50"><Trash2 size={18}/> {cleaning ? "Depurando…" : `Eliminar ${nonPublishableCandidates.length} no publicables`}</button>
      </div>
    </section>}
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-2">{[["incompletos","Incompletos"],["duplicados","Duplicados"],["publicables","Publicables"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-[#cf1533] text-white" : "bg-gray-100 text-gray-700"}`}>{label}</button>)}</div>
      <label className="flex w-full items-center gap-2 rounded-lg border px-3 sm:ml-auto sm:w-auto sm:min-w-[260px]"><Search size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} className="min-w-0 flex-1 py-2 outline-none" placeholder="Buscar SKU, UPC o nombre" /></label>
    </div>
    {filter === "duplicados" && !loading && <section className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Limpieza protegida</p><h2 className="mt-1 text-xl font-bold">Conservar la ficha más completa</h2><p className="mt-2 max-w-3xl text-sm text-gray-700">Se detectaron {resolutionGroups.length} grupos. El sistema conservará una ficha por grupo, priorizando menos faltantes, más fotografías, descripción y especificaciones. Antes de eliminar se descarga el respaldo íntegro.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => downloadBackup(removalCandidates)} disabled={!removalCandidates.length || cleaning} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-bold disabled:opacity-50"><Download size={18}/> Descargar respaldo</button><button type="button" onClick={removeDuplicates} disabled={!removalCandidates.length || cleaning} className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50"><Trash2 size={18}/> {cleaning ? "Limpiando…" : `Eliminar ${removalCandidates.length} copias`}</button></div>
      </div>
    </section>}
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p> : loading ? <p>Cargando auditoría…</p> : <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-gray-950 text-xs uppercase tracking-wider text-white"><tr><th className="p-4">Producto</th><th>SKU</th><th>UPC</th><th>Estado</th><th className="pr-4">Acción</th></tr></thead><tbody>{rows.map(({product,issues,duplicateSku,duplicateUpc}) => <tr key={product.id} className="border-t"><td className="p-4"><div className="flex items-center gap-3">{product.imagenes?.imagen_01?.img ? <img src={product.imagenes.imagen_01.img} alt="" className="h-12 w-12 rounded object-contain"/> : <span className="grid h-12 w-12 place-items-center rounded bg-gray-100"><ImageOff/></span>}<span className="max-w-sm font-semibold">{product.producto || "Sin nombre"}</span></div></td><td>{product.sku || "—"}{duplicateSku && <b className="block text-xs text-red-600">Duplicado</b>}</td><td>{product.extradata?.upc || "—"}{duplicateUpc && <b className="block text-xs text-red-600">Duplicado</b>}</td><td><div className="flex max-w-xs flex-wrap gap-1">{issues.map(issue => <span key={issue} className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Falta {issue}</span>)}{!issues.length && !duplicateSku && !duplicateUpc && <span className="text-sm font-semibold text-emerald-700">Listo</span>}</div></td><td className="pr-4"><a href={`/update?id=${encodeURIComponent(product.id)}`} className="font-bold text-[#cf1533]">Corregir →</a></td></tr>)}</tbody></table></div>{!rows.length && <p className="p-8 text-center text-gray-500">No hay productos en este estado.</p>}</div>}
  </div>;
}

 
function Stat({icon:Icon,label,value,tone}) { return <div className="rounded-xl border bg-white p-5"><Icon className={tone}/><strong className="mt-5 block text-3xl">{value}</strong><span className="text-sm text-gray-500">{label}</span></div>; }
