// Función para obtener festivos
const getHolidays = async (year, month) => {
  try {
    const response = await fetch(`${API_BASE_URL}/holidays/${year}/${month}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return { success: false, message: error.message };
  }
};

// Función para eliminar entrada del calendario
const deleteCalendarEntry = async (entryId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/calendar/entry/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting calendar entry:', error);
    return { success: false, message: error.message };
  }
};

// Función para obtener forecast general (sin empleado específico)
const getForecast = async (year, month, employeeId = null) => {
  try {
    let url = `${API_BASE_URL}/forecast/${year}/${month}`;
    if (employeeId) {
      url = `${API_BASE_URL}/forecast/employee/${employeeId}/${year}/${month}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return { success: false, message: error.message };
  }
};

// Función para obtener datos del calendario
const getCalendar = async (year, month, employeeId = null) => {
  try {
    let url = `${API_BASE_URL}/calendar/${year}/${month}`;
    if (employeeId) {
      url = `${API_BASE_URL}/calendar/employee/${employeeId}/${year}/${month}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return { success: false, message: error.message };
  }
};

