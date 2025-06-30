import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EmployeeForm from './components/EmployeeForm';
import Calendar from './components/Calendar';
import Summary from './components/Summary';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
// import RegisterPage from './components/RegisterPage'; // Descomentar si se implementa
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const AppLayout = () => {
  const { isAuthenticated, logout, user, hasRole } = useAuth();

  return (
    <div className="App">
      <header className="app-header">
        <h1>Control de Horarios</h1>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <p>Sistema de Gestión de Equipos</p>
          {isAuthenticated() && (
            <div style={{ marginRight: '20px' }}>
              <span style={{ color: 'white', marginRight: '10px' }}>Hola, {user?.email} ({user?.roles?.join(', ') || 'user'})</span>
              <button onClick={logout} style={{padding: '5px 10px'}}>Logout</button>
            </div>
          )}
        </div>
      </header>
      
      <div className="app-container">
        {isAuthenticated() && (
          <nav className="sidebar">
            <ul>
              <li><Link to="/">📊 Dashboard</Link></li>
              {/* Proteger ruta de Registro Empleado para admins */}
              {hasRole('admin') && (
                <li><Link to="/registro">👤 Registro Empleado</Link></li>
              )}
              <li><Link to="/calendario">📅 Calendario</Link></li>
              <li><Link to="/resumen">📋 Resumen Datos</Link></li>
            </ul>

            <div className="legend">
              <h3>Leyenda de Actividades</h3>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#c8e6c9'}}></span>V - Vacaciones</div>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#fff9c4'}}></span>F - Ausencia</div>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#81c784'}}></span>HLD - Horas Libre Disposición</div>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#ffcc80'}}></span>G - Guardia</div>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#e1bee7'}}></span>V! - Formación/Evento</div>
              <div className="legend-item"><span className="color-box" style={{backgroundColor: '#bbdefb'}}></span>C - Permiso/Otro</div>
            </div>
          </nav>
        )}
        
        <main className="main-content">
          <Outlet /> {/* Aquí se renderizarán las rutas anidadas */}
        </main>
      </div>
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

          {/* Rutas Protegidas anidadas bajo AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} /> {/* Ruta por defecto (Dashboard) */}
            <Route
              path="registro"
              element={
                <ProtectedRoute rolesAllowed={['admin']}> {/* Solo admin puede acceder */}
                  <EmployeeForm />
                </ProtectedRoute>
              }
            />
            <Route path="calendario" element={<Calendar />} />
            <Route path="resumen" element={<Summary />} />
            {/* Otras rutas protegidas aquí */}
          </Route>

          {/* Ruta catch-all o página 404 si es necesario */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

