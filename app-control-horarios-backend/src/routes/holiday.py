from flask import Blueprint, request, jsonify # type: ignore
from src.models.employee import db, Holiday, AutonomousCommunity, Province
from src.services.holiday_service import HolidayService
from datetime import datetime, date
import calendar as cal
from flask_security import auth_required # type: ignore

holiday_bp = Blueprint('holiday', __name__)
holiday_service = HolidayService()

@holiday_bp.route('/holidays/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_holidays_by_month(year, month):
    """Obtener festivos de un mes específico"""
    try:
        # Validar fecha
        if not (1 <= month <= 12):
            return jsonify({'success': False, 'message': 'Mes inválido. Debe estar entre 1 y 12'}), 400
        if not (2020 <= year <= 2030):
            return jsonify({'success': False, 'message': 'Año inválido. Debe estar entre 2020 y 2030'}), 400

        # Obtener parámetros opcionales
        community_id = request.args.get('community', type=int)
        province_id = request.args.get('province', type=int)

        # Fechas de inicio y fin del mes
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        # Construir la consulta
        query = Holiday.query.filter(
            Holiday.date >= start_date,
            Holiday.date < end_date
        )

        # Filtrado por provincia o comunidad
        if province_id:
            query = query.filter(Holiday.province_id == province_id)
        elif community_id:
            query = query.filter(
                db.or_(
                    Holiday.autonomous_community_id == community_id,
                    Holiday.autonomous_community_id.is_(None)
                )
            )
        else:
            query = query.filter(Holiday.autonomous_community_id.is_(None))  # Solo nacionales

        holidays = query.order_by(Holiday.date).all()

        # Convertir a formato JSON
        holidays_data = []
        for holiday in holidays:
            holidays_data.append({
                'id': holiday.id,
                'date': holiday.date.strftime('%Y-%m-%d'),
                'name': holiday.name,
                'autonomous_community': holiday.autonomous_community_id,
                'province': holiday.province_id
            })

        # Calcular días laborables
        days_in_month = cal.monthrange(year, month)[1]
        weekend_days = []
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            if current_date.weekday() >= 5:
                weekend_days.append(current_date.strftime('%Y-%m-%d'))

        # Calcular días laborables (sin festivos ni fines de semana)
        holiday_dates = [h['date'] for h in holidays_data]
        working_days = 0
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            if current_date.weekday() < 5 and current_date.strftime('%Y-%m-%d') not in holiday_dates:
                working_days += 1

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'month_name': cal.month_name[month],
                'community': community_id,
                'province': province_id,
                'holidays': holidays_data,
                'holiday_count': len(holidays_data),
                'working_days': working_days,
                'weekend_days': weekend_days,
                'total_days': days_in_month
            }
        })

    except Exception as e:
        print(f"Error en get_holidays_by_month: {e}")
        return jsonify({'success': False, 'message': f'Error al obtener festivos del mes: {str(e)}'}), 500

@holiday_bp.route('/holidays/<int:year>', methods=['GET'])
@auth_required('jwt')
def get_holidays_by_year(year):
    """Obtener todos los festivos de un año específico"""
    try:
        if not (2020 <= year <= 2030):
            return jsonify({'success': False, 'message': 'Año inválido. Debe estar entre 2020 y 2030'}), 400

        community_id = request.args.get('community', type=int)
        province_id = request.args.get('province', type=int)

        holidays = holiday_service.get_holidays_by_year(year, community_id, province_id)

        holidays_data = []
        for holiday in holidays:
            holidays_data.append({
                'id': holiday.id,
                'date': holiday.date.strftime('%Y-%m-%d'),
                'name': holiday.name,
                'autonomous_community': holiday.autonomous_community_id,
                'province': holiday.province_id
            })

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'community': community_id,
                'province': province_id,
                'holidays': holidays_data,
                'total_holidays': len(holidays_data)
            }
        })

    except Exception as e:
        print(f"Error en get_holidays_by_year: {e}")
        return jsonify({'success': False, 'message': f'Error al obtener festivos del año: {str(e)}'}), 500

