import React, { createContext, useContext, useCallback, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success", ttl = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => remove(id), ttl);
  }, [remove]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm w-full px-4 py-2 rounded-lg shadow text-sm flex items-start justify-between gap-3 transition transform`}
          >
            <div className={`flex-1 ${t.type === "error" ? "bg-red-50 border border-red-200 text-red-800" : t.type === "info" ? "bg-blue-50 border border-blue-200 text-blue-800" : "bg-emerald-50 border border-emerald-200 text-emerald-800"} rounded p-3`}> 
              {t.message}
            </div>
            <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export default ToastProvider;
