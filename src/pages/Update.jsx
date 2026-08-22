import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { qualityIssues } from "../lib/productQuality";
import { useSearchParams } from "react-router-dom";

// Componentes básicos para simular Card o Button si no los importas de App.jsx directamente
// (Aunque es mejor usar los componentes creados en ./components si están disponibles)
const BasicCard = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-white text-gray-900 shadow-sm p-4 ${className}`}>
    {children}
  </div>
);

const BasicButton = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50
      bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);


function Update() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updatedData, setUpdatedData] = useState({});
  const [imageFiles, setImageFiles] = useState([]); // Para archivos de imagen nuevos a subir
  const [pendingImageDeletions, setPendingImageDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "Products"));
        const fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetchedProducts);
        const requestedId = searchParams.get("id");
        const requestedProduct = requestedId
          ? fetchedProducts.find((product) => product.id === requestedId)
          : null;
        if (requestedProduct) {
          setSelectedProduct(requestedProduct);
          setUpdatedData({ ...requestedProduct });
          setImageFiles([]);
          setPendingImageDeletions([]);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Error al cargar los productos. Por favor, intente de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  const openModal = (product) => {
    setSelectedProduct(product);
    setUpdatedData({ ...product }); // Clonar para evitar mutaciones directas
    setImageFiles([]); // Resetear archivos de imagen al abrir un nuevo modal
    setPendingImageDeletions([]);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setUpdatedData({});
    setImageFiles([]);
    setPendingImageDeletions([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');
    const finalValue = type === 'checkbox' ? checked : value;

    setUpdatedData(prev => {
      const updated = { ...prev };
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {}; // Crear objeto anidado si no existe
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = finalValue;
      return updated;
    });
  };

  const handleImageFileChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      setImageFiles((prev) =>
        prev.map((img, i) => (i === index ? { file, order: img.order } : img))
      );
    }
  };

  const addImageField = () => {
    setImageFiles((prev) => [...prev, { file: null, order: prev.length }]);
  };

  const handleRemoveExistingImage = (imageKey) => {
    if (!selectedProduct) return;

    const imageUrl = updatedData.imagenes?.[imageKey]?.img;
    if (!imageUrl) {
      alert("No se encontró la URL de la imagen para eliminar.");
      return;
    }

    setPendingImageDeletions((previous) => previous.includes(imageUrl) ? previous : [...previous, imageUrl]);
    setUpdatedData((prev) => {
      const updatedImages = { ...prev.imagenes };
      delete updatedImages[imageKey];
      return { ...prev, imagenes: updatedImages };
    });
  };


  const handleSaveChanges = async () => {
    if (!selectedProduct) {
      console.error("No product selected");
      alert("No se ha seleccionado ningún producto para actualizar.");
      return;
    }

    setLoading(true);
    const productRef = doc(db, "Products", selectedProduct.id);
    const storage = getStorage();
    let newImageUrls = {}; // Objeto para almacenar las URLs de las nuevas imágenes

    try {
      // 1. Subir nuevas imágenes
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (imageField, index) => {
          if (imageField.file) {
            // Asegúrate de que marca y SKU existan para la ruta
            const marca = updatedData.marca_producto?.marca || "sin_marca";
            const sku = updatedData.sku || selectedProduct.sku || "sin_sku"; // Usa el SKU actual si no se ha cambiado aún
            const storageRef = ref(storage, `productos/${marca}/${sku}/${imageField.file.name}`);
            await uploadBytes(storageRef, imageField.file);
            const url = await getDownloadURL(storageRef);
            // Asignar un nombre único o secuencial a la nueva imagen
            return { key: `imagen_new_${Date.now()}_${index}`, data: { img: url, id: `${sku}_new_${index}` } };
          }
          return null;
        });

        const uploadedResults = await Promise.all(uploadPromises);
        uploadedResults.forEach(res => {
          if (res) {
            newImageUrls[res.key] = res.data;
          }
        });
      }

      // 2. Combinar datos actualizados con imágenes
      const finalImages = { ...updatedData.imagenes, ...newImageUrls }; // Combina las existentes (incluyendo las eliminadas ya por handleRemoveExistingImage) con las nuevas
      
      const updatedProductData = {
        ...updatedData,
        precio: {
          detalle: parseFloat(updatedData.precio?.detalle) || 0, // Convertir a número
          mayoreo: parseFloat(updatedData.precio?.mayoreo) || 0, // Convertir a número
        },
        extradata: {
          ...(updatedData.extradata || {}),
          stock: updatedData.extradata?.stock || false,
          especificaciones: updatedData.extradata?.especificaciones || "",
          tags: updatedData.extradata?.tags || "", // Asegurarse de que tags se maneje
        },
        // Asegurarse de que categoria y subcategorias sean strings, o arrays si es necesario
        categorias: Array.isArray(updatedData.categorias)
          ? updatedData.categorias
          : String(updatedData.categorias || "").split(",").map((item) => item.trim()).filter(Boolean),
        Subcategorias: updatedData.Subcategorias || updatedData.SubCategorias || "",
        imagenes: finalImages,
        marca_producto: {
          ...(updatedData.marca_producto || {}),
          marca: updatedData.marca_producto?.marca || "",
        },
      };

      const issues = qualityIssues(updatedProductData);
      updatedProductData.publication_status = issues.length ? "draft_incomplete" : "ready";
      updatedProductData.publication_issues = issues;

      await updateDoc(productRef, updatedProductData);
      const failedImageDeletions = [];
      for (const imageUrl of pendingImageDeletions) {
        try {
          await deleteObject(ref(storage, imageUrl));
        } catch (imageError) {
          console.warn("No se pudo limpiar una imagen antigua de Storage:", imageError);
          failedImageDeletions.push(imageUrl);
        }
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...updatedProductData, id: selectedProduct.id } : p))
      );
      closeModal();
      alert(failedImageDeletions.length
        ? "Producto actualizado. Algunas imágenes antiguas no pudieron limpiarse de Storage, pero ya no se muestran en la ficha."
        : "¡Producto actualizado exitosamente!");
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Error actualizando producto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-1 sm:p-3 lg:p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Actualizar Productos</h1>

      {loading && <p className="text-center text-gray-600 text-lg">Cargando productos...</p>}
      {error && <p className="text-center text-red-600 text-lg">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="text-center text-gray-600 text-lg">No hay productos para mostrar.</p>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <BasicCard key={product.id} className="flex flex-col items-center justify-between p-4 bg-white hover:shadow-lg transition-shadow duration-200">
            <div className="flex flex-col items-center text-center">
              <img
                src={product.imagenes?.imagen_01?.img || "/default-product.webp"}
                alt={product.producto}
                className="w-32 h-32 object-contain mb-4 rounded-lg border border-gray-200"
              />
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-1">{product.producto}</h3>
              <p className="text-sm text-gray-600">SKU: {product.sku || "N/A"}</p>
              <p className="text-sm text-gray-600">Marca: {product.marca_producto?.marca || "N/A"}</p>
            </div>
            <BasicButton
              onClick={() => openModal(product)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md shadow-md"
            >
              Editar Producto
            </BasicButton>
          </BasicCard>
        ))}
      </ul>

      {/* Modal de Edición */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Editar Producto: {selectedProduct.producto}</h2>
            <p className="text-sm text-gray-500 mb-4">ID del Producto: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{selectedProduct.id}</span></p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Sección de Imágenes */}
              <section className="flex flex-col gap-4 border p-4 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Imágenes del Producto</h3>
                <div className="flex justify-center items-center h-64 border border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                  <img
                    src={updatedData.imagenes?.imagen_01?.img || "/default-product.webp"}
                    alt="Imagen Principal"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                  {Object.keys(updatedData.imagenes || {}).map((key) => (
                    <div key={key} className="flex flex-col items-center gap-1 border p-2 rounded-md bg-white shadow-sm">
                      <img
                        src={updatedData.imagenes[key]?.img}
                        alt={`Existente ${key}`}
                        className="w-20 h-20 object-cover rounded-md mb-1"
                      />
                      <button
                        onClick={() => handleRemoveExistingImage(key)}
                        className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  {imageFiles.map((image, index) => (
                    <div key={index} className="flex flex-col items-center gap-1 border p-2 rounded-md bg-white shadow-sm">
                      <input
                        type="file"
                        onChange={(e) => handleImageFileChange(e, index)}
                        className="text-xs w-full text-gray-700 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {image.file && (
                        <img
                          src={URL.createObjectURL(image.file)}
                          alt={`Previsualización ${index}`}
                          className="w-20 h-20 object-cover rounded-md mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <BasicButton
                  onClick={addImageField}
                  className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
                >
                  Agregar Nueva Imagen
                </BasicButton>
              </section>

              {/* Sección de Detalles del Producto */}
              <section className="flex flex-col gap-4 border p-4 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Detalles del Producto</h3>
                <div className="flex flex-col gap-3">
                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Nombre del Producto:</span>
                    <input
                      type="text"
                      name="producto"
                      value={updatedData.producto || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del Producto"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Descripción:</span>
                    <textarea
                      name="descripcion"
                      value={updatedData.descripcion || ""}
                      onChange={handleChange}
                      rows="3"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      placeholder="Descripción del Producto"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-gray-700 text-sm font-medium">Precio Detalle:</span>
                      <input
                        type="number"
                        name="precio.detalle"
                        value={updatedData.precio?.detalle || ""}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </label>

                    <label className="block">
                      <span className="text-gray-700 text-sm font-medium">Precio Mayoreo:</span>
                      <input
                        type="number"
                        name="precio.mayoreo"
                        value={updatedData.precio?.mayoreo || ""}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-gray-700 text-sm font-medium">SKU:</span>
                      <input
                        type="text"
                        name="sku"
                        value={updatedData.sku || ""}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="SKU"
                      />
                    </label>

                    <label className="block">
                      <span className="text-gray-700 text-sm font-medium">Marca:</span>
                      <input
                        type="text"
                        name="marca_producto.marca"
                        value={updatedData.marca_producto?.marca || ""}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Marca"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">UPC:</span>
                    <input
                      type="text"
                      name="extradata.upc"
                      value={updatedData.extradata?.upc || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Código UPC del producto"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">URL (Permalink):</span>
                    <input
                      type="text"
                      name="permalink"
                      value={updatedData.permalink || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="URL del Producto"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Slug:</span>
                    <input
                      type="text"
                      name="slug"
                      value={updatedData.slug || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Slug del Producto"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Categorías (separadas por coma si son varias):</span>
                    <input
                      type="text"
                      name="categorias" // Corregido a 'categorias' sin S al final
                      value={updatedData.categorias || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Electrónica, Hogar"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Subcategorías (separadas por coma):</span>
                    <input
                      type="text"
                      name="SubCategorias"
                      value={updatedData.SubCategorias || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Laptops, Accesorios"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Tags (separados por coma):</span>
                    <input
                      type="text"
                      name="extradata.tags"
                      value={updatedData.extradata?.tags || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: gaming, oficina"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Variantes y formas de buscar:</span>
                    <textarea
                      name="extradata.searchAliases"
                      value={Array.isArray(updatedData.extradata?.searchAliases) ? updatedData.extradata.searchAliases.join(", ") : updatedData.extradata?.searchAliases || ""}
                      onChange={handleChange}
                      rows="2"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 resize-y"
                      placeholder="Ej. cargador, cabeza, cubo, cubito de carga, charger"
                    />
                    <small className="text-gray-500">Separe cada variante con coma. Incluya términos reales; no altere el nombre oficial.</small>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="extradata.stock"
                      checked={!!updatedData.extradata?.stock} // Usar !! para convertir a booleano verdadero/falso
                      onChange={handleChange}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 text-sm font-medium">Producto en Stock</span>
                  </label>

                  <label className="block">
                    <span className="text-gray-700 text-sm font-medium">Especificaciones:</span>
                    <textarea
                      name="extradata.especificaciones"
                      value={updatedData.extradata?.especificaciones || ""}
                      onChange={handleChange}
                      rows="3"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      placeholder="Especificaciones del Producto"
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* Botones de acción del Modal */}
            <div className="flex justify-end gap-3 mt-6">
              <BasicButton
                onClick={closeModal}
                className="bg-gray-400 hover:bg-gray-500 text-white"
              >
                Cancelar
              </BasicButton>
              <BasicButton
                onClick={handleSaveChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading} // Deshabilitar mientras se guarda
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </BasicButton>
            </div>

            {/* Botón de cerrar modal en la esquina (SVG) */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-gray-200 text-gray-700 size-8 flex items-center justify-center rounded-full hover:bg-gray-300 transition-colors"
              aria-label="Cerrar modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Update;
