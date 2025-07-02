from datetime import datetime, date
from src.models.employee import db, Holiday

class HolidayService:
    """Servicio para gestión de festivos nacionales, autonómicos y provinciales"""

    def get_holidays_by_year(self, year, community_id=None, province_id=None):
        """Obtener festivos por año y opcionalmente por comunidad/provincia"""
        query = Holiday.query.filter(
            db.extract('year', Holiday.date) == year
        )
        if province_id:
            query = query.filter(Holiday.province_id == province_id)
        elif community_id:
            query = query.filter(
                db.or_(
                    Holiday.autonomous_community_id == community_id,
                    Holiday.autonomous_community_id.is_(None)  # Incluye nacionales
                )
            )
        else:
            query = query.filter(Holiday.autonomous_community_id.is_(None))
        return query.order_by(Holiday.date).all()

    def get_holidays_by_month(self, year, month, community_id=None, province_id=None):
        """Obtener festivos por mes y año"""
        query = Holiday.query.filter(
            db.extract('year', Holiday.date) == year,
            db.extract('month', Holiday.date) == month
        )
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
            query = query.filter(Holiday.autonomous_community_id.is_(None))
        return query.order_by(Holiday.date).all()

    def is_holiday(self, date_obj, community_id=None, province_id=None):
        """Verificar si una fecha es festivo"""
        query = Holiday.query.filter(Holiday.date == date_obj)
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
            query = query.filter(Holiday.autonomous_community_id.is_(None))
        return query.first() is not None

    def get_working_days_in_month(self, year, month, community_id=None, province_id=None):
        """Calcular días laborables en un mes (excluyendo festivos y fines de semana)"""
        import calendar as cal
        holidays = self.get_holidays_by_month(year, month, community_id, province_id)
        holiday_dates = {holiday.date for holiday in holidays}
        working_days = 0
        days_in_month = cal.monthrange(year, month)[1]
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            weekday = current_date.weekday()
            if weekday >= 5:
                continue
            if current_date in holiday_dates:
                continue
            working_days += 1
        return working_days

    def get_autonomous_communities(self):
        """Obtener lista de comunidades autónomas con festivos"""
        from src.models.employee import Employee
        return Employee.get_autonomous_communities()

