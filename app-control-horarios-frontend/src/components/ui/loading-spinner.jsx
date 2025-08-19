import React from 'react';

/**
 * LoadingSpinner Component - Componente de spinner de carga reutilizable
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.size - Tamaño del spinner (xs, sm, md, lg, xl)
 * @param {string} props.color - Color del spinner 
 * @param {string} props.message - Mensaje a mostrar junto al spinner
 * @param {boolean} props.overlay - Si debe mostrar un overlay de fondo
 * @param {string} props.className - Clases CSS adicionales
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  message,
  overlay = false,
  className = ''
}) => {
  
  const getSizeClasses = () => {
    const sizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };
    return sizes[size] || sizes.md;
  };
  
  const getColorClasses = () => {
    const colors = {
      primary: 'text-primary',
      secondary: 'text-gray-600',
      white: 'text-white',
      success: 'text-success',
      error: 'text-error',
      warning: 'text-warning'
    };
    return colors[color] || colors.primary;
  };

  const SpinnerIcon = () => (
    <svg 
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()} ${className}`}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      role="img"
      aria-label={message || "Cargando..."}
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const content = (
    <div className={`flex flex-col items-center justify-center gap-2 ${overlay ? 'text-white' : ''}`}>
      <SpinnerIcon />
      {message && (
        <p className={`text-sm font-medium ${overlay ? 'text-white' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-label="Cargando"
        aria-modal="true"
      >
        {content}
      </div>
    );
  }

  return content;
};

/**
 * LoadingCard Component - Componente de carga para reemplazar contenido de tarjetas
 */
const LoadingCard = ({ 
  lines = 3, 
  className = '',
  title = false,
  height = 'auto'
}) => {
  return (
    <div 
      className={`bg-white rounded-lg p-6 shadow-md ${className}`}
      style={{ height }}
      role="status" 
      aria-label="Cargando contenido"
    >
      {title && (
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-1/3"></div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * LoadingTable Component - Componente de carga para tablas
 */
const LoadingTable = ({ 
  rows = 5, 
  columns = 4,
  className = ''
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}
      role="status"
      aria-label="Cargando tabla"
    >
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b">
        <div className="flex gap-4">
          {Array.from({ length: columns }, (_, i) => (
            <div 
              key={i} 
              className="h-4 bg-gray-300 rounded animate-pulse"
              style={{ width: `${20 + (i % 3) * 10}%` }}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }, (_, colIndex) => (
                <div 
                  key={colIndex} 
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{ width: `${20 + (colIndex % 3) * 10}%` }}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { LoadingSpinner, LoadingCard, LoadingTable };