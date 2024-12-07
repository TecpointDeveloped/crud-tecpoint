import { useState } from "react";
import { db, storage } from "./firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function App() {
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    sku: "",
    upc: "",
    slug: "",
    detailPrice: "",
    wholesalePrice: "",
    categories: [],
    brand: "",
    brandLogo: "",
    modelId: "", // Nuevo campo modelId
    stock: "", // Nuevo campo stock
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState("");

  const [specifications, setSpecifications] = useState([{ key: "", value: "" }]);

  const [sections, setSections] = useState([{ title: "", image: "" }]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    console.log('Archivos seleccionados:', files);
    const files = Array.from(e.target.files);

    const orderedFiles = files.map((file, index) => ({
      file,
      order: index,
    }));

    setImageFiles(orderedFiles);

    const previews = orderedFiles.map(({ file }) => ({
      id: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);
  };

  const validateForm = () => {
    const {
      productName,
      description,
      sku,
      upc,
      slug,
      detailPrice,
      wholesalePrice,
      categories,
      brand,
      brandLogo,
    } = formData;

    if (
      !productName.trim() ||
      !description.trim() ||
      !sku.trim() ||
      !upc.trim() ||
      !slug.trim() ||
      !detailPrice.trim() ||
      !wholesalePrice.trim() ||
      !categories.length ||
      !brand.trim() ||
      !brandLogo.trim() ||
      !imageFiles.length
    ) {
      setError("Por favor, completa todos los campos y selecciona al menos una imagen.");
      return false;
    }

    setError("");
    return true;
  };

  const uploadImagesToStorage = async (sku) => {
    const uploadedImages = {};

    for (let i = 0; i < imageFiles.length; i++) {
      const { file, order } = imageFiles[i];
      const imageIndex = order + 1;

      const imageRef = ref(storage, `productos/${formData.brand}/${sku}/${sku}_0${imageIndex}`);

      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      uploadedImages[`imagen_0${imageIndex}`] = {
        id: `${sku}_0${imageIndex}`,
        img: imageUrl,
      };
    }

    return uploadedImages;
  };

  const handleSubmit = async (e) => {
    console.log(formData);
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const uploadedImages = await uploadImagesToStorage(formData.sku);

      await addDoc(collection(db, "Products"), {
        categorias: formData.categories,
        descripcion: formData.description,
        fecha_agregado: new Date().toISOString(),
        imagenes: uploadedImages,
        marca_producto: {
          logo: formData.brandLogo,
          marca: formData.brand,
        },
        permalink: `https://tecpoint.ws/shop/${formData.slug}`,
        precio: {
          detalle: parseFloat(formData.detailPrice),
          mayoreo: parseFloat(formData.wholesalePrice),
        },
        producto: formData.productName,
        sku: formData.sku,
        upc: formData.upc,
        slug: formData.slug,
        modelId: formData.modelId, // Incluye el modelId si es necesario
        stock: formData.stock.trim() !== "" && parseInt(formData.stock, 10) > 0, // True si el stock > 0, False si no
        extradata: {
          especificaciones: Object.fromEntries(
            specifications.map((spec) => [spec.key, spec.value])
          ),
        },
        secciones: sections.map((section) => ({
          title: section.title,
          image: section.image,
        })),
      });

      alert("¡Producto subido con éxito!");

      setFormData({
        productName: "",
        description: "",
        sku: "",
        upc: "",
        slug: "",
        detailPrice: "",
        wholesalePrice: "",
        categories: [],
        brand: "",
        brandLogo: "",
        modelId: "",
        stock: "",
      });
      setImageFiles([]);
      setPreviewImages([]);
      setSpecifications([{ key: "", value: "" }]);
      setSections([{ title: "", image: "" }]);
    } catch (error) {
      console.error("Error subiendo producto:", error);
      alert("Hubo un error al subir el producto.");
    }
  };

  const handleAddSpecification = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const handleSpecificationChange = (index, field, value) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index][field] = value;
    setSpecifications(updatedSpecs);
  };

  const handleAddSection = () => {
    setSections([...sections, { title: "", image: "" }]);
  };

  const handleSectionChange = (index, field, value) => {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[800px]">
        <div>
          <label className="font-[600]">Subir Imágenes del Producto</label>
          <input
            type="file"
            multiple
            onChange={handleImageChange}
            className="border w-full py-2 px-4 rounded-md"
          />
        </div>

        {previewImages.length > 0 && (
          <div className="flex gap-4 flex-wrap">
            {previewImages.map((preview) => (
              <img
                key={preview.id}
                src={preview.url}
                alt={`Vista previa ${preview.id}`}
                className="w-24 h-24 object-contain aspect-square rounded-md border"
              />
            ))}
          </div>
        )}

        {error && <p className="text-red-500">{error}</p>}

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
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="upc"
            placeholder="UPC del Producto"
            value={formData.upc}
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
        <select
          className="border w-full py-2 px-4 rounded-md"
          name="brand"
          value={formData.brand}
          onChange={handleChange}
        >
          <option value="" disabled>
            Selecciona una marca
          </option>
          <option value="Hypergear">Hypergear</option>
          <option value="Naztech">Naztech</option>
          <option value="PowerPeak">PowerPeak</option>
          <option value="Krieg">Krieg</option>
          <option value="Deken">Deken</option>
          <option value="Appacs">Appacs</option>
          <option value="USG">USG</option>
          <option value="XBase">XBase</option>
          <option value="Ghostek">Ghostek</option>
          <option value="Imilab">Imilab</option>
          <option value="Samsung">Samsung</option>
          <option value="Apple">Apple</option>
          <option value="Coast">Coast</option>
          <option value="Rock Space">Rock Space</option>
        </select>
        <input
          className="border w-full py-2 px-4 rounded-md"
          type="text"
          name="brandLogo"
          placeholder="URL del logo de la marca"
          value={formData.brandLogo}
          onChange={handleChange}
        />

        {/* Especificaciones dinámicas */}
        <div>
          <h3 className="font-semibold">Especificaciones</h3>
          {specifications.map((spec, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                className="border px-4 py-2 rounded-md w-1/2"
                placeholder="Nombre de la especificación"
                value={spec.key}
                onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
              />
              <input
                className="border px-4 py-2 rounded-md w-1/2"
                placeholder="Valor de la especificación"
                value={spec.value}
                onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
              />
            </div>
          ))}
          <button
            type="button"
            className="bg-gray-300 py-2 px-4 rounded-md"
            onClick={handleAddSpecification}
          >
            Agregar Especificación
          </button>
        </div>

        {/* Secciones dinámicas */}
        <div>
          <h3 className="font-semibold">Secciones</h3>
          {sections.map((section, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                className="border px-4 py-2 rounded-md w-1/2"
                placeholder="Título de la sección"
                value={section.title}
                onChange={(e) => handleSectionChange(index, "title", e.target.value)}
              />
              <input
                className="border px-4 py-2 rounded-md w-1/2"
                placeholder="URL de la imagen de la sección"
                value={section.image}
                onChange={(e) => handleSectionChange(index, "image", e.target.value)}
              />
            </div>
          ))}
          <button
            type="button"
            className="bg-gray-300 py-2 px-4 rounded-md"
            onClick={handleAddSection}
          >
            Agregar Sección
          </button>
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