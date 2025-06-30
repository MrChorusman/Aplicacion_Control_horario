from flask import Blueprint, request, jsonify
from src.models.employee import db, Holiday
from src.services.holiday_service import HolidayService
from datetime import datetime, date
import calendar as cal
from flask_security import auth_required

holiday_bp = Blueprint('holiday', __name__)
holiday_service = HolidayService()

@holiday_bp.route('/holidays/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_holidays_by_month(year, month):
    """Obtener festivos de un mes específico"""
    try:
        # Validar fecha
        if not (1 <= month <= 12):
            return jsonify({
                'success': False,
                'message': 'Mes inválido. Debe estar entre 1 y 12'
            }), 400
        
        if not (2020 <= year <= 2030):
            return jsonify({
                'success': False,
                'message': 'Año inválido. Debe estar entre 2020 y 2030'
            }), 400
        
        # Obtener parámetros opcionales
        community = request.args.get('community')
        
        # Mapeo de nombres completos a códigos de comunidades autónomas
        community_mapping = {
            'Galicia': 'GA',
            'Cataluña': 'CT',
            'Madrid': 'MD',
            'Andalucía': 'AN',
            'Valencia': 'VC',
            'País Vasco': 'PV',
            'Castilla y León': 'CL',
            'Castilla-La Mancha': 'CM',
            'Canarias': 'CN',
            'Aragón': 'AR',
            'Extremadura': 'EX',
            'Asturias': 'AS',
            'Navarra': 'NC',
            'Murcia': 'MC',
            'Cantabria': 'CB',
            'Baleares': 'IB',
            'La Rioja': 'RI',
            'Ceuta': 'CE',
            'Melilla': 'ML'
        }
        
        # Convertir nombre completo a código si es necesario
        community_code = None
        if community:
            community_code = community_mapping.get(community, community)
        
        # Obtener festivos del mes
        holidays = []
        try:
            holidays = holiday_service.get_holidays_by_month(year, month, community_code)
        except AttributeError:
            # Si el método no existe, usar consulta directa
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month + 1, 1)
            
            query = Holiday.query.filter(
                Holiday.date >= start_date,
                Holiday.date < end_date
            )
            
            if community:
                # Buscar por código o nombre completo
                query = query.filter(
                    db.or_(
                        Holiday.autonomous_community == community_code,
                        Holiday.autonomous_community == community,
                        Holiday.autonomous_community.is_(None)  # Festivos nacionales
                    )
                )
            else:
                # Solo festivos nacionales si no se especifica comunidad
                query = query.filter(Holiday.autonomous_community.is_(None))
            
            holidays = query.order_by(Holiday.date).all()
        
        # Debug para julio
        if month == 7:
            print(f"🔍 DEBUG holidays route: Buscando festivos para {year}/{month}")
            print(f"   Comunidad solicitada: '{community}'")
            print(f"   Código mapeado: '{community_code}'")
            print(f"   Festivos encontrados: {len(holidays)}")
            for h in holidays:
                print(f"     - {h.date}: {h.name} (comunidad: '{h.autonomous_community}')")
        
        # Convertir a formato JSON
        holidays_data = []
        for holiday in holidays:
            holidays_data.append({
                'id': holiday.id,
                'date': holiday.date.strftime('%Y-%m-%d'),
                'name': holiday.name,
                'type': holiday.type,
                'autonomous_community': holiday.autonomous_community
            })
        
        # Calcular días laborables
        working_days = 0
        try:
            working_days = holiday_service.get_working_days_in_month(year, month, community_code)
        except AttributeError:
            # Calcular manualmente si el método no existe
            days_in_month = cal.monthrange(year, month)[1]
            holiday_dates = [h.date for h in holidays]
            
            for day in range(1, days_in_month + 1):
                current_date = date(year, month, day)
                # Si no es fin de semana y no es festivo
                if current_date.weekday() < 5 and current_date not in holiday_dates:
                    working_days += 1
        
        # Información del mes
        days_in_month = cal.monthrange(year, month)[1]
        
        # Calcular fines de semana
        weekend_days = []
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            if current_date.weekday() >= 5:  # Sábado o Domingo
                weekend_days.append(current_date.strftime('%Y-%m-%d'))
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'month_name': cal.month_name[month],
                'community': community,
                'community_code': community_code,
                'holidays': holidays_data,
                'holiday_count': len(holidays_data),
                'working_days': working_days,
                'weekend_days': weekend_days,
                'total_days': days_in_month
            }
        })
        
    except Exception as e:
        print(f"Error en get_holidays_by_month: {e}")
        return jsonify({
            'success': False,
            'message': f'Error al obtener festivos del mes: {str(e)}'
        }), 500

