import { useState } from "react";
import Create from "./pages/Create";
import Update from "./pages/Update";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ToastProvider } from "./components/Toast";

function App() {
  const [selected, setSelected] = useState("create");

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <Header selected={selected} onNavigate={setSelected} />

        <main className="container mx-auto px-4 py-8">
          {selected === "create" ? <Create /> : <Update />}
        </main>

        <Footer />
      </div>
    </ToastProvider>
  );
}

export default App;