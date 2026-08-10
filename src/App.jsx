import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import Button from './components/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './components/Card';
import { Tabs, TabsList, TabsTrigger } from './components/Tabs';

import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from './components/PrivateRoute.jsx';

const CreatePage = lazy(() => import('./pages/Create'));
const UpdatePage = lazy(() => import('./pages/Update'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Projects = lazy(() => import('./pages/Proyects'));
const LoginPage = lazy(() => import('./pages/Login'));
const ProductQuality = lazy(() => import('./pages/ProductQuality'));
const MarketingAssets = lazy(() => import('./pages/MarketingAssets'));
const SiteSettings = lazy(() => import('./pages/SiteSettings'));

// Importa db y las funciones de Firestore
import { db } from './firebaseConfig.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import {
  Home, Plus, FileText, MoreHorizontal, PlusCircle, Pencil, LogOut,
  UserCircle2, Package, Tag, Users, BadgeCheck, Images, Settings2, Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChartComponent = () => (
  <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-md text-gray-400 border border-dashed border-gray-300">
    Placeholder para el gráfico de visitantes
  </div>
);

// --- DashboardHome MODIFICADO ---
const DashboardHome = () => {
  const [activeTab, setActiveTab] = useState('outline');
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBrands: 0,
    totalUsers: 0, // Suponiendo que cada documento en 'Users' es un usuario único
    totalProjects: 0, // Puedes reutilizar el conteo de proyectos
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  const [integrations, setIntegrations] = useState({ meta: false, analytics: false, searchConsole: false });

  const fetchDashboardStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorStats(null);
    try {
      // Fetch Products Count
      const productsCollectionRef = collection(db, "Products"); // Cambia "Products" si tu colección se llama diferente
      const productsSnapshot = await getDocs(productsCollectionRef);
      const totalProducts = productsSnapshot.size;

      // Fetch Brands Count
      const brandsCollectionRef = collection(db, "Brands"); // Cambia "Brands" si tu colección se llama diferente
      const brandsSnapshot = await getDocs(brandsCollectionRef);
      const totalBrands = brandsSnapshot.size;

      // Fetch Users Count (desde una colección 'Users' si la tienes, si no, puedes enlazar con la Cloud Function de Auth)
      // Para propósitos de este ejemplo, asumiré una colección 'Users'.
      // Si quieres el conteo exacto de Firebase Auth, necesitarías otra Cloud Function
      // que te devuelva solo el conteo de usuarios de Auth, o modificar listAllUsers.
      const usersCollectionRef = collection(db, "Users"); // Cambia "Users" si tu colección de usuarios es diferente o no existe
      const usersSnapshot = await getDocs(usersCollectionRef);
      const totalUsers = usersSnapshot.size;

      // Fetch Projects Count (ya que tienes una tabla de proyectos, puedes contarlos aquí también)
      const projectsCollectionRef = collection(db, "Projects");
      const projectsSnapshot = await getDocs(projectsCollectionRef);
      const totalProjects = projectsSnapshot.size;
      const settingsSnapshot = await getDoc(doc(db, "site_settings", "general")).catch(() => null);
      const settings = settingsSnapshot?.exists() ? settingsSnapshot.data() : {};
      setIntegrations({
        meta: Boolean(settings.metaPixelId),
        analytics: Boolean(settings.gaMeasurementId),
        searchConsole: Boolean(settings.googleSiteVerification),
      });


      setStats({
        totalProducts,
        totalBrands,
        totalUsers,
        totalProjects,
      });

    } catch (err) {
      console.error("Error al cargar estadísticas del dashboard:", err);
      setErrorStats("No se pudieron cargar las estadísticas. Inténtalo de nuevo.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);


  return (
    <>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard Overview</h1> {/* Título más genérico */}
        <Link to="/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Quick Create</span>
          </Button>
        </Link>
      </header>

      {loadingStats && <p className="text-center text-gray-600 mb-8">Cargando estadísticas del dashboard...</p>}
      {errorStats && <p className="text-center text-red-600 mb-8">Error: {errorStats}</p>}

      {!loadingStats && !errorStats && (
        <Link to="/configuracion" className="mb-6 grid gap-3 rounded-xl border border-red-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Integraciones del sitio</p><h2 className="mt-1 text-xl font-bold">Meta Pixel, Analytics y Search Console</h2></div>
          <div className="flex flex-wrap gap-2">{[["Meta Pixel",integrations.meta],["GA4",integrations.analytics],["Search Console",integrations.searchConsole]].map(([label,active])=><span key={label} className={`rounded-full px-3 py-1 text-xs font-bold ${active?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}>{label}: {active?"activo":"pendiente"}</span>)}</div>
        </Link>
      )}

      {!loadingStats && !errorStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
              <Package className="w-4 h-4 text-blue-500" /> {/* Icono de paquete */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
              <p className="text-xs text-gray-500 mt-1">Items disponibles en inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Brands</CardTitle>
              <Tag className="w-4 h-4 text-purple-500" /> {/* Icono de etiqueta/marca */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalBrands}</div>
              <p className="text-xs text-gray-500 mt-1">Marcas registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Registered Users</CardTitle>
              <Users className="w-4 h-4 text-green-500" /> {/* Icono de usuarios */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Usuarios registrados en la plataforma</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Projects</CardTitle>
              <FileText className="w-4 h-4 text-orange-500" /> {/* Icono de proyectos */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <p className="text-xs text-gray-500 mt-1">Proyectos documentados</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-gray-800">Total Visitors</CardTitle>
            <CardDescription className="text-gray-500">Total for the last 3 months</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">Last 3 months</Button>
            <Button variant="default" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Last 30 days</Button>
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">Last 7 days</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChartComponent />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-md shadow-sm border border-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow">
          <TabsList className="bg-gray-100 p-1 rounded-md">
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="past-performance">Past Performance <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">3</span></TabsTrigger>
            <TabsTrigger value="key-personnel">Key Personnel <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">2</span></TabsTrigger>
            <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex space-x-2 ml-0 sm:ml-4 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">Customize Columns</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </Button>
        </div>
      </div>
    </>
  );
};

// --- RESTO DEL CÓDIGO (SIN CAMBIOS) ---
const SidebarContent = ({ onNavigate }) => {
  const { currentUser, logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  };

  return (
    <>
      <div className="text-xl font-bold mb-8 text-gray-800">Tecpoint</div>
      <nav className="space-y-2 flex-grow overflow-y-auto pb-4">
        <NavItem onNavigate={onNavigate} to="/" icon={<Home className="w-5 h-5" />} text="Dashboard" />
        <NavItem onNavigate={onNavigate} to="/configuracion" icon={<Settings2 className="w-5 h-5" />} text="Integraciones y contacto" />
        <NavItem onNavigate={onNavigate} to="/projects" icon={<FileText className="w-5 h-5" />} text="Reporte" />

        <div className="font-semibold text-sm mt-6 mb-2 text-gray-500 uppercase tracking-wider pt-4 border-t border-gray-100">Productos</div>
        <NavItem onNavigate={onNavigate} to="/create" icon={<PlusCircle className="w-5 h-5" />} text="Crear" />
        <NavItem onNavigate={onNavigate} to="/update" icon={<Pencil className="w-5 h-5" />} text="Actualizar" />
        <NavItem onNavigate={onNavigate} to="/calidad" icon={<BadgeCheck className="w-5 h-5" />} text="Calidad y duplicados" />
        <div className="font-semibold text-sm mt-6 mb-2 text-gray-500 uppercase tracking-wider pt-4 border-t border-gray-100">Contenido web</div>
        <NavItem onNavigate={onNavigate} to="/contenido" icon={<Images className="w-5 h-5" />} text="Banners, videos y promociones" />
        <NavItem onNavigate={onNavigate} to="/more" icon={<MoreHorizontal className="w-5 h-5" />} text="Más" />
      </nav>
      {currentUser && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 p-2">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="User Avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <UserCircle2 className="h-8 w-8 text-gray-400" />
            )}
            <div className="flex-grow">
              <p className="text-sm font-medium text-gray-800">{currentUser.displayName || "Usuario"}</p>
              <p className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">{currentUser.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 p-1 rounded-md transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="grid min-h-screen place-items-center bg-gray-50 text-sm font-semibold text-gray-600">Cargando panel TECPOINT...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
};

const DashboardLayout = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  return (
    <div className="relative min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
        <strong className="text-lg tracking-tight">TECPOINT · ADMIN</strong>
        <button type="button" onClick={() => setMobileMenu(true)} aria-label="Abrir menú" className="grid h-11 w-11 place-items-center rounded-xl border"><Menu /></button>
      </header>
      {mobileMenu && <button type="button" className="fixed inset-0 z-40 bg-black/45 lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)} />}
      <aside className={`fixed left-0 top-0 z-50 flex h-full w-[min(86vw,280px)] flex-col border-r bg-white p-4 shadow-xl transition-transform lg:w-64 lg:translate-x-0 lg:shadow-sm ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <button type="button" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl border lg:hidden"><X /></button>
        <SidebarContent onNavigate={() => setMobileMenu(false)} />
      </aside>

      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/update" element={<UpdatePage />} />
          <Route path="/calidad" element={<ProductQuality />} />
          <Route path="/contenido" element={<MarketingAssets />} />
          <Route path="/configuracion" element={<SiteSettings />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/lifecycle" element={<h2 className="text-2xl font-bold p-6">Lifecycle Page</h2>} />
          <Route path="/analytics" element={<h2 className="text-2xl font-bold p-6">Analytics Page</h2>} />
          <Route path="/data-library" element={<h2 className="text-2xl font-bold p-6">Data Library Page</h2>} />
          <Route path="/reports" element={<h2 className="text-2xl font-bold p-6">Reports Page</h2>} />
          <Route path="/word-assistant" element={<h2 className="text-2xl font-bold p-6">Word Assistant Page</h2>} />
          <Route path="/team" element={<h2 className="text-2xl font-bold p-6">Team Page</h2>} />
          <Route path="/more" element={<h2 className="text-2xl font-bold p-6">More Page</h2>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const NavItem = ({ to, icon, text, onNavigate }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center space-x-2 p-2 rounded-md transition-colors
        ${isActive ? 'bg-red-50 text-[#b5122f] font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
};

export default App;
