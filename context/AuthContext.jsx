import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../src/firebaseConfig'; // Importa tu instancia de auth
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Efecto para escuchar cambios en el estado de autenticación de Firebase
  // y manejar localStorage.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario logueado, guarda en localStorage
        console.log("Usuario autenticado (onAuthStateChanged):", user.uid);
        localStorage.setItem('firebaseUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
        setCurrentUser(user);
      } else {
        // No hay usuario logueado, elimina de localStorage
        console.log("No hay usuario autenticado (onAuthStateChanged).");
        localStorage.removeItem('firebaseUser');
        setCurrentUser(null);
      }
      setLoading(false); // La carga inicial ha terminado
    });

    // Cargar usuario desde localStorage al inicio (si existe)
    const storedUser = localStorage.getItem('firebaseUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user from localStorage:", e);
        localStorage.removeItem('firebaseUser');
      }
    } else {
        setLoading(false); // Si no hay nada en localStorage, terminamos la carga
    }


    // Limpiar el listener al desmontar el componente
    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión con Google
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // El usuario ya se establecerá por onAuthStateChanged
      console.log("Inicio de sesión con Google exitoso:", result.user.uid);
      return result.user; // Opcional, puedes devolver el usuario si lo necesitas inmediatamente
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error.message);
      throw error; // Propagar el error para manejarlo en el componente de Login
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
      console.log("Sesión cerrada.");
      // onAuthStateChanged se encargará de actualizar el estado y localStorage
    } catch (error) {
      console.error("Error al cerrar sesión:", error.message);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Renderiza los children solo después de cargar */}
    </AuthContext.Provider>
  );
};