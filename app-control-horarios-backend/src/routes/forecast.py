from flask import Blueprint, request, jsonify
from src.models.employee import Employee, CalendarEntry, Holiday, db
from src.utils.hours_calculator import HoursCalculator
from datetime import datetime
import calendar
from flask_security import auth_required

forecast_bp = Blueprint('forecast', __name__)
calculator = HoursCalculator()

@forecast_bp.route('/forecast/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_monthly_forecast(year, month):
    """Obtener forecast mensual para todos los empleados o uno específico"""
    try:
        # Obtener parámetros opcionales
        employee_id = request.args.get('employee_id', type=int)
        
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
        
        if employee_id:
            # Forecast de un empleado específico
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({
                    'success': False,
                    'message': 'Empleado no encontrado'
                }), 404
            
            forecast_data = calculator.calculate_employee_forecast(employee, year, month)
            if forecast_data:
                return jsonify({
                    'success': True,
                    'data': forecast_data
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Error al calcular forecast del empleado'
                }), 500
        else:
            # Forecast de todos los equipos para Dashboard
            dashboard_data = calculator.calculate_dashboard_summary(year, month)
            if dashboard_data:
                return jsonify({
                    'success': True,
                    'data': dashboard_data
                })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@forecast_bp.route('/forecast/employee/<int:employee_id>/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_employee_forecast(employee_id, year, month):
    """Obtener forecast de un empleado específico"""
    try:
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
        
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        forecast_data = calculator.calculate_employee_forecast(employee, year, month)
        
        if forecast_data:
            return jsonify({
                'success': True,
                'data': forecast_data
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Error al calcular forecast del empleado'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@forecast_bp.route('/forecast/team/<string:team_name>/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_team_forecast(team_name, year, month):
    """Obtener forecast de un equipo específico"""
    try:
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
        
        # Verificar que el equipo existe
        team_exists = Employee.query.filter_by(team_name=team_name).first()
        if not team_exists:
            return jsonify({
                'success': False,
                'message': 'Equipo no encontrado'
            }), 404
        
        team_data = calculator.calculate_team_summary(team_name, year, month)
        
        if team_data:
            return jsonify({
                'success': True,
                'data': team_data
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Error al calcular forecast del equipo'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@forecast_bp.route('/forecast/monthly/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_monthly_summary(year, month):
    """Obtener resumen mensual de todos los equipos"""
    try:
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
        
        all_teams_data = calculator.calculate_all_teams_summary(year, month)
        
        if all_teams_data:
            return jsonify({
                'success': True,
                'data': all_teams_data
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Error al calcular resumen mensual'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@forecast_bp.route('/forecast/working-days/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_working_days(year, month):
    """Obtener días laborables de un mes"""
    try:
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
        
        working_days = calculator.get_working_days_in_month(year, month)
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'working_days': working_days,
                'total_days': calendar.monthrange(year, month)[1]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

@forecast_bp.route('/forecast/indra-inditex/<int:employee_id>/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_indra_inditex_hours(employee_id, year, month):
    """Obtener cálculo específico de horas INDRA e INDITEX"""
    try:
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
        
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Empleado no encontrado'
            }), 404
        
        # Calcular horas específicas
        theoretical_hours = calculator.calculate_theoretical_hours(employee, year, month)
        actual_hours = calculator.calculate_actual_hours(employee, year, month)
        indra_hours = calculator.calculate_indra_hours(employee, year, month)
        inditex_hours = calculator.calculate_inditex_hours(employee, year, month)
        
        return jsonify({
            'success': True,
            'data': {
                'employee_id': employee_id,
                'employee_name': employee.full_name,
                'year': year,
                'month': month,
                'theoretical_hours': round(theoretical_hours, 1),
                'actual_hours': round(actual_hours, 1),
                'indra_hours': round(indra_hours, 1),
                'inditex_hours': round(inditex_hours, 1),
                'indra_percentage': 60,
                'inditex_percentage': 40,
                'calculation_method': {
                    'indra': 'Día 1 al último del mes (60% de horas reales)',
                    'inditex': 'Día 26 del mes anterior al 25 del mes actual (40% de horas del período)'
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor: {str(e)}'
        }), 500

