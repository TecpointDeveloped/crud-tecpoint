import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function LoginPage() {
  const { currentUser, signInWithGoogle, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  useEffect(() => {
    if (window.location.hostname === "127.0.0.1") {
      window.location.replace(`${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (currentUser) navigate("/", { replace: true });
  }, [currentUser, navigate]);

  const messageFor = (errorCode) => ({
    "auth/invalid-credential": "El correo o la contraseña no coinciden.",
    "auth/invalid-email": "Revise el formato del correo electrónico.",
    "auth/too-many-requests": "El acceso fue pausado por varios intentos. Espere unos minutos.",
    "auth/user-disabled": "Esta cuenta está desactivada. Contacte al administrador.",
    "auth/access-denied": "Esta cuenta no está autorizada para administrar TECPOINT.",
    "auth/unauthorized-domain": "Este dominio todavía no está autorizado en Firebase.",
    "auth/popup-closed-by-user": "La ventana de Google se cerró antes de terminar.",
    "auth/network-request-failed": "No pudimos conectar con Google. Revise su conexión.",
  }[errorCode] || "No pudimos iniciar sesión. Inténtelo nuevamente.");

  const handlePassword = async (event) => {
    event.preventDefault();
    setLoading("password"); setError("");
    try {
      const user = await signInWithPassword(email, password);
      if (user) navigate("/");
    } catch (caught) {
      setError(messageFor(caught.code));
    } finally { setLoading(""); }
  };

  const handleGoogle = async () => {
    setLoading("google"); setError("");
    try {
      const user = await signInWithGoogle();
      if (user) navigate("/");
    } catch (caught) {
      setError(messageFor(caught.code));
    } finally { setLoading(""); }
  };

  return <main className="grid min-h-screen bg-[#f3f5f6] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-[#111817] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[70px] border-[#c8102e] opacity-90" />
      <div className="relative z-10 flex items-center gap-3"><img src="/brand/logo-reserva.svg" alt="TECPOINT" width="230" height="48" className="h-12 max-w-[230px] object-contain object-left" /></div>
      <div className="relative z-10 max-w-xl"><p className="text-xs font-bold tracking-[.22em] text-[#ef233c]">ADMINISTRACIÓN SEGURA</p><h1 className="mt-4 text-6xl font-semibold leading-[.95] tracking-[-.055em]">Todo TECPOINT, en un solo lugar.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-gray-300">Gestione catálogo, calidad, banners, videos, ubicaciones e integraciones con una experiencia clara y ordenada.</p></div>
      <div className="relative z-10 flex items-center gap-3 text-sm text-gray-400"><ShieldCheck className="text-[#ef233c]" /> Acceso exclusivo para personal autorizado.</div>
    </section>

    <section className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_24px_80px_rgba(17,24,23,.08)] sm:p-10">
        <div className="mb-8 flex items-center gap-3 lg:hidden"><img src="/brand/isologo.svg" alt="" width="44" height="44" className="h-11 w-11 rounded-xl" /><strong className="text-xl">TECPOINT</strong></div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#c8102e]">Panel administrativo</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] text-[#111817]">Bienvenido.</h2>
        <p className="mt-3 leading-7 text-gray-600">Ingrese con la cuenta asignada. Sus cambios quedarán registrados en Firebase.</p>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800" role="alert">{error}</div>}

        <form onSubmit={handlePassword} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold text-gray-800">Correo electrónico<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required className="mt-2 h-14 w-full rounded-xl border border-gray-300 px-4 font-normal outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-50" placeholder="nombre@tecpoint.ws" /></label>
          <label className="block text-sm font-semibold text-gray-800">Contraseña<span className="relative mt-2 flex"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required className="h-14 w-full rounded-xl border border-gray-300 px-4 pr-12 font-normal outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-50" placeholder="⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-lg text-gray-500 hover:bg-gray-100">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
          <button disabled={Boolean(loading)} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#111817] px-5 font-bold text-white transition hover:bg-[#c8102e] disabled:opacity-60"><LogIn size={18} />{loading === "password" ? "Verificando⬦" : "Iniciar sesión"}</button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-400 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200">O</div>
        <button type="button" onClick={handleGoogle} disabled={Boolean(loading)} className="h-14 w-full rounded-xl border border-gray-300 bg-white font-semibold text-gray-800 transition hover:border-gray-500 hover:bg-gray-50 disabled:opacity-60">{loading === "google" ? "Conectando⬦" : "Continuar con Google"}</button>
        <p className="mt-7 text-center text-xs leading-5 text-gray-500">Si necesita recuperar o cambiar una contraseña, solicítelo al administrador de Firebase.</p>
      </div>
    </section>
  </main>;
}

export default LoginPage;
