import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

function Update() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updatedData, setUpdatedData] = useState({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Products"));
        const fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  const openModal = (product) => {
    setSelectedProduct(product);
    setUpdatedData(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const handleChange = (e) => {
    setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    if (!selectedProduct) return;

    const productRef = doc(db, "Products", selectedProduct.id);
    try {
      await updateDoc(productRef, updatedData);
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? updatedData : p))
      );
      closeModal();
      alert("Producto actualizado exitosamente!");
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lista de Productos</h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <li key={product.id} className="p-4 border rounded-lg shadow flex flex-col items-center">
            <img
              src={product.imagenes?.[0]?.img || "https://via.placeholder.com/50"}
              alt={product.producto}
              className="w-20 h-20 object-cover mb-2"
            />
            <p className="text-lg font-semibold">{product.producto}</p>
            <button
              onClick={() => openModal(product)}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Editar
            </button>
          </li>
        ))}
      </ul>

      {/* Modal de Edición */}
      {selectedProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar Producto</h2>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Nombre:</label>
              <input
                type="text"
                name="producto"
                value={updatedData.producto}
                onChange={handleChange}
                className="border p-2 rounded"
              />

              <label className="text-sm font-semibold">Descripción:</label>
              <textarea
                name="descripcion"
                value={updatedData.descripcion}
                onChange={handleChange}
                className="border p-2 rounded"
              />

              <label className="text-sm font-semibold">Precio Detalle:</label>
              <input
                type="number"
                name="precioDetalle"
                value={updatedData.precioDetalle}
                onChange={handleChange}
                className="border p-2 rounded"
              />

              <label className="text-sm font-semibold">Precio Mayoreo:</label>
              <input
                type="number"
                name="precioMayoreo"
                value={updatedData.precioMayoreo}
                onChange={handleChange}
                className="border p-2 rounded"
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={closeModal}
                className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Update;