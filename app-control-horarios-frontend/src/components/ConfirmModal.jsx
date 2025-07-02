import React from 'react';

const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={e => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div
        className="modal"
        style={{
          background: '#fff', padding: 32, borderRadius: 12, minWidth: 340, boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          border: '2px solid #60a5fa', animation: 'fadeInScale 0.2s'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#d97706', marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
          ⚠️ Confirmar eliminación
        </h3>
        <div style={{ marginBottom: 24, color: '#222', textAlign: 'center', fontSize: 16 }}>
          {message}
        </div>
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
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              borderRadius: 4,
              border: 'none',
              background: '#dc3545',
              color: '#fff',
              fontWeight: 600,
              minWidth: 90
            }}
          >
            Eliminar
          </button>
        </div>
        <style>
          {`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95);}
              to { opacity: 1; transform: scale(1);}
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ConfirmModal;