@holiday_bp.route('/holidays/<int:year>', methods=['GET'])
@auth_required('jwt')
def get_holidays_by_year(year):
    """Obtener todos los festivos de un año específico"""
    try:
        # Validar año
        if not (2020 <= year <= 2030):
            return jsonify({
                'success': False,
                'message': 'Año inválido. Debe estar entre 2020 y 2030'
            }), 400
        
        # Obtener parámetros opcionales
        community = request.args.get('community')
        
        # Obtener festivos
        holidays = holiday_service.get_holidays_by_year(year, community)
        
        # Convertir a formato JSON
        holidays_data = []
        for holiday in holidays:
            holidays_data.append({
                'id': holiday.id,
                'date': holiday.date.strftime('%Y-%m-%d'),
                'name': holiday.name,
                'type': holiday.type,
                'autonomous_community': holiday.autonomous_community
            })
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'community': community,
                'holidays': holidays_data,
                'total_holidays': len(holidays_data)
            }
        })
        
    except Exception as e:
        print(f"Error en get_holidays_by_year: {e}")
        return jsonify({
            'success': False,
            'message': f'Error al obtener festivos del año: {str(e)}'
        }), 500

@holiday_bp.route('/holidays/working-days/<int:year>/<int:month>', methods=['GET'])
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
        
        # Obtener comunidad autónoma opcional
        community = request.args.get('community')
        
        # Calcular días laborables
        working_days = holiday_service.get_working_days_in_month(year, month, community)
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'community': community,
                'working_days': working_days
            }
        })
        
    except Exception as e:
        print(f"Error en get_working_days: {e}")
        return jsonify({
            'success': False,
            'message': f'Error al calcular días laborables: {str(e)}'
        }), 500

@holiday_bp.route('/holidays/communities', methods=['GET'])
@auth_required('jwt')
def get_autonomous_communities():
    """Obtener lista de comunidades autónomas disponibles"""
    try:
        communities = holiday_service.get_autonomous_communities()
        
        return jsonify({
            'success': True,
            'data': {
                'communities': communities,
                'total_communities': len(communities)
            }
        })
        
    except Exception as e:
        print(f"Error en get_autonomous_communities: {e}")
        return jsonify({
            'success': False,
            'message': f'Error al obtener comunidades: {str(e)}'
        }), 500

@holiday_bp.route('/holidays/check', methods=['POST'])
@auth_required('jwt')
def check_holiday():
    """Verificar si una fecha específica es festivo"""
    try:
        data = request.get_json()
        
        if not data or 'date' not in data:
            return jsonify({
                'success': False,
                'message': 'Se requiere el campo date en formato YYYY-MM-DD'
            }), 400
        
        # Validar y convertir fecha
        try:
            check_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }), 400
        
        # Obtener comunidad autónoma opcional
        community = data.get('community')
        
        # Verificar si es festivo
        is_holiday = holiday_service.is_holiday(check_date, community)
        
        # Información adicional de la fecha
        weekday = check_date.weekday()
        is_weekend = weekday >= 5
        
        return jsonify({
            'success': True,
            'data': {
                'date': check_date.isoformat(),
                'community': community,
                'is_holiday': is_holiday,
                'is_weekend': is_weekend,
                'is_working_day': not (is_holiday or is_weekend),
                'weekday': weekday,
                'weekday_name': cal.day_name[weekday]
            }
        })
        
    except Exception as e:
        print(f"Error en check_holiday: {e}")
        return jsonify({
            'success': False,
            'message': f'Error al verificar festivo: {str(e)}'
        }), 500

