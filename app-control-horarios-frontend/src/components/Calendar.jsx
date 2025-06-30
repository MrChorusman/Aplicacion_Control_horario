import React, { useState, useEffect } from 'react';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoursDialog, setHoursDialog] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthName = currentDate.toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric' 
  });

  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    loadCalendarData();
  }, [year, month]);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📅 Cargando datos del calendario para ${year}/${month}...`);
      
      // Cargar empleados
      console.log('👥 Cargando empleados...');
      const employeesResponse = await fetch('http://localhost:5002/api/employees');
      if (!employeesResponse.ok) {
        throw new Error(`Error al cargar empleados: ${employeesResponse.status}`);
      }
      const employeesData = await employeesResponse.json();
      console.log('✅ Empleados cargados:', employeesData.data?.length || 0);
      setEmployees(Array.isArray(employeesData.data) ? employeesData.data : []);

      // Cargar datos del calendario
      console.log('📋 Cargando datos del calendario...');
      const calendarResponse = await fetch(`http://localhost:5002/api/calendar/${year}/${month}`);
      if (!calendarResponse.ok) {
        throw new Error(`Error al cargar calendario: ${calendarResponse.status}`);
      }
      const calendarDataResponse = await calendarResponse.json();
      console.log('✅ Datos del calendario cargados:', Object.keys(calendarDataResponse.data || {}).length, 'empleados');
      setCalendarData(calendarDataResponse.data || {});

      // Cargar festivos individuales para cada empleado según su comunidad autónoma
      console.log('🎉 Cargando festivos por empleado...');
      
      const employeeHolidays = {};
      
      for (const employee of (Array.isArray(employeesData.data) ? employeesData.data : [])) {
        // USAR employee.id (no employee.employee_id) para consistencia con el renderizado
        const employeeId = employee.id;
        const community = employee.autonomous_community;
        
        console.log(`🔍 DEBUG: Empleado ${employee.full_name}`);
        console.log(`   employee.id: ${employee.id}`);
        console.log(`   employee.employee_id: ${employee.employee_id}`);
        console.log(`   Usando como clave: ${employeeId}`);
        
        if (!community || community.trim() === '') {
          console.log(`⚠️ Empleado ${employee.full_name} sin comunidad autónoma`);
          employeeHolidays[employeeId] = [];
          continue;
        }
        
        try {
          console.log(`🏛️ Cargando festivos para ${employee.full_name} (${community})...`);
          
          // Cargar festivos nacionales y de la comunidad específica del empleado
          const employeeHolidaysResponse = await fetch(
            `http://localhost:5002/api/holidays/${year}/${month}?community=${encodeURIComponent(community)}`
          );
          
          if (employeeHolidaysResponse.ok) {
            const employeeHolidaysData = await employeeHolidaysResponse.json();
            const holidaysList = employeeHolidaysData.data?.holidays || [];
            
            employeeHolidays[employeeId] = holidaysList;
            console.log(`✅ Festivos para ${employee.full_name} (ID: ${employeeId}): ${holidaysList.length}`);
            
            // Debug: mostrar festivos específicos
            holidaysList.forEach(holiday => {
              console.log(`   - ${holiday.date}: ${holiday.name} (${holiday.autonomous_community || 'Nacional'})`);
            });
          } else {
            console.warn(`⚠️ Error cargando festivos para ${employee.full_name}`);
            employeeHolidays[employeeId] = [];
          }
        } catch (err) {
          console.warn(`⚠️ Error cargando festivos para ${employee.full_name}:`, err);
          employeeHolidays[employeeId] = [];
        }
      }
      
      console.log('✅ Festivos por empleado cargados:', Object.keys(employeeHolidays).length);
      console.log('🔍 DEBUG: Claves en employeeHolidays:', Object.keys(employeeHolidays));
      setHolidays(employeeHolidays); // Ahora holidays es un objeto con festivos por empleado

    } catch (err) {
      console.error('❌ Error loading calendar data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDayOfWeek = (day) => {
    try {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      return days[dayOfWeek] || 'L';
    } catch (e) {
      return 'L';
    }
  };

  const isWeekend = (day) => {
    try {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    } catch (e) {
      return false;
    }
  };

  const isHoliday = (day, employeeId) => {
    try {
      // Verificar que holidays sea un objeto válido y que el empleado tenga festivos
      if (!holidays || typeof holidays !== 'object' || !employeeId) {
        return false;
      }
      
      const employeeHolidays = holidays[employeeId] || [];
      
      if (!Array.isArray(employeeHolidays) || employeeHolidays.length === 0) {
        return false;
      }
      
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const isHol = employeeHolidays.some(holiday => {
        if (!holiday || !holiday.date) return false;
        // Comparar tanto con formato YYYY-MM-DD como con solo la fecha
        return holiday.date === dateStr || holiday.date?.startsWith(dateStr);
      });
      
      // Debug específico para mayo 2025
      if (month === 5 && (day === 1 || day === 2 || day === 15 || day === 17)) {
        console.log(`🔍 DEBUG isHoliday: día ${day}, empleado ${employeeId}`);
        console.log(`   Fecha buscada: ${dateStr}`);
        console.log(`   Festivos del empleado:`, employeeHolidays.map(h => h.date));
        console.log(`   ¿Es festivo?: ${isHol}`);
      }
      
      return isHol;
    } catch (e) {
      console.error('❌ Error checking holiday:', e);
      return false;
    }
  };

  const getEmployeeEntry = (employeeId, day) => {
    try {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const employeeEntries = calendarData[employeeId] || [];
      return employeeEntries.find(entry => entry.date === dateStr);
    } catch (e) {
      return null;
    }
  };

  const getCellStyle = (entry, day, employeeId) => {
    const baseStyle = {
      padding: '8px 4px',
      minHeight: '40px',
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: 'bold',
      border: '1px solid #ddd',
      cursor: 'pointer',
      verticalAlign: 'middle'
    };

    try {
      // FESTIVOS - PRIORIDAD MÁXIMA (fondo rojo) - ESPECÍFICO POR EMPLEADO
      const isEmployeeHoliday = isHoliday(day, employeeId);
      
      // Debug específico para mayo 2025
      if (month === 5 && (day === 1 || day === 2 || day === 15 || day === 17)) {
        console.log(`🎨 DEBUG getCellStyle: día ${day}, empleado ${employeeId}`);
        console.log(`   ¿Es festivo?: ${isEmployeeHoliday}`);
        if (isEmployeeHoliday) {
          console.log(`   ✅ APLICANDO ESTILO ROJO`);
        }
      }
      
      if (isEmployeeHoliday) {
        return { 
          ...baseStyle, 
          backgroundColor: '#ffcdd2', 
          color: '#000',
          cursor: 'default'
        };
      }
      
      // FINES DE SEMANA (fondo gris)
      if (isWeekend(day)) {
        return { 
          ...baseStyle, 
          backgroundColor: '#f5f5f5', 
          color: '#999', 
          cursor: 'default' 
        };
      }

      // DÍAS CON ACTIVIDADES
      if (entry) {
        switch (entry.activity_type) {
          case 'V': // Vacaciones - verde claro
            return { ...baseStyle, backgroundColor: '#c8e6c9', color: '#000' };
          case 'F': // Ausencias - amarillo
            return { ...baseStyle, backgroundColor: '#fff9c4', color: '#000' };
          case 'HLD': // Horas Libre Disposición - verde oscuro
            return { ...baseStyle, backgroundColor: '#4caf50', color: '#fff' };
          case 'G': // Guardia - azul claro
            return { ...baseStyle, backgroundColor: '#e1f5fe', color: '#000' };
          case 'V!': // Formación/Evento - morado
            return { ...baseStyle, backgroundColor: '#e1bee7', color: '#000' };
          case 'C': // Permiso/Otro - azul claro
            return { ...baseStyle, backgroundColor: '#bbdefb', color: '#000' };
          default:
            return { ...baseStyle, backgroundColor: '#fff', color: '#000' };
        }
      }

      // DÍAS LABORABLES VACÍOS (fondo blanco)
      return { ...baseStyle, backgroundColor: '#fff', color: '#000' };
      
    } catch (e) {
      return { ...baseStyle, backgroundColor: '#fff', color: '#000' };
    }
  };

  const getCellContent = (entry, day) => {
    try {
      // Festivos y fines de semana no muestran contenido
      if (isHoliday(day) || isWeekend(day)) {
        return '';
      }

      if (!entry) {
        return '';
      }

      switch (entry.activity_type) {
        case 'V':
          return 'V';
        case 'F':
          return 'F';
        case 'HLD':
          return `HLD -${entry.hours || 0}h`;
        case 'G':
          return `G +${entry.hours || 0}h`;
        case 'V!':
          return 'V!';
        case 'C':
          return 'C';
        default:
          return '';
      }
    } catch (e) {
      return '';
    }
  };

  const handleCellRightClick = (e, employeeId, day) => {
    e.preventDefault();
    e.stopPropagation();
    
    // No permitir menú en festivos o fines de semana - ESPECÍFICO POR EMPLEADO
    if (isHoliday(day, employeeId) || isWeekend(day)) {
      return;
    }

    console.log(`🖱️ Clic derecho en empleado ${employeeId}, día ${day}`);

    setSelectedCell({ employeeId, day });
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      employeeId,
      day
    });
  };

  const handleContextMenuOption = async (activityType) => {
    if (!selectedCell) return;

    console.log(`✅ Actividad seleccionada: ${activityType}`);

    // Para HLD y Guardia, mostrar dialog para horas
    if (activityType === 'HLD' || activityType === 'G') {
      setHoursDialog({
        type: activityType,
        employeeId: selectedCell.employeeId,
        day: selectedCell.day
      });
      setContextMenu(null);
      return;
    }

    // Para otras actividades, crear entrada directamente
    await createOrUpdateEntry(selectedCell.employeeId, selectedCell.day, activityType);
    setContextMenu(null);
    setSelectedCell(null);
  };

  const createOrUpdateEntry = async (employeeId, day, activityType, hours = null) => {
    try {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const payload = {
        employee_id: employeeId,
        date: dateStr,
        activity_type: activityType,
        hours: hours
      };

      console.log('📝 Creando entrada:', payload);

      const response = await fetch('http://localhost:5002/api/calendar/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Entrada creada exitosamente:', result);
        await loadCalendarData(); // Recargar datos
      } else {
        const errorData = await response.json();
        console.error('❌ Error creating entry:', errorData);
        alert('Error al crear la entrada: ' + (errorData.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('Error de conexión al crear la entrada');
    }
  };

  const handleHoursSubmit = (hours) => {
    if (hoursDialog && hours > 0) {
      createOrUpdateEntry(
        hoursDialog.employeeId,
        hoursDialog.day,
        hoursDialog.type,
        hours
      );
    }
    setHoursDialog(null);
    setSelectedCell(null);
  };

  const deleteEntry = async () => {
    if (!selectedCell) return;

    try {
      const entry = getEmployeeEntry(selectedCell.employeeId, selectedCell.day);
      if (entry && entry.id) {
        console.log('🗑️ Eliminando entrada:', entry.id);
        
        const response = await fetch(`http://localhost:5002/api/calendar/entry/${entry.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('✅ Entrada eliminada exitosamente');
          await loadCalendarData(); // Recargar datos
        } else {
          const errorData = await response.json();
          console.error('❌ Error deleting entry:', errorData);
          alert('Error al eliminar la entrada: ' + (errorData.message || 'Error desconocido'));
        }
      } else {
        console.log('ℹ️ No hay entrada para eliminar');
      }
    } catch (error) {
      console.error('❌ Error deleting entry:', error);
      alert('Error de conexión al eliminar la entrada');
    }

    setContextMenu(null);
    setSelectedCell(null);
  };

  const getEmployeeSummary = (employeeId) => {
    try {
      const entries = calendarData[employeeId] || [];
      const vacationDays = entries.filter(e => e.activity_type === 'V').length;
      const absenceDays = entries.filter(e => e.activity_type === 'F').length;
      return { vacationDays, absenceDays };
    } catch (e) {
      return { vacationDays: 0, absenceDays: 0 };
    }
  };

  // Agrupar empleados por equipo
  const getEmployeesByTeam = () => {
    try {
      if (!Array.isArray(employees)) {
        return {};
      }
      
      return employees.reduce((acc, employee) => {
        if (!acc[employee.team_name]) {
          acc[employee.team_name] = [];
        }
        acc[employee.team_name].push(employee);
        return acc;
      }, {});
    } catch (e) {
      return {};
    }
  };

  const employeesByTeam = getEmployeesByTeam();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#666'
      }}>
        📅 Cargando calendario...
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
        margin: '20px'
      }}>
        ❌ Error: {error}
        <br />
        <button 
          onClick={loadCalendarData}
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

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      padding: '25px', 
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header del calendario */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '25px', 
        padding: '20px', 
        background: 'linear-gradient(135deg, #667eea, #764ba2)', 
        color: 'white', 
        borderRadius: '8px' 
      }}>
        <button 
          onClick={() => navigateMonth(-1)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Anterior
        </button>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.5rem', 
          fontWeight: '600', 
          textTransform: 'capitalize' 
        }}>
          📅 {monthName}
        </h3>
        <button 
          onClick={() => navigateMonth(1)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Siguiente →
        </button>
      </div>

      {/* Tabla del calendario */}
      <div style={{ 
        overflowX: 'auto', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        width: '100%'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse'
          // minWidth: '1200px' eliminado para que la tabla sea 100% responsive
        }}>
          <thead>
            <tr>
              <th style={{ 
                backgroundColor: '#667eea', 
                color: 'white', 
                padding: '12px 8px', 
                minWidth: '120px',
                fontWeight: 'bold',
                border: '1px solid #ddd'
              }}>
                Equipo
              </th>
              <th style={{ 
                backgroundColor: '#667eea', 
                color: 'white', 
                padding: '12px 8px', 
                minWidth: '120px',
                fontWeight: 'bold',
                border: '1px solid #ddd'
              }}>
                Empleado
              </th>
              <th style={{ 
                backgroundColor: '#c8e6c9', 
                color: '#000', 
                padding: '12px 8px', 
                minWidth: '80px',
                fontWeight: 'bold',
                border: '1px solid #ddd'
              }}>
                Días Vacaciones
              </th>
              <th style={{ 
                backgroundColor: '#fff9c4', 
                color: '#000', 
                padding: '12px 8px', 
                minWidth: '80px',
                fontWeight: 'bold',
                border: '1px solid #ddd'
              }}>
                Días Ausencias
              </th>
              
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                <th key={day} style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '8px 4px', 
                  minWidth: '35px', 
                  maxWidth: '35px',
                  textAlign: 'center',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>
                    {day}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {getDayOfWeek(day)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(employeesByTeam).map(([teamName, teamEmployees]) => (
              teamEmployees.map((employee, employeeIndex) => {
                const summary = getEmployeeSummary(employee.id);
                return (
                  <tr key={`${teamName}-${employee.id}`}>
                    {employeeIndex === 0 && (
                      <td 
                        style={{
                          backgroundColor: '#f8f9fa',
                          fontWeight: 'bold',
                          padding: '8px',
                          verticalAlign: 'middle',
                          borderRight: '2px solid #667eea',
                          color: '#000',
                          border: '1px solid #ddd'
                        }}
                        rowSpan={teamEmployees.length}
                      >
                        {teamName}
                      </td>
                    )}
                    
                    <td style={{
                      backgroundColor: '#ffffff',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: '500',
                      color: '#000',
                      border: '1px solid #ddd'
                    }}>
                      {employee.full_name}
                    </td>
                    
                    <td style={{
                      backgroundColor: '#c8e6c9',
                      color: '#000',
                      padding: '8px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      border: '1px solid #ddd'
                    }}>
                      {summary.vacationDays}
                    </td>
                    
                    <td style={{
                      backgroundColor: '#fff9c4',
                      color: '#000',
                      padding: '8px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      border: '1px solid #ddd'
                    }}>
                      {summary.absenceDays}
                    </td>
                    
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const entry = getEmployeeEntry(employee.id, day);
                      const cellStyle = getCellStyle(entry, day, employee.id); // Pasar employeeId
                      const cellContent = getCellContent(entry, day);
                      
                      // Debug específico para mayo 2025 y días de festivos
                      if (month === 5 && (day === 1 || day === 2 || day === 15 || day === 17)) {
                        console.log(`🔍 DEBUG renderizado: día ${day}, empleado ${employee.full_name}`);
                        console.log(`   employee.id: ${employee.id}`);
                        console.log(`   employee_id: ${employee.employee_id}`);
                        console.log(`   Festivos en holidays[${employee.id}]:`, holidays[employee.id]);
                        console.log(`   Festivos en holidays[${employee.employee_id}]:`, holidays[employee.employee_id]);
                      }
                      
                      return (
                        <td
                          key={`${employee.id}-${day}`}
                          style={cellStyle}
                          onContextMenu={(e) => handleCellRightClick(e, employee.id, day)}
                          title={`${employee.full_name} - ${day}/${month}/${year}${isHoliday(day, employee.id) ? ' (Festivo)' : ''}${isWeekend(day) ? ' (Fin de semana)' : ''}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>

      {/* Menú contextual - TEXTO NEGRO LEGIBLE */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '2px solid #667eea',
            borderRadius: '8px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '220px',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              transition: 'background-color 0.2s',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('V')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🏖️ Vacaciones (V)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('F')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🏥 Ausencia (F)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('HLD')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ⏰ Horas Libre Disposición (HLD)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('G')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🛡️ Guardia (G)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('V!')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            📚 Formación/Evento (V!)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              borderBottom: '1px solid #f1f1f1',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333' // TEXTO NEGRO
            }}
            onClick={() => handleContextMenuOption('C')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            📋 Permiso/Otro (C)
          </div>
          <div 
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              color: '#dc3545', // ROJO PARA ELIMINAR
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={deleteEntry}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🗑️ Borrar Contenido
          </div>
        </div>
      )}

      {/* Dialog para horas */}
      {hoursDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            minWidth: '350px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#333' }}>
              {hoursDialog.type === 'HLD' ? '⏰ Horas de Libre Disposición' : '🛡️ Horas de Guardia'}
            </h4>
            <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
              Introduce el número de horas (0.5 - 12):
            </p>
            <input
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              placeholder="Ej: 4"
              id="hours-input"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                margin: '0 0 20px 0',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const hours = parseFloat(e.target.value);
                  if (hours > 0) {
                    handleHoursSubmit(hours);
                  }
                }
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setHoursDialog(null)}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #6c757d',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const hours = parseFloat(document.getElementById('hours-input').value);
                  if (hours > 0) {
                    handleHoursSubmit(hours);
                  } else {
                    alert('Por favor, introduce un número de horas válido');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información de estado */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <strong>📊 Estado:</strong> {employees.length} empleados, {holidays.length} festivos
        <br />
        <strong>📅 Mes:</strong> {monthName} ({daysInMonth} días)
        <br />
        <strong>💡 Instrucciones:</strong> Haz clic derecho en cualquier día laborable para marcar actividades
      </div>
    </div>
  );
};

export default Calendar;

