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
    modelId: "",
    stock: "true",
    SubCategorias: [],
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState("");
  const [specifications, setSpecifications] = useState([{ key: "", value: "" }]);
  const [sections, setSections] = useState([
    { id: "seccion_01", title: "", imageUrl: "" },
    { id: "seccion_02", title: "", imageUrl: "" },
  ]);
  const [fichaDescriptiva, setFichaDescriptiva] = useState({
    title: "",
    description: "",
    image: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const orderedFiles = files.map((file, index) => ({ file, order: index }));
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
      SubCategorias
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
      uploadedImages[`imagen_${imageIndex}`] = {
        id: `${sku}_0${imageIndex}`,
        img: imageUrl,
      };
    }
    return uploadedImages;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const uploadedImages = await uploadImagesToStorage(formData.sku);

      await addDoc(collection(db, "Products"), {
        categorias: formData.categories,
        SubCategorias: formData.SubCategorias,
        descripcion: formData.description,
        fecha_agregado: new Date().toISOString(),
        imagenes: uploadedImages,
        marca_producto: {
          marca: formData.brand,
        },
        permalink: `https://tecpoint.ws/shop/${formData.slug}`,
        precio: {
          detalle: parseFloat(formData.detailPrice),
          mayoreo: parseFloat(formData.wholesalePrice),
        },
        producto: formData.productName,
        sku: formData.sku,
        slug: formData.slug,
        extradata: {
          color: '',
          discount: 0,
          modelId: formData.modelId,
          stock: formData.stock === "true",
          upc: formData.upc,
          tags: formData.SeoTags,
          especificaciones: Object.fromEntries(
            specifications.map((spec) => [spec.key, spec.value])
          ),
        },
        secciones: {
          seccion_01: {
            title: sections[0].title,
            imageUrl: sections[0].imageUrl,
          },
          seccion_02: {
            title: sections[1].title,
            imageUrl: sections[1].imageUrl,
          },
          ficha_descriptiva: {
            ficha_title: fichaDescriptiva.title,
            ficha_description: fichaDescriptiva.description,
            ficha_image: fichaDescriptiva.image,
          },
        },
      });

      alert("¡Producto subido con éxito!");
      resetForm();
    } catch (error) {
      console.error("Error subiendo producto:", error);
      alert("Hubo un error al subir el producto.");
    }
  };

  const resetForm = () => {
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
      stock: "true",
    });
    setImageFiles([]);
    setPreviewImages([]);
    setSpecifications([{ key: "", value: "" }]);
    setSections([
      { id: "seccion_01", title: "", imageUrl: "" },
      { id: "seccion_02", title: "", imageUrl: "" },
    ]);
    setFichaDescriptiva({
      title: "",
      description: "",
      image: "",
    });
  };

  const handleAddSpecification = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const handleSpecificationChange = (index, field, value) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index][field] = value;
    setSpecifications(updatedSpecs);
  };

  const handleSectionChange = (index, field, value) => {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  };

  const handleFichaDescriptivaChange = (field, value) => {
    setFichaDescriptiva((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSection = () => {
    setSections([
      ...sections,
      { id: `seccion_${sections.length + 1}`, title: "", imageUrl: "" },
    ]);
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[800px] mx-auto">
        <div>
          <label className="font-semibold">Subir Imágenes del Producto</label>
          <input
            type="file"
            multiple
            accept="image/*"
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
            type="number"
            name="detailPrice"
            placeholder="Precio de Detalle"
            value={formData.detailPrice}
            onChange={handleChange}
          />
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="number"
            name="wholesalePrice"
            placeholder="Precio de Mayoreo"
            value={formData.wholesalePrice}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
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

          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="SeoTags"
            placeholder="Tags (separadas por comas)"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                SeoTags: e.target.value.split(",").map((tag) => tag.trim()),
              }))
            }
          />

          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            name="SubCategorias"
            placeholder="Subcategorías (separadas por comas)"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                SubCategorias: e.target.value.split(",").map((subCat) => subCat.trim()),
              }))
            }
          />
        </div>

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
          name="slug"
          placeholder="Slug del Producto"
          value={formData.slug}
          onChange={handleChange}
        />

        <div className="flex gap-4 items-center">
          <label className="font-semibold">¿Hay Stock?</label>
          <select
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            className="border w-[80px] py-2 px-4 rounded-md"
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

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

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Ficha Descriptiva</h3>
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            placeholder="Título de la ficha descriptiva"
            value={fichaDescriptiva.title}
            onChange={(e) => handleFichaDescriptivaChange("title", e.target.value)}
          />
          <textarea
            className="border w-full py-2 px-4 rounded-md"
            placeholder="Descripción de la ficha descriptiva"
            value={fichaDescriptiva.description}
            onChange={(e) => handleFichaDescriptivaChange("description", e.target.value)}
          ></textarea>
          <input
            className="border w-full py-2 px-4 rounded-md"
            type="text"
            placeholder="URL de la imagen"
            value={fichaDescriptiva.image}
            onChange={(e) => handleFichaDescriptivaChange("image", e.target.value)}
          />
        </div>

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
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const imageUrl = URL.createObjectURL(file);
                  handleSectionChange(index, "imageUrl", imageUrl);
                }
              }}
              className="border px-4 py-2 rounded-md w-1/2"
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