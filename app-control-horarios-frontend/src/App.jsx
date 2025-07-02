import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EmployeeForm from './components/EmployeeForm';
import Calendar from './components/Calendar';
import Summary from './components/Summary';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPasswordModal from './components/AdminPasswordModal';
import './App.css';

// Layout principal con navegación lateral y modal admin
const AppLayout = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Puedes agregar lógica para roles aquí si lo necesitas
  const handleAdminValidated = () => {
    setShowAdminModal(false);
    setCurrentView('admin');
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Control de Horarios</h1>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <p>Sistema de Gestión de Equipos</p>
          {isAuthenticated && (
            <div style={{ marginRight: '20px' }}>
              <span style={{ color: 'white', marginRight: '10px' }}>Hola, {user?.email} ({user?.roles?.join(', ') || 'user'})</span>
              <button onClick={logout} style={{padding: '5px 10px'}}>Logout</button>
            </div>
          )}
        </div>
      </header>
      <div className="app-container">
        <nav className="sidebar">
          <ul>
            <li 
              className={currentView === 'dashboard' ? 'active' : ''}
              onClick={() => setCurrentView('dashboard')}
            >
              📊 Dashboard
            </li>
            <li 
              className={currentView === 'registro' ? 'active' : ''}
              onClick={() => setCurrentView('registro')}
            >
              👤 Registro Empleado
            </li>
            <li 
              className={currentView === 'calendario' ? 'active' : ''}
              onClick={() => setCurrentView('calendario')}
            >
              📅 Calendario
            </li>
            <li 
              className={currentView === 'resumen' ? 'active' : ''}
              onClick={() => setCurrentView('resumen')}
            >
              📋 Resumen Datos
            </li>
          </ul>
          <div className="legend">
            <h3>Leyenda de Actividades</h3>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#c8e6c9'}}></span>
              V - Vacaciones
            </div>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#fff9c4'}}></span>
              F - Ausencia
            </div>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#81c784'}}></span>
              HLD - Horas Libre Disposición
            </div>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#ffcc80'}}></span>
              G - Guardia
            </div>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#e1bee7'}}></span>
              V! - Formación/Evento
            </div>
            <div className="legend-item">
              <span className="color-box" style={{backgroundColor: '#bbdefb'}}></span>
              C - Permiso/Otro
            </div>
          </div>
        </nav>
        <main className="main-content">
          {/* Renderiza el contenido según la vista seleccionada */}
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'registro' && <EmployeeForm />}
          {currentView === 'calendario' && <Calendar />}
          {currentView === 'resumen' && <Summary />}
          {/* Si usas rutas anidadas, puedes usar <Outlet /> aquí */}
        </main>
      </div>
      {/* Modal de contraseña de administrador */}
      <AdminPasswordModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onValidate={handleAdminValidated}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* <Route path="/register" element={<RegisterPage />} /> */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
          {/* Ruta catch-all o página 404 si es necesario */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

