import React from "react";
import Button from "./Button";

export default function ProductCard({ product, onEdit }) {
  const imgSrc = product.imagenes?.imagen_01?.img || "/default-product.webp";
  const price =
    product.precio && product.precio.detalle != null
      ? `$${Number(product.precio.detalle).toFixed(2)}`
      : null;
  const inStock = product.extradata?.stock ?? true;

  return (
    <li className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col">
      <div className="relative w-full pb-[100%] overflow-hidden rounded-md bg-gray-50">
        <img
          src={imgSrc}
          alt={product.producto}
          className="absolute inset-0 w-full h-full object-contain p-4"
        />
        {price && (
          <div className="absolute top-2 right-2 bg-white/90 text-sm text-gray-800 px-2 py-1 rounded-md font-semibold shadow">
            {price}
          </div>
        )}
      </div>

      <div className="mt-3 flex-1">
        <h3 className="text-lg font-semibold leading-tight truncate">{product.producto}</h3>
        <p className="text-sm text-gray-500 mt-1 truncate">{product.marca_producto?.marca || "Marca desconocida"}</p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {inStock ? "En stock" : "Agotado"}
          </span>
          <span className="text-xs text-gray-500">SKU: {product.sku || "-"}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </li>
  );
}
