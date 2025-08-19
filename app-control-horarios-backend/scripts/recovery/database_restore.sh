#!/bin/bash

# =======================================================================
# SCRIPT DE RESTAURACIÓN DE BASE DE DATOS - CONTROL DE HORARIOS
# =======================================================================
# Este script restaura backups de la base de datos PostgreSQL
# Soporta restauración desde archivos locales o descarga desde S3
# =======================================================================

set -euo pipefail

# Configuración por defecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="${BACKUP_LOCAL_PATH:-/backups}"
LOG_FILE="${BACKUP_DIR}/restore.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
    
    case $level in
        ERROR)   echo -e "${RED}[ERROR]${NC} ${message}" >&2 ;;
        WARN)    echo -e "${YELLOW}[WARN]${NC} ${message}" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} ${message}" ;;
        INFO)    echo -e "${BLUE}[INFO]${NC} ${message}" ;;
    esac
}

# Mostrar ayuda
show_help() {
    cat << EOF
Database Restore Script - Control de Horarios

USAGE:
    $0 [OPTIONS] BACKUP_FILE

OPTIONS:
    -h, --help              Show this help message
    -f, --force             Force restore without confirmation
    -s, --s3-key KEY        Download backup from S3 using this key
    -d, --drop-existing     Drop existing database before restore
    --dry-run               Show what would be restored without executing

EXAMPLES:
    # Restore from local file
    $0 /backups/control_horarios_backup_20240101_120000.sql

    # Restore from S3
    $0 --s3-key database-backups/control_horarios_backup_20240101_120000.sql.gz

    # Force restore with database drop
    $0 --force --drop-existing backup.sql

EOF
}

# Parsear argumentos
parse_arguments() {
    BACKUP_FILE=""
    FORCE_RESTORE=false
    S3_KEY=""
    DROP_EXISTING=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--force)
                FORCE_RESTORE=true
                shift
                ;;
            -s|--s3-key)
                S3_KEY="$2"
                shift 2
                ;;
            -d|--drop-existing)
                DROP_EXISTING=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                BACKUP_FILE="$1"
                shift
                ;;
        esac
    done
    
    # Validar argumentos
    if [ -z "$BACKUP_FILE" ] && [ -z "$S3_KEY" ]; then
        log "ERROR" "Backup file or S3 key is required"
        show_help
        exit 1
    fi
}

# Verificar dependencias
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    local deps=("pg_restore" "psql")
    local missing_deps=()
    
    if [ -n "$S3_KEY" ]; then
        deps+=("aws")
    fi
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log "SUCCESS" "All dependencies available"
}

# Cargar configuración de base de datos
load_db_config() {
    log "INFO" "Loading database configuration..."
    
    # Cargar variables de entorno
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        source "${PROJECT_ROOT}/.env"
    fi
    
    # Verificar variables requeridas
    if [ -z "${DATABASE_URL:-}" ]; then
        log "ERROR" "DATABASE_URL not set"
        return 1
    fi
    
    # Parsear DATABASE_URL
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        log "SUCCESS" "Database configuration loaded: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    else
        log "ERROR" "Invalid DATABASE_URL format: $DATABASE_URL"
        return 1
    fi
}

# Descargar backup desde S3
download_from_s3() {
    local s3_key="$1"
    local s3_bucket="${BACKUP_S3_BUCKET:-}"
    
    if [ -z "$s3_bucket" ]; then
        log "ERROR" "S3 bucket not configured"
        return 1
    fi
    
    log "INFO" "Downloading backup from S3: s3://$s3_bucket/$s3_key"
    
    local local_file="${BACKUP_DIR}/$(basename "$s3_key")"
    
    aws s3 cp "s3://$s3_bucket/$s3_key" "$local_file" 2>&1 | tee -a "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS" "Backup downloaded: $local_file"
        echo "$local_file"
    else
        log "ERROR" "S3 download failed"
        return 1
    fi
}

# Verificar integridad del backup
verify_backup() {
    local backup_file="$1"
    
    log "INFO" "Verifying backup integrity: $backup_file"
    
    # Verificar que el archivo existe
    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    # Verificar si está comprimido
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Backup is compressed, checking gzip integrity..."
        if ! gzip -t "$backup_file"; then
            log "ERROR" "Compressed backup file is corrupted"
            return 1
        fi
        
        # Descomprimir temporalmente para verificar
        local temp_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Verificar formato del backup
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log "SUCCESS" "Backup verification passed"
        echo "$backup_file"
    else
        log "ERROR" "Backup verification failed - invalid format"
        return 1
    fi
}

