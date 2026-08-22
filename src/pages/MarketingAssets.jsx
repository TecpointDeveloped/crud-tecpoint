 
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Film, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { db, storage } from "../firebaseConfig";

const blank = {
  type: "site_banners",
  mediaType: "image",
  title: "",
  subtitle: "",
  linkUrl: "",
  cta: "Ver más",
  alt: "",
  active: true,
  sortOrder: 0,
};

export default function MarketingAssets() {
  const [form, setForm] = useState(blank);
  const [desktop, setDesktop] = useState(null);
  const [mobile, setMobile] = useState(null);
  const [poster, setPoster] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const groups = await Promise.all(["site_banners", "flash_promotions"].map(async (type) => {
        const snapshot = await getDocs(collection(db, type));
        return snapshot.docs.map((item) => ({ id: item.id, type, ...item.data() }));
      }));
      setItems(groups.flat().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch {
      setError("No fue posible cargar los banners y promociones.");
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (file, suffix) => {
    if (!file) return "";
    const safeName = file.name.replace(/[^a-z0-9.]+/gi, "-");
    const fileRef = ref(storage, `marketing/${form.type}/${Date.now()}-${suffix}-${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
  };

  const validateImage = (file, kind) => new Promise((resolve, reject) => {
    if (!file) return resolve();
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      const valid = kind === "desktop"
        ? image.naturalWidth >= 1600 && image.naturalWidth / image.naturalHeight >= 2.2
        : kind === "mobile"
          ? image.naturalWidth >= 900 && image.naturalHeight >= 1100
          : image.naturalWidth >= 1200;
      valid ? resolve() : reject(new Error(
        kind === "desktop"
          ? "El banner de escritorio debe medir al menos 1600 px de ancho y ser horizontal."
          : kind === "mobile"
            ? "La imagen móvil debe medir al menos 900 × 1100 px."
            : "El póster del video debe medir al menos 1200 px de ancho.",
      ));
    };
    image.onerror = () => reject(new Error("No fue posible leer la imagen seleccionada."));
    image.src = URL.createObjectURL(file);
  });

  const validateVideo = (file) => {
    if (!file) return;
    if (!/^video\/(mp4|webm)$/i.test(file.type)) throw new Error("Use video MP4 o WebM.");
    if (file.size > 40 * 1024 * 1024) throw new Error("Cada video debe pesar menos de 40 MB para mantener rápida la página.");
  };

  const reset = () => {
    setForm(blank);
    setDesktop(null);
    setMobile(null);
    setPoster(null);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const current = form.id ? items.find((item) => item.id === form.id && item.type === form.type) : null;
      const cleanLink = form.linkUrl.trim();
      if (cleanLink && !cleanLink.startsWith("/") && !/^https:\/\//i.test(cleanLink)) {
        throw new Error("El enlace debe comenzar con / o usar una dirección https:// completa.");
      }
      let imageUrl = current?.imageUrl || "";
      let mobileImageUrl = current?.mobileImageUrl || "";
      let videoUrl = current?.videoUrl || "";
      let mobileVideoUrl = current?.mobileVideoUrl || "";
      let posterUrl = current?.posterUrl || "";

      if (form.mediaType === "video") {
        validateVideo(desktop);
        validateVideo(mobile);
        await validateImage(poster, "poster");
        videoUrl = desktop ? await upload(desktop, "video-desktop") : videoUrl;
        mobileVideoUrl = mobile ? await upload(mobile, "video-mobile") : mobileVideoUrl;
        posterUrl = poster ? await upload(poster, "poster") : posterUrl || imageUrl;
        if (!videoUrl) throw new Error("El video de escritorio es obligatorio.");
      } else {
        await validateImage(desktop, "desktop");
        await validateImage(mobile, "mobile");
        imageUrl = desktop ? await upload(desktop, "desktop") : imageUrl;
        mobileImageUrl = mobile ? await upload(mobile, "mobile") : mobileImageUrl;
        if (!imageUrl) throw new Error("La imagen de escritorio es obligatoria.");
      }

      const payload = {
        mediaType: form.mediaType,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        linkUrl: cleanLink,
        cta: form.cta.trim(),
        alt: form.alt.trim() || form.title.trim(),
        active: Boolean(form.active),
        sortOrder: Number(form.sortOrder || 0),
        imageUrl,
        mobileImageUrl,
        videoUrl,
        mobileVideoUrl,
        posterUrl,
        updatedAt: serverTimestamp(),
      };
      if (form.id) await updateDoc(doc(db, form.type, form.id), payload);
      else await addDoc(collection(db, form.type), { ...payload, createdAt: serverTimestamp() });
      reset();
      await load();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setForm({ ...blank, ...item, mediaType: item.mediaType || (item.videoUrl ? "video" : "image") });
    setDesktop(null); setMobile(null); setPoster(null);
  };
  const remove = async (item) => {
    if (!confirm(`¿Eliminar “${item.title}”?`)) return;
    try {
      await deleteDoc(doc(db, item.type, item.id));
      await load();
    } catch {
      setError("No fue posible eliminar el contenido. Inténtelo nuevamente.");
    }
  };

  const isVideo = form.mediaType === "video";
  return <div className="space-y-7">
    <header>
      <p className="text-xs font-bold tracking-[.2em] text-red-600">CONTENIDO DEL SITIO</p>
      <h1 className="text-3xl font-bold">Banners, videos y promociones</h1>
      <p className="mt-2 max-w-3xl text-gray-600">Publique piezas adaptadas a escritorio y celular. Los videos se reproducen sin sonido y deben ser breves y livianos.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Ubicación" value={form.type} onChange={type => setForm({ ...form, type, id: undefined })} options={[["site_banners", "Banner de inicio"], ["flash_promotions", "Promoción flash"]]} />
          <Select label="Formato" value={form.mediaType} onChange={mediaType => setForm({ ...form, mediaType })} options={[["image", "Imagen"], ["video", "Video"]]} />
        </div>
        <Field label="Título" value={form.title} onChange={title => setForm({ ...form, title })} required />
        <Field label="Texto secundario" value={form.subtitle} onChange={subtitle => setForm({ ...form, subtitle })} />
        <Field label="Texto del botón" value={form.cta} onChange={cta => setForm({ ...form, cta })} />
        <Field label="Enlace del botón" value={form.linkUrl} onChange={linkUrl => setForm({ ...form, linkUrl })} placeholder="/shop o https://…" />
        <Field label="Texto alternativo" value={form.alt} onChange={alt => setForm({ ...form, alt })} />

        <FileField label={isVideo ? "Video de escritorio" : "Imagen de escritorio"} note={isVideo ? "MP4/WebM, máximo 40 MB; recomendado 1920×640" : "Recomendado 1920×600"} accept={isVideo ? "video/mp4,video/webm" : "image/*"} onChange={setDesktop} />
        <FileField label={isVideo ? "Video móvil" : "Imagen móvil"} note={isVideo ? "Opcional; vertical, máximo 40 MB" : "Recomendado 1080×1350"} accept={isVideo ? "video/mp4,video/webm" : "image/*"} onChange={setMobile} />
        {isVideo && <FileField label="Póster del video" note="Imagen que se muestra mientras carga" accept="image/*" onChange={setPoster} />}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Activo</label>
          <label className="text-sm font-semibold">Orden <input type="number" value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: event.target.value })} className="ml-2 w-20 rounded border p-2" /></label>
        </div>
        <button disabled={saving} className="w-full rounded-xl bg-[#c8102e] px-5 py-3 font-bold text-white transition hover:bg-[#9e0d25] disabled:opacity-50">{saving ? "Guardando…" : form.id ? "Guardar cambios" : "Publicar contenido"}</button>
        {form.id && <button type="button" onClick={reset} className="w-full rounded-xl border px-5 py-3 font-bold">Cancelar edición</button>}
      </form>

      <div className="grid content-start gap-4 md:grid-cols-2">{items.map(item => {
        const video = item.mediaType === "video" || Boolean(item.videoUrl);
        return <article key={`${item.type}-${item.id}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="relative aspect-[16/7] bg-gray-100">
            {video && item.videoUrl ? <video src={item.videoUrl} poster={item.posterUrl || item.imageUrl} muted playsInline controls className="h-full w-full object-cover" /> : item.imageUrl ? <img src={item.imageUrl} alt={item.alt || item.title} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center">{video ? <Film /> : <ImagePlus />}</div>}
            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${item.active !== false ? "bg-emerald-600 text-white" : "bg-gray-200"}`}>{item.active !== false ? "Activo" : "Inactivo"}</span>
          </div>
          <div className="p-4"><small className="font-bold uppercase tracking-wider text-red-600">{item.type === "site_banners" ? "Banner" : "Flash"} · {video ? "Video" : "Imagen"}</small><h2 className="mt-1 text-xl font-bold">{item.title}</h2><p className="mt-1 text-sm text-gray-500">{item.subtitle}</p><div className="mt-4 flex gap-2"><button onClick={() => edit(item)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold"><Pencil size={15} /> Editar</button><button onClick={() => remove(item)} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700"><Trash2 size={15} /> Eliminar</button></div></div>
        </article>;
      })}</div>
    </div>
  </div>;
}

function Field({ label, value, onChange, ...props }) { return <label className="block text-sm font-semibold">{label}<input value={value || ""} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" {...props} /></label>; }
function Select({ label, value, onChange, options }) { return <label className="block text-sm font-semibold">{label}<select value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal">{options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>; }
function FileField({ label, note, accept, onChange }) { return <label className="block text-sm font-semibold">{label} <small className="font-normal text-gray-500">({note})</small><input type="file" accept={accept} onChange={event => onChange(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border p-3 font-normal" /></label>; }
