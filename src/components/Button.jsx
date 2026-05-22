import React from "react";

export default function Button({ children, className = "", variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium focus:outline-none disabled:opacity-60";

  const variantClasses =
    variant === "primary"
      ? "px-3 py-1 bg-blue-600 text-white hover:bg-blue-700"
      : variant === "ghost"
      ? "px-2 py-1 bg-transparent text-blue-600 hover:bg-gray-50 border border-transparent hover:border-gray-200"
      : "px-3 py-1 bg-gray-100 text-gray-800 hover:bg-gray-200";

  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
