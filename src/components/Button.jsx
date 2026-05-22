import React from "react";

export default function Button({ children, className = "", variant = "primary", ...props }) {
  const base = "px-4 py-2 rounded-md font-medium focus:outline-none disabled:opacity-60";
  const variantClasses =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200";

  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
