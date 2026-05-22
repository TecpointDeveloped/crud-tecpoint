import React from "react";

export default function Footer() {
  return (
    <footer className="mt-8 py-6 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} TecPoint
    </footer>
  );
}
