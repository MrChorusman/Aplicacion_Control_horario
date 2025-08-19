import React, { forwardRef, useState } from 'react';

/**
 * Select Component - Componente de select reutilizable y accesible
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.label - Etiqueta del select
 * @param {string|number} props.value - Valor seleccionado
 * @param {Function} props.onChange - Función que se ejecuta al cambiar la selección
 * @param {Array} props.options - Array de opciones
 * @param {string} props.placeholder - Texto placeholder
 * @param {boolean} props.required - Si el campo es obligatorio
 * @param {boolean} props.disabled - Si el select está deshabilitado
 * @param {string} props.error - Mensaje de error
 * @param {string} props.helperText - Texto de ayuda
 * @param {string} props.size - Tamaño del select
 * @param {string} props.className - Clases CSS adicionales
 * @param {React.Ref} ref - Referencia al elemento select
 */
const Select = forwardRef(({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
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
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const getSelectClasses = () => {
    const baseClasses = `
      w-full px-3 py-2 pr-10
      border rounded-md
      transition-all duration-200 ease-in-out
      font-medium
      bg-white
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50
      appearance-none
      cursor-pointer
    `;
    
    const sizeClasses = {
      sm: 'text-sm py-1.5 px-2 pr-8',
      medium: 'text-base py-2 px-3 pr-10',
      lg: 'text-lg py-3 px-4 pr-12'
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
          htmlFor={selectId} 
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
        <select
          ref={ref}
          id={selectId}
          name={name || selectId}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          disabled={disabled}
          className={getSelectClasses()}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${selectId}-error` : 
            helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options.map((option, index) => {
            // Permitir opciones como objetos {value, label} o strings simples
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            const optionDisabled = typeof option === 'object' ? option.disabled : false;
            
            return (
              <option 
                key={`${optionValue}-${index}`} 
                value={optionValue}
                disabled={optionDisabled}
              >
                {optionLabel}
              </option>
            );
          })}
        </select>
        
        {/* Icono de flecha personalizada */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {error ? (
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
          ) : (
            <svg 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 9l4-4 4 4m0 6l-4 4-4-4" 
              />
            </svg>
          )}
        </div>
      </div>
      
      {error && (
        <p 
          id={`${selectId}-error`}
          className="mt-1 text-sm text-error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={`${selectId}-helper`}
          className="mt-1 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export { Select };