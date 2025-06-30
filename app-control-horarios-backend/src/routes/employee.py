from flask import Blueprint, request, jsonify
from src.models.employee import db, Employee
from datetime import datetime
import re

employee_bp = Blueprint('employee', __name__)

@employee_bp.route('/employees', methods=['GET'])
def get_employees():
    """Obtener todos los empleados con filtros opcionales"""
    try:
        # Parámetros de filtro opcionales
        team_name = request.args.get('team')
        community = request.args.get('community')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # Construir query base
        query = Employee.query
        
        # Aplicar filtros
        if team_name:
            query = query.filter(Employee.team_name.ilike(f'%{team_name}%'))
        if community:
            query = query.filter(Employee.autonomous_community == community)
        
        # Ordenar por equipo y nombre
        query = query.order_by(Employee.team_name, Employee.full_name)
        
        # Paginación
        if per_page > 100:
            per_page = 100  # Límite máximo
        
        employees = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [emp.to_dict() for emp in employees.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': employees.total,
                'pages': employees.pages,
                'has_next': employees.has_next,
                'has_prev': employees.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener empleados: {str(e)}'
        }), 500

@employee_bp.route('/employees/teams', methods=['GET'])
def get_teams():
    """Obtener lista de equipos únicos"""
    try:
        # Obtener equipos únicos
        teams_query = db.session.query(Employee.team_name).distinct().all()
        teams = [team[0] for team in teams_query if team[0]]  # Filtrar valores None
        teams.sort()  # Ordenar alfabéticamente
        
        return jsonify({
            'success': True,
            'data': teams,
            'count': len(teams)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener equipos: {str(e)}'
        }), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Obtener un empleado específico por ID"""
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'data': employee.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener empleado: {str(e)}'
        }), 500

@employee_bp.route('/employees', methods=['POST'])
def create_employee():
    """Crear un nuevo empleado"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        required_fields = ['team_name', 'full_name', 'hours_mon_thu', 'hours_fri', 
                          'vacation_days', 'free_hours', 'autonomous_community']
        
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    'success': False,
                    'message': f'Campo requerido faltante: {field}'
                }), 400
        
        # Validaciones específicas
        if not isinstance(data['hours_mon_thu'], (int, float)) or data['hours_mon_thu'] < 0:
            return jsonify({
                'success': False,
                'message': 'Las horas de lunes a jueves deben ser un número positivo'
            }), 400
        
        if not isinstance(data['hours_fri'], (int, float)) or data['hours_fri'] < 0:
            return jsonify({
                'success': False,
                'message': 'Las horas de viernes deben ser un número positivo'
            }), 400
        
        if not isinstance(data['vacation_days'], int) or data['vacation_days'] < 1:
            return jsonify({
                'success': False,
                'message': 'Los días de vacaciones deben ser un número entero positivo'
            }), 400
        
        if not isinstance(data['free_hours'], int) or data['free_hours'] < 0:
            return jsonify({
                'success': False,
                'message': 'Las horas libres deben ser un número entero no negativo'
            }), 400
        
        # Validar formato del nombre
        if len(data['full_name'].strip()) < 2:
            return jsonify({
                'success': False,
                'message': 'El nombre debe tener al menos 2 caracteres'
            }), 400
        
        # Validar que no exista empleado con el mismo nombre
        existing_employee = Employee.query.filter_by(full_name=data['full_name'].strip()).first()
        if existing_employee:
            return jsonify({
                'success': False,
                'message': 'Ya existe un empleado con ese nombre'
            }), 400
        
        # Crear nuevo empleado
        employee = Employee(
            team_name=data['team_name'].strip(),
            full_name=data['full_name'].strip(),
            hours_mon_thu=float(data['hours_mon_thu']),
            hours_fri=float(data['hours_fri']),
            vacation_days=int(data['vacation_days']),
            free_hours=int(data['free_hours']),
            autonomous_community=data['autonomous_community'].strip()
        )
        
        db.session.add(employee)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': employee.to_dict(),
            'message': 'Empleado creado exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al crear empleado: {str(e)}'
        }), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Actualizar un empleado existente"""
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        data = request.get_json()
        
        # Actualizar campos si están presentes
        if 'team_name' in data:
            employee.team_name = data['team_name'].strip()
        if 'full_name' in data:
            # Validar que no exista otro empleado con el mismo nombre
            if data['full_name'].strip() != employee.full_name:
                existing = Employee.query.filter_by(full_name=data['full_name'].strip()).first()
                if existing:
                    return jsonify({
                        'success': False,
                        'message': 'Ya existe un empleado con ese nombre'
                    }), 400
            employee.full_name = data['full_name'].strip()
        if 'hours_mon_thu' in data:
            employee.hours_mon_thu = float(data['hours_mon_thu'])
        if 'hours_fri' in data:
            employee.hours_fri = float(data['hours_fri'])
        if 'vacation_days' in data:
            employee.vacation_days = int(data['vacation_days'])
        if 'free_hours' in data:
            employee.free_hours = int(data['free_hours'])
        if 'autonomous_community' in data:
            employee.autonomous_community = data['autonomous_community'].strip()
        
        employee.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': employee.to_dict(),
            'message': 'Empleado actualizado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al actualizar empleado: {str(e)}'
        }), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Eliminar un empleado"""
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        # Guardar información para respuesta
        employee_info = employee.to_dict()
        
        db.session.delete(employee)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': employee_info,
            'message': 'Empleado eliminado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al eliminar empleado: {str(e)}'
        }), 500

@employee_bp.route('/employees/stats', methods=['GET'])
def get_employee_stats():
    """Obtener estadísticas generales de empleados"""
    try:
        total_employees = Employee.query.count()
        teams_count = db.session.query(Employee.team_name).distinct().count()
        
        # Estadísticas por comunidad autónoma
        communities = db.session.query(
            Employee.autonomous_community,
            db.func.count(Employee.id).label('count')
        ).group_by(Employee.autonomous_community).all()
        
        # Estadísticas por equipo
        teams = db.session.query(
            Employee.team_name,
            db.func.count(Employee.id).label('count'),
            db.func.avg(Employee.hours_mon_thu).label('avg_hours_mon_thu'),
            db.func.avg(Employee.hours_fri).label('avg_hours_fri')
        ).group_by(Employee.team_name).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total_employees': total_employees,
                'total_teams': teams_count,
                'by_community': [
                    {'community': comm[0], 'count': comm[1]} 
                    for comm in communities
                ],
                'by_team': [
                    {
                        'team': team[0],
                        'count': team[1],
                        'avg_hours_mon_thu': round(float(team[2] or 0), 1),
                        'avg_hours_fri': round(float(team[3] or 0), 1)
                    }
                    for team in teams
                ]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener estadísticas: {str(e)}'
        }), 500

