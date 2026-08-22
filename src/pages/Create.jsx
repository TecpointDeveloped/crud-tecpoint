import { useEffect, useState } from "react";
import { db, storage } from "../firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { qualityIssues } from "../lib/productQuality";

function Create() {
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
    SeoTags: [],
    searchAliases: [],
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    const invalidFile = files.find((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024);
    if (invalidFile) {
      setError("Use únicamente imágenes de hasta 8 MB por archivo.");
      e.target.value = "";
      return;
    }
    previewImages.forEach((preview) => URL.revokeObjectURL(preview.url));
    const orderedFiles = files.map((file, index) => ({ file, order: index }));
    setImageFiles(orderedFiles);
    const previews = orderedFiles.map(({ file }) => ({
      id: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);
    setError("");
  };

  useEffect(() => () => {
    previewImages.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previewImages]);

  // const validateForm = () => {
  //   const {
  //     productName,
  //     description,
  //     sku,
  //     upc,
  //     slug,
  //     detailPrice,
  //     wholesalePrice,
  //     categories,
  //     brand,
  //     SubCategorias
  //   } = formData;

  //   if (
  //     !productName.trim() ||
  //     !description.trim() ||
  //     !sku.trim() ||
  //     !upc.trim() ||
  //     !slug.trim() ||
  //     !detailPrice.trim() ||
  //     !wholesalePrice.trim() ||
  //     !categories.length ||
  //     !brand.trim() ||
  //     !imageFiles.length
  //   ) {
  //     setError("Por favor, completa todos los campos y selecciona al menos una imagen.");
  //     return false;
  //   }

  //   setError("");
  //   return true;
  // };

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
    e.preventDefault();
    if (submitting) return;
    setError("");
    const normalizedSku = formData.sku.trim();
    const normalizedUpc = formData.upc.replace(/\s+/g, "");
    const normalizedSlug = formData.slug.trim().toLowerCase();
    const requiredMissing = [
      !formData.productName.trim() && "nombre",
      formData.description.trim().length < 20 && "descripción de al menos 20 caracteres",
      !normalizedSku && "SKU",
      !normalizedUpc && "UPC",
      !normalizedSlug && "slug",
      !(Number(formData.detailPrice) > 0) && "precio de detalle",
      !formData.categories.some(Boolean) && "categoría",
      !formData.brand.trim() && "marca",
      !imageFiles.length && "al menos una imagen",
    ].filter(Boolean);
    if (requiredMissing.length) {
      setError(`Complete antes de guardar: ${requiredMissing.join(", ")}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const existingSnapshot = await getDocs(collection(db, "Products"));
      const duplicate = existingSnapshot.docs.find((productDoc) => {
        const product = productDoc.data();
        return String(product.sku || "").trim().toLowerCase() === normalizedSku.toLowerCase()
          || String(product.extradata?.upc || "").replace(/\s+/g, "") === normalizedUpc
          || String(product.slug || "").trim().toLowerCase() === normalizedSlug;
      });
      if (duplicate) throw new Error("Ya existe un producto con ese SKU, UPC o slug.");

      const uploadedImages = await uploadImagesToStorage(normalizedSku);

      const productPayload = {
        categorias: formData.categories,
        Subcategorias: Array.isArray(formData.SubCategorias) ? formData.SubCategorias.join(", ") : formData.SubCategorias,
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
        sku: normalizedSku,
        slug: normalizedSlug,
        extradata: {
          color: '',
          discount: 0,
          modelId: formData.modelId,
          stock: formData.stock === "true",
          upc: normalizedUpc,
          tags: formData.SeoTags,
          searchAliases: formData.searchAliases,
          especificaciones: Object.fromEntries(
            specifications.map((spec) => [spec.key, spec.value])
          ),
        },
        secciones: {
          seccion_01: {
            title: sections[0].title,
            imagenUrl: sections[0].imageUrl,
          },
          seccion_02: {
            title: sections[1].title,
            imagenUrl: sections[1].imageUrl,
          },
          ficha_descriptiva: {
            ficha_title: fichaDescriptiva.title,
            ficha_description: fichaDescriptiva.description,
            ficha_image: fichaDescriptiva.image,
          },
        },
      };
      const issues = qualityIssues(productPayload);
      await addDoc(collection(db, "Products"), {
        ...productPayload,
        publication_status: issues.length ? "draft_incomplete" : "ready",
        publication_issues: issues,
      });

      alert(issues.length
        ? `Producto guardado como borrador. Falta completar: ${issues.join(", ")}.`
        : "¡Producto guardado y listo para publicar!");
      // resetForm();
    } catch (error) {
      console.error("Error subiendo producto:", error);
      setError(error.message || "Hubo un error al subir el producto.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  // const resetForm = () => {
  //   setFormData({
  //     productName: "",
  //     description: "",
  //     sku: "",
  //     upc: "",
  //     slug: "",
  //     detailPrice: "",
  //     wholesalePrice: "",
  //     categories: [],
  //     brand: "",
  //     brandLogo: "",
  //     modelId: "",
  //     stock: "true",
  //   });
  //   setImageFiles([]);
  //   setPreviewImages([]);
  //   setSpecifications([{ key: "", value: "" }]);
  //   setSections([
  //     { id: "seccion_01", title: "", imageUrl: "" },
  //     { id: "seccion_02", title: "", imageUrl: "" },
  //   ]);
  //   setFichaDescriptiva({
  //     title: "",
  //     description: "",
  //     image: "",
  //   });
  // };

  const handleAddSpecification = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const handleSpecificationChange = (index, field, value) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index][field] = value;
    setSpecifications(updatedSpecs);
  };

  const handleSectionChange = async (index, field, value) => {
    const updatedSections = [...sections];
    if (field === "imageUrl" && value instanceof File) {
      const imageRef = ref(storage, `secciones/${formData.sku}/${value.name}`);
      await uploadBytes(imageRef, value);
      const imageUrl = await getDownloadURL(imageRef);
      updatedSections[index][field] = imageUrl;
    } else {
      updatedSections[index][field] = value;
    }
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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-7">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c8102e]">Catálogo TECPOINT</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Crear producto</h1><p className="mt-2 text-sm text-gray-600">Los productos incompletos se guardan como borrador y no se muestran al cliente.</p></div>
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

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

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
            name="searchAliases"
            placeholder="Variantes de búsqueda: cubo, cubito, cabeza…"
            onChange={(e) => setFormData((prev) => ({
              ...prev,
              searchAliases: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
            }))}
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
          <option value="Appacs">Appacs</option>
          <option value="Apple">Apple</option>
          <option value="Coast">Coast</option>
          <option value="Deken">Deken</option>
          <option value="Ghostek">Ghostek</option>
          <option value="Hoco">Hoco</option>
          <option value="Hypergear">Hypergear</option>
          <option value="Imilab">Imilab</option>
          <option value="Krieg">Krieg</option>
          <option value="Langsdom">Langsdom</option>
          <option value="Naztech">Naztech</option>
          <option value="Powerpeak">PowerPeak</option>
          <option value="Rock Space">Rock Space</option>
          <option value="Samsung">Samsung</option>
          <option value="USG">USG</option>
          <option value="XO">XO</option>
          <option value="XBase">XBase</option>
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
                onChange={(e) => handleSectionChange(index, "imageUrl", e.target.files[0])}
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
          disabled={submitting}
          className="rounded-xl bg-[#c8102e] px-5 py-3 font-bold text-white transition hover:bg-[#a90d26] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Guardando producto…" : "Guardar producto"}
        </button>
      </form>
    </div>
  );
}

export default Create;
