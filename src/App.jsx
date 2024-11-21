import { useState } from "react";
import { Autocomplete, AutocompleteItem } from "@nextui-org/react";
import { db, storage } from "./firebaseConfig"; // Configura Firebase aquí
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function App() {
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    sku: "",
    detailPrice: "",
    wholesalePrice: "",
    categories: [],
    brand: "",
    brandLogo: "",
    permalink: "",
  });

  const [imageFiles, setImageFiles] = useState([]); // Archivos seleccionados

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejar selección de imágenes
  const handleImageChange = (e) => {
    setImageFiles(Array.from(e.target.files)); // Convertimos FileList a Array
  };

  // Subir imágenes al Storage y obtener URLs
  const uploadImagesToStorage = async (sku) => {
    const uploadedImages = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const imageRef = ref(storage, `productos/${formData.brand}/${sku}/${sku}_0${i + 1}`);

      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);
      uploadedImages.push({ id: `${sku}_0${i + 1}`, img: imageUrl });
    }

    return uploadedImages;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sku || !formData.productName || !imageFiles.length) {
      alert("Por favor, completa todos los campos obligatorios y selecciona imágenes.");
      return;
    }

    try {
      // Subir imágenes y obtener sus URLs
      const uploadedImages = await uploadImagesToStorage(formData.sku);

      // Crear permalink
      const permalink = `https://tecpoint.ws/shop/${formData.brand.toLowerCase()}-${formData.productName
        .toLowerCase()
        .replace(/ /g, "-")}`;

      // Subir datos del producto a Firestore
      await addDoc(collection(db, "productos"), {
        categorias: formData.categories, // Array de categorías
        descripcion: formData.description,
        fecha_agregado: new Date().toISOString(),
        imagenes: uploadedImages, // Array de imágenes con ID y URL
        marca_producto: {
          logo: formData.brandLogo,
          marca: formData.brand,
          permalink: permalink,
        },
        precio: {
          detalle: parseFloat(formData.detailPrice),
          mayoreo: parseFloat(formData.wholesalePrice),
        },
        producto: formData.productName,
        sku: formData.sku,
      });

      alert("¡Producto subido con éxito!");
      // Resetear formulario
      setFormData({
        productName: "",
        description: "",
        sku: "",
        detailPrice: "",
        wholesalePrice: "",
        categories: [],
        brand: "",
        brandLogo: "",
        permalink: "",
      });
      setImageFiles([]);
    } catch (error) {
      console.error("Error subiendo producto:", error);
      alert("Hubo un error al subir el producto.");
    }
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[500px]">
        <input
          className="border w-full py-2 px-4 rounded-md"
          type="text"
          name="productName"
          placeholder="Nombre del Producto"
          value={formData.productName}
          onChange={handleChange}
        />
        <textarea
          className="border w-full py-2 px-4 rounded-md"
          name="description"
          placeholder="Descripción del Producto"
          value={formData.description}
          onChange={handleChange}
        ></textarea>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="sku"
            placeholder="SKU del Producto"
            value={formData.sku}
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="detailPrice"
            placeholder="Precio de Detalle"
            value={formData.detailPrice}
            onChange={handleChange}
          />
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="wholesalePrice"
            placeholder="Precio de Mayoreo"
            value={formData.wholesalePrice}
            onChange={handleChange}
          />
        </div>
        <input
          className="border w-full py-2 px-4 rounded-md"
          type="text"
          name="categories"
          placeholder="Categorías (separadas por comas)"
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              categories: e.target.value.split(",").map((cat) => cat.trim()),
            }))
          }
        />
        <Autocomplete
          onSelect={(key) => setFormData((prev) => ({ ...prev, brand: key }))}
        >
          <AutocompleteItem key="Hypergear">Hypergear</AutocompleteItem>
          <AutocompleteItem key="Naztech">Naztech</AutocompleteItem>
          <AutocompleteItem key="PowerPeak">PowerPeak</AutocompleteItem>
        </Autocomplete>
        <input
          className="border w-full py-2 px-4 rounded-md"
          type="text"
          name="brandLogo"
          placeholder="URL del logo de la marca"
          value={formData.brandLogo}
          onChange={handleChange}
        />
        <div>
          <label className="font-[600]">Subir Imágenes del Producto</label>
          <input
            type="file"
            multiple
            onChange={handleImageChange}
            className="border w-full py-2 px-4 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Subir Producto
        </button>
      </form>
    </div>
  );
}

export default App;
