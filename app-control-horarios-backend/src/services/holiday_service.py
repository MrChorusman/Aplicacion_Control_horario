from datetime import datetime, date
from src.models.employee import db, Holiday

class HolidayService:
    """Servicio para gestión de festivos nacionales y autonómicos"""
    
    def __init__(self):
        self.national_holidays_2024 = [
            {'date': '2024-01-01', 'name': 'Año Nuevo', 'type': 'national'},
            {'date': '2024-01-06', 'name': 'Epifanía del Señor', 'type': 'national'},
            {'date': '2024-03-29', 'name': 'Viernes Santo', 'type': 'national'},
            {'date': '2024-05-01', 'name': 'Día del Trabajador', 'type': 'national'},
            {'date': '2024-08-15', 'name': 'Asunción de la Virgen', 'type': 'national'},
            {'date': '2024-10-12', 'name': 'Fiesta Nacional de España', 'type': 'national'},
            {'date': '2024-11-01', 'name': 'Todos los Santos', 'type': 'national'},
            {'date': '2024-12-06', 'name': 'Día de la Constitución', 'type': 'national'},
            {'date': '2024-12-08', 'name': 'Inmaculada Concepción', 'type': 'national'},
            {'date': '2024-12-25', 'name': 'Navidad', 'type': 'national'},
        ]
        
        self.national_holidays_2025 = [
            {'date': '2025-01-01', 'name': 'Año Nuevo', 'type': 'national'},
            {'date': '2025-01-06', 'name': 'Epifanía del Señor', 'type': 'national'},
            {'date': '2025-04-18', 'name': 'Viernes Santo', 'type': 'national'},
            {'date': '2025-05-01', 'name': 'Día del Trabajador', 'type': 'national'},
            {'date': '2025-08-15', 'name': 'Asunción de la Virgen', 'type': 'national'},
            {'date': '2025-10-12', 'name': 'Fiesta Nacional de España', 'type': 'national'},
            {'date': '2025-11-01', 'name': 'Todos los Santos', 'type': 'national'},
            {'date': '2025-12-06', 'name': 'Día de la Constitución', 'type': 'national'},
            {'date': '2025-12-08', 'name': 'Inmaculada Concepción', 'type': 'national'},
            {'date': '2025-12-25', 'name': 'Navidad', 'type': 'national'},
        ]
        
        # Festivos autonómicos más comunes
        self.regional_holidays = {
            'GA': [  # Galicia
                {'date': '2024-05-17', 'name': 'Día de las Letras Gallegas', 'type': 'regional'},
                {'date': '2024-07-25', 'name': 'Santiago Apóstol', 'type': 'regional'},
                {'date': '2025-05-17', 'name': 'Día de las Letras Gallegas', 'type': 'regional'},
                {'date': '2025-07-25', 'name': 'Santiago Apóstol', 'type': 'regional'},
            ],
            'MD': [  # Madrid
                {'date': '2024-05-02', 'name': 'Día de la Comunidad de Madrid', 'type': 'regional'},
                {'date': '2024-05-15', 'name': 'San Isidro', 'type': 'regional'},
                {'date': '2025-05-02', 'name': 'Día de la Comunidad de Madrid', 'type': 'regional'},
                {'date': '2025-05-15', 'name': 'San Isidro', 'type': 'regional'},
            ],
            'CT': [  # Cataluña
                {'date': '2024-04-01', 'name': 'Lunes de Pascua', 'type': 'regional'},
                {'date': '2024-06-24', 'name': 'San Juan', 'type': 'regional'},
                {'date': '2024-09-11', 'name': 'Diada Nacional de Catalunya', 'type': 'regional'},
                {'date': '2024-12-26', 'name': 'San Esteban', 'type': 'regional'},
                {'date': '2025-04-21', 'name': 'Lunes de Pascua', 'type': 'regional'},
                {'date': '2025-06-24', 'name': 'San Juan', 'type': 'regional'},
                {'date': '2025-09-11', 'name': 'Diada Nacional de Catalunya', 'type': 'regional'},
                {'date': '2025-12-26', 'name': 'San Esteban', 'type': 'regional'},
            ],
            'PV': [  # País Vasco
                {'date': '2024-03-28', 'name': 'Jueves Santo', 'type': 'regional'},
                {'date': '2024-10-25', 'name': 'Día del País Vasco', 'type': 'regional'},
                {'date': '2025-04-17', 'name': 'Jueves Santo', 'type': 'regional'},
                {'date': '2025-10-25', 'name': 'Día del País Vasco', 'type': 'regional'},
            ],
            'VC': [  # Comunidad Valenciana
                {'date': '2024-03-19', 'name': 'San José', 'type': 'regional'},
                {'date': '2024-04-01', 'name': 'Lunes de Pascua', 'type': 'regional'},
                {'date': '2024-10-09', 'name': 'Día de la Comunidad Valenciana', 'type': 'regional'},
                {'date': '2025-03-19', 'name': 'San José', 'type': 'regional'},
                {'date': '2025-04-21', 'name': 'Lunes de Pascua', 'type': 'regional'},
                {'date': '2025-10-09', 'name': 'Día de la Comunidad Valenciana', 'type': 'regional'},
            ],
            'AN': [  # Andalucía
                {'date': '2024-02-28', 'name': 'Día de Andalucía', 'type': 'regional'},
                {'date': '2024-03-28', 'name': 'Jueves Santo', 'type': 'regional'},
                {'date': '2025-02-28', 'name': 'Día de Andalucía', 'type': 'regional'},
                {'date': '2025-04-17', 'name': 'Jueves Santo', 'type': 'regional'},
            ]
        }
    
    def initialize_holidays(self):
        """Inicializar festivos en la base de datos"""
        try:
            # Verificar si ya existen festivos
            existing_count = Holiday.query.count()
            if existing_count > 0:
                print(f"✅ Ya existen {existing_count} festivos en la base de datos")
                return
            
            # Añadir festivos nacionales 2024 y 2025
            all_holidays = self.national_holidays_2024 + self.national_holidays_2025
            
            # Añadir festivos regionales
            for community, holidays in self.regional_holidays.items():
                for holiday in holidays:
                    holiday_with_community = holiday.copy()
                    holiday_with_community['autonomous_community'] = community
                    all_holidays.append(holiday_with_community)
            
            # Insertar en base de datos
            for holiday_data in all_holidays:
                holiday_date = datetime.strptime(holiday_data['date'], '%Y-%m-%d').date()
                
                holiday = Holiday(
                    date=holiday_date,
                    name=holiday_data['name'],
                    autonomous_community=holiday_data.get('autonomous_community'),
                    type=holiday_data['type']
                )
                
                db.session.add(holiday)
            
            db.session.commit()
            print(f"✅ Inicializados {len(all_holidays)} festivos en la base de datos")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error inicializando festivos: {e}")
    
    def get_holidays_by_year(self, year, autonomous_community=None):
        """Obtener festivos por año y opcionalmente por comunidad autónoma"""
        query = Holiday.query.filter(
            db.extract('year', Holiday.date) == year
        )
        
        if autonomous_community:
            query = query.filter(
                db.or_(
                    Holiday.autonomous_community == autonomous_community,
                    Holiday.autonomous_community.is_(None)  # Festivos nacionales
                )
            )
        else:
            # Solo festivos nacionales si no se especifica comunidad
            query = query.filter(Holiday.autonomous_community.is_(None))
        
        return query.order_by(Holiday.date).all()
    
    def get_holidays_by_month(self, year, month, autonomous_community=None):
        """Obtener festivos por mes y año"""
        query = Holiday.query.filter(
            db.extract('year', Holiday.date) == year,
            db.extract('month', Holiday.date) == month
        )
        
        if autonomous_community:
            query = query.filter(
                db.or_(
                    Holiday.autonomous_community == autonomous_community,
                    Holiday.autonomous_community.is_(None)
                )
            )
        else:
            query = query.filter(Holiday.autonomous_community.is_(None))
        
        return query.order_by(Holiday.date).all()
    
    def is_holiday(self, date_obj, autonomous_community=None):
        """Verificar si una fecha es festivo"""
        query = Holiday.query.filter(Holiday.date == date_obj)
        
        if autonomous_community:
            query = query.filter(
                db.or_(
                    Holiday.autonomous_community == autonomous_community,
                    Holiday.autonomous_community.is_(None)
                )
            )
        else:
            query = query.filter(Holiday.autonomous_community.is_(None))
        
        return query.first() is not None
    
    def get_working_days_in_month(self, year, month, autonomous_community=None):
        """Calcular días laborables en un mes (excluyendo festivos y fines de semana)"""
        import calendar as cal
        
        # Obtener festivos del mes
        holidays = self.get_holidays_by_month(year, month, autonomous_community)
        holiday_dates = {holiday.date for holiday in holidays}
        
        # Contar días laborables
        working_days = 0
        days_in_month = cal.monthrange(year, month)[1]
        
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            weekday = current_date.weekday()  # 0=Lunes, 6=Domingo
            
            # Verificar si es fin de semana
            if weekday >= 5:  # Sábado o Domingo
                continue
            
            # Verificar si es festivo
            if current_date in holiday_dates:
                continue
            
            working_days += 1
        
        return working_days
    
    def get_autonomous_communities(self):
        """Obtener lista de comunidades autónomas con festivos"""
        from src.models.employee import Employee
        return Employee.get_autonomous_communities()

