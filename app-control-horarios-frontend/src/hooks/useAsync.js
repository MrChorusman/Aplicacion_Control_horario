import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAsync Hook - Hook personalizado para manejar operaciones asíncronas
 * 
 * @param {Function} asyncFunction - Función asíncrona a ejecutar
 * @param {boolean} immediate - Si debe ejecutarse inmediatamente
 * @param {Array} deps - Dependencias para re-ejecutar la función
 * 
 * @returns {Object} Estado y funciones de control
 */
export const useAsync = (asyncFunction, immediate = true, deps = []) => {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const pendingPromiseRef = useRef(null);
  
  // Estados derivados para mejor UX
  const isIdle = status === 'idle';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isSuccess = status === 'success';

  const execute = useCallback(async (...args) => {
    setStatus('loading');
    setError(null);

    try {
      const promise = asyncFunction(...args);
      pendingPromiseRef.current = promise;
      
      const result = await promise;
      
      // Solo actualizar el estado si esta promesa sigue siendo la actual
      if (pendingPromiseRef.current === promise) {
        setData(result);
        setStatus('success');
        return result;
      }
    } catch (err) {
      // Solo actualizar el estado si esta promesa sigue siendo la actual
      if (pendingPromiseRef.current === promise) {
        setError(err);
        setStatus('error');
        throw err;
      }
    }
  }, [asyncFunction]);

  // Reset function para limpiar el estado
  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
    pendingPromiseRef.current = null;
  }, []);

  // Retry function para volver a ejecutar
  const retry = useCallback(() => {
    return execute();
  }, [execute]);

  // Efecto para ejecución automática
  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    // Cleanup: cancelar promesa pendiente al desmontar
    return () => {
      pendingPromiseRef.current = null;
    };
  }, deps);

  return {
    // Estados
    status,
    data,
    error,
    
    // Estados booleanos para mejor legibilidad
    isIdle,
    isLoading,
    isError,
    isSuccess,
    
    // Funciones de control
    execute,
    reset,
    retry
  };
};

/**
 * useAsyncData Hook - Versión específica para carga de datos con cache
 * 
 * @param {Function} fetchFunction - Función que obtiene los datos
 * @param {string} cacheKey - Clave para cache opcional
 * @param {Object} options - Opciones adicionales
 * 
 * @returns {Object} Estado de los datos y funciones
 */
export const useAsyncData = (fetchFunction, cacheKey, options = {}) => {
  const {
    immediate = true,
    cacheTime = 5 * 60 * 1000, // 5 minutos por defecto
    staleTime = 1 * 60 * 1000,  // 1 minuto por defecto
    retry = 3,
    retryDelay = 1000
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const cache = useRef(new Map());
  const timestampRef = useRef(null);

  const asyncOperation = useCallback(async (...args) => {
    // Verificar cache si existe cacheKey
    if (cacheKey && cache.current.has(cacheKey)) {
      const cached = cache.current.get(cacheKey);
      const isStale = Date.now() - cached.timestamp > staleTime;
      
      if (!isStale) {
        return cached.data;
      }
    }

    let lastError;
    
    // Lógica de retry
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await fetchFunction(...args);
        
        // Guardar en cache
        if (cacheKey) {
          cache.current.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          // Limpiar cache después del tiempo especificado
          setTimeout(() => {
            cache.current.delete(cacheKey);
          }, cacheTime);
        }
        
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < retry) {
          setRetryCount(attempt + 1);
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }
    
    throw lastError;
  }, [fetchFunction, cacheKey, retry, retryDelay, staleTime, cacheTime]);

  const asyncState = useAsync(asyncOperation, immediate);

  // Función para invalidar cache
  const invalidateCache = useCallback(() => {
    if (cacheKey) {
      cache.current.delete(cacheKey);
    }
  }, [cacheKey]);

  // Función para refrescar datos
  const refresh = useCallback(() => {
    invalidateCache();
    return asyncState.execute();
  }, [invalidateCache, asyncState.execute]);

  return {
    ...asyncState,
    retryCount,
    invalidateCache,
    refresh,
    isCached: cacheKey && cache.current.has(cacheKey)
  };
};

/**
 * useAsyncCallback Hook - Para ejecutar operaciones asíncronas bajo demanda
 * 
 * @param {Function} asyncFunction - Función asíncrona
 * @param {Array} deps - Dependencias
 * 
 * @returns {Array} [execute function, state object]
 */
export const useAsyncCallback = (asyncFunction, deps = []) => {
  const asyncState = useAsync(asyncFunction, false, deps);
  
  return [asyncState.execute, asyncState];
};

/**
 * useAsyncMutation Hook - Para operaciones de modificación (POST, PUT, DELETE)
 * 
 * @param {Function} mutationFn - Función de mutación
 * @param {Object} options - Opciones de la mutación
 * 
 * @returns {Object} Estado y función de mutación
 */
export const useAsyncMutation = (mutationFn, options = {}) => {
  const {
    onSuccess,
    onError,
    onSettled
  } = options;

  const mutationState = useAsync(mutationFn, false);

  const mutate = useCallback(async (...args) => {
    try {
      const result = await mutationState.execute(...args);
      
      if (onSuccess) {
        onSuccess(result, ...args);
      }
      
      return result;
    } catch (error) {
      if (onError) {
        onError(error, ...args);
      }
      throw error;
    } finally {
      if (onSettled) {
        onSettled(...args);
      }
    }
  }, [mutationState.execute, onSuccess, onError, onSettled]);

  return {
    ...mutationState,
    mutate,
    mutateAsync: mutationState.execute
  };
};