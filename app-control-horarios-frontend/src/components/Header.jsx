import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SuperAdminPanel from './SuperAdminPanel';
import { Button } from './ui/button';

const Header = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutButtonRef = useRef(null);

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      setIsLoggingOut(true);
      try {
        await logout();
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  const handleAdminClick = () => {
    setShowAdminPanel(true);
  };

  const handleCloseAdminPanel = () => {
    setShowAdminPanel(false);
  };

  // Focus management para accesibilidad
  useEffect(() => {
    if (showAdminPanel) {
      // Enfocar el panel cuando se abra
      document.body.style.overflow = 'hidden'; // Prevenir scroll
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAdminPanel]);

  // Manejo de teclas para accesibilidad
  const handleKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <header 
      className="app-header" 
      role="banner"
      aria-label="Cabecera principal de la aplicación"
    >
      <div className="header-content">
        <h1 className="app-title">
          <span role="img" aria-label="calendario">📅</span>
          {' '}Control de Horarios
        </h1>
        
        {isAuthenticated() ? (
          <div className="user-info" role="region" aria-label="Información del usuario">
            <span className="user-greeting" aria-live="polite">
              Hola, <strong>{user?.full_name || user?.email}</strong>
            </span>
            
            {user?.roles?.length > 0 && (
              <span 
                className="user-roles" 
                aria-label={`Roles del usuario: ${user.roles.join(', ')}`}
              >
                ({user.roles.join(', ')})
              </span>
            )}
            
            <nav className="header-actions" aria-label="Acciones de usuario">
              <Button
                variant="warning"
                size="sm"
                onClick={handleAdminClick}
                onKeyDown={(e) => handleKeyDown(e, handleAdminClick)}
                aria-label="Abrir panel de administración"
                aria-describedby="admin-help"
              >
                <span role="img" aria-hidden="true">🛡️</span>
                {' '}Admin
              </Button>
              <span id="admin-help" className="sr-only">
                Abre el panel de administración en una ventana modal
              </span>
              
              <Button
                ref={logoutButtonRef}
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                onKeyDown={(e) => handleKeyDown(e, handleLogout)}
                loading={isLoggingOut}
                aria-label="Cerrar sesión"
                aria-describedby="logout-help"
              >
                <span role="img" aria-hidden="true">🚪</span>
                {' '}Salir
              </Button>
              <span id="logout-help" className="sr-only">
                Cierra tu sesión y regresa a la página de inicio de sesión
              </span>
            </nav>
          </div>
        ) : (
          <div className="login-prompt">
            <Button
              variant="success"
              onClick={() => window.location.href = '/login'}
              onKeyDown={(e) => handleKeyDown(e, () => window.location.href = '/login')}
              aria-label="Ir a la página de inicio de sesión"
            >
              <span role="img" aria-hidden="true">🔐</span>
              {' '}Iniciar Sesión
            </Button>
          </div>
        )}
      </div>

      {/* Panel de administración */}
      {showAdminPanel && (
        <SuperAdminPanel onClose={handleCloseAdminPanel} />
      )}

      <style jsx>{`
        .app-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .app-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .user-greeting {
          font-size: 16px;
          font-weight: 500;
        }
        
        .user-roles {
          font-size: 14px;
          opacity: 0.8;
          font-style: italic;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
        }
        
        .admin-btn, .logout-btn, .login-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .admin-btn {
          background-color: #ff9800;
          color: white;
        }
        
        .admin-btn:hover {
          background-color: #f57c00;
          transform: translateY(-1px);
        }
        
        .logout-btn {
          background-color: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }
        
        .logout-btn:hover {
          background-color: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }
        
        .login-btn {
          background-color: #4caf50;
          color: white;
        }
        
        .login-btn:hover {
          background-color: #45a049;
          transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
          }
          
          .app-title {
            font-size: 20px;
          }
          
          .user-info {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
