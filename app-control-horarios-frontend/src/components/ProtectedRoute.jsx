import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, rolesAllowed }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Si todavía estamos cargando el estado de autenticación, podríamos mostrar un spinner
  // Pero por ahora, si no está autenticado y no está cargando, redirigimos.
  // Esto evita redirigir prematuramente si el estado de auth se carga de localStorage.
  // Una mejor aproximación sería tener un estado "authLoading" o "isInitialized" en AuthContext.
  // Por simplicidad, si isLoading es true (ej. durante un login activo), no hacemos nada aún.

  // Si el contexto todavía no ha determinado si está autenticado (ej. user es null y no hay token)
  // y no estamos en medio de un proceso de login (isLoading es false)
  if (!isLoading && !isAuthenticated()) {
    // Redirigir al login, guardando la ubicación actual para volver después
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se especifican roles y el usuario no tiene ninguno de los roles permitidos
  if (rolesAllowed && rolesAllowed.length > 0) {
    const userHasRequiredRole = user && user.roles && user.roles.some(role => rolesAllowed.includes(role));
    if (!userHasRequiredRole) {
      // Redirigir a una página de "No Autorizado" o de vuelta al dashboard
      // Por ahora, redirigimos al dashboard (o a '/')
      // En una app real, sería mejor una página de error 403 dedicada.
      console.warn(`Acceso denegado para ${user?.email}. Roles requeridos: ${rolesAllowed.join(', ')}. Roles del usuario: ${user?.roles?.join(', ')}`);
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
