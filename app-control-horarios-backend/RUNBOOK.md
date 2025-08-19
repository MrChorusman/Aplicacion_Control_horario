# Runbook Operacional - Control de Horarios

## Índice de Procedimientos de Emergencia

### 🚨 Incidentes Críticos
- [Aplicación Completamente Caída](#aplicación-completamente-caída)
- [Base de Datos No Responde](#base-de-datos-no-responde)
- [Performance Extremadamente Lenta](#performance-extremadamente-lenta)
- [Pérdida de Datos](#pérdida-de-datos)

### ⚠️ Problemas Comunes
- [Error 500 Intermitente](#error-500-intermitente)
- [Usuarios No Pueden Autenticarse](#usuarios-no-pueden-autenticarse)
- [Carga Lenta de Datos](#carga-lenta-de-datos)
- [Errores de Conexión a Base de Datos](#errores-de-conexión-a-base-de-datos)

### 🔧 Mantenimiento Programado
- [Actualización de Aplicación](#actualización-de-aplicación)
- [Mantenimiento de Base de Datos](#mantenimiento-de-base-de-datos)
- [Rotación de Logs](#rotación-de-logs)

---

## 🚨 INCIDENTES CRÍTICOS

### Aplicación Completamente Caída

**Síntomas:**
- Health check `/health` retorna 503 o timeout
- Usuarios reportan que no pueden acceder
- Alertas de monitoreo activadas

**Diagnóstico Inmediato:**
```bash
# 1. Verificar estado de servicios
docker-compose ps

# 2. Health check rápido
curl -I https://tu-dominio.com/health

# 3. Ver logs del backend
docker-compose logs --tail=50 backend
```

**Acciones de Recuperación:**

1. **Reinicio Rápido (2 minutos)**:
```bash
# Reiniciar todos los servicios
docker-compose restart

# Verificar que levantan correctamente
docker-compose ps
```

2. **Si el reinicio falla, deployment limpio (5 minutos)**:
```bash
# Backup de seguridad (si es posible)
./scripts/backup/database_backup.sh

# Parar servicios
docker-compose down

# Limpiar y levantar servicios
docker-compose up -d

# Verificar salud
curl https://tu-dominio.com/health
```

3. **Si persiste, rollback a versión anterior (10 minutos)**:
```bash
# Ver último commit funcional
git log --oneline -10

# Rollback
git reset --hard <commit-hash-funcional>
docker-compose down
docker-compose up -d
```

**Escalación:**
- Si no se resuelve en 15 minutos → Contactar equipo de desarrollo
- Si hay pérdida de datos → Activar procedimiento de disaster recovery

---

### Base de Datos No Responde

**Síntomas:**
- Health check `/health/ready` falla
- Errores "Connection refused" en logs
- Timeouts en queries

**Diagnóstico:**
```bash
# 1. Estado del contenedor de DB
docker-compose ps db

# 2. Logs de PostgreSQL
docker-compose logs --tail=100 db

# 3. Intentar conexión directa
docker-compose exec backend pg_isready -h db -p 5432 -U postgres

# 4. Ver procesos dentro del contenedor
docker-compose exec db ps aux
```

**Acciones de Recuperación:**

1. **Reinicio de BD (3 minutos)**:
```bash
# Reiniciar solo la base de datos
docker-compose restart db

# Esperar que esté lista
sleep 30
docker-compose exec backend pg_isready -h db -p 5432 -U postgres
```

2. **Si no responde, verificar recursos (2 minutos)**:
```bash
# Verificar espacio en disco
df -h

# Verificar memoria
free -h

# Ver procesos que consumen recursos
top -o %MEM
```

3. **Recovery completo de BD (15 minutos)**:
```bash
# Parar aplicación para evitar corrupciones
docker-compose stop backend

# Parar base de datos
docker-compose stop db

# Verificar logs del sistema
dmesg | tail -20

# Levantar BD con logs detallados
docker-compose up -d db
docker-compose logs -f db

# Una vez estable, levantar backend
docker-compose up -d backend
```

4. **Último recurso - Restaurar desde backup (30 minutos)**:
```bash
# Listar backups disponibles
ls -la /backups/ | head -10

# Restaurar backup más reciente
./scripts/recovery/database_restore.sh --force <backup-más-reciente>

# Verificar integridad
curl https://tu-dominio.com/health
```

---

### Performance Extremadamente Lenta

**Síntomas:**
- Requests toman > 10 segundos
- Usuarios reportan timeout
- Alta carga de CPU/memoria

**Diagnóstico Rápido:**
```bash
# 1. Verificar recursos del sistema
docker stats

# 2. Ver métricas de aplicación
curl localhost:8000/metrics | jq '.application'

# 3. Queries lentas en PostgreSQL
docker-compose exec db psql -U postgres -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 4. Ver conexiones activas
docker-compose exec db psql -U postgres -c "
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;"
```

**Acciones Inmediatas:**

1. **Terminar queries problemáticas (2 minutos)**:
```bash
# Identificar queries lentas
docker-compose exec db psql -U postgres -c "
SELECT pid, query, state, query_start
FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '2 minutes'
AND query NOT LIKE '%pg_stat_activity%';"

# Terminar query específica (CUIDADO!)
# docker-compose exec db psql -U postgres -c "SELECT pg_terminate_backend(<PID>);"
```

2. **Reiniciar servicios para limpiar conexiones (3 minutos)**:
```bash
# Reinicio graceful
docker-compose restart backend
sleep 10
curl https://tu-dominio.com/health
```

3. **Escalar recursos temporalmente (si está en cloud)**:
```bash
# Aumentar réplicas del backend (Kubernetes)
# kubectl scale deployment control-horarios-backend --replicas=5

# O aumentar recursos del contenedor
# Modificar docker-compose.yml temporalmente
```

---

### Pérdida de Datos

**Síntomas:**
- Usuarios reportan datos faltantes
- Inconsistencias en base de datos
- Errores de integridad referencial

**⚠️ CRÍTICO - Acciones Inmediatas:**

1. **STOP - Aislar el problema (1 minuto)**:
```bash
# Activar modo mantenimiento INMEDIATAMENTE
docker-compose stop nginx
# O redirigir tráfico a página de mantenimiento
```

2. **Backup inmediato del estado actual (5 minutos)**:
```bash
# Backup de emergencia
./scripts/backup/database_backup.sh
mv /backups/control_horarios_backup_*.sql /backups/EMERGENCY_$(date +%Y%m%d_%H%M%S).sql
```

3. **Evaluación de daños (10 minutos)**:
```bash
# Verificar integridad de base de datos
docker-compose exec db psql -U postgres -d control_horarios -c "
SELECT schemaname, tablename, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;"

# Verificar constraints
docker-compose exec db psql -U postgres -d control_horarios -c "
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE confrelid = 0;"
```

4. **Contactar equipo de desarrollo INMEDIATAMENTE**
5. **Documentar todo lo observado**
6. **NO restaurar backups sin consultar primero**

---

## ⚠️ PROBLEMAS COMUNES

### Error 500 Intermitente

**Síntomas:**
- Algunos requests fallan con 500
- Otros requests funcionan normalmente
- Error rate entre 1-10%

**Diagnóstico:**
```bash
# 1. Ver errores recientes en logs
docker-compose logs --since=10m backend | grep ERROR

# 2. Verificar patrones en errores
tail -f logs/app.log | jq 'select(.level=="ERROR")' | jq '.message' | sort | uniq -c

# 3. Verificar recursos
docker stats backend
```

**Soluciones:**

1. **Errores por timeout de BD**:
```bash
# Verificar pool de conexiones
curl localhost:8000/health | jq '.checks.database.details'

# Ajustar pool en .env (requiere reinicio)
# SQLALCHEMY_POOL_SIZE=10
# SQLALCHEMY_POOL_TIMEOUT=30
```

2. **Memory leaks**:
```bash
# Reinicio programado cada 6 horas (workaround temporal)
# Agregar a cron:
# 0 */6 * * * docker-compose restart backend
```

---

### Usuarios No Pueden Autenticarse

**Síntomas:**
- Login retorna 401 o 500
- Tokens no funcionan
- Registros fallan

**Diagnóstico:**
```bash
# 1. Test de login directo
curl -X POST localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# 2. Verificar variables de entorno críticas
docker-compose exec backend printenv | grep -E "(SECRET_KEY|SECURITY_PASSWORD_SALT)"

# 3. Verificar tabla de usuarios
docker-compose exec db psql -U postgres -d control_horarios -c "SELECT count(*) FROM public.user;"
```

**Soluciones:**

1. **Variables de entorno faltantes**:
```bash
# Verificar .env
grep -E "(SECRET_KEY|SECURITY_PASSWORD_SALT)" .env

# Si faltan, regenerar (CUIDADO: invalidará sesiones existentes)
# python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
# python -c "import secrets; print('SECURITY_PASSWORD_SALT=' + secrets.token_urlsafe(32))"
```

2. **Problema con base de datos de usuarios**:
```bash
# Crear usuario admin de emergencia
docker-compose exec backend python -c "
from src.models.employee import *
from src.main import app, user_datastore
with app.app_context():
    user = user_datastore.create_user(
        email='admin@emergency.com',
        password='TempPassword123!',
        active=True
    )
    db.session.commit()
    print('Emergency admin created')
"
```

---

### Carga Lenta de Datos

**Síntomas:**
- APIs de listado tardan > 5 segundos
- Frontend se ve lento
- Timeouts ocasionales

**Diagnóstico:**
```bash
# 1. Verificar queries lentas
docker-compose exec db psql -U postgres -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 5;"

# 2. Verificar cache Redis
docker-compose exec redis redis-cli info memory

# 3. Ver métricas de timing
curl localhost:8000/metrics | jq '.application'
```

**Soluciones:**

1. **Optimizar queries**:
```bash
# Analizar query específica
docker-compose exec db psql -U postgres -d control_horarios -c "
EXPLAIN ANALYZE SELECT * FROM employee LIMIT 100;"

# Crear índices faltantes (ejemplo)
docker-compose exec db psql -U postgres -d control_horarios -c "
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_department ON employee(department);"
```

2. **Implementar paginación**:
```bash
# Verificar que APIs usen LIMIT
curl "localhost:8000/api/employees?page=1&limit=50"
```

---

## 🔧 MANTENIMIENTO PROGRAMADO

### Actualización de Aplicación

**Antes del mantenimiento:**
```bash
# 1. Notificar usuarios (30 min antes)
# 2. Backup completo
./scripts/backup/database_backup.sh

# 3. Verificar backup
ls -la /backups/ | head -5
```

**Durante el mantenimiento:**
```bash
# 1. Activar modo mantenimiento
# Crear página de mantenimiento o usar load balancer

# 2. Actualizar código
git pull origin main

# 3. Update y restart servicios
docker-compose pull
docker-compose up -d

# 4. Verificar deployment
curl https://tu-dominio.com/health
```

**Post-mantenimiento:**
```bash
# 1. Smoke tests
cd e2e
npm run test:smoke

# 2. Verificar métricas
curl https://tu-dominio.com/metrics

# 3. Monitoreo intensivo por 2 horas
# 4. Notificar fin de mantenimiento
```

---

### Mantenimiento de Base de Datos

**Tareas mensuales:**
```bash
# 1. Vacuum y analyze
docker-compose exec db psql -U postgres -d control_horarios -c "
VACUUM ANALYZE;"

# 2. Revisar tamaño de tablas
docker-compose exec db psql -U postgres -d control_horarios -c "
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 3. Limpiar logs antiguos
docker-compose exec db psql -U postgres -c "
SELECT pg_stat_statements_reset();"

# 4. Verificar índices no utilizados
docker-compose exec db psql -U postgres -d control_horarios -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;"
```

---

### Rotación de Logs

**Script automatizado (semanal):**
```bash
#!/bin/bash
# Rotar logs de aplicación
find logs/ -name "*.log" -type f -size +100M -exec gzip {} \;
find logs/ -name "*.log.gz" -type f -mtime +30 -delete

# Limpiar logs de Docker
docker system prune -f

# Restart logging para crear nuevos archivos
docker-compose restart backend
```

---

## 📞 CONTACTOS DE EMERGENCIA

- **Equipo de Desarrollo**: [email/slack]
- **Administrador de Sistema**: [email/teléfono]
- **Supabase Support**: [si se usa]
- **Proveedor de Cloud**: [si aplica]

---

## 📋 CHECKLIST DE POST-INCIDENTE

Después de resolver cualquier incidente:

- [ ] Documentar causa raíz
- [ ] Actualizar monitoreo/alertas si es necesario
- [ ] Revisar si se necesitan mejoras en este runbook
- [ ] Comunicar resolución a usuarios si fue visible
- [ ] Programar post-mortem si el incidente fue crítico
- [ ] Actualizar documentación si se encontraron gaps

---

**¡Recuerda!** En caso de duda, siempre es mejor:
1. Hacer backup antes de cualquier cambio
2. Preguntar al equipo antes de acciones destructivas
3. Documentar todo lo que observes y hagas