#!/bin/bash

# =======================================================================
# CONFIGURACIÓN DE CRON PARA BACKUPS AUTOMATICOS
# =======================================================================
# Este script configura tareas cron para backups automáticos
# =======================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/database_backup.sh"

# Función para instalar crontab
install_cron() {
    echo "Installing backup cron jobs..."
    
    # Crear entrada de cron temporal
    cat > /tmp/backup_cron << EOF
# Control de Horarios - Database Backups
# Backup diario a las 2:30 AM
30 2 * * * $BACKUP_SCRIPT >> /var/log/control-horarios-backup.log 2>&1

# Backup semanal (domingos a las 3:00 AM) con compresión adicional
0 3 * * 0 COMPRESS_BACKUP=true $BACKUP_SCRIPT >> /var/log/control-horarios-backup.log 2>&1

# Limpieza mensual de logs (primer día del mes a las 4:00 AM)
0 4 1 * * find /var/log -name "control-horarios-*.log" -type f -mtime +30 -delete

EOF
    
    # Instalar en crontab del usuario actual
    crontab /tmp/backup_cron
    
    # Limpiar archivo temporal
    rm -f /tmp/backup_cron
    
    echo "Cron jobs installed successfully!"
    echo "Current crontab:"
    crontab -l | grep -E "(Control de Horarios|backup)"
}

# Función para desinstalar crontab
uninstall_cron() {
    echo "Removing backup cron jobs..."
    
    # Obtener crontab actual sin las líneas de backup
    crontab -l 2>/dev/null | grep -v -E "(Control de Horarios|database_backup\.sh)" > /tmp/new_cron
    
    # Reinstalar crontab limpio
    crontab /tmp/new_cron
    
    # Limpiar archivo temporal
    rm -f /tmp/new_cron
    
    echo "Backup cron jobs removed successfully!"
}

# Mostrar ayuda
show_help() {
    cat << EOF
Backup Cron Configuration Script

USAGE:
    $0 [install|uninstall|status]

COMMANDS:
    install     Install backup cron jobs
    uninstall   Remove backup cron jobs
    status      Show current cron status

SCHEDULE:
    - Daily backup at 2:30 AM
    - Weekly compressed backup on Sundays at 3:00 AM
    - Monthly log cleanup on 1st day at 4:00 AM

EOF
}

# Mostrar estado actual
show_status() {
    echo "Current backup-related cron jobs:"
    echo "=================================="
    
    if crontab -l 2>/dev/null | grep -E "(database_backup\.sh|Control de Horarios)" > /dev/null; then
        crontab -l | grep -E "(database_backup\.sh|Control de Horarios)" -A1 -B1
        echo
        echo "Status: INSTALLED"
    else
        echo "No backup cron jobs found."
        echo "Status: NOT INSTALLED"
    fi
    
    echo
    echo "Next backup times (if installed):"
    echo "================================="
    
    # Mostrar próximas ejecuciones estimadas
    local now=$(date)
    local today=$(date +%Y-%m-%d)
    local tomorrow=$(date -d "tomorrow" +%Y-%m-%d)
    local next_sunday=$(date -d "next sunday" +%Y-%m-%d)
    
    echo "Daily backup: ${today} 02:30 or ${tomorrow} 02:30"
    echo "Weekly backup: ${next_sunday} 03:00"
}

# Función principal
main() {
    case "${1:-status}" in
        install)
            install_cron
            ;;
        uninstall)
            uninstall_cron
            ;;
        status)
            show_status
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar si se llama directamente
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi