import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ApiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { LoadingSpinner, LoadingCard, LoadingTable } from './ui/loading-spinner';
import { ErrorBoundary } from './ui/error-boundary';
import { useAsync } from '../hooks/useAsync';

const api = new ApiService();

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  // Estados para eliminación de empleado
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');
  
  // Usar el nuevo contexto de autenticación
  const { user, hasRole } = useAuth();

  // Función memoizada para cargar datos
  const loadDashboardData = useCallback(async () => {
    const response = await api.getForecast(selectedYear, selectedMonth);
    if (!response.success) {
      throw new Error(response.message || 'Error al cargar datos del dashboard');
    }
    return response.data;
  }, [selectedYear, selectedMonth]);

  // Hook personalizado para manejar el estado async
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error, 
    retry 
  } = useAsync(loadDashboardData, true, [selectedYear, selectedMonth]);

  // Datos memoizados para optimizar renders
  const overallSummary = useMemo(() => 
    dashboardData?.overall_summary || {}, [dashboardData]);
  
  const teams = useMemo(() => 
    dashboardData?.teams || [], [dashboardData]);

  // Lista de empleados memoizada
  const allEmployees = useMemo(() => {
    const employees = [];
    teams.forEach(team => {
      if (team.employees) {
        team.employees.forEach(employee => {
          employees.push({
            ...employee,
            team_name: team.team_name
          });
        });
      }
    });
    return employees;
  }, [teams]);

  const selectedEmployee = useMemo(() => 
    allEmployees.find(emp => emp.employee_id === selectedEmployeeId), 
    [allEmployees, selectedEmployeeId]);

  // Opciones para los selects memoizadas
  const monthOptions = useMemo(() => 
    Array.from({length: 12}, (_, i) => ({
      value: i + 1,
      label: new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })
    })), []);
  
  const yearOptions = useMemo(() => [
    { value: 2024, label: '2024' },
    { value: 2025, label: '2025' }
  ], []);

  const employeeOptions = useMemo(() => [
    { value: '', label: '-- Selecciona --' },
    ...allEmployees.map(emp => ({
      value: emp.employee_id,
      label: emp.full_name
    }))
  ], [allEmployees]);

  // Funciones auxiliares memoizadas
  const getStatusClass = useCallback((status) => {
    switch (status) {
      case 'Excelente': return 'status-excellent';
      case 'Bueno': return 'status-good';
      case 'Mejorable': return 'status-poor';
      default: return 'status-neutral';
    }
  }, []);

  const getEfficiencyClass = useCallback((efficiency) => {
    if (efficiency >= 95) return 'efficiency-excellent';
    if (efficiency >= 85) return 'efficiency-good';
    return 'efficiency-poor';
  }, []);

  // Handlers memoizados
  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(parseInt(e.target.value));
  }, []);

  const handleYearChange = useCallback((e) => {
    setSelectedYear(parseInt(e.target.value));
  }, []);

  const handleEmployeeSelect = useCallback((e) => {
    setSelectedEmployeeId(Number(e.target.value) || null);
  }, []);

  const getMonthName = useCallback((month, year) => {
    return new Date(year, month - 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  }, []);

  // Funciones de eliminación de empleado memoizadas
  const handleDeleteClick = useCallback((employeeId, employeeName) => {
    // Verificar permisos de administrador o manager
    if (!hasRole('admin') && !hasRole('manager')) {
      alert('❌ No tienes permisos para eliminar empleados');
      return;
    }
    
    setPendingDeleteId(employeeId);
    setPendingDeleteName(employeeName);
    setShowConfirmModal(true);
  }, [hasRole]);

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDeleteId) {
      try {
        const response = await api.deleteEmployee(pendingDeleteId);
        if (response.success) {
          // Recargar datos del dashboard
          retry();
          alert('✅ Empleado eliminado correctamente');
        } else {
          alert('❌ Error al eliminar empleado: ' + (response.message || 'Error desconocido'));
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('❌ Error de conexión al eliminar empleado');
      } finally {
        setPendingDeleteId(null);
        setPendingDeleteName('');
        setShowConfirmModal(false);
      }
    }
  }, [pendingDeleteId, retry]);

  const handleCloseModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingDeleteId(null);
    setPendingDeleteName('');
  }, []);

  // Estados de carga y error optimizados
  if (isLoading) {
    return (
      <div 
        className="bg-white rounded-lg p-6 shadow-md w-full"
        role="status"
        aria-live="polite"
        aria-label="Cargando dashboard"
      >
        <LoadingSpinner 
          size="lg" 
          message="Cargando datos del dashboard..." 
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div 
        className="bg-white rounded-lg p-6 shadow-md w-full"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-error">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar el dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Ocurrió un error inesperado'}
          </p>
          <Button 
            variant="primary" 
            onClick={retry}
            aria-label="Reintentar carga de datos"
          >
            🔄 Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // JSX principal del Dashboard
  return (
    <ErrorBoundary>
      <div 
        className="bg-white rounded-lg p-6 shadow-md w-full"
        role="main"
        aria-label="Dashboard principal"
      >
        {/* CABECERA */}
        <header className="dashboard-header">
          <div className="dashboard-title">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span role="img" aria-label="estadísticas">📊</span>
              Dashboard - {getMonthName(selectedMonth, selectedYear)}
            </h1>
            <div className="dashboard-controls" role="group" aria-label="Controles de fecha">
              <Select
                value={selectedMonth}
                onChange={handleMonthChange}
                options={monthOptions}
                aria-label="Seleccionar mes"
                className="min-w-40"
              />
              
              <Select
                value={selectedYear}
                onChange={handleYearChange}
                options={yearOptions}
                aria-label="Seleccionar año"
                className="min-w-24"
              />
            </div>
          </div>

        <div className="dashboard-summary-cards">
          {/* Cuadro 1: Horas Teóricas */}
          <div className="dashboard-card">
            <h3>⏰ Horas Teóricas del Mes</h3>
            <div className="card-metrics">
              <div className="metric-row">
                <span className="metric-label">Horas Teóricas INDRA:</span>
                <span className="metric-value indra-hours">
                  {selectedEmployee
                    ? (selectedEmployee.theoretical_indra_hours?.toFixed(1) || '0.0')
                    : (overallSummary.total_theoretical_indra?.toFixed(1) || '0.0')
                  }h
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Horas Teóricas INDITEX:</span>
                <span className="metric-value inditex-hours">
                  {selectedEmployee
                    ? (selectedEmployee.theoretical_inditex_hours?.toFixed(1) || '0.0')
                    : (overallSummary.total_theoretical_inditex?.toFixed(1) || '0.0')
                  }h
                </span>
              </div>
            </div>
          </div>          
          {/* Cuadro 2: Información del Período */}
          <div className="dashboard-card">
            <h3>📅 Información del Período</h3>
            <div className="card-metrics">
              <div className="metric-row">
                <span className="metric-label">Días Laborables:</span>
                <span className="metric-value">{overallSummary.working_days || 'N/A'}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Total Empleados:</span>
                <span className="metric-value">{overallSummary.total_employees || 0}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Equipos Activos:</span>
                <span className="metric-value">{overallSummary.active_teams || 0}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Eficiencia Global:</span>
                <span className={`metric-value ${getEfficiencyClass(overallSummary.overall_efficiency || 0)}`}>
                  {overallSummary.overall_efficiency?.toFixed(1) || '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="dashboard-main-grid">
        <h2>👥 Detalle por Empleado</h2>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="employee-select" className="employee-cell" style={{ marginRight: 8 }}>Selecciona un empleado:</label>
          <select
            id="employee-select"
            value={selectedEmployeeId || ''}
            onChange={e => setSelectedEmployeeId(Number(e.target.value))}
            className="dashboard-select"
          >
            <option value="">-- Selecciona --</option>
            {allEmployees.map(emp => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </div>
        
        {allEmployees.length > 0 ? (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>EQUIPO</th>
                  <th>EMPLEADO</th>
                  <th>HORAS REALES INDITEX</th>
                  <th>HORAS REALES INDRA</th>
                  <th>EFICIENCIA</th>
                  <th>ESTADO</th>
                  <th>CIUDAD/LOCALIDAD</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {allEmployees.map((employee, index) => (
                  <tr key={`${employee.employee_id}-${index}`}>
                    <td className="team-cell">{employee.team_name}</td>
                    <td className="employee-cell">{employee.full_name}</td>
                    <td className="hours-cell inditex-hours">
                      {employee.worked_inditex_hours?.toFixed(1) || '0.0'}h
                    </td>
                    <td className="hours-cell indra-hours">
                      {employee.worked_indra_hours?.toFixed(1) || '0.0'}h
                    </td>
                    <td className={`efficiency-cell ${getEfficiencyClass(employee.efficiency_percentage || 0)}`}>
                      {employee.efficiency_percentage?.toFixed(1) || '0.0'}%
                    </td>
                    <td className={`status-cell ${getStatusClass(employee.status)}`}>
                      {employee.status || 'N/A'}
                    </td>
                    <td className="city-cell">{employee.city_name || 'N/A'}</td>
                    <td className="actions-cell">
                      {(hasRole('admin') || hasRole('manager')) && (
                        <button
                          onClick={() => handleDeleteClick(employee.employee_id, employee.full_name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc3545',
                            fontSize: '1.2em',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          title="Eliminar empleado"
                          onMouseOver={(e) => e.target.style.backgroundColor = '#f8d7da'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          🗑️
                        </button>
                      )}
                      {!hasRole('admin') && !hasRole('manager') && (
                        <span style={{ color: '#6c757d', fontSize: '0.9em' }}>
                          Sin permisos
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-employees">
            <p>No hay empleados registrados para mostrar.</p>
            <button onClick={loadDashboardData} className="btn btn-primary">
              🔄 Actualizar
            </button>
          </div>
        )}
      </div>

      {/* RESUMEN POR EQUIPOS */}
      {teams.length > 0 && (
        <div className="dashboard-teams-summary">
          <h2>🏢 Resumen por Equipos</h2>
          <div className="teams-grid">
            {teams.map((team, index) => (
              <div key={index} className="team-summary-card">
                <h3>{team.team_name}</h3>
                <div className="team-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Empleados:</span>
                    <span className="metric-value">{team.employee_count}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">H. Reales INDRA:</span>
                    <span className="metric-value indra-hours">
                      {team.total_worked_indra?.toFixed(1) || '0.0'}h
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">H. Reales INDITEX:</span>
                    <span className="metric-value inditex-hours">
                      {team.total_worked_inditex?.toFixed(1) || '0.0'}h
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Eficiencia:</span>
                    <span className={`metric-value ${getEfficiencyClass(team.efficiency_percentage || 0)}`}>
                      {team.efficiency_percentage?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Estado:</span>
                    <span className={`metric-value ${getStatusClass(team.status)}`}>
                      {team.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACCIONES RÁPIDAS */}
      <div className="dashboard-actions">
        <button 
          onClick={loadDashboardData}
          className="btn btn-primary"
        >
          🔄 Actualizar Dashboard
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
        >
          📊 Recargar Página
        </button>
      </div>

      {/* HORAS TEÓRICAS DEL EMPLEADO SELECCIONADO */}
      {selectedEmployee && (
        <div className="dashboard-card" style={{ marginBottom: '16px' }}>
          <h3>⏰ Horas Teóricas del Mes (Empleado Seleccionado)</h3>
          <div className="card-metrics">
            <div className="metric-row">
              <span className="metric-label">Horas Teóricas INDRA:</span>
              <span className="metric-value indra-hours">
                {selectedEmployee.theoretical_indra_hours?.toFixed(1) || '0.0'}h
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Horas Teóricas INDITEX:</span>
              <span className="metric-value inditex-hours">
                {selectedEmployee.theoretical_inditex_hours?.toFixed(1) || '0.0'}h
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODALES */}
      <ConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        message={`¿Estás seguro de que deseas eliminar al empleado "${pendingDeleteName}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default Dashboard;

