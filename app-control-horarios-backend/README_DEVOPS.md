# Control de Horarios - DevOps Configuration

## Descripción

Configuración completa de DevOps para la aplicación Control de Horarios, incluyendo CI/CD, containerización, monitoreo, backup/recovery y documentación operacional.

## 🚀 Características DevOps Implementadas

### ✅ CI/CD Pipeline
- **GitHub Actions** workflow completo
- Testing automatizado (unitarios + E2E)
- Build y push de imágenes Docker
- Deploy automático a staging/producción
- Security scanning con Trivy y Bandit
- Notificaciones de deployment

### ✅ Containerización
- **Dockerfile multi-stage** para optimización
- **Docker Compose** para desarrollo, testing y producción
- Configuración de Nginx como reverse proxy
- Health checks y resource limits
- Non-root user para seguridad

### ✅ Environment Management
- Configuraciones separadas por entorno (dev/staging/prod/testing)
- Variables de entorno seguras
- Secrets management con GitHub Actions
- Configuración de Supabase para diferentes entornos

### ✅ Monitoring y Logging
- **Logging estructurado** en formato JSON
- **Health checks** completos (/health, /health/live, /health/ready)
- **Métricas** de aplicación y negocio
- Formato Prometheus para integración con Grafana
- Middleware de request logging automático

### ✅ Backup Strategy
- Scripts automatizados de backup PostgreSQL
- Compresión y encriptación de backups
- Almacenamiento local y S3
- Rotación automática de backups antiguos
- Scripts de restore con verificación de integridad

### ✅ Testing Automatizado
- **E2E Testing** con Puppeteer y Jest
- Tests de smoke, regression y performance
- Screenshot automático en fallos
- Reportes HTML y Allure
- Integración con CI/CD pipeline

## 📁 Estructura de Archivos Creados

```
app-control-horarios-backend/
├── .github/workflows/
│   └── ci-cd.yml                    # Pipeline CI/CD completo
├── docker/
│   ├── Dockerfile.backend           # Multi-stage backend image
│   ├── Dockerfile.frontend          # Frontend con Nginx
│   └── nginx.conf                   # Configuración Nginx optimizada
├── config/environments/
│   ├── development.env              # Variables desarrollo
│   ├── staging.env                  # Variables staging
│   ├── production.env               # Variables producción
│   └── testing.env                  # Variables testing
├── scripts/
│   ├── backup/
│   │   ├── database_backup.sh       # Script backup automatizado
│   │   └── backup_cron.sh           # Configuración cron
│   └── recovery/
│       └── database_restore.sh      # Script restauración
├── src/utils/monitoring/
│   ├── logger.py                    # Sistema logging estructurado
│   ├── health.py                    # Health checks avanzados
│   └── metrics.py                   # Colector métricas
├── src/routes/
│   └── monitoring.py                # Endpoints monitoreo
├── e2e/
│   ├── config/
│   │   ├── jest.setup.js            # Configuración Jest
│   │   ├── jest.global-setup.js     # Setup global E2E
│   │   └── jest.global-teardown.js  # Teardown E2E
│   ├── tests/
│   │   ├── smoke/                   # Tests smoke
│   │   └── regression/              # Tests regression
│   └── package.json                 # Dependencias E2E
├── docker-compose.yml               # Producción
├── docker-compose.dev.yml           # Desarrollo
├── docker-compose.test.yml          # Testing
├── .env.example                     # Template variables
├── DEPLOYMENT_GUIDE.md              # Guía deployment completa
├── RUNBOOK.md                       # Procedimientos operacionales
└── README_DEVOPS.md                 # Esta documentación
```

## 🛠 Quick Start

### 1. Configuración Inicial
```bash
# Clonar repositorio y navegar al directorio
cd app-control-horarios-backend

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Configurar secrets en GitHub
# (ver DEPLOYMENT_GUIDE.md para detalles)
```

### 2. Desarrollo Local
```bash
# Desarrollo con Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Acceder a servicios:
# Backend: http://localhost:8000
# pgAdmin: http://localhost:5050
# Redis Commander: http://localhost:8081

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f backend
```

