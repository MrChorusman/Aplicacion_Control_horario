const API_BASE_URL = 'http://localhost:5002/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
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

