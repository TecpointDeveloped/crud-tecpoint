import Create from "./pages/Create";
import Update from "./pages/Update";

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
      uploadedImages[`imagen_0${imageIndex}`] = {
        id: `${sku}_0${imageIndex}`,
        img: imageUrl,
      };
    }
    return uploadedImages;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // if (!validateForm()) return;

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
      });

      alert("¡Producto subido con éxito!");
      // resetForm();
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
    <div>
      {/* <Create /> */}
      <Update />
    </div>
  );
}

export default App;