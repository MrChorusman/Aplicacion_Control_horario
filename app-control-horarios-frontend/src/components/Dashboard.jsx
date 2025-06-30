import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),
    data: null,
    loading: true,
    error: null
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [dashboardData.selectedMonth, dashboardData.selectedYear]);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));

      const { selectedMonth, selectedYear } = dashboardData;
      
      const response = await apiService.getForecast(selectedYear, selectedMonth);

      if (response.success) {
        setDashboardData(prev => ({
          ...prev,
          data: response.data,
          loading: false
        }));
      } else {
        setDashboardData(prev => ({
          ...prev,
          error: 'Error al cargar datos del dashboard',
          loading: false
        }));
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setDashboardData(prev => ({
        ...prev,
        error: 'Error al cargar datos del dashboard',
        loading: false
      }));
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Excelente': return 'status-excellent';
      case 'Bueno': return 'status-good';
      case 'Mejorable': return 'status-poor';
      default: return 'status-neutral';
    }
  };

  const getEfficiencyClass = (efficiency) => {
    if (efficiency >= 95) return 'efficiency-excellent';
    if (efficiency >= 85) return 'efficiency-good';
    return 'efficiency-poor';
  };

  const handleMonthChange = (month) => {
    setDashboardData(prev => ({ ...prev, selectedMonth: parseInt(month) }));
  };

  const handleYearChange = (year) => {
    setDashboardData(prev => ({ ...prev, selectedYear: parseInt(year) }));
  };

  const getMonthName = (month, year) => {
    return new Date(year, month - 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (dashboardData.loading) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '25px', 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '25px', 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="error-message">
          <h3>❌ Error</h3>
          <p>{dashboardData.error}</p>
          <button onClick={loadDashboardData} className="btn btn-primary">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { data } = dashboardData;
  const overallSummary = data?.overall_summary || {};
  const teams = data?.teams || [];

  // Crear lista de empleados de todos los equipos para el grid principal
  const allEmployees = [];
  teams.forEach(team => {
    if (team.employees) {
      team.employees.forEach(employee => {
        allEmployees.push({
          ...employee,
          team_name: team.team_name
        });
      });
    }
  });

  const selectedEmployee = allEmployees.find(emp => emp.employee_id === selectedEmployeeId);

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      padding: '25px', 
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* CABECERA */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>📊 Dashboard - {getMonthName(dashboardData.selectedMonth, dashboardData.selectedYear)}</h1>
          <div className="dashboard-controls">
            <select
              value={dashboardData.selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="dashboard-select"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
            
            <select
              value={dashboardData.selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="dashboard-select"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
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
    </div>
  );
};

export default Dashboard;

