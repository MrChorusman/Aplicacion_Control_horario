import React from 'react';
import { Button } from './button';

/**
 * ErrorBoundary Component - Componente para capturar y manejar errores de React
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Captura el error y la información adicional
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log del error (aquí podrías enviar a un servicio de logging)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Si hay una función de callback para reportar errores
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // UI de error personalizable
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.handleRetry,
          this.state.errorInfo
        );
      }

      // UI de error por defecto
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={this.handleRetry}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorFallback Component - UI de error por defecto
 */
const ErrorFallback = ({ 
  error, 
  onRetry, 
  showDetails = false 
}) => {
  return (
    <div 
      className="min-h-96 flex items-center justify-center p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Icono de error */}
        <div className="mx-auto mb-4 h-12 w-12 text-error">
          <svg 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            className="w-full h-full"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Título */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          ¡Algo salió mal!
        </h2>

        {/* Descripción */}
        <p className="text-gray-600 mb-6">
          Se produjo un error inesperado. Por favor, intenta recargar la página o contacta con soporte si el problema persiste.
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="primary"
            onClick={onRetry}
            aria-label="Reintentar cargar el contenido"
          >
            🔄 Reintentar
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => window.location.reload()}
            aria-label="Recargar la página completa"
          >
            📄 Recargar página
          </Button>
        </div>

        {/* Detalles del error (solo en desarrollo) */}
        {showDetails && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Mostrar detalles técnicos
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-40">
              <p className="font-semibold">Error:</p>
              <pre className="whitespace-pre-wrap">{error.toString()}</pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

/**
 * AsyncErrorBoundary Component - Error boundary específico para errores async
 */
const AsyncErrorBoundary = ({ children, onError }) => {
  return (
    <ErrorBoundary 
      onError={onError}
      fallback={(error, retry) => (
        <div 
          className="bg-error-light border border-error/20 rounded-lg p-6 m-4"
          role="alert"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-error" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-error">
                Error de conexión
              </h3>
              <p className="mt-1 text-sm text-error/80">
                No se pudieron cargar los datos. Verifica tu conexión e intenta nuevamente.
              </p>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={retry}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export { ErrorBoundary, ErrorFallback, AsyncErrorBoundary };