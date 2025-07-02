import React, { useState, useEffect, useRef } from 'react';

const AdminPasswordModal = ({ open, onClose, onValidate }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const inputRef = useRef(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && password && !validating) handleValidate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [open, password, validating]);

  // Autofocus input al abrir
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Cerrar al hacer click fuera del modal
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) onClose();
  };

  const handleValidate = async () => {
    setError('');
    setValidating(true);
    try {
      const res = await fetch('http://localhost:5002/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setPassword('');
        setError('');
        onValidate();
        onClose();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setValidating(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal"
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          minWidth: 340,
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          animation: 'fadeInScale 0.2s',
          border: '2px solid #60a5fa' // Borde azul claro
        }}
        onClick={e => e.stopPropagation()}
      >
        <h4 style={{ color: '#d97706', marginBottom: 8, fontWeight: 700, fontSize: 18, textAlign: 'center' }}>
          ⚠️ Funcionalidad restringida
        </h4>
        <h3 style={{ color: '#222', marginBottom: 20, fontWeight: 600, textAlign: 'center' }}>
          Introduce contraseña de Administrador
        </h3>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Introduce la contraseña"
          style={{
            width: '100%',
            padding: 10,
            marginBottom: 16,
            borderRadius: 4,
            border: '1px solid #bbb',
            background: '#fafafa',
            fontSize: 16,
            color: '#222', // Color de fuente oscuro para mejor visibilidad
            letterSpacing: '0.1em'
          }}
          autoFocus
          disabled={validating}
        />
        {error && (
          <div style={{
            color: '#b91c1c',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500
          }}>
            <span>❌</span> <span>{error}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 4,
              border: 'none',
              background: '#e5e7eb',
              color: '#222',
              fontWeight: 500,
              minWidth: 90
            }}
            disabled={validating}
          >
            Cancelar
          </button>
          <button
            onClick={handleValidate}
            style={{
              padding: '8px 18px',
              borderRadius: 4,
              border: 'none',
              background: password ? '#2563eb' : '#a5b4fc',
              color: '#fff',
              fontWeight: 600,
              cursor: password && !validating ? 'pointer' : 'not-allowed',
              minWidth: 90,
              position: 'relative'
            }}
            disabled={!password || validating}
          >
            {validating ? (
              <span style={{
                display: 'inline-block',
                width: 18,
                height: 18,
                border: '2px solid #fff',
                borderTop: '2px solid #2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                verticalAlign: 'middle'
              }} />
            ) : 'Validar'}
          </button>
        </div>
        {/* Animaciones CSS */}
        <style>
          {`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95);}
              to { opacity: 1; transform: scale(1);}
            }
            @keyframes spin {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg);}
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default AdminPasswordModal;