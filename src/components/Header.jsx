import React from "react";

export default function Header({ selected, onNavigate }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">TP</div>
          <div>
            <h1 className="text-lg font-semibold">TecPoint Admin</h1>
            <p className="text-sm text-gray-500">Gestión de productos</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("create")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              selected === "create"
                ? "bg-blue-600 text-white"
                : "text-blue-600 border border-blue-100 hover:bg-blue-50"
            }`}
          >
            Crear
          </button>
          <button
            onClick={() => onNavigate("update")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              selected === "update"
                ? "bg-blue-600 text-white"
                : "text-blue-600 border border-blue-100 hover:bg-blue-50"
            }`}
          >
            Editar
          </button>
        </nav>
      </div>
    </header>
  );
}