### 3. Testing
```bash
# Tests E2E
cd e2e
npm install
npm run test

# Health checks
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

### 4. Deploy a Producción
```bash
# Via GitHub Actions (automático)
git push origin main

# Manual
docker-compose pull
docker-compose up -d
```

## 📊 Endpoints de Monitoreo

| Endpoint | Descripción | Formato |
|----------|-------------|---------|
| `/health` | Health check completo | JSON |
| `/health/live` | Liveness probe | JSON |
| `/health/ready` | Readiness probe | JSON |
| `/metrics` | Métricas aplicación | JSON |
| `/metrics/prometheus` | Métricas Prometheus | Text |
| `/info` | Información aplicación | JSON |

## 🔒 Características de Seguridad

- **Non-root containers**: Todos los contenedores corren con usuarios no privilegiados
- **Security scanning**: Trivy para vulnerabilidades, Bandit para código Python
- **Secrets management**: Variables sensibles via GitHub Secrets
- **Network isolation**: Servicios aislados en redes Docker
- **HTTPS enforcement**: Configuración SSL/TLS en Nginx
- **Input validation**: Validación de todos los endpoints
- **Rate limiting**: Protección contra ataques DoS

## 📈 Métricas Implementadas

### Métricas de Aplicación
- Número total de requests HTTP
- Tiempo de respuesta promedio
- Rate de errores (4xx/5xx)
- Conexiones activas a base de datos
- Uso de memoria y CPU

### Métricas de Negocio
- Operaciones de empleados (crear, editar, eliminar)
- Operaciones de calendario (entradas, modificaciones)
- Eventos de autenticación (login, logout, fallos)
- Uso de endpoints por categoría

## 🔄 Estrategia de Backup

### Automático
- **Diario**: Backup a las 2:30 AM
- **Semanal**: Backup comprimido domingos 3:00 AM
- **Retención**: 30 días local, 90 días S3
- **Verificación**: Automática de integridad

### Manual
```bash
# Backup inmediato
./scripts/backup/database_backup.sh

# Restaurar backup
./scripts/recovery/database_restore.sh backup.sql

# Configurar backups automáticos
./scripts/backup/backup_cron.sh install
```

## 📋 Troubleshooting Rápido

### Aplicación No Responde
```bash
docker-compose ps
docker-compose logs backend
curl http://localhost:8000/health
```

### Base de Datos Problemas
```bash
docker-compose logs db
docker-compose exec backend pg_isready -h db -p 5432
```

### Performance Lenta
```bash
curl http://localhost:8000/metrics | jq '.application'
docker stats
```

## 📚 Documentación Adicional

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Guía completa de deployment
- **[RUNBOOK.md](RUNBOOK.md)**: Procedimientos operacionales y resolución de incidentes
- **Código fuente**: Comentarios inline en archivos críticos

## 🎯 Próximos Pasos Recomendados

1. **Implementar monitoreo externo**: Grafana + Prometheus
2. **Configurar alertas**: PagerDuty/Slack para incidentes críticos
3. **Optimizar performance**: Cache Redis, CDN para assets
4. **Security hardening**: Vault para secrets, network policies
5. **Disaster recovery testing**: Simulacros de recuperación

## 🤝 Contribuciones

Para mejorar la configuración DevOps:

1. Fork del repositorio
2. Crear branch feature: `git checkout -b feature/devops-improvement`
3. Commit cambios: `git commit -am 'Add new monitoring feature'`
4. Push branch: `git push origin feature/devops-improvement`
5. Abrir Pull Request

## 📞 Soporte

- **Issues**: GitHub Issues para bugs y mejoras
- **Documentation**: Esta documentación y comentarios inline
- **Emergency**: Ver RUNBOOK.md para procedimientos de emergencia

---

**Configuración DevOps completada** ✅
- CI/CD Pipeline: ✅
- Containerización: ✅
- Monitoring: ✅
- Backup/Recovery: ✅
- Testing E2E: ✅
- Documentación: ✅