# Crear backup de seguridad antes de restaurar
create_safety_backup() {
    log "INFO" "Creating safety backup before restore..."
    
    local safety_backup="${BACKUP_DIR}/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=custom \
        --compress=9 \
        --file="$safety_backup" \
        2>&1 | tee -a "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS" "Safety backup created: $safety_backup"
        echo "$safety_backup"
    else
        log "WARN" "Failed to create safety backup - proceeding anyway"
    fi
    
    unset PGPASSWORD
}

# Terminar conexiones activas a la base de datos
terminate_connections() {
    log "INFO" "Terminating active connections to database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --command="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        2>&1 | tee -a "${LOG_FILE}"
    
    unset PGPASSWORD
}

# Eliminar base de datos existente
drop_database() {
    log "WARN" "Dropping existing database: $DB_NAME"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Terminar conexiones primero
    terminate_connections
    
    # Eliminar base de datos
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --command="DROP DATABASE IF EXISTS $DB_NAME;" \
        2>&1 | tee -a "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS" "Database dropped successfully"
    else
        log "ERROR" "Failed to drop database"
        unset PGPASSWORD
        return 1
    fi
    
    # Crear base de datos nueva
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --command="CREATE DATABASE $DB_NAME;" \
        2>&1 | tee -a "${LOG_FILE}"
    
    unset PGPASSWORD
}

# Restaurar base de datos
restore_database() {
    local backup_file="$1"
    
    log "INFO" "Restoring database from: $backup_file"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would restore from $backup_file"
        return 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Ejecutar restauración
    pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$backup_file" \
        2>&1 | tee -a "${LOG_FILE}"
    
    local restore_result=${PIPESTATUS[0]}
    unset PGPASSWORD
    
    if [ $restore_result -eq 0 ]; then
        log "SUCCESS" "Database restore completed successfully"
    else
        log "ERROR" "Database restore failed with exit code $restore_result"
        return 1
    fi
}

# Verificar restauración
verify_restore() {
    log "INFO" "Verifying database restore..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Verificar que las tablas principales existen
    local tables=("employee" "calendar_entry" "holiday" "user" "role")
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        local exists=$(psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            --tuples-only \
            --no-align \
            --command="SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" \
            2>/dev/null)
        
        if [ "$exists" != "t" ]; then
            missing_tables+=("$table")
        fi
    done
    
    unset PGPASSWORD
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        log "WARN" "Some expected tables are missing: ${missing_tables[*]}"
    else
        log "SUCCESS" "All expected tables are present"
    fi
    
    # Mostrar estadísticas básicas
    log "INFO" "Database restore verification completed"
}

# Función de confirmación
confirm_restore() {
    if [ "$FORCE_RESTORE" = true ]; then
        return 0
    fi
    
    echo
    log "WARN" "WARNING: This will restore the database and may overwrite existing data!"
    log "INFO" "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    log "INFO" "Backup file: $BACKUP_FILE"
    
    if [ "$DROP_EXISTING" = true ]; then
        log "WARN" "The existing database will be DROPPED and recreated!"
    fi
    
    echo
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "INFO" "Restore cancelled by user"
        exit 0
    fi
}

# Función principal
main() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    log "INFO" "=== Starting database restore process ==="
    log "INFO" "Timestamp: $timestamp"
    
    # Crear directorio de backups
    mkdir -p "$BACKUP_DIR"
    
    # Parsear argumentos
    parse_arguments "$@"
    
    # Verificar dependencias
    check_dependencies || exit 1
    
    # Cargar configuración
    load_db_config || exit 1
    
    # Determinar archivo de backup a usar
    local backup_to_restore="$BACKUP_FILE"
    
    # Descargar desde S3 si es necesario
    if [ -n "$S3_KEY" ]; then
        backup_to_restore=$(download_from_s3 "$S3_KEY") || exit 1
    fi
    
    # Verificar backup
    backup_to_restore=$(verify_backup "$backup_to_restore") || exit 1
    
    # Confirmar restauración
    confirm_restore
    
    # Crear backup de seguridad
    local safety_backup=""
    if [ "$DRY_RUN" = false ]; then
        safety_backup=$(create_safety_backup) || log "WARN" "Could not create safety backup"
    fi
    
    # Eliminar base de datos existente si se solicita
    if [ "$DROP_EXISTING" = true ]; then
        drop_database || exit 1
    fi
    
    # Restaurar base de datos
    restore_database "$backup_to_restore" || exit 1
    
    # Verificar restauración
    if [ "$DRY_RUN" = false ]; then
        verify_restore
    fi
    
    log "SUCCESS" "=== Database restore process completed ==="
    
    if [ -n "$safety_backup" ]; then
        log "INFO" "Safety backup available at: $safety_backup"
    fi
    
    # Limpiar archivos temporales
    if [[ "$backup_to_restore" == *"temp_"* ]]; then
        rm -f "$backup_to_restore"
    fi
}

# Ejecutar función principal si el script se ejecuta directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi