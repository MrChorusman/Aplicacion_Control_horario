import { useState } from 'react';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);

  const validateAdmin = async () => {
    const password = window.prompt('Introduce la contraseña de administrador:');
    if (!password) return false;
    const res = await fetch('http://localhost:5002/api/admin/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      setIsAdmin(true);
      return true;
    } else {
      alert('Contraseña incorrecta');
      setIsAdmin(false);
      return false;
    }
  };

  return { isAdmin, validateAdmin };
}