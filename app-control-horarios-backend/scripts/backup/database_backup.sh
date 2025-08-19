#!/bin/bash

# =======================================================================
# SCRIPT DE BACKUP DE BASE DE DATOS - CONTROL DE HORARIOS
# =======================================================================
# Este script realiza backups automáticos de la base de datos PostgreSQL
# Soporta compresión, encriptación y almacenamiento en S3
# =======================================================================

set -euo pipefail

# Configuración por defecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="${BACKUP_LOCAL_PATH:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${BACKUP_DIR}/backup.log"

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

# Función de limpieza en caso de error
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "ERROR" "Backup failed with exit code $exit_code"
        # Limpiar archivos temporales
        rm -f "${BACKUP_DIR}/temp_*"
    fi
    exit $exit_code
}

# Configurar trap para limpieza
trap cleanup EXIT

# Verificar dependencias
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    local deps=("pg_dump" "gzip" "aws")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        log "INFO" "Install missing dependencies:"
        log "INFO" "  - PostgreSQL client: apt-get install postgresql-client"
        log "INFO" "  - AWS CLI: pip install awscli"
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
    # Format: postgresql://user:password@host:port/database
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

# Crear backup de base de datos
create_database_backup() {
    local backup_file="$1"
    
    log "INFO" "Creating database backup: $backup_file"
    
    # Configurar variables de entorno para pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Crear backup con pg_dump
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=custom \
        --compress=9 \
        --file="$backup_file" \
        2>&1 | tee -a "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS" "Database backup created successfully"
        
        # Mostrar información del backup
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log "INFO" "Backup size: $backup_size"
    else
        log "ERROR" "Database backup failed"
        return 1
    fi
    
    unset PGPASSWORD
}

# Verificar integridad del backup
verify_backup() {
    local backup_file="$1"
    
    log "INFO" "Verifying backup integrity..."
    
    # Verificar que el archivo existe y no está vacío
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        log "ERROR" "Backup file is missing or empty"
        return 1
    fi
    
    # Verificar formato del backup
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log "SUCCESS" "Backup verification passed"
    else
        log "ERROR" "Backup verification failed - file may be corrupted"
        return 1
    fi
}

# Comprimir y encriptar backup (opcional)
compress_and_encrypt() {
    local backup_file="$1"
    local compressed_file="${backup_file}.gz"
    
    log "INFO" "Compressing backup..."
    
    if gzip "$backup_file"; then
        log "SUCCESS" "Backup compressed: $compressed_file"
        echo "$compressed_file"
    else
        log "ERROR" "Compression failed"
        return 1
    fi
}

# Subir backup a S3
upload_to_s3() {
    local backup_file="$1"
    local s3_bucket="${BACKUP_S3_BUCKET:-}"
    
    if [ -z "$s3_bucket" ]; then
        log "WARN" "S3 bucket not configured, skipping upload"
        return 0
    fi
    
    log "INFO" "Uploading backup to S3: s3://$s3_bucket/"
    
    local s3_key="database-backups/$(basename "$backup_file")"
    
    aws s3 cp "$backup_file" "s3://$s3_bucket/$s3_key" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        2>&1 | tee -a "${LOG_FILE}"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS" "Backup uploaded to S3: s3://$s3_bucket/$s3_key"
    else
        log "ERROR" "S3 upload failed"
        return 1
    fi
}

# Limpiar backups antiguos
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Limpiar backups locales
    find "$BACKUP_DIR" -name "control_horarios_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -delete
    
    local deleted_count=$(find "$BACKUP_DIR" -name "control_horarios_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -print | wc -l)
    log "INFO" "Deleted $deleted_count old local backups"
    
    # Limpiar backups de S3 (si está configurado)
    if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3 ls "s3://$BACKUP_S3_BUCKET/database-backups/" | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$BACKUP_S3_BUCKET/database-backups/$file_name"
                log "INFO" "Deleted old S3 backup: $file_name"
            fi
        done
    fi
    
    log "SUCCESS" "Old backup cleanup completed"
}

# Función principal
main() {
    log "INFO" "=== Starting database backup process ==="
    log "INFO" "Timestamp: $TIMESTAMP"
    
    # Crear directorio de backups
    mkdir -p "$BACKUP_DIR"
    
    # Verificar dependencias
    check_dependencies || exit 1
    
    # Cargar configuración
    load_db_config || exit 1
    
    # Crear nombre del archivo de backup
    local backup_filename="control_horarios_backup_${TIMESTAMP}.sql"
    local backup_path="${BACKUP_DIR}/${backup_filename}"
    
    # Crear backup
    create_database_backup "$backup_path" || exit 1
    
    # Verificar backup
    verify_backup "$backup_path" || exit 1
    
    # Comprimir backup (opcional)
    if [ "${COMPRESS_BACKUP:-true}" = "true" ]; then
        backup_path=$(compress_and_encrypt "$backup_path") || exit 1
    fi
    
    # Subir a S3 (si está configurado)
    upload_to_s3 "$backup_path" || log "WARN" "S3 upload failed, but backup was created locally"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    log "SUCCESS" "=== Backup process completed successfully ==="
    log "INFO" "Backup location: $backup_path"
    
    # Enviar notificación (opcional)
    if [ -n "${BACKUP_NOTIFICATION_WEBHOOK:-}" ]; then
        curl -X POST "$BACKUP_NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"message\": \"Database backup completed successfully\", \"file\": \"$backup_path\"}" \
            2>/dev/null || log "WARN" "Notification webhook failed"
    fi
}

# Ejecutar función principal si el script se ejecuta directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi