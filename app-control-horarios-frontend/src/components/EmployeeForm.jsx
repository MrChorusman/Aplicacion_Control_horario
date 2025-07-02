import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth';
import AdminPasswordModal from './AdminPasswordModal';
import ConfirmModal from './ConfirmModal';

const EmployeeForm = () => {
  const [formData, setFormData] = useState({
    team_name: '',
    full_name: '',
    hours_mon_thu: '',
    hours_fri: '',
    vacation_days: '',
    free_hours: '',
    autonomous_community: ''
  })

  const [employees, setEmployees] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [errors, setErrors] = useState({})

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { isAdmin, validateAdmin } = useAdminAuth();

  const autonomousCommunities = [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
    'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
    'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra',
    'País Vasco', 'Ceuta', 'Melilla'
  ]

  useEffect(() => {
    fetchEmployees()
    fetchTeams()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/employees/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.team_name.trim()) {
      newErrors.team_name = 'El nombre del equipo es requerido'
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre y apellidos son requeridos'
    }

    if (!formData.hours_mon_thu || formData.hours_mon_thu < 0 || formData.hours_mon_thu > 12) {
      newErrors.hours_mon_thu = 'Las horas deben estar entre 0 y 12'
    }

    if (!formData.hours_fri || formData.hours_fri < 0 || formData.hours_fri > 12) {
      newErrors.hours_fri = 'Las horas deben estar entre 0 y 12'
    }

    if (!formData.vacation_days || formData.vacation_days < 1 || formData.vacation_days > 40) {
      newErrors.vacation_days = 'Los días de vacaciones deben estar entre 1 y 40'
    }

    if (!formData.free_hours || formData.free_hours < 0 || formData.free_hours > 200) {
      newErrors.free_hours = 'Las horas de libre disposición deben estar entre 0 y 200'
    }

    if (!formData.autonomous_community) {
      newErrors.autonomous_community = 'La comunidad autónoma es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Por favor, corrige los errores en el formulario' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('http://localhost:5002/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hours_mon_thu: parseFloat(formData.hours_mon_thu),
          hours_fri: parseFloat(formData.hours_fri),
          vacation_days: parseInt(formData.vacation_days),
          free_hours: parseInt(formData.free_hours)
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Empleado registrado exitosamente' })
        setFormData({
          team_name: '',
          full_name: '',
          hours_mon_thu: '',
          hours_fri: '',
          vacation_days: '',
          free_hours: '',
          autonomous_community: ''
        })
        fetchEmployees()
        fetchTeams()
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al registrar empleado' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      team_name: '',
      full_name: '',
      hours_mon_thu: '',
      hours_fri: '',
      vacation_days: '',
      free_hours: '',
      autonomous_community: ''
    })
    setErrors({})
    setMessage({ type: '', text: '' })
  }

  // Cuando el usuario pulsa la papelera
  const handleDeleteClick = (employeeId) => {
    setPendingDeleteId(employeeId);
    setShowAdminModal(true);
  };

  // Cuando la contraseña es correcta, mostramos la confirmación
  const handleAdminValidated = () => {
    setShowConfirmModal(true);
  };

  // Cuando el usuario confirma la eliminación
  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      await handleDeleteEmployee(pendingDeleteId);
      setPendingDeleteId(null);
      setShowConfirmModal(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`http://localhost:5002/api/employees/${employeeId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Empleado eliminado correctamente' });
        fetchEmployees();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al eliminar empleado' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '25px', 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="employee-form-header">
          <h2>👤 Registro de Empleado</h2>
          <p style={{ margin: 0, color: '#6c757d' }}>
            Registra un nuevo empleado en el sistema con toda la información necesaria para el control de horarios
          </p>
        </div>

        {message.text && (
          <div className={`error ${message.type === 'success' ? 'success' : ''}`} style={{
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderLeft: `5px solid ${message.type === 'success' ? '#28a745' : '#dc3545'}`
          }}>
            {message.text}
          </div>
        )}

        <div className="summary-card">
          <h3>📝 Datos del Empleado</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Nombre del Equipo */}
              <div className="form-group">
                <label htmlFor="team_name">
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  id="team_name"
                  name="team_name"
                  value={formData.team_name}
                  onChange={handleInputChange}
                  placeholder="Ej: Desarrollo Frontend"
                  list="teams-list"
                />
                <datalist id="teams-list">
                  {teams.map((team, index) => (
                    <option key={index} value={team} />
                  ))}
                </datalist>
                {errors.team_name && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.team_name}</span>}
              </div>

              {/* Nombre y Apellidos */}
              <div className="form-group">
                <label htmlFor="full_name">
                  Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez García"
                />
                {errors.full_name && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.full_name}</span>}
              </div>

              {/* Horas Lunes a Jueves */}
              <div className="form-group">
                <label htmlFor="hours_mon_thu">
                  Horas Lunes a Jueves *
                </label>
                <input
                  type="number"
                  id="hours_mon_thu"
                  name="hours_mon_thu"
                  value={formData.hours_mon_thu}
                  onChange={handleInputChange}
                  min="0"
                  max="12"
                  step="0.5"
                  placeholder="Ej: 8"
                />
                {errors.hours_mon_thu && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.hours_mon_thu}</span>}
              </div>

              {/* Horas Viernes */}
              <div className="form-group">
                <label htmlFor="hours_fri">
                  Horas Viernes *
                </label>
                <input
                  type="number"
                  id="hours_fri"
                  name="hours_fri"
                  value={formData.hours_fri}
                  onChange={handleInputChange}
                  min="0"
                  max="12"
                  step="0.5"
                  placeholder="Ej: 7"
                />
                {errors.hours_fri && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.hours_fri}</span>}
              </div>

              {/* Días de Vacaciones */}
              <div className="form-group">
                <label htmlFor="vacation_days">
                  Días de Vacaciones Anuales *
                </label>
                <input
                  type="number"
                  id="vacation_days"
                  name="vacation_days"
                  value={formData.vacation_days}
                  onChange={handleInputChange}
                  min="1"
                  max="40"
                  placeholder="Ej: 22"
                />
                {errors.vacation_days && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.vacation_days}</span>}
              </div>

              {/* Horas de Libre Disposición */}
              <div className="form-group">
                <label htmlFor="free_hours">
                  Horas de Libre Disposición Anuales *
                </label>
                <input
                  type="number"
                  id="free_hours"
                  name="free_hours"
                  value={formData.free_hours}
                  onChange={handleInputChange}
                  min="0"
                  max="200"
                  placeholder="Ej: 40"
                />
                {errors.free_hours && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.free_hours}</span>}
              </div>

              {/* Comunidad Autónoma */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="autonomous_community">
                  Comunidad Autónoma *
                </label>
                <select
                  id="autonomous_community"
                  name="autonomous_community"
                  value={formData.autonomous_community}
                  onChange={handleInputChange}
                >
                  <option value="">Selecciona una comunidad autónoma</option>
                  {autonomousCommunities.map((community) => (
                    <option key={community} value={community}>
                      {community}
                    </option>
                  ))}
                </select>
                {errors.autonomous_community && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.autonomous_community}</span>}
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleReset}
                className="btn"
                style={{ background: '#6c757d' }}
              >
                Limpiar Formulario
              </button>
              <button 
                type="submit" 
                className="btn"
                disabled={loading}
              >
                {loading ? 'Registrando...' : 'Registrar Empleado'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Empleados Registrados */}
        {employees.length > 0 && (
          <div className="summary-card" style={{ marginTop: '30px' }}>
            <h3>👥 Empleados Registrados ({employees.length})</h3>
            
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Nombre</th>
                    <th>Horas L-J</th>
                    <th>Horas V</th>
                    <th>Vacaciones</th>
                    <th>Horas Libres</th>
                    <th>Comunidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td><strong>{employee.team_name}</strong></td>
                      <td>{employee.full_name}</td>
                      <td>{employee.hours_mon_thu}h</td>
                      <td>{employee.hours_fri}h</td>
                      <td>{employee.vacation_days} días</td>
                      <td>{employee.free_hours}h</td>
                      <td>{employee.autonomous_community}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteClick(employee.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc3545',
                            fontSize: '1.2em'
                          }}
                          title="Eliminar empleado"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de contraseña de administrador */}
      <AdminPasswordModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onValidate={handleAdminValidated}
      />
      <ConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        message="¿Seguro que quieres eliminar este empleado? Esta acción no se puede deshacer."
      />
    </>
  )
}

export default EmployeeForm

