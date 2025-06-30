import React, { useState, useEffect } from 'react';

const Summary = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadYearlyData();
    }
  }, [selectedEmployee, selectedYear]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedEmployee(data.data[0]);
        }
      } else {
        setError('Error al cargar empleados');
      }
    } catch (err) {
      setError('Error de conexión al cargar empleados');
    } finally {
      setLoading(false); // <-- Añade esto aquí
    }
  };

  const loadYearlyData = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`📊 Cargando datos anuales para ${selectedEmployee.full_name} - ${selectedYear}`);

      // Cargar datos de todos los meses del año para calcular totales
      const monthlyPromises = [];
      for (let month = 1; month <= 12; month++) {
        monthlyPromises.push(
          fetch(`http://localhost:5002/api/forecast/employee/${selectedEmployee.id}/${selectedYear}/${month}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
      }

      const monthlyResults = await Promise.all(monthlyPromises);
      const validMonths = monthlyResults.filter(result => result && result.success);

      if (validMonths.length === 0) {
        setError('No se pudieron cargar los datos del empleado');
        return;
      }

      // Calcular totales anuales
      let totalTheoreticalHours = 0;
      let totalActualHours = 0;
      let totalIndraHours = 0;
      let totalInditexHours = 0;
      let totalVacationDays = 0;
      let totalAbsenceDays = 0;
      let totalHldHours = 0;
      let totalGuardHours = 0;

      validMonths.forEach(monthData => {
        const data = monthData.data;
        totalTheoreticalHours += data.theoretical_hours || 0;
        totalActualHours += data.actual_hours || 0;
        totalIndraHours += data.indra_hours || 0;
        totalInditexHours += data.inditex_hours || 0;
        totalVacationDays += data.vacation_days_month || 0;
        totalAbsenceDays += data.absence_days_month || 0;
        totalHldHours += data.hld_hours_month || 0;
        totalGuardHours += data.guard_hours_month || 0;
      });

      // Calcular vacaciones restantes
      const vacationDaysTotal = selectedEmployee.vacation_days || 22;
      const vacationDaysRemaining = Math.max(0, vacationDaysTotal - totalVacationDays);

      // Calcular HLD restantes
      const hldHoursTotal = selectedEmployee.free_hours || 40;
      const hldHoursRemaining = Math.max(0, hldHoursTotal - totalHldHours);

      // Calcular eficiencia anual
      const efficiencyPercentage = totalTheoreticalHours > 0 
        ? (totalActualHours / totalTheoreticalHours * 100) 
        : 0;

      const yearlyData = {
        employee: selectedEmployee,
        year: selectedYear,
        totalTheoreticalHours: Math.round(totalTheoreticalHours * 10) / 10,
        totalActualHours: Math.round(totalActualHours * 10) / 10,
        totalIndraHours: Math.round(totalIndraHours * 10) / 10,
        totalInditexHours: Math.round(totalInditexHours * 10) / 10,
        efficiencyPercentage: Math.round(efficiencyPercentage * 10) / 10,
        
        // Vacaciones
        vacationDaysTotal,
        vacationDaysUsed: totalVacationDays,
        vacationDaysRemaining,
        
        // HLD
        hldHoursTotal,
        hldHoursUsed: Math.round(totalHldHours * 10) / 10,
        hldHoursRemaining: Math.round(hldHoursRemaining * 10) / 10,
        
        // Guardias
        totalGuardHours: Math.round(totalGuardHours * 10) / 10,
        
        // Estado
        efficiencyStatus: efficiencyPercentage >= 95 ? 'Excelente' : 
                         efficiencyPercentage >= 85 ? 'Bueno' : 'Mejorable',
        vacationAlert: vacationDaysRemaining < 5,
        hldAlert: hldHoursRemaining < 10
      };

      console.log('✅ Datos anuales calculados:', yearlyData);
      setYearlyData(yearlyData);

    } catch (err) {
      console.error('❌ Error loading yearly data:', err);
      setError('Error al cargar datos anuales');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#666',
        width: '100%'
      }}>
        📊 Cargando resumen anual...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8d7da', 
        color: '#721c24', 
        borderRadius: '8px',
        margin: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        ❌ Error: {error}
        <br />
        <button 
          onClick={loadYearlyData}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (!loading && employees.length === 0) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderRadius: '8px',
        margin: '20px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'center',
        fontSize: '18px'
      }}>
        ⚠️ No hay empleados registrados para mostrar el resumen anual.
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      padding: '25px', 
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div className="summary-header">
        <h2>📊 Resumen Anual Individual - {selectedYear}</h2>
        
        <div className="summary-controls">
          <select
            value={selectedEmployee?.id || ''}
            onChange={(e) => {
              const employee = employees.find(emp => emp.id === parseInt(e.target.value));
              setSelectedEmployee(employee);
            }}
          >
            <option value="">Seleccionar empleado...</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.team_name})
              </option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {yearlyData && (
        <>
          {/* Información del empleado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '25px',
            width: '100%'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem' }}>
                👤 Información del Empleado
              </h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                <div><strong>Nombre:</strong> {yearlyData.employee.full_name}</div>
                <div><strong>Equipo:</strong> {yearlyData.employee.team_name}</div>
                <div><strong>Horas L-J:</strong> {yearlyData.employee.hours_mon_thu}h</div>
                <div><strong>Horas Viernes:</strong> {yearlyData.employee.hours_fri}h</div>
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: yearlyData.efficiencyPercentage >= 95 ? '#d4edda' : 
                             yearlyData.efficiencyPercentage >= 85 ? '#fff3cd' : '#f8d7da',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem' }}>
                📈 Eficiencia Anual
              </h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                {yearlyData.efficiencyPercentage}%
              </div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                Estado: <strong>{yearlyData.efficiencyStatus}</strong>
              </div>
            </div>
          </div>

          {/* Resumen de horas anuales */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '25px',
            width: '100%'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>⏰ Horas Teóricas</h4>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>
                {yearlyData.totalTheoreticalHours}h
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>✅ Horas Reales</h4>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#388e3c' }}>
                {yearlyData.totalActualHours}h
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>🏢 Horas INDRA</h4>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f57c00' }}>
                {yearlyData.totalIndraHours}h
              </div>
              <div style={{ fontSize: '12px', color: '#333' }}>60% horas reales</div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#fce4ec',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#c2185b' }}>🏪 Horas INDITEX</h4>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c2185b' }}>
                {yearlyData.totalInditexHours}h
              </div>
              <div style={{ fontSize: '12px', color: '#333' }}>40% período 26-25</div>
            </div>
          </div>

          {/* Vacaciones y permisos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '25px',
            width: '100%'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#c8e6c9',
              borderRadius: '8px',
              border: yearlyData.vacationAlert ? '2px solid #f44336' : '1px solid #4caf50'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#2e7d32', fontSize: '1.1rem' }}>
                🏖️ Vacaciones Anuales
                {yearlyData.vacationAlert && <span style={{ color: '#f44336' }}> ⚠️</span>}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{yearlyData.vacationDaysTotal}</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Total</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f44336' }}>{yearlyData.vacationDaysUsed}</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Usadas</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4caf50' }}>{yearlyData.vacationDaysRemaining}</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Restantes</div>
                </div>
              </div>
              {yearlyData.vacationAlert && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#f44336', fontWeight: 'bold' }}>
                  ⚠️ Quedan pocas vacaciones disponibles
                </div>
              )}
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#fff9c4',
              borderRadius: '8px',
              border: yearlyData.hldAlert ? '2px solid #f44336' : '1px solid #fbc02d'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#f57f17', fontSize: '1.1rem' }}>
                ⏰ Horas Libre Disposición
                {yearlyData.hldAlert && <span style={{ color: '#f44336' }}> ⚠️</span>}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{yearlyData.hldHoursTotal}h</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Total</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f44336' }}>{yearlyData.hldHoursUsed}h</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Usadas</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4caf50' }}>{yearlyData.hldHoursRemaining}h</div>
                  <div style={{ fontSize: '12px', color: '#333' }}>Restantes</div>
                </div>
              </div>
              {yearlyData.hldAlert && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#f44336', fontWeight: 'bold' }}>
                  ⚠️ Quedan pocas horas de libre disposición
                </div>
              )}
            </div>
          </div>

          {/* Guardias */}
          <div style={{
            padding: '20px',
            backgroundColor: '#e1f5fe',
            borderRadius: '8px',
            marginBottom: '25px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0277bd', fontSize: '1.1rem' }}>
              🛡️ Guardias Realizadas
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0277bd' }}>
                  {yearlyData.totalGuardHours}h
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>Horas totales de guardia</div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            width: '100%',
            boxSizing: 'border-box',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={loadYearlyData}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 Actualizar Datos
            </button>
            
            <button 
              onClick={() => window.print()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🖨️ Imprimir Resumen
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Summary;

