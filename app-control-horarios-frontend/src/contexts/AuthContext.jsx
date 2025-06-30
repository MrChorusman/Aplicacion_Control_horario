import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiService } from '../services/api'; // Asegúrate que la ruta sea correcta

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(apiService.getUserInfo());
  const [token, setToken] = useState(apiService.getToken());
  const [isLoading, setIsLoading] = useState(false); // Para manejar estados de carga
  const [error, setError] = useState(null); // Para manejar errores de autenticación

  useEffect(() => {
    // Sincronizar estado si el token o usuario cambian fuera del contexto (ej. otra pestaña)
    const handleStorageChange = () => {
      setToken(apiService.getToken());
      setUser(apiService.getUserInfo());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: loggedInUser } = await apiService.login(email, password);
      setUser(loggedInUser);
      setToken(apiService.getToken()); // apiService ya guarda el token en localStorage
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setIsLoading(false);
      setUser(null);
      setToken(null);
      return false;
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.register(userData);
      // Podrías loguear automáticamente al usuario aquí o requerir login manual
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Error en el registro');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout(); // Llama al logout de la API (opcional si solo es limpiar token local)
    } catch (err) {
        console.warn("Error during API logout, proceeding with client-side logout:", err.message);
    } finally {
      setUser(null);
      setToken(null);
      apiService.setToken(null); // Asegurar que apiService también limpia su token interno
      apiService.setUserInfo(null);
      localStorage.removeItem('authToken'); // Doble seguridad
      localStorage.removeItem('userInfo');
      setIsLoading(false);
      // La redirección se manejará en el componente que llama a logout o en App.jsx
    }
  };

  const isAuthenticated = () => {
    // Podríamos añadir una verificación de expiración del token aquí si lo parseamos
    return !!token && !!user;
  };

  const hasRole = (roleName) => {
    return user && user.roles && user.roles.includes(roleName);
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    hasRole,
    setError // Para limpiar errores desde componentes
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
