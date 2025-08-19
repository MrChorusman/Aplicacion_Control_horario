import React, { forwardRef } from 'react';

/**
 * Button Component - Componente de botón reutilizable y accesible
 * 
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {Function} props.onClick - Función a ejecutar al hacer click
 * @param {string} props.type - Tipo de botón (button, submit, reset)
 * @param {string} props.variant - Variante visual del botón
 * @param {string} props.size - Tamaño del botón
 * @param {boolean} props.disabled - Estado deshabilitado
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.className - Clases CSS adicionales
 * @param {React.Ref} ref - Referencia al elemento button
 */
const Button = forwardRef(({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
  ...props 
}, ref) => {
  
  const getButtonClasses = () => {
    const baseClasses = `
      inline-flex items-center justify-center
      font-medium text-center
      border border-transparent rounded-md
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      ${loading ? 'cursor-wait' : 'cursor-pointer'}
    `;
    
    // Variantes de color usando design tokens
    const variantClasses = {
      primary: `
        bg-primary text-white border-primary
        hover:bg-primary-hover hover:border-primary-hover
        focus:ring-primary/20
        active:bg-primary-dark
      `,
      secondary: `
        bg-white text-gray-700 border-gray-300
        hover:bg-gray-50 hover:border-gray-400
        focus:ring-primary/20
        active:bg-gray-100
      `,
      success: `
        bg-success text-white border-success
        hover:opacity-90
        focus:ring-success/20
        active:opacity-80
      `,
      danger: `
        bg-error text-white border-error
        hover:opacity-90
        focus:ring-error/20
        active:opacity-80
      `,
      warning: `
        bg-warning text-gray-900 border-warning
        hover:opacity-90
        focus:ring-warning/20
        active:opacity-80
      `,
      info: `
        bg-info text-white border-info
        hover:opacity-90
        focus:ring-info/20
        active:opacity-80
      `,
      ghost: `
        bg-transparent text-gray-700 border-transparent
        hover:bg-gray-100
        focus:ring-primary/20
        active:bg-gray-200
      `,
      outline: `
        bg-transparent text-primary border-primary
        hover:bg-primary hover:text-white
        focus:ring-primary/20
        active:bg-primary-dark active:border-primary-dark
      `
    };
    
    // Tamaños
    const sizeClasses = {
      xs: 'text-xs px-2 py-1 min-h-6',
      sm: 'text-sm px-3 py-1.5 min-h-8', 
      medium: 'text-base px-4 py-2 min-h-10',
      lg: 'text-lg px-6 py-3 min-h-12',
      xl: 'text-xl px-8 py-4 min-h-14'
    };

    return [
      baseClasses,
      variantClasses[variant] || variantClasses.primary,
      sizeClasses[size] || sizeClasses.medium,
      className
    ].join(' ').replace(/\s+/g, ' ').trim();
  };

  return (
    <button
      ref={ref}
      type={type}
      className={getButtonClasses()}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      )}
      <span className={loading ? 'opacity-75' : ''}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export { Button };

