const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
const AUTH_URL_PREFIX = '/auth'; // Prefijo para las rutas de Flask-Security-Too

class ApiService {
  constructor() {
    this.token = this.getToken();
    this.userInfo = this.getUserInfo();
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
    this.token = token;
  }

  getUserInfo() {
    const info = localStorage.getItem('userInfo');
    return info ? JSON.parse(info) : null;
  }

  setUserInfo(userInfo) {
    if (userInfo) {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('userInfo');
    }
    this.userInfo = userInfo;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token && !endpoint.startsWith(AUTH_URL_PREFIX)) { // No enviar token a rutas de auth como login/register
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 204) { // No content
        return null;
      }

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401 && !endpoint.startsWith(AUTH_URL_PREFIX)) {
          // Token inválido o expirado, desloguear
          this.logout();
          // Podríamos redirigir al login aquí o dejar que el AuthContext lo maneje
          window.location.href = '/login';
        }
        throw new Error(data.message || data.description || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error.message);
      // No relanzar el error aquí directamente si queremos manejarlo en el AuthContext
      // o en el componente que llama. Por ahora lo relanzo para mantener comportamiento.
      throw error;
    }
  }

  // --- Autenticación ---
  async login(email, password) {
    try {
      const response = await this.request(`${AUTH_URL_PREFIX}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      // Flask-Security-Too devuelve el token en response.user.authentication_token o similar
      // o directamente en response.authentication_token
      // Necesitamos verificar la estructura exacta de la respuesta del login
      // Asumamos que es response.authentication_token y response.user para el usuario
      // La respuesta de Flask-Security-Too es usualmente:
      // {"response": {"user": {"id": "...", "email": "...", "roles": [...]}, "token": "..."}}
      // o {"meta": {"token": "...", "user": ...}}
      // O si es `SECURITY_RETURN_GENERIC_RESPONSES=True` es {"access_token": ..., "user": ...}
      // Vamos a asumir que el token está en response.access_token o response.token
      // y los datos del usuario en response.user

      let token = null;
      let user = null;

      if (response && response.response && response.response.token) { // Estructura común
        token = response.response.token;
        user = response.response.user;
      } else if (response && response.response && response.response.user && response.response.user.authentication_token) { // Otra estructura
        token = response.response.user.authentication_token;
        user = response.response.user;
      } else if (response && response.access_token) { // Estructura con SECURITY_RETURN_GENERIC_RESPONSES=True
         token = response.access_token;
         user = response.user;
      } else if (response && response.token) { // Estructura más simple
        token = response.token;
        user = response.user; // Asumimos que viene user también
      }


      if (token) {
        this.setToken(token);
        if (user) {
          this.setUserInfo({ email: user.email, roles: user.roles || [], id: user.id || user.fs_uniquifier });
        }
        return { success: true, user: this.userInfo };
      } else {
        // Si la estructura del token no se encuentra, pero la petición fue ok (raro)
        console.error("Login successful but token not found in response:", response);
        throw new Error(response.message || "Token no encontrado en la respuesta del login");
      }
    } catch (error) {
      this.logout(); // Limpiar en caso de error
      console.error("Login failed:", error.message);
      throw error; // Relanzar para que el componente de login lo maneje
    }
  }

  async register(userData) { // userData: { email, password, roles (opcional) }
    try {
        const response = await this.request(`${AUTH_URL_PREFIX}/register`, {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        // Flask-Security-Too devuelve el usuario creado, no un token directamente en el registro.
        // El usuario tendría que loguearse después.
        if (response && response.response && response.response.user) {
            return { success: true, user: response.response.user };
        }
        return { success: true, message: "Registro exitoso. Por favor, inicie sesión." };
    } catch (error) {
        console.error("Registration failed:", error.message);
        throw error;
    }
  }

  logout() {
    this.setToken(null);
    this.setUserInfo(null);
    // No se necesita llamar a /api/auth/logout si el token JWT se maneja solo en el cliente,
    // pero es buena práctica llamarlo si el backend invalida tokens o sesiones.
    // Flask-Security-Too con JWT puro no mantiene estado del token en el servidor,
    // por lo que el logout es principalmente una operación del cliente.
    // Sin embargo, si se usa `SECURITY_BLACKLIST_ENABLED = True`, entonces sí se debe llamar.
    // Por ahora, lo llamaremos por si acaso y para consistencia.
    return this.request(`${AUTH_URL_PREFIX}/logout`, { method: 'POST' })
      .catch(err => console.warn("Error en API logout (puede ser normal si el token ya fue invalidado o no había sesión):", err.message));
  }

  // Empleados
  async getEmployees() {
    return this.request('/employees');
  }

  async createEmployee(employeeData) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(employeeId, employeeData) {
    return this.request(`/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(employeeId) {
    return this.request(`/employees/${employeeId}`, {
      method: 'DELETE',
    });
  }

  async getTeams() {
    return this.request('/employees/teams');
  }

  async getAutonomousCommunities() {
    return this.request('/employees/autonomous-communities');
  }

  // Calendario - Endpoints unificados
  async getCalendarData(year, month, employeeId = null) {
    let endpoint = `/calendar/${year}/${month}`;
    if (employeeId) {
      endpoint += `?employee_id=${employeeId}`;
    }
    return this.request(endpoint);
  }

  async getEmployeeCalendar(employeeId, year, month) {
    return this.request(`/calendar/${year}/${month}?employee_id=${employeeId}`);
  }

  async createCalendarEntry(entryData) {
    return this.request('/calendar', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateCalendarEntry(entryId, entryData) {
    return this.request(`/calendar/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(entryData),
    });
  }

  async deleteCalendarEntry(entryId) {
    return this.request(`/calendar/${entryId}`, {
      method: 'DELETE',
    });
  }

  async getCalendarEntry(entryId) {
    return this.request(`/calendar/entry/${entryId}`);
  }

  // Forecast - Endpoints corregidos
  async getForecast(year, month, employeeId = null) {
    let endpoint = `/forecast/${year}/${month}`;
    if (employeeId) {
      endpoint += `?employee_id=${employeeId}`;
    }
    return this.request(endpoint);
  }

  async getAllTeamsForecast(year, month) {
    return this.request(`/forecast/${year}/${month}`);
  }

  async getEmployeeForecast(employeeId, year, month) {
    return this.request(`/forecast/employee/${employeeId}/${year}/${month}`);
  }

  async getTeamForecast(teamName, year, month) {
    return this.request(`/forecast/team/${encodeURIComponent(teamName)}/${year}/${month}`);
  }

  async getMonthlyForecast(year, month) {
    return this.request(`/forecast/monthly/${year}/${month}`);
  }

  async getWorkingDays(year, month, community = null) {
    let endpoint = `/forecast/working-days/${year}/${month}`;
    if (community) {
      endpoint += `?community=${encodeURIComponent(community)}`;
    }
    return this.request(endpoint);
  }

  // Festivos - Endpoints corregidos
  async getHolidays(year, month = null, community = null) {
    let endpoint = `/holidays/${year}`;
    if (month) {
      endpoint += `/${month}`;
    }
    
    const params = new URLSearchParams();
    if (community) {
      params.append('community', community);
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request(endpoint);
  }

  async checkHoliday(date, community = null) {
    const params = new URLSearchParams({ date });
    if (community) {
      params.append('community', community);
    }
    return this.request(`/holidays/check?${params.toString()}`);
  }

  async getWorkingDaysInMonth(year, month, community = null) {
    let endpoint = `/holidays/working-days/${year}/${month}`;
    if (community) {
      endpoint += `?community=${encodeURIComponent(community)}`;
    }
    return this.request(endpoint);
  }

  async getHolidayCalendar(community, year, month) {
    return this.request(`/holidays/calendar/${encodeURIComponent(community)}/${year}/${month}`);
  }

  async getCommunitiesList() {
    return this.request('/holidays/communities');
  }

  async syncHolidays(year) {
    return this.request(`/holidays/sync/${year}`, {
      method: 'POST',
    });
  }

  async createBulkHolidays(holidaysData) {
    return this.request('/holidays/bulk', {
      method: 'POST',
      body: JSON.stringify(holidaysData),
    });
  }

  // Utilidades
  async getHealth() {
    return this.request('/health');
  }

  async getApiInfo() {
    return this.request('/');
  }

  // Métodos auxiliares para compatibilidad
  async getTeamSummary(teamName, year, month) {
    return this.getTeamForecast(teamName, year, month);
  }

  async getEmployeeSummary(employeeId, year, month) {
    return this.getEmployeeForecast(employeeId, year, month);
  }
}

export const apiService = new ApiService();

