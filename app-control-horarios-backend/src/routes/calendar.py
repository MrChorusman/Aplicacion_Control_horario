from flask import Blueprint, request, jsonify
from src.models.employee import db, Employee, CalendarEntry, Holiday
from datetime import datetime, date, timedelta
import calendar as cal
from flask_security import auth_required

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/calendar/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_calendar_data(year, month):
    """Obtener datos del calendario para un mes específico"""
    try:
        print(f"📅 Obteniendo datos del calendario para {year}/{month}")
        
        # Validar fecha
        if not (1 <= month <= 12):
            return jsonify({
                'success': False,
                'message': 'Mes inválido'
            }), 400
        
        if not (2020 <= year <= 2030):
            return jsonify({
                'success': False,
                'message': 'Año inválido'
            }), 400
        
        # Obtener empleados con manejo de errores
        try:
            employees = Employee.query.all()
            print(f"👥 Empleados encontrados: {len(employees)}")
        except Exception as e:
            print(f"❌ Error al obtener empleados: {e}")
            return jsonify({
                'success': False,
                'message': f'Error al obtener empleados: {str(e)}'
            }), 500
        
        if not employees:
            return jsonify({
                'success': True,
                'data': {},
                'message': 'No hay empleados registrados'
            })
        
        # Obtener entradas del calendario para el mes
        try:
            start_date = date(year, month, 1)
            end_date = date(year, month, cal.monthrange(year, month)[1])
            
            calendar_entries = CalendarEntry.query.filter(
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            print(f"📋 Entradas del calendario encontradas: {len(calendar_entries)}")
            
        except Exception as e:
            print(f"❌ Error al obtener entradas del calendario: {e}")
            return jsonify({
                'success': False,
                'message': f'Error al obtener entradas del calendario: {str(e)}'
            }), 500
        
        # Organizar datos por empleado
        calendar_data = {}
        for employee in employees:
            calendar_data[employee.id] = []
        
        # Agregar entradas del calendario
        for entry in calendar_entries:
            if entry.employee_id in calendar_data:
                calendar_data[entry.employee_id].append({
                    'id': entry.id,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'activity_type': entry.activity_type,
                    'hours': entry.hours,
                    'notes': entry.notes
                })
        
        print(f"✅ Datos del calendario organizados para {len(calendar_data)} empleados")
        
        return jsonify({
            'success': True,
            'data': calendar_data,
            'meta': {
                'year': year,
                'month': month,
                'days_in_month': cal.monthrange(year, month)[1],
                'employees_count': len(employees),
                'entries_count': len(calendar_entries)
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_calendar_data: {e}")
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@calendar_bp.route('/calendar/entry', methods=['POST'])
@auth_required('jwt')
def create_calendar_entry():
    """Crear una nueva entrada en el calendario"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No se proporcionaron datos'
            }), 400
        
        # Validar campos requeridos
        required_fields = ['employee_id', 'date', 'activity_type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Campo requerido faltante: {field}'
                }), 400
        
        # Validar empleado existe
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        # Validar fecha
        try:
            entry_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }), 400
        
        # Verificar si ya existe una entrada para ese día
        existing_entry = CalendarEntry.query.filter_by(
            employee_id=data['employee_id'],
            date=entry_date
        ).first()
        
        if existing_entry:
            # Actualizar entrada existente
            existing_entry.activity_type = data['activity_type']
            existing_entry.hours = data.get('hours')
            existing_entry.notes = data.get('notes', '')
            existing_entry.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Entrada actualizada exitosamente',
                'data': {
                    'id': existing_entry.id,
                    'employee_id': existing_entry.employee_id,
                    'date': existing_entry.date.strftime('%Y-%m-%d'),
                    'activity_type': existing_entry.activity_type,
                    'hours': existing_entry.hours,
                    'notes': existing_entry.notes
                }
            })
        else:
            # Crear nueva entrada
            new_entry = CalendarEntry(
                employee_id=data['employee_id'],
                date=entry_date,
                activity_type=data['activity_type'],
                hours=data.get('hours'),
                notes=data.get('notes', ''),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.session.add(new_entry)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Entrada creada exitosamente',
                'data': {
                    'id': new_entry.id,
                    'employee_id': new_entry.employee_id,
                    'date': new_entry.date.strftime('%Y-%m-%d'),
                    'activity_type': new_entry.activity_type,
                    'hours': new_entry.hours,
                    'notes': new_entry.notes
                }
            })
            
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al crear entrada del calendario: {e}")
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@calendar_bp.route('/calendar/entry/<int:entry_id>', methods=['DELETE'])
@auth_required('jwt')
def delete_calendar_entry(entry_id):
    """Eliminar una entrada del calendario"""
    try:
        entry = CalendarEntry.query.get(entry_id)
        
        if not entry:
            return jsonify({
                'success': False,
                'message': 'Entrada no encontrada'
            }), 404
        
        db.session.delete(entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Entrada eliminada exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al eliminar entrada del calendario: {e}")
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@calendar_bp.route('/calendar/employee/<int:employee_id>/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_employee_calendar(employee_id, year, month):
    """Obtener calendario específico de un empleado"""
    try:
        # Validar empleado
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        # Obtener entradas del mes
        start_date = date(year, month, 1)
        end_date = date(year, month, cal.monthrange(year, month)[1])
        
        entries = CalendarEntry.query.filter(
            CalendarEntry.employee_id == employee_id,
            CalendarEntry.date >= start_date,
            CalendarEntry.date <= end_date
        ).all()
        
        entries_data = []
        for entry in entries:
            entries_data.append({
                'id': entry.id,
                'date': entry.date.strftime('%Y-%m-%d'),
                'activity_type': entry.activity_type,
                'hours': entry.hours,
                'notes': entry.notes
            })
        
        return jsonify({
            'success': True,
            'data': {
                'employee': {
                    'id': employee.id,
                    'name': employee.full_name,
                    'team': employee.team_name
                },
                'entries': entries_data,
                'month_info': {
                    'year': year,
                    'month': month,
                    'days_in_month': cal.monthrange(year, month)[1]
                }
            }
        })
        
    except Exception as e:
        print(f"❌ Error al obtener calendario del empleado: {e}")
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

