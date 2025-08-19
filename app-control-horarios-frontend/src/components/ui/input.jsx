import React, { forwardRef, useState } from 'react';

/**
 * Input Component - Componente de input reutilizable y accesible
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.label - Etiqueta del input
 * @param {string} props.type - Tipo de input
 * @param {string} props.value - Valor del input
 * @param {Function} props.onChange - Función que se ejecuta al cambiar el valor
 * @param {string} props.placeholder - Texto placeholder
 * @param {boolean} props.required - Si el campo es obligatorio
 * @param {boolean} props.disabled - Si el input está deshabilitado
 * @param {string} props.error - Mensaje de error
 * @param {string} props.helperText - Texto de ayuda
 * @param {string} props.size - Tamaño del input
 * @param {string} props.className - Clases CSS adicionales
 * @param {React.Ref} ref - Referencia al elemento input
 */
const Input = forwardRef(({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  size = 'medium',
  className = '',
  id,
  name,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  
  // Generar ID único si no se proporciona
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const getInputClasses = () => {
    const baseClasses = `
      w-full px-3 py-2
      border rounded-md
      transition-all duration-200 ease-in-out
      font-medium
      placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50
    `;
    
    const sizeClasses = {
      sm: 'text-sm py-1.5 px-2',
      medium: 'text-base py-2 px-3',
      lg: 'text-lg py-3 px-4'
    };
    
    const stateClasses = error 
      ? 'border-error focus:ring-error/20 focus:border-error'
      : focused
        ? 'border-primary ring-2 ring-primary/20'
        : 'border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-primary/20';
    
    return [
      baseClasses,
      sizeClasses[size] || sizeClasses.medium,
      stateClasses,
      className
    ].join(' ').replace(/\s+/g, ' ').trim();
  };
  
  const getLabelClasses = () => {
    const baseClasses = `
      block text-sm font-medium mb-1
      transition-colors duration-200
    `;
    
    const stateClasses = error 
      ? 'text-error'
      : focused
        ? 'text-primary'
        : 'text-gray-700';
    
    return [baseClasses, stateClasses].join(' ');
  };

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className={getLabelClasses()}
        >
          {label}
          {required && (
            <span 
              className="text-error ml-1" 
              aria-label="campo obligatorio"
              title="Campo obligatorio"
            >
              *
            </span>
          )}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          name={name || inputId}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={getInputClasses()}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg 
              className="h-5 w-5 text-error" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-1 text-sm text-error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={`${inputId}-helper`}
          className="mt-1 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };