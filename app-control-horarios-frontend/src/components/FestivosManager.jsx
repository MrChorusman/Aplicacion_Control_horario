import React, { useEffect, useState } from 'react';

const FestivosManager = () => {
  const [festivos, setFestivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comunidades, setComunidades] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [form, setForm] = useState({
    date: '',
    name: '',
    autonomous_community: '',
    province: ''
  });

  // Cargar comunidades y provincias al montar
  useEffect(() => {
    fetch('http://localhost:5002/api/autonomous_communities')
      .then(res => res.json())
      .then(setComunidades);

    fetch('http://localhost:5002/api/provinces')
      .then(res => res.json())
      .then(setProvincias);

    fetchFestivos();
  }, []);

  const fetchFestivos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5002/api/holidays');
      const data = await res.json();
      if (res.ok) {
        setFestivos(data.data || []);
      } else {
        setError(data.message || 'Error al cargar festivos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Provincias filtradas por comunidad seleccionada
  const provinciasFiltradas = form.autonomous_community
    ? provincias.filter(p => p.autonomous_community_id === Number(form.autonomous_community))
    : [];

  const handleAddFestivo = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5002/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ date: '', name: '', autonomous_community: '', province: '' });
        fetchFestivos();
      } else {
        setError(data.message || 'Error al añadir festivo');
      }
    } catch {
      setError('Error de conexión');
    }
  };

  const handleDeleteFestivo = async (id) => {
    if (!window.confirm('¿Eliminar este festivo?')) return;
    setError('');
    try {
      const res = await fetch(`http://localhost:5002/api/holidays/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchFestivos();
      } else {
        setError(data.message || 'Error al eliminar festivo');
      }
    } catch {
      setError('Error de conexión');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, background: '#f6f8fa', borderRadius: 12 }}>
      <h2 style={{ color: '#222', marginBottom: 20 }}>🎉 Gestión de Festivos</h2>
      <form onSubmit={handleAddFestivo} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleInputChange}
          required
          style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 4, border: '1px solid #bbb', background: '#fff', color: '#222' }}
        />
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleInputChange}
          placeholder="Nombre del festivo"
          required
          style={{ flex: 2, minWidth: 160, padding: 8, borderRadius: 4, border: '1px solid #bbb', background: '#fff', color: '#222' }}
        />
        <select
          name="autonomous_community"
          value={form.autonomous_community}
          onChange={e => {
            handleInputChange(e);
            setForm(f => ({ ...f, province: '' })); // Reset provincia al cambiar comunidad
          }}
          style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 4, border: '1px solid #bbb', background: '#fff', color: '#222' }}
          required
        >
          <option value="">Comunidad...</option>
          <option value="Nacional">Nacional</option>
          {comunidades.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {form.autonomous_community && form.autonomous_community !== 'Nacional' && (
          <select
            name="province"
            value={form.province}
            onChange={handleInputChange}
            style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 4, border: '1px solid #bbb', background: '#fff', color: '#222' }}
          >
            <option value="">Provincia...</option>
            {provinciasFiltradas.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600
          }}
        >
          Añadir
        </button>
      </form>
      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#222' }}>Cargando festivos...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#222' }}>
          <thead>
            <tr>
              <th style={{ padding: 8, borderBottom: '2px solid #2563eb' }}>Fecha</th>
              <th style={{ padding: 8, borderBottom: '2px solid #2563eb' }}>Nombre</th>
              <th style={{ padding: 8, borderBottom: '2px solid #2563eb' }}>Comunidad</th>
              <th style={{ padding: 8, borderBottom: '2px solid #2563eb' }}>Provincia</th>
              <th style={{ padding: 8, borderBottom: '2px solid #2563eb' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {festivos.map(f => (
              <tr key={f.id}>
                <td style={{ padding: 8 }}>{f.date}</td>
                <td style={{ padding: 8 }}>{f.name}</td>
                <td style={{ padding: 8 }}>
                  {f.autonomous_community === null ? 'Nacional'
                    : comunidades.find(c => c.id === f.autonomous_community)?.name || f.autonomous_community}
                </td>
                <td style={{ padding: 8 }}>
                  {provincias.find(p => p.id === f.province)?.name || (f.province ? f.province : '-')}
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => handleDeleteFestivo(f.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      fontSize: 18,
                      cursor: 'pointer'
                    }}
                    title="Eliminar festivo"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {festivos.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>
                  No hay festivos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FestivosManager;