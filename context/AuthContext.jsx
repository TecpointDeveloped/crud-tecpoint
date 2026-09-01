/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../src/firebaseConfig'; // Importa tu instancia de auth
import { onAuthStateChanged, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();
const AUTHORIZED_EMAIL = 'tecpointdistribucion2@gmail.com';

const isAuthorized = (user) => user?.email?.toLowerCase() === AUTHORIZED_EMAIL;

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user && isAuthorized(user)) {
          setCurrentUser(user);
        } else {
          if (user) await signOut(auth);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("No fue posible validar la sesión administrativa:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión con Google
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      if (!isAuthorized(result.user)) {
        await signOut(auth);
        const accessError = new Error('Esta cuenta no está autorizada para administrar TECPOINT.');
        accessError.code = 'auth/access-denied';
        throw accessError;
      }
      return result.user;
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error.message);
      throw error; // Propagar el error para manejarlo en el componente de Login
    }
  };

  const signInWithPassword = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!isAuthorized(result.user)) {
      await signOut(auth);
      const accessError = new Error('Esta cuenta no está autorizada para administrar TECPOINT.');
      accessError.code = 'auth/access-denied';
      throw accessError;
    }
    return result.user;
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error.message);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
