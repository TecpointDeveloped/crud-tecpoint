import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, Copy, ImageOff, Search } from "lucide-react";
import { db } from "../firebaseConfig";
import { duplicateKeys, qualityIssues } from "../lib/productQuality";

export default function ProductQuality() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("incompletos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { getDocs(collection(db, "Products")).then((snapshot) => {
    setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }).finally(() => setLoading(false)); }, []);
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
    if (filter === "publicables") return !row.issues.length && !row.duplicateSku && !row.duplicateUpc;
    return row.issues.length > 0;
  }), [products, duplicates, filter, search]);
  const incomplete = products.filter((product) => qualityIssues(product).length).length;
  const duplicateCount = new Set([...duplicates.sku, ...duplicates.upc]).size;

  return <div className="space-y-6">
    <header><p className="text-xs font-bold tracking-[.2em] text-red-600">CONTROL DE PUBLICACIÓN</p><h1 className="text-3xl font-bold text-gray-950">Calidad del catálogo</h1><p className="mt-2 text-gray-600">Los productos incompletos o duplicados quedan fuera de la tienda hasta corregirse. No se alteran automáticamente SKU, UPC, precios ni existencias.</p></header>
    <div className="grid gap-4 md:grid-cols-3">
      <Stat icon={AlertTriangle} label="Incompletos" value={incomplete} tone="text-amber-600" />
      <Stat icon={Copy} label="Con duplicidad" value={duplicateCount} tone="text-red-600" />
      <Stat icon={CheckCircle2} label="Listos para publicar" value={products.length - new Set(products.filter(p => qualityIssues(p).length || duplicates.sku.has(p.id) || duplicates.upc.has(p.id)).map(p => p.id)).size} tone="text-emerald-600" />
    </div>
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex gap-2">{[["incompletos","Incompletos"],["duplicados","Duplicados"],["publicables","Publicables"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-[#cf1533] text-white" : "bg-gray-100 text-gray-700"}`}>{label}</button>)}</div>
      <label className="ml-auto flex min-w-[260px] items-center gap-2 rounded-lg border px-3"><Search size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full py-2 outline-none" placeholder="Buscar SKU, UPC o nombre" /></label>
    </div>
    {loading ? <p>Cargando auditoría…</p> : <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-gray-950 text-xs uppercase tracking-wider text-white"><tr><th className="p-4">Producto</th><th>SKU</th><th>UPC</th><th>Estado</th><th className="pr-4">Acción</th></tr></thead><tbody>{rows.map(({product,issues,duplicateSku,duplicateUpc}) => <tr key={product.id} className="border-t"><td className="p-4"><div className="flex items-center gap-3">{product.imagenes?.imagen_01?.img ? <img src={product.imagenes.imagen_01.img} alt="" className="h-12 w-12 rounded object-contain"/> : <span className="grid h-12 w-12 place-items-center rounded bg-gray-100"><ImageOff/></span>}<span className="max-w-sm font-semibold">{product.producto || "Sin nombre"}</span></div></td><td>{product.sku || "—"}{duplicateSku && <b className="block text-xs text-red-600">Duplicado</b>}</td><td>{product.extradata?.upc || "—"}{duplicateUpc && <b className="block text-xs text-red-600">Duplicado</b>}</td><td><div className="flex max-w-xs flex-wrap gap-1">{issues.map(issue => <span key={issue} className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Falta {issue}</span>)}{!issues.length && !duplicateSku && !duplicateUpc && <span className="text-sm font-semibold text-emerald-700">Listo</span>}</div></td><td className="pr-4"><a href={`/update?id=${encodeURIComponent(product.id)}`} className="font-bold text-[#cf1533]">Corregir →</a></td></tr>)}</tbody></table></div>{!rows.length && <p className="p-8 text-center text-gray-500">No hay productos en este estado.</p>}</div>}
  </div>;
}

 
function Stat({icon:Icon,label,value,tone}) { return <div className="rounded-xl border bg-white p-5"><Icon className={tone}/><strong className="mt-5 block text-3xl">{value}</strong><span className="text-sm text-gray-500">{label}</span></div>; }
