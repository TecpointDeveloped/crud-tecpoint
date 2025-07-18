import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

function Update() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updatedData, setUpdatedData] = useState({});
  const [imageFiles, setImageFiles] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Products"));
        const fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetchedProducts);
        console.log("Products fetched:", fetchedProducts);
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
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');
    const finalValue = type === 'checkbox' ? checked : value;
    if (keys.length > 1) {
      setUpdatedData(prev => {
        const updated = { ...prev };
        let obj = updated;
        for (let i = 0; i < keys.length - 1; i++) {
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = finalValue;
        return updated;
      });
    } else {
      setUpdatedData({ ...updatedData, [name]: finalValue });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedProduct) {
      console.error("No product selected");
      return;
    }

    const productRef = doc(db, "Products", selectedProduct.id);
    const storage = getStorage();
    const uploadPromises = imageFiles.map(async (image, index) => {
      if (image.file) {
        const storageRef = ref(storage, `productos/${selectedProduct.marca_producto.marca}/${selectedProduct.sku}/${image.file.name}_${index + 1}`);
        await uploadBytes(storageRef, image.file);
        const url = await getDownloadURL(storageRef);
        return { img: url };
      }
      return null;
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);

      // Mantener las imágenes existentes si no se seleccionan nuevas
      const existingImages = selectedProduct.imagenes || {};
      const newImages = uploadedImages.reduce((acc, img, index) => {
        if (img) acc[`imagen_0${index + 1}`] = { ...img, id: `${updatedData.sku}_0${index + 1}` };
        return acc;
      }, {});

      const updatedProductData = {
        ...updatedData,
        precio: {
          detalle: updatedData.precio?.detalle || 0,
          mayoreo: updatedData.precio?.mayoreo || 0,
        },
        extradata: {
          stock: updatedData.extradata?.stock || false,
          especificaciones: updatedData.extradata?.especificaciones || "",
        },
        imagenes: { ...existingImages, ...newImages }, // Combinar imágenes existentes con nuevas
        marca_producto: {
          marca: updatedData.marca_producto?.marca || "",
        },
      };

      await updateDoc(productRef, updatedProductData);
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...updatedProductData, id: selectedProduct.id } : p))
      );
      closeModal();
      alert("Producto actualizado exitosamente!");
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error updating product: " + error.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lista de Productos</h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <li key={product.id} className="p-2 border rounded-lg shadow flex flex-col items-center">
            <div className="flex">
              <div className="flex items-center gap-4">
                <img
                  src={product.imagenes?.imagen_01?.img || "/default-product.webp"}
                  alt={product.producto}
                  className="size-[180px] aspect-square object-contain mb-2 border rounded-lg"
                />
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-semibold tracking-[-0.9px] leading-[18px]">{product.producto}</h3>
                  <h4>{product.sku || "null"}</h4>
                  <h4>{product.marca_producto.marca || "null"}</h4>
                </div>
              </div>
            </div>
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-full h-full overflow-hidden overflow-y-scroll relative">
            <h2 className="text-xl font-bold mb-4">Editar Producto</h2>
            <h1>{updatedData.id}</h1>

            <div className="flex flex-col gap-2">
              <section className="flex gap-4 max-w-[1200px]">

                <section className="flex flex-col gap-4 flex-1">
                  <picture className="border rounded-md max-w-[500px] max-h-[500px] min-w-[500px] min-h-[500px] overflow-hidden">
                    <img src={updatedData.imagenes?.imagen_01?.img || "/default-product.webp"} className="max-w-[500px] max-h-[500px] min-w-[500px] min-h-[500px] aspect-square object-cover" alt="" />
                  </picture>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImageFiles([...imageFiles, { file: null, order: imageFiles.length }])}
                        className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Agregar Imagen
                      </button>
                    </div>
                    <section className="flex gap-4">
                      {Object.keys(updatedData.imagenes || {}).map((key, index) => (
                        <div key={key} className="flex flex-col items-center gap-2">
                          <img
                            src={updatedData.imagenes[key]?.img}
                            alt={`Existing ${index}`}
                            className="size-20 object-cover border rounded"
                          />
                          <button
                            onClick={async () => {
                              const storage = getStorage();
                              const imageRef = ref(storage, updatedData.imagenes[key]?.img);
                              try {
                                await deleteObject(imageRef);
                                setUpdatedData((prev) => {
                                  const updatedImages = { ...prev.imagenes };
                                  delete updatedImages[key];
                                  return { ...prev, imagenes: updatedImages };
                                });
                                alert("Imagen eliminada correctamente");
                              } catch (error) {
                                console.error("Error eliminando la imagen:", error);
                                alert("Error eliminando la imagen: " + error.message);
                              }
                            }}
                            className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </section>
                    {imageFiles.map((image, index) => (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setImageFiles((prev) =>
                                prev.map((img, i) => (i === index ? { file, order: img.order } : img))
                              );
                            }
                          }}
                          className="border p-2 rounded"
                        />
                        {image.file && (
                          <img
                            src={URL.createObjectURL(image.file)}
                            alt={`Selected ${index}`}
                            className="size-20 object-cover border rounded"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                </section>

                <section className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      name="producto"
                      value={updatedData.producto}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      placeholder="Nombre del Producto"
                    />

                    <textarea
                      name="descripcion"
                      value={updatedData.descripcion}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      placeholder="Descripción del Producto"
                    />
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="number"
                      name="precio.detalle"
                      value={updatedData.precio?.detalle || ""}
                      onChange={handleChange}
                      className="border p-2 rounded w-[80px]"
                      placeholder="Precio Detalle"
                    />

                    <input
                      type="number"
                      name="precio.mayoreo"
                      value={updatedData.precio?.mayoreo || ""}
                      onChange={handleChange}
                      className="border p-2 rounded w-[80px]"
                      placeholder="Precio Mayoreo"
                    />

                    <input
                      type="text"
                      name="sku"
                      value={updatedData.sku}
                      onChange={handleChange}
                      className="border p-2 rounded w-[120px]"
                      placeholder="SKU"
                    />

                    <input
                      type="text"
                      name="marca_producto.marca"
                      value={updatedData.marca_producto?.marca || ""}
                      onChange={handleChange}
                      className="border p-2 rounded w-[120px]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">URL:</label>
                    <input
                      type="text"
                      name="permalink"
                      value={updatedData.permalink}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      placeholder="URL del Producto"
                    />

                    <label className="text-sm font-semibold">Slug:</label>
                    <input
                      type="text"
                      name="slug"
                      value={updatedData.slug}
                      onChange={handleChange}
                      className="border p-2 rounded"
                      placeholder="Slug del Producto"
                    />
                  </div>
                </section>

              </section>

              <input
                type="text"
                name="categoria"
                value={updatedData.categorias}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="Categorías"
              />

              <input
                type="text"
                name="categoria"
                value={updatedData.SubCategorias}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="Subcategorías"
              />

              <input
                type="text"
                name="categoria"
                value={updatedData.extradata.tags}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="Subcategorías"
              />

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Stock:</label>
                <input
                  type="checkbox"
                  name="extradata.stock"
                  checked={updatedData.extradata?.stock || false}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
              </div>

              <textarea
                name="extradata.especificaciones"
                value={updatedData.extradata?.especificaciones || ""}
                onChange={handleChange}
                className="border p-2 rounded"
                placeholder="Especificaciones"
              />
            </div>

            <div className="flex items-center justify-between absolute top-2 right-2 gap-2">
              <button
                onClick={async () => {
                  await handleSaveChanges();
                  setUpdatedData({});
                  setImageFiles([]);
                  setUpdatedData((prev) => ({
                    ...prev,
                    imagenes: { ...selectedProduct.imagenes, ...updatedData.imagenes },
                  }));
                }}
                className="bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-400"
              >
                Actualizar
              </button>

              <button
                onClick={closeModal}
                className="bg-gray-400 text-white size-[30px] grid place-content-center rounded-full hover:bg-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Update;