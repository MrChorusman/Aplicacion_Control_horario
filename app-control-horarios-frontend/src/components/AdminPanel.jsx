import React from 'react';
import FestivosManager from './FestivosManager';

const AdminPanel = () => (
  <div style={{ padding: 32 }}>
    <h2>🛡️ Panel Administrador</h2>
    <FestivosManager />
    {/* Aquí puedes añadir más funcionalidades en el futuro */}
  </div>
);

export default AdminPanel;