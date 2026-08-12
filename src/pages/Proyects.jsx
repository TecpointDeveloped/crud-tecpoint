import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Download, FileWarning, PackageCheck, Tags } from "lucide-react";
import { db } from "../firebaseConfig";
import { duplicateKeys, qualityIssues } from "../lib/productQuality";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function CatalogReport() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocs(collection(db, "Products"))
      .then((snapshot) => setProducts(snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }))))
      .catch(() => setError("No fue posible cargar el reporte del catálogo."))
      .finally(() => setLoading(false));
  }, []);

  const report = useMemo(() => {
    const duplicates = duplicateKeys(products);
    const rows = products.map((product) => {
      const issues = qualityIssues(product);
      const duplicate = duplicates.sku.has(product.id) || duplicates.upc.has(product.id);
      return { product, issues, duplicate, ready: !issues.length && !duplicate };
    });
    const brands = new Set(products.map((product) => String(product.marca_producto?.marca || "").trim()).filter(Boolean));
    return { rows, brands: brands.size, ready: rows.filter((row) => row.ready).length, incomplete: rows.filter((row) => row.issues.length).length, duplicates: rows.filter((row) => row.duplicate).length };
  }, [products]);

  const download = () => {
    const header = ["SKU", "Producto", "UPC", "Marca", "Estado", "Pendientes"];
    const body = report.rows.map(({ product, issues, duplicate, ready }) => [
      product.sku,
      product.producto,
      product.extradata?.upc,
      product.marca_producto?.marca,
      ready ? "Listo" : duplicate ? "Duplicado" : "Incompleto",
      issues.join(", "),
    ]);
    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = `reporte-catalogo-tecpoint-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold tracking-[.2em] text-red-600">INFORME OPERATIVO</p><h1 className="text-3xl font-bold">Estado del catálogo</h1><p className="mt-2 text-gray-600">Información calculada desde los productos reales. No modifica precios, SKU, UPC ni existencias.</p></div><button onClick={download} disabled={loading || !products.length} className="flex items-center justify-center gap-2 rounded-xl bg-[#c8102e] px-5 py-3 font-bold text-white disabled:opacity-50"><Download size={18}/> Descargar CSV</button></header>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={PackageCheck} label="Productos" value={products.length}/><Metric icon={Tags} label="Marcas" value={report.brands}/><Metric icon={FileWarning} label="Incompletos" value={report.incomplete} tone="text-amber-600"/><Metric icon={PackageCheck} label="Listos" value={report.ready} tone="text-emerald-600"/>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="text-xl font-bold">Resumen de publicación</h2><p className="text-sm text-gray-500">{report.duplicates} productos presentan SKU o UPC duplicado.</p></div>{loading ? <p className="p-8">Preparando reporte…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-gray-950 text-xs uppercase tracking-wider text-white"><tr><th className="p-4">SKU</th><th>Producto</th><th>Marca</th><th>Estado</th><th className="pr-4">Pendientes</th></tr></thead><tbody>{report.rows.slice(0, 100).map(({product,issues,duplicate,ready})=><tr key={product.id} className="border-t"><td className="p-4 font-semibold">{product.sku||"—"}</td><td className="max-w-md py-4">{product.producto||"Sin nombre"}</td><td>{product.marca_producto?.marca||"—"}</td><td><span className={`rounded-full px-3 py-1 text-xs font-bold ${ready?"bg-emerald-50 text-emerald-700":duplicate?"bg-red-50 text-red-700":"bg-amber-50 text-amber-800"}`}>{ready?"Listo":duplicate?"Duplicado":"Incompleto"}</span></td><td className="pr-4 text-sm text-gray-600">{issues.join(", ")||"—"}</td></tr>)}</tbody></table><p className="border-t p-4 text-xs text-gray-500">Vista previa de 100 filas. El archivo CSV incluye las {products.length} fichas.</p></div>}</section>
  </div>;
}

function Metric({icon:Icon,label,value,tone="text-red-600"}) { return <article className="rounded-2xl border bg-white p-5"><Icon className={tone}/><strong className="mt-5 block text-3xl">{value}</strong><span className="text-sm text-gray-500">{label}</span></article>; }
