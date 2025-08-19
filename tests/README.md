# 🧪 Testing Suite - Aplicación Control de Horarios

## 📋 Descripción

Suite completa de testing End-to-End (E2E) usando **Puppeteer** y **Jest** para la aplicación de control de horarios.

## 🏗️ Estructura de Tests

```
tests/
├── README.md                 # Este archivo
├── jest.setup.js            # Configuración global de Jest
├── puppeteer.config.js      # Configuración de Puppeteer
├── utils/
│   └── helpers.js           # Utilidades y helpers para tests
└── e2e/
    ├── auth.test.js         # Tests de autenticación
    ├── employees.test.js    # Tests de gestión de empleados
    └── calendar.test.js     # Tests de funcionalidad del calendario
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Puppeteer instalado manualmente (ya configurado)

### Instalar dependencias de testing
```bash
cd app-control-horarios-frontend
npm install jest jest-environment-node --save-dev
```

## 🎯 Ejecutar Tests

### Tests completos
```bash
# Desde app-control-horarios-frontend/
npm run test:e2e
```

### Tests específicos
```bash
# Solo tests de autenticación
npm run test:auth

# Solo tests de empleados
npm run test:employees

# Solo tests de calendario  
npm run test:calendar
```

### Tests en modo watch (desarrollo)
```bash
npm run test:e2e:watch
```

### Tests en modo headless (CI/CD)
```bash
npm run test:e2e:headless
```

## 🔧 Configuración

### Variables de Entorno
Puedes configurar el comportamiento de los tests con estas variables:

```bash
# URLs de la aplicación
BASE_URL=http://localhost:5173
API_URL=http://localhost:8000/api

# Configuración de Puppeteer
HEADLESS=false              # true para modo headless
SLOW_MO=50                 # Velocidad de ejecución (ms)
SCREENSHOTS=true           # Tomar capturas durante tests

# Ejemplo de ejecución personalizada
HEADLESS=true SLOW_MO=0 npm run test:e2e
```

### Configuración de Test Users
Los tests usan estos usuarios por defecto (definidos en `puppeteer.config.js`):

```javascript
admin: {
  email: 'admin@example.com',
  password: 'password'
}

user: {
  email: 'user@example.com', 
  password: 'userpassword'
}
```

## 📸 Screenshots y Debugging

Los tests automáticamente toman screenshots en puntos clave:
- `screenshots/` - Capturas organizadas por test y timestamp
- Útiles para debugging cuando tests fallan
- Se pueden deshabilitar con `SCREENSHOTS=false`

## 🧪 Tests Incluidos

### 🔐 Authentication Tests (`auth.test.js`)
- ✅ Visualización correcta del formulario de login
- ✅ Validación de campos vacíos
- ✅ Login exitoso con credenciales válidas
- ✅ Rechazo de credenciales inválidas
- ✅ Protección de rutas sin autenticación
- ✅ Logout correcto
- ✅ Persistencia de sesión

### 👥 Employee Management Tests (`employees.test.js`)
- ✅ Visualización del formulario de empleados
- ✅ Validación de campos obligatorios
- ✅ Creación exitosa de empleados
- ✅ Manejo de empleados duplicados
- ✅ Listado y búsqueda de empleados
- ✅ Validación de datos numéricos
- ✅ Validación de reglas de negocio
- ✅ Jerarquía geográfica (País > Comunidad > Ciudad)

### 📅 Calendar Tests (`calendar.test.js`)
- ✅ Visualización correcta del calendario
- ✅ Navegación entre meses
- ✅ Creación de entradas de calendario
- ✅ Visualización de eventos existentes
- ✅ Filtrado por empleado y tipo de actividad
- ✅ Leyenda de tipos de actividad
- ✅ Responsive design

## 🎯 Mejores Prácticas

### Escribir Tests Robustos
```javascript
// ✅ Usar helpers para operaciones comunes
await helpers.loginAsAdmin();
await helpers.navigateToSection('employees');

// ✅ Usar waits apropiados
await helpers.waitForElement('.form-input');
await page.waitForTimeout(1000); // Solo cuando sea necesario

// ✅ Tomar screenshots para debugging
await helpers.screenshot('test-step-description');

// ✅ Manejar errores gracefully
try {
  await helpers.waitForElement('.optional-element', 2000);
} catch (error) {
  console.log('Optional element not found, continuing...');
}
```

### Selectores Resilientes
```javascript
// ✅ Usar múltiples selectores como fallback
const selectors = [
  'input[name="email"]',
  'input[type="email"]', 
  '.email-input'
];

for (const selector of selectors) {
  const element = await page.$(selector);
  if (element) {
    await element.type(email);
    break;
  }
}
```

## 🐛 Debugging

### Tests Fallando
1. **Verificar screenshots** en `screenshots/`
2. **Ejecutar en modo no-headless**: `HEADLESS=false npm run test:auth`
3. **Añadir más logging**: `console.log()` en points clave
4. **Verificar aplicación funcionando**: Backend en :8000, Frontend en :5173

### Errores Comunes
```bash
# Error: Cannot find module 'puppeteer'
npm list puppeteer  # Verificar instalación

# Error: Timeout waiting for element
# Aumentar timeout o verificar selector
await helpers.waitForElement(selector, 10000);

# Error: Navigation timeout
# Verificar que la aplicación esté ejecutándose
curl http://localhost:5173
curl http://localhost:8000/api
```

## 🔄 Integración CI/CD

### GitHub Actions (ejemplo)
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Instalar dependencias
      - run: cd app-control-horarios-frontend && npm install
      
      # Iniciar aplicación
      - run: cd app-control-horarios-frontend && npm run dev &
      - run: cd app-control-horarios-backend && python src/main.py &
      
      # Esperar que aplicación esté lista
      - run: npx wait-on http://localhost:5173 http://localhost:8000
      
      # Ejecutar tests
      - run: cd app-control-horarios-frontend && npm run test:e2e:headless
      
      # Upload screenshots si fallan
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: screenshots
          path: screenshots/
```

## 📊 Métricas de Cobertura

Los tests cubren estas funcionalidades críticas:
- 🔐 **Autenticación**: 100% flows críticos
- 👥 **Empleados**: CRUD completo + validaciones
- 📅 **Calendario**: Visualización + interacción básica
- 🛡️ **Seguridad**: Protección de rutas + roles

## 🔮 Próximos Tests

- [ ] Tests de panel de administración
- [ ] Tests de API endpoints
- [ ] Tests de performance
- [ ] Tests de accesibilidad (a11y)
- [ ] Tests de responsive design completo
- [ ] Tests de integración con festivos globales

---

*Para más información, consulta el archivo `TO-DO.md` del proyecto principal.*