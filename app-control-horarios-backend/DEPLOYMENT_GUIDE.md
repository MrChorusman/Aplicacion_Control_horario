# Guía de Deployment - Control de Horarios

## Índice
- [Arquitectura](#arquitectura)
- [Requisitos Previos](#requisitos-previos)
- [Configuración de Entornos](#configuración-de-entornos)
- [Deployment Local](#deployment-local)
- [Deployment a Staging](#deployment-a-staging)
- [Deployment a Producción](#deployment-a-producción)
- [Monitoreo y Logs](#monitoreo-y-logs)
- [Backup y Recovery](#backup-y-recovery)
- [Troubleshooting](#troubleshooting)

## Arquitectura

### Componentes Principales
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Base de       │
│   (React)       │◄──►│   (Flask)       │◄──►│   Datos         │
│   Port: 3000    │    │   Port: 8000    │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Redis         │    │   Backups       │
│   (Proxy)       │    │   (Cache)       │    │   (S3/Local)    │
│   Port: 80/443  │    │   Port: 6379    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Stack Tecnológico
- **Backend**: Flask + SQLAlchemy + PostgreSQL
- **Frontend**: React + TypeScript (opcional)
- **Cache**: Redis
- **Web Server**: Nginx (reverse proxy)
- **Containerización**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoreo**: Health checks + Métricas estructuradas
- **Logs**: Logging estructurado JSON

## Requisitos Previos

### Software Requerido
```bash
# Docker y Docker Compose
docker --version  # >= 20.10
docker-compose --version  # >= 2.0

# Git
git --version  # >= 2.20

# Node.js (para frontend y E2E tests)
node --version  # >= 18.0
npm --version   # >= 8.0

# AWS CLI (para backups en S3)
aws --version  # >= 2.0
```

### Servicios Externos
- **Base de Datos**: Supabase PostgreSQL o PostgreSQL self-hosted
- **Cache**: Redis Cloud o Redis self-hosted
- **Storage**: AWS S3 para backups
- **DNS**: Configurado para tu dominio
- **SSL**: Certificados SSL/TLS

## Configuración de Entornos

### 1. Variables de Entorno
Copia y configura las variables según el entorno:

```bash
# Para desarrollo
cp .env.example .env
# Edita .env con valores de desarrollo

# Para staging
cp config/environments/staging.env .env.staging

# Para producción
cp config/environments/production.env .env.production
```

### 2. Configuración de Secretos

#### GitHub Secrets (para CI/CD)
```bash
# En tu repositorio de GitHub, configura estos secrets:
DATABASE_URL                 # URL de base de datos
SECRET_KEY                  # Clave secreta de Flask
SECURITY_PASSWORD_SALT      # Salt para passwords
SUPABASE_URL               # URL de Supabase
SUPABASE_ANON_KEY         # Clave anónima de Supabase
SUPABASE_SERVICE_KEY      # Clave de servicio de Supabase
AWS_ACCESS_KEY_ID         # Para backups en S3
AWS_SECRET_ACCESS_KEY     # Para backups en S3
BACKUP_S3_BUCKET         # Bucket de S3 para backups
```

## Deployment Local

### Desarrollo con Docker Compose

1. **Iniciar servicios de desarrollo**:
```bash
# Desarrollo completo con hot reload
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Acceder a pgAdmin: http://localhost:5050
# Acceder a Redis Commander: http://localhost:8081
```

2. **Desarrollo nativo**:
```bash
# Instalar dependencias Python
pip install -r requirements_supabase.txt

# Configurar variables de entorno
export FLASK_ENV=development
export DATABASE_URL=sqlite:///control_horarios_dev.db

# Ejecutar servidor de desarrollo
python src/main.py

# El backend estará disponible en http://localhost:8000
```

### Ejecutar Tests

```bash
# Tests unitarios del backend
cd src
python -m pytest --cov=. --cov-report=html

# Tests E2E
cd e2e
npm install
npm run test

# Tests E2E en modo CI
npm run test:ci
```

## Deployment a Staging

### 1. Configurar Infraestructura
```bash
# Crear recursos en cloud provider (ejemplo con Docker)
docker-compose -f docker-compose.yml up -d

# Configurar variables de entorno de staging
cp config/environments/staging.env .env
```

### 2. Deployment Automático via GitHub Actions
```bash
# Push a branch 'develop' activará deployment automático
git checkout develop
git push origin develop

# Monitorear deployment en GitHub Actions
# https://github.com/tu-usuario/tu-repo/actions
```

### 3. Verificación Post-Deployment
```bash
# Verificar health checks
curl -f https://staging.tu-dominio.com/health

# Verificar métricas
curl https://staging.tu-dominio.com/metrics

# Ejecutar smoke tests
cd e2e
API_URL=https://staging.tu-dominio.com npm run test:smoke
```

## Deployment a Producción

### 1. Pre-Deployment Checklist
- [ ] Tests pasando en CI/CD
- [ ] Staging funcionando correctamente
- [ ] Backup de base de datos actual
- [ ] Variables de entorno configuradas
- [ ] Certificados SSL válidos
- [ ] DNS apuntando correctamente
- [ ] Monitoreo configurado

### 2. Deployment
```bash
# Deployment automático via merge a main
git checkout main
git merge develop
git push origin main

# O deployment manual con Docker
docker-compose -f docker-compose.yml pull
docker-compose -f docker-compose.yml up -d --remove-orphans
```

### 3. Post-Deployment
```bash
# Verificar servicios
docker-compose ps

# Health check
curl -f https://tu-dominio.com/health

# Verificar logs
docker-compose logs -f --tail=100 backend

# Ejecutar smoke tests en producción
cd e2e
API_URL=https://tu-dominio.com npm run test:smoke
```

### 4. Rollback (si es necesario)
```bash
# Rollback automático con Docker
git revert <commit-hash>
git push origin main

# O rollback manual
docker-compose down
git checkout <previous-version>
docker-compose up -d

# Restaurar backup de base de datos si es necesario
./scripts/recovery/database_restore.sh backup_file.sql
```

## Monitoreo y Logs

### Health Checks
```bash
# Health check completo
curl https://tu-dominio.com/health

# Liveness probe (Kubernetes)
curl https://tu-dominio.com/health/live

# Readiness probe (Kubernetes)
curl https://tu-dominio.com/health/ready

# Información de aplicación
curl https://tu-dominio.com/info
```

### Métricas
```bash
# Métricas en formato JSON
curl https://tu-dominio.com/metrics

# Métricas en formato Prometheus
curl https://tu-dominio.com/metrics/prometheus
```

### Logs
```bash
# Ver logs en desarrollo
docker-compose -f docker-compose.dev.yml logs -f backend

# Ver logs en producción
docker-compose logs -f backend

# Logs estructurados se guardan en:
tail -f logs/app.log

# Filtrar logs por nivel
grep "ERROR" logs/app.log | jq '.'
```

### Alertas Recomendadas

1. **Health Check Failures**: Si `/health` retorna 503
2. **High Error Rate**: Si error rate > 5%
3. **Response Time**: Si tiempo respuesta > 2s
4. **Database Connections**: Si conexiones DB > 80%
5. **Disk Space**: Si uso disco > 85%
6. **Memory Usage**: Si uso memoria > 90%

## Backup y Recovery

### Backups Automáticos
```bash
# Configurar cron para backups automáticos
./scripts/backup/backup_cron.sh install

# Ejecutar backup manual
./scripts/backup/database_backup.sh

# Ver estado de backups
./scripts/backup/backup_cron.sh status
```

### Restauración
```bash
# Listar backups disponibles
ls -la /backups/

# Restaurar desde archivo local
./scripts/recovery/database_restore.sh backup_file.sql

# Restaurar desde S3
./scripts/recovery/database_restore.sh --s3-key database-backups/backup_20240101.sql.gz

# Restaurar con drop de BD existente (CUIDADO!)
./scripts/recovery/database_restore.sh --drop-existing --force backup_file.sql
```

### Disaster Recovery Plan

1. **Detección del Problema**
   - Monitoreo automático detecta fallo
   - Alertas enviadas al equipo

2. **Evaluación Inicial**
   - Determinar alcance del problema
   - Decidir entre fix rápido o restauración completa

3. **Comunicación**
   - Notificar a usuarios sobre el problema
   - Activar página de mantenimiento

4. **Restauración**
   - Restaurar desde backup más reciente
   - Verificar integridad de datos
   - Ejecutar smoke tests

5. **Verificación y Monitoreo**
   - Confirmar que todos los servicios funcionan
   - Monitoreo intensivo por 24 horas
   - Post-mortem y mejoras

## Troubleshooting

### Problemas Comunes

#### 1. Backend no inicia
```bash
# Verificar logs
docker-compose logs backend

# Problemas comunes:
# - Variables de entorno faltantes
# - Base de datos no accesible
# - Puerto ya en uso

# Solución:
docker-compose down
docker-compose up -d db redis  # Iniciar dependencias primero
sleep 10
docker-compose up -d backend
```

#### 2. Base de datos no conecta
```bash
# Verificar estado de PostgreSQL
docker-compose ps db

# Verificar conectividad
docker-compose exec backend pg_isready -h db -p 5432 -U postgres

# Verificar logs de DB
docker-compose logs db

# Reiniciar base de datos
docker-compose restart db
```

#### 3. Redis no disponible
```bash
# Verificar Redis
docker-compose ps redis

# Test de conectividad
docker-compose exec redis redis-cli ping

# Reiniciar Redis
docker-compose restart redis
```

#### 4. Performance lenta
```bash
# Verificar métricas
curl localhost:8000/metrics

# Verificar recursos del sistema
docker stats

# Ver queries lentas en PostgreSQL
docker-compose exec db psql -U postgres -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Optimizar:
# - Revisar índices de base de datos
# - Aumentar pool de conexiones
# - Verificar queries N+1
```

#### 5. Error 502 Bad Gateway
```bash
# Verificar Nginx
docker-compose logs nginx

# Verificar backend
docker-compose ps backend
curl localhost:8000/health

# Reiniciar servicios
docker-compose restart nginx backend
```

### Comandos de Diagnóstico

```bash
# Estado general de servicios
docker-compose ps

# Recursos utilizados
docker stats

# Health check completo
curl localhost:8000/health | jq '.'

# Ver conexiones activas
docker-compose exec db psql -U postgres -c "
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE state = 'active';"

# Espacio en disco
df -h

# Memoria disponible
free -h

# Procesos con más memoria
ps aux --sort=-%mem | head -10
```

### Logs para Debugging

```bash
# Logs estructurados con contexto
tail -f logs/app.log | jq 'select(.level=="ERROR")'

# Logs de requests específicos
tail -f logs/app.log | jq 'select(.request_id=="12345")'

# Logs de usuario específico
tail -f logs/app.log | jq 'select(.user_id=="67890")'

# Logs de base de datos
tail -f logs/app.log | jq 'select(.logger=="control_horarios.database")'
```

## Contacto y Soporte

Para problemas o dudas sobre deployment:

- **Documentación**: Este archivo y comentarios en código
- **Issues**: GitHub Issues del repositorio
- **Logs**: Siempre incluir logs relevantes
- **Health Checks**: Resultado de `/health` endpoint

---

**¡Importante!** Siempre realizar deployment en staging antes que en producción y tener backups actualizados antes de cualquier cambio mayor.