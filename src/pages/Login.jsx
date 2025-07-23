// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Para redireccionar
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Para el método de inicio de sesión
import { LogIn } from 'lucide-react'; // Un icono para el botón

// Componentes básicos para LoginPage (puedes usar tus propios Button y Card)
const Button = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50
      bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className}`}>
    {children}
  </div>
);
// --- FIN COMPONENTES BÁSICOS ---

function LoginPage() {
  const { signInWithGoogle } = useAuth(); // Obtén la función de login del contexto
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/'); // Redirige a la página principal después del login exitoso
    } catch (err) {
      console.error("Error during Google sign in:", err.message);
      setError("Error al iniciar sesión con Google. Por favor, inténtalo de nuevo.");
      // Puedes añadir más detalles del error si `err` tiene un `code` específico de Firebase
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="p-8 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Welcome</h2>
        <p className="text-gray-600 mb-8">Sign in to access your projects.</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-3 text-lg"
        >
          {loading ? (
            'Signing in...'
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Sign in with Google</span>
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}

export default LoginPage;