@holiday_bp.route('/holidays/working-days/<int:year>/<int:month>', methods=['GET'])
@auth_required('jwt')
def get_working_days(year, month):
    """Obtener días laborables de un mes"""
    try:
        if not (1 <= month <= 12):
            return jsonify({'success': False, 'message': 'Mes inválido'}), 400
        if not (2020 <= year <= 2030):
            return jsonify({'success': False, 'message': 'Año inválido'}), 400

        community_id = request.args.get('community', type=int)
        province_id = request.args.get('province', type=int)

        working_days = holiday_service.get_working_days_in_month(year, month, community_id, province_id)

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'community': community_id,
                'province': province_id,
                'working_days': working_days
            }
        })

    except Exception as e:
        print(f"Error en get_working_days: {e}")
        return jsonify({'success': False, 'message': f'Error al calcular días laborables: {str(e)}'}), 500

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
            return jsonify({'success': False, 'message': 'Se requiere el campo date en formato YYYY-MM-DD'}), 400

        try:
            check_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400

        community_id = data.get('community')
        province_id = data.get('province')

        is_holiday = holiday_service.is_holiday(check_date, community_id, province_id)

        weekday = check_date.weekday()
        is_weekend = weekday >= 5

        return jsonify({
            'success': True,
            'data': {
                'date': check_date.isoformat(),
                'community': community_id,
                'province': province_id,
                'is_holiday': is_holiday,
                'is_weekend': is_weekend,
                'is_working_day': not (is_holiday or is_weekend),
                'weekday': weekday,
                'weekday_name': cal.day_name[weekday]
            }
        })

    except Exception as e:
        print(f"Error en check_holiday: {e}")
        return jsonify({'success': False, 'message': f'Error al verificar festivo: {str(e)}'}), 500

# --- NUEVOS ENDPOINTS PARA GESTIÓN GENERAL DE FESTIVOS ---

@holiday_bp.route('/holidays', methods=['GET'])
def get_all_holidays():
    """Obtener todos los festivos"""
    try:
        holidays = Holiday.query.order_by(Holiday.date).all()
        holidays_data = []
        for holiday in holidays:
            holidays_data.append({
                'id': holiday.id,
                'date': holiday.date.strftime('%Y-%m-%d'),
                'name': holiday.name,
                'autonomous_community': holiday.autonomous_community_id,
                'province': holiday.province_id
            })
        return jsonify({'success': True, 'data': holidays_data})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener festivos: {str(e)}'}), 500

@holiday_bp.route('/holidays', methods=['POST'])
def create_holiday():
    """Crear un nuevo festivo"""
    try:
        data = request.get_json()
        date_str = data.get('date')
        name = data.get('name')
        community = data.get('autonomous_community')
        province = data.get('province')
        if not date_str or not name:
            return jsonify({'success': False, 'message': 'Faltan campos obligatorios'}), 400
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        holiday = Holiday(
            date=date_obj,
            name=name,
            autonomous_community_id=None if not community or community == 'Nacional' else int(community),
            province_id=None if not province else int(province)
        )
        db.session.add(holiday)
        db.session.commit()
        return jsonify({'success': True, 'data': {
            'id': holiday.id,
            'date': holiday.date.strftime('%Y-%m-%d'),
            'name': holiday.name,
            'autonomous_community': holiday.autonomous_community_id,
            'province': holiday.province_id
        }})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error al crear festivo: {str(e)}'}), 500

@holiday_bp.route('/holidays/<int:holiday_id>', methods=['DELETE'])
def delete_holiday(holiday_id):
    """Eliminar un festivo por ID"""
    try:
        holiday = Holiday.query.get(holiday_id)
        if not holiday:
            return jsonify({'success': False, 'message': 'Festivo no encontrado'}), 404
        db.session.delete(holiday)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Festivo eliminado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error al eliminar festivo: {str(e)}'}), 500

# ENDPOINTS PARA COMUNIDADES Y PROVINCIAS (mejorados)
@holiday_bp.route('/autonomous_communities', methods=['GET'])
def get_communities():
    """
    Devuelve la lista de comunidades autónomas ordenadas por nombre.
    """
    try:
        communities = AutonomousCommunity.query.order_by(AutonomousCommunity.name).all()
        data = [{'id': c.id, 'name': c.name} for c in communities]
        return jsonify(data)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener comunidades: {str(e)}'}), 500

@holiday_bp.route('/provinces', methods=['GET'])
def get_provinces():
    """
    Devuelve la lista de provincias ordenadas por nombre, incluyendo el id de la comunidad autónoma.
    """
    try:
        provinces = Province.query.order_by(Province.name).all()
        data = [
            {
                'id': p.id,
                'name': p.name,
                'autonomous_community_id': p.autonomous_community_id
            }
            for p in provinces
        ]
        return jsonify(data)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener provincias: {str(e)}'}), 500

