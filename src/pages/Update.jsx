import { useEffect, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import ProductCard from "../components/ProductCard";
import { useToast } from "../components/Toast";

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPTY_PRODUCT = {
  producto: "",
  descripcion: "",
  sku: "",
  permalink: "",
  slug: "",
  categorias: "",
  SubCategorias: "",
  imagenes: {},
  precio: { detalle: "", mayoreo: "" },
  extradata: { stock: false, especificaciones: "", tags: "" },
  marca_producto: { marca: "" },
};

function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const clone = structuredClone(obj);
  let node = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] === undefined || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
  return clone;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-medium uppercase tracking-wide text-gray-400"
    >
      {children}
    </label>
  );
}

function Field({ label, htmlFor, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function baseInput () {
  return "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-gray-300";
}

function Toggle({ checked, onChange, name }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-500 transition-colors" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}

function ImageThumbs({ imagenes, pendingFiles, onSelect, activeKey, onDeleteExisting, onAddFile, onDeletePending }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {/* Imágenes existentes */}
      {Object.entries(imagenes).map(([key, img]) => (
        <div key={key} className="relative group">
          <button
            type="button"
            onClick={() => onSelect(key)}
            className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
              activeKey === key ? "border-indigo-500" : "border-gray-200"
            }`}
          >
            <img
              src={img.img}
              alt={key}
              className="w-full h-full object-cover"
            />
          </button>
          <button
            type="button"
            onClick={() => onDeleteExisting(key, img.img)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] items-center justify-center hidden group-hover:flex"
            aria-label="Eliminar imagen"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Imágenes pendientes de subir */}
      {pendingFiles.map((pf, i) => (
        <div key={`pending-${i}`} className="relative group">
          <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-dashed border-indigo-300">
            <img
              src={URL.createObjectURL(pf.file)}
              alt="nueva"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => onDeletePending(i)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] items-center justify-center hidden group-hover:flex"
            aria-label="Quitar imagen"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Botón agregar */}
      <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition text-gray-400 hover:text-indigo-500">
        <span className="text-xl leading-none">+</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onAddFile}
        />
      </label>
    </div>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────

function EditModal({ product, onClose, onSaved }) {
  const [data, setData] = useState({ ...EMPTY_PRODUCT, ...product });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [activeImgKey, setActiveImgKey] = useState(
    Object.keys(product.imagenes || {})[0] ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const showToast = useToast();
  const scrollRef = useRef(null);

  const previewSrc =
    activeImgKey && data.imagenes?.[activeImgKey]?.img
      ? data.imagenes[activeImgKey].img
      : pendingFiles[0]
      ? URL.createObjectURL(pendingFiles[0].file)
      : null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === "checkbox" ? checked : value;
    setData((prev) => setNestedValue(prev, name, finalValue));
    setIsDirty(true);
  };

  const handleDeleteExisting = async (key, imgUrl) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const storage = getStorage();
    try {
      await deleteObject(ref(storage, imgUrl));
    } catch {
      // Si ya no existe en storage, continuar
    }
    setData((prev) => {
      const imgs = { ...prev.imagenes };
      delete imgs[key];
      return { ...prev, imagenes: imgs };
    });
    if (activeImgKey === key) {
      const remaining = Object.keys(data.imagenes).filter((k) => k !== key);
      setActiveImgKey(remaining[0] ?? null);
    }
    setIsDirty(true);
    showToast("Imagen eliminada", "success");
  };

  const handleAddFile = (e) => {
    const files = Array.from(e.target.files);
    setPendingFiles((prev) => [...prev, ...files.map((file) => ({ file }))]);
    setIsDirty(true);
  };

  const handleDeletePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const storage = getStorage();
      const nextIndex = Object.keys(data.imagenes).length;

      const uploaded = await Promise.all(
        pendingFiles.map(async ({ file }, i) => {
          const storageRef = ref(
            storage,
            `productos/${data.marca_producto?.marca}/${data.sku}/${Date.now()}_${i}`
          );
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          const key = `imagen_0${nextIndex + i + 1}`;
          return [key, { img: url, id: `${data.sku}_0${nextIndex + i + 1}` }];
        })
      );

      const newImages = Object.fromEntries(uploaded);

      const payload = {
        ...data,
        precio: {
          detalle: Number(data.precio?.detalle) || 0,
          mayoreo: Number(data.precio?.mayoreo) || 0,
        },
        extradata: {
          stock: data.extradata?.stock ?? false,
          especificaciones: data.extradata?.especificaciones ?? "",
          tags: data.extradata?.tags ?? "",
        },
        imagenes: { ...data.imagenes, ...newImages },
        marca_producto: { marca: data.marca_producto?.marca ?? "" },
      };

      await updateDoc(doc(db, "Products", product.id), payload);
      onSaved({ ...payload, id: product.id });
      setIsDirty(false);
      showToast("Producto actualizado correctamente", "success");
      onClose();
    } catch (err) {
      setError(err.message);
      showToast("Error al actualizar: " + (err.message || ""), "error");
    } finally {
      setSaving(false);
    }
  };

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (isDirty && !confirm("Hay cambios sin guardar. ¿Salir de todos modos?")) return;
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDirty, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (isDirty && !confirm("Hay cambios sin guardar. ¿Salir de todos modos?")) return;
          onClose();
        }
      }}
    >
      <div className="bg-white w-[90vw] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Editar producto</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{data.sku || "Sin SKU"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isDirty && !confirm("Hay cambios sin guardar. ¿Salir de todos modos?")) return;
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition text-sm"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Columna izquierda: imágenes */}
          <div className="w-[500px] shrink-0 border-r border-gray-100 p-4 flex flex-col gap-3 overflow-y-auto">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Imágenes</p>
            <div className="aspect-square w-full rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-sm">Sin imagen</span>
              )}
            </div>
            <ImageThumbs
              imagenes={data.imagenes}
              pendingFiles={pendingFiles}
              onSelect={setActiveImgKey}
              activeKey={activeImgKey}
              onDeleteExisting={handleDeleteExisting}
              onAddFile={handleAddFile}
              onDeletePending={handleDeletePending}
            />
            <p className="text-[10px] text-gray-300 leading-relaxed">
              JPG, PNG, WEBP · Máx. 5&nbsp;MB
            </p>
          </div>

          {/* Columna derecha: campos */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

            {/* Información básica */}
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Información básica</p>
              <Field label="Nombre del producto" htmlFor="producto">
                <input
                  id="producto"
                  type="text"
                  name="producto"
                  value={data.producto}
                  onChange={handleChange}
                  className={baseInput}
                  placeholder="Ej. Reloj Clásico Plateado"
                />
              </Field>
              <Field label="Descripción" htmlFor="descripcion">
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={data.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className={`${baseInput} resize-y`}
                  placeholder="Descripción detallada del producto…"
                />
              </Field>
            </section>

            {/* Precios e identificación */}
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Precios e identificación</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio detalle" htmlFor="precio-detalle">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">L</span>
                    <input
                      id="precio-detalle"
                      type="number"
                      name="precio.detalle"
                      value={data.precio?.detalle ?? ""}
                      onChange={handleChange}
                      className={`${baseInput} pl-6`}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </Field>
                <Field label="Precio mayoreo" htmlFor="precio-mayoreo">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">L</span>
                    <input
                      id="precio-mayoreo"
                      type="number"
                      name="precio.mayoreo"
                      value={data.precio?.mayoreo ?? ""}
                      onChange={handleChange}
                      className={`${baseInput} pl-6`}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </Field>
                <Field label="SKU" htmlFor="sku">
                  <input
                    id="sku"
                    type="text"
                    name="sku"
                    value={data.sku}
                    onChange={handleChange}
                    className={`${baseInput} font-mono`}
                    placeholder="PRD-00001"
                  />
                </Field>
                <Field label="Marca" htmlFor="marca">
                  <input
                    id="marca"
                    type="text"
                    name="marca_producto.marca"
                    value={data.marca_producto?.marca ?? ""}
                    onChange={handleChange}
                    className={baseInput}
                    placeholder="Ej. Casio"
                  />
                </Field>
              </div>
            </section>

            {/* Categorización */}
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Categorización</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoría" htmlFor="categorias">
                  <input
                    id="categorias"
                    type="text"
                    name="categorias"
                    value={data.categorias ?? ""}
                    onChange={handleChange}
                    className={baseInput}
                    placeholder="Ej. Electrónica"
                  />
                </Field>
                <Field label="Subcategoría" htmlFor="subcategorias">
                  <input
                    id="subcategorias"
                    type="text"
                    name="SubCategorias"
                    value={data.SubCategorias ?? ""}
                    onChange={handleChange}
                    className={baseInput}
                    placeholder="Ej. Relojes"
                  />
                </Field>
              </div>
              <Field label="Etiquetas (tags)" htmlFor="tags">
                <input
                  id="tags"
                  type="text"
                  name="extradata.tags"
                  value={data.extradata?.tags ?? ""}
                  onChange={handleChange}
                  className={baseInput}
                  placeholder="reloj, plateado, acero (separadas por coma)"
                />
              </Field>
            </section>

            {/* URLs */}
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">URLs</p>
              <Field label="Permalink" htmlFor="permalink">
                <input
                  id="permalink"
                  type="text"
                  name="permalink"
                  value={data.permalink ?? ""}
                  onChange={handleChange}
                  className={baseInput}
                  placeholder="https://tienda.com/producto/..."
                />
              </Field>
              <Field label="Slug" htmlFor="slug">
                <input
                  id="slug"
                  type="text"
                  name="slug"
                  value={data.slug ?? ""}
                  onChange={handleChange}
                  className={baseInput}
                  placeholder="nombre-del-producto"
                />
              </Field>
            </section>

            {/* Inventario y specs */}
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Inventario y especificaciones</p>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-700">En stock</span>
                <Toggle
                  name="extradata.stock"
                  checked={data.extradata?.stock ?? false}
                  onChange={handleChange}
                />
              </div>
              <Field label="Especificaciones técnicas" htmlFor="especificaciones">
                <textarea
                  id="especificaciones"
                  name="extradata.especificaciones"
                  value={data.extradata?.especificaciones ?? ""}
                  onChange={handleChange}
                  rows={4}
                  className={`${baseInput} resize-y`}
                  placeholder="Material, dimensiones, peso, garantía…"
                />
              </Field>
            </section>

          </div>
        </div>

        {/* Footer status */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 bg-gray-50 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className="text-[11px] text-gray-400">
            {isDirty ? "Cambios pendientes" : "Sin cambios"}
          </span>
        </div>

      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Update() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [skuQuery, setSkuQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Products"));
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error al cargar productos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleSaved = (updated) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const filteredProducts = skuQuery.trim()
    ? products.filter((p) => (p.sku || "").toLowerCase().includes(skuQuery.toLowerCase()))
    : products;

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Productos</h1>
        <div className="ml-auto flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por SKU"
            value={skuQuery}
            onChange={(e) => setSkuQuery(e.target.value)}
            className="border p-2 rounded w-52 text-sm"
          />
          {skuQuery && (
            <button onClick={() => setSkuQuery("")} className="text-sm text-gray-500">Limpiar</button>
          )}
          <span className="text-sm text-gray-400">{filteredProducts.length} / {products.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => setSelectedProduct(product)}
            />
          ))}
        </ul>
      )}

      {selectedProduct && (
        <EditModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}