import React, { useState } from 'react';
import EmployeeForm from './components/EmployeeForm';
import Calendar from './components/Calendar';
import Summary from './components/Summary';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'registro':
        return <EmployeeForm />;
      case 'calendario':
        return <Calendar />;
      case 'resumen':
        return <Summary />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Control de Horarios</h1>
        <p>Sistema de Gestión de Equipos</p>
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;

