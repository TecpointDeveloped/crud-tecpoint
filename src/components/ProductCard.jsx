import React from "react";
import Button from "./Button";

export default function ProductCard({ product, onEdit }) {
  const imgSrc = product.imagenes?.imagen_01?.img || "/default-product.webp";
  const inStock = product.extradata?.stock ?? true;

  return (
    <li className="flex items-center gap-4 p-3 bg-white border border-transparent hover:border-gray-200 rounded-md transition-colors">
      <img src={imgSrc} alt={product.producto} className="w-16 h-16 object-contain rounded-sm bg-gray-50 p-1" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate">
            <h3 className="text-sm font-medium truncate">{product.producto}</h3>
            <p className="text-xs text-gray-500 truncate">{product.marca_producto?.marca || ""} - {product.sku || ""}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${inStock ? "bg-green-500" : "bg-red-500"}`} aria-hidden></span>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <Button variant="ghost" className="text-sm" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </li>
  );
}
