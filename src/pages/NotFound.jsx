import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center px-4 text-center">
      <div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#c8102e]">Error 404</p><h2 className="mt-2 text-3xl font-bold">Esta sección no existe.</h2><p className="mt-3 text-gray-600">Regrese al panel para continuar administrando TECPOINT.</p><Link to="/" className="mt-6 inline-block rounded-xl bg-[#111817] px-5 py-3 font-bold text-white hover:bg-[#c8102e]">Volver al panel</Link></div>
    </div>
  )
}

export default NotFound
