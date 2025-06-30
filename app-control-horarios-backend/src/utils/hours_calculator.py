from datetime import datetime, date, timedelta
import calendar
from src.models.employee import Employee, CalendarEntry, Holiday, db

class HoursCalculator:
    def __init__(self):
        pass
    
    def calculate_theoretical_hours(self, employee, year, month):
        """Calcula las horas teóricas de un empleado para un mes específico"""
        try:
            # Verificar si es julio o agosto (horario de verano)
            is_summer = month in [7, 8]
            
            # Obtener días del mes
            days_in_month = calendar.monthrange(year, month)[1]
            total_hours = 0
            
            for day in range(1, days_in_month + 1):
                date_obj = date(year, month, day)
                weekday = date_obj.weekday()  # 0=Lunes, 6=Domingo
                
                # Verificar si es fin de semana
                if weekday >= 5:  # Sábado o Domingo
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(date_obj, employee.autonomous_community):
                    continue
                
                # Calcular horas del día
                if is_summer:
                    # Julio y agosto: 7 horas por día
                    total_hours += 7
                else:
                    # Resto del año: según configuración del empleado
                    if weekday < 4:  # Lunes a Jueves
                        total_hours += employee.hours_mon_thu
                    else:  # Viernes
                        total_hours += employee.hours_fri
            
            return total_hours
        except Exception as e:
            print(f"Error calculating theoretical hours: {e}")
            return 0
    
    def calculate_actual_hours(self, employee, year, month):
        """Calcula las horas reales trabajadas por un empleado"""
        try:
            theoretical_hours = self.calculate_theoretical_hours(employee, year, month)
            
            # Obtener entradas del calendario
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])
            
            entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            # Calcular deducciones y adiciones
            deductions = 0
            additions = 0
            
            for entry in entries:
                if entry.activity_type in ['V', 'F']:  # Vacaciones y ausencias
                    # Calcular horas del día perdido
                    weekday = entry.date.weekday()
                    is_summer = month in [7, 8]
                    
                    if is_summer:
                        deductions += 7
                    else:
                        if weekday < 4:  # Lunes a Jueves
                            deductions += employee.hours_mon_thu
                        else:  # Viernes
                            deductions += employee.hours_fri
                
                elif entry.activity_type == 'HLD' and entry.hours:
                    # Restar horas de libre disposición
                    deductions += entry.hours
                
                elif entry.activity_type == 'G' and entry.hours:
                    # Sumar horas de guardia
                    additions += entry.hours
            
            actual_hours = theoretical_hours - deductions + additions
            return max(0, actual_hours)  # No puede ser negativo
            
        except Exception as e:
            print(f"Error calculating actual hours: {e}")
            return 0
    
    def calculate_indra_hours(self, employee, year, month):
        """Calcula las horas INDRA (día 1 al último del mes) - TOTAL de horas laborables del mes"""
        try:
            # INDRA = Total de horas laborables del mes (sin aplicar porcentaje)
            # Calcular horas laborables del mes considerando deducciones
            
            # Obtener días del mes
            days_in_month = calendar.monthrange(year, month)[1]
            total_hours = 0
            
            # Obtener entradas del calendario para el mes
            start_date = date(year, month, 1)
            end_date = date(year, month, days_in_month)
            
            entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            # Crear diccionario de entradas por fecha
            entries_by_date = {entry.date: entry for entry in entries}
            
            for day in range(1, days_in_month + 1):
                date_obj = date(year, month, day)
                weekday = date_obj.weekday()  # 0=Lunes, 6=Domingo
                
                # Verificar si es fin de semana
                if weekday >= 5:  # Sábado o Domingo
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(date_obj, employee.autonomous_community):
                    continue
                
                # Calcular horas base del día
                is_summer = month in [7, 8]
                if is_summer:
                    day_hours = 7
                else:
                    if weekday < 4:  # Lunes a Jueves
                        day_hours = employee.hours_mon_thu
                    else:  # Viernes
                        day_hours = employee.hours_fri
                
                # Aplicar modificaciones según entradas del calendario
                if date_obj in entries_by_date:
                    entry = entries_by_date[date_obj]
                    if entry.activity_type in ['V', 'F']:  # Vacaciones y ausencias
                        day_hours = 0  # Día completo perdido
                    elif entry.activity_type == 'HLD' and entry.hours:
                        day_hours = max(0, day_hours - entry.hours)  # Restar HLD
                    elif entry.activity_type == 'G' and entry.hours:
                        day_hours += entry.hours  # Sumar guardia
                
                total_hours += day_hours
            
            return total_hours
            
        except Exception as e:
            print(f"Error calculating INDRA hours: {e}")
            return 0
    
    def calculate_inditex_hours(self, employee, year, month):
        """Calcula las horas INDITEX (día 26 del mes anterior al 25 del mes actual) - TOTAL del período"""
        try:
            # INDITEX = Total de horas del período 26 mes anterior - 25 mes actual (sin aplicar porcentaje)
            
            # Calcular período INDITEX: del 26 del mes anterior al 25 del mes actual
            if month == 1:
                prev_year = year - 1
                prev_month = 12
            else:
                prev_year = year
                prev_month = month - 1
            
            # Período: 26 del mes anterior al 25 del mes actual
            start_date = date(prev_year, prev_month, 26)
            end_date = date(year, month, 25)
            
            # Obtener entradas del calendario para todo el período
            entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            # Crear diccionario de entradas por fecha
            entries_by_date = {entry.date: entry for entry in entries}
            
            total_hours = 0
            current_date = start_date
            
            while current_date <= end_date:
                weekday = current_date.weekday()
                
                # Verificar si es fin de semana
                if weekday >= 5:
                    current_date += timedelta(days=1)
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(current_date, employee.autonomous_community):
                    current_date += timedelta(days=1)
                    continue
                
                # Calcular horas base del día
                current_month = current_date.month
                is_summer = current_month in [7, 8]
                
                if is_summer:
                    day_hours = 7
                else:
                    if weekday < 4:  # Lunes a Jueves
                        day_hours = employee.hours_mon_thu
                    else:  # Viernes
                        day_hours = employee.hours_fri
                
                # Aplicar modificaciones según entradas del calendario
                if current_date in entries_by_date:
                    entry = entries_by_date[current_date]
                    if entry.activity_type in ['V', 'F']:  # Vacaciones y ausencias
                        day_hours = 0  # Día completo perdido
                    elif entry.activity_type == 'HLD' and entry.hours:
                        day_hours = max(0, day_hours - entry.hours)  # Restar HLD
                    elif entry.activity_type == 'G' and entry.hours:
                        day_hours += entry.hours  # Sumar guardia
                
                total_hours += day_hours
                current_date += timedelta(days=1)
            
            return total_hours
            
        except Exception as e:
            print(f"Error calculating INDITEX hours: {e}")
            return 0
    
    def calculate_vacation_summary(self, employee, year):
        """Calcula el resumen anual de vacaciones de un empleado"""
        try:
            # Obtener todas las entradas de vacaciones del año
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
            today = date.today()
            
            vacation_entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.activity_type == 'V',
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            # Separar vacaciones usadas (días que ya pasaron) y asignadas (futuras)
            vacation_days_used = 0
            vacation_days_assigned = 0
            
            for entry in vacation_entries:
                if entry.date <= today:
                    vacation_days_used += 1
                else:
                    vacation_days_assigned += 1
            
            total_vacation_days_marked = vacation_days_used + vacation_days_assigned
            vacation_days_remaining = employee.vacation_days - total_vacation_days_marked
            
            return {
                'vacation_days_total': employee.vacation_days,
                'vacation_days_used': vacation_days_used,  # Solo días que ya pasaron
                'vacation_days_assigned': vacation_days_assigned,  # Días futuros marcados
                'vacation_days_remaining': max(0, vacation_days_remaining)
            }
            
        except Exception as e:
            print(f"Error calculating vacation summary: {e}")
            return {
                'vacation_days_total': employee.vacation_days,
                'vacation_days_used': 0,
                'vacation_days_assigned': 0,
                'vacation_days_remaining': employee.vacation_days
            }
    
    def calculate_hld_summary(self, employee, year):
        """Calcula el resumen anual de horas de libre disposición"""
        try:
            # Obtener todas las entradas HLD del año
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
            
            hld_entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.activity_type == 'HLD',
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            hld_hours_used = sum([entry.hours or 0 for entry in hld_entries])
            hld_hours_remaining = max(0, employee.free_hours - hld_hours_used)
            
            return {
                'hld_hours_total': employee.free_hours,
                'hld_hours_used': round(hld_hours_used, 1),
                'hld_hours_remaining': round(hld_hours_remaining, 1)
            }
            
        except Exception as e:
            print(f"Error calculating HLD summary: {e}")
            return {
                'hld_hours_total': employee.free_hours,
                'hld_hours_used': 0,
                'hld_hours_remaining': employee.free_hours
            }
    
    def calculate_annual_summary(self, employee, year):
        """Calcula el resumen anual completo de un empleado"""
        try:
            # Calcular totales anuales
            total_theoretical_hours = 0
            total_actual_hours = 0
            total_indra_hours = 0
            total_inditex_hours = 0
            
            for month in range(1, 13):
                total_theoretical_hours += self.calculate_theoretical_hours(employee, year, month)
                total_actual_hours += self.calculate_actual_hours(employee, year, month)
                total_indra_hours += self.calculate_indra_hours(employee, year, month)
                total_inditex_hours += self.calculate_inditex_hours(employee, year, month)
            
            # Obtener resúmenes de vacaciones y HLD
            vacation_summary = self.calculate_vacation_summary(employee, year)
            hld_summary = self.calculate_hld_summary(employee, year)
            
            # Calcular guardias del año
            guard_entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.activity_type == 'G',
                CalendarEntry.date >= date(year, 1, 1),
                CalendarEntry.date <= date(year, 12, 31)
            ).all()
            
            guard_hours_total = sum([entry.hours or 0 for entry in guard_entries])
            guard_count = len(guard_entries)
            
            # Calcular eficiencia anual
            efficiency = (total_actual_hours / total_theoretical_hours * 100) if total_theoretical_hours > 0 else 0
            
            return {
                'employee_id': employee.id,
                'full_name': employee.full_name,
                'team_name': employee.team_name,
                'year': year,
                
                # Horas anuales
                'total_theoretical_hours': round(total_theoretical_hours, 1),
                'total_actual_hours': round(total_actual_hours, 1),
                'total_indra_hours': round(total_indra_hours, 1),
                'total_inditex_hours': round(total_inditex_hours, 1),
                'efficiency_percentage': round(efficiency, 1),
                
                # Vacaciones
                **vacation_summary,
                
                # Horas de libre disposición
                **hld_summary,
                
                # Guardias
                'guard_hours_total': round(guard_hours_total, 1),
                'guard_count': guard_count,
                
                # Estado y alertas
                'efficiency_status': 'Excelente' if efficiency >= 95 else 'Bueno' if efficiency >= 85 else 'Mejorable',
                'vacation_alert': vacation_summary['vacation_days_remaining'] < 5,
                'hld_alert': hld_summary['hld_hours_remaining'] < 10
            }
            
        except Exception as e:
            print(f"Error calculating annual summary: {e}")
            return None
    
    def calculate_employee_forecast(self, employee, year, month):
        """Calcula el forecast mensual de un empleado"""
        try:
            theoretical_hours = self.calculate_theoretical_hours(employee, year, month)
            actual_hours = self.calculate_actual_hours(employee, year, month)
            indra_hours = self.calculate_indra_hours(employee, year, month)
            inditex_hours = self.calculate_inditex_hours(employee, year, month)
            
            # Calcular estadísticas adicionales
            efficiency = (actual_hours / theoretical_hours * 100) if theoretical_hours > 0 else 0
            
            # Obtener resumen de actividades del mes
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])
            
            entries = CalendarEntry.query.filter(
                CalendarEntry.employee_id == employee.id,
                CalendarEntry.date >= start_date,
                CalendarEntry.date <= end_date
            ).all()
            
            vacation_days = len([e for e in entries if e.activity_type == 'V'])
            absence_days = len([e for e in entries if e.activity_type == 'F'])
            hld_hours = sum([e.hours or 0 for e in entries if e.activity_type == 'HLD'])
            guard_hours = sum([e.hours or 0 for e in entries if e.activity_type == 'G'])
            
            return {
                'employee_id': employee.id,
                'full_name': employee.full_name,
                'team_name': employee.team_name,
                'theoretical_hours': round(theoretical_hours, 1),
                'actual_hours': round(actual_hours, 1),
                'indra_hours': round(indra_hours, 1),
                'inditex_hours': round(inditex_hours, 1),
                'efficiency_percentage': round(efficiency, 1),
                'vacation_days_month': vacation_days,
                'absence_days_month': absence_days,
                'hld_hours_month': round(hld_hours, 1),
                'guard_hours_month': round(guard_hours, 1),
                'year': year,
                'month': month
            }
            
        except Exception as e:
            print(f"Error calculating employee forecast: {e}")
            return None
    
    def calculate_team_summary(self, team_name, year, month):
        """Calcula el resumen mensual de un equipo"""
        try:
            employees = Employee.query.filter_by(team_name=team_name).all()
            
            if not employees:
                return None
            
            team_data = {
                'team_name': team_name,
                'employee_count': len(employees),
                'employees': [],
                'total_theoretical_hours': 0,
                'total_actual_hours': 0,
                'total_indra_hours': 0,
                'total_inditex_hours': 0,
                'efficiency_percentage': 0,
                'year': year,
                'month': month
            }
            
            for employee in employees:
                employee_forecast = self.calculate_employee_forecast(employee, year, month)
                if employee_forecast:
                    team_data['employees'].append(employee_forecast)
                    team_data['total_theoretical_hours'] += employee_forecast['theoretical_hours']
                    team_data['total_actual_hours'] += employee_forecast['actual_hours']
                    team_data['total_indra_hours'] += employee_forecast['indra_hours']
                    team_data['total_inditex_hours'] += employee_forecast['inditex_hours']
            
            # Calcular eficiencia del equipo
            if team_data['total_theoretical_hours'] > 0:
                team_data['efficiency_percentage'] = round(
                    (team_data['total_actual_hours'] / team_data['total_theoretical_hours']) * 100, 1
                )
            
            # Redondear totales
            team_data['total_theoretical_hours'] = round(team_data['total_theoretical_hours'], 1)
            team_data['total_actual_hours'] = round(team_data['total_actual_hours'], 1)
            team_data['total_indra_hours'] = round(team_data['total_indra_hours'], 1)
            team_data['total_inditex_hours'] = round(team_data['total_inditex_hours'], 1)
            
            # Añadir estado de eficiencia
            if team_data['efficiency_percentage'] >= 95:
                team_data['efficiency_status'] = 'Excelente'
            elif team_data['efficiency_percentage'] >= 85:
                team_data['efficiency_status'] = 'Bueno'
            else:
                team_data['efficiency_status'] = 'Mejorable'
            
            return team_data
            
        except Exception as e:
            print(f"Error calculating team summary: {e}")
            return None
    
    def calculate_all_teams_summary(self, year, month):
        """Calcula el resumen de todos los equipos para el Dashboard"""
        try:
            # Obtener todos los equipos únicos
            teams = db.session.query(Employee.team_name).distinct().all()
            teams_data = []
            
            overall_summary = {
                'total_employees': 0,
                'total_theoretical_hours': 0,
                'total_actual_hours': 0,
                'total_indra_hours': 0,
                'total_inditex_hours': 0,
                'overall_efficiency': 0,
                'active_teams': 0,
                'year': year,
                'month': month
            }
            
            for (team_name,) in teams:
                team_summary = self.calculate_team_summary(team_name, year, month)
                if team_summary:
                    teams_data.append(team_summary)
                    overall_summary['total_employees'] += team_summary['employee_count']
                    overall_summary['total_theoretical_hours'] += team_summary['total_theoretical_hours']
                    overall_summary['total_actual_hours'] += team_summary['total_actual_hours']
                    overall_summary['total_indra_hours'] += team_summary['total_indra_hours']
                    overall_summary['total_inditex_hours'] += team_summary['total_inditex_hours']
                    overall_summary['active_teams'] += 1
            
            # Calcular eficiencia general
            if overall_summary['total_theoretical_hours'] > 0:
                overall_summary['overall_efficiency'] = round(
                    (overall_summary['total_actual_hours'] / overall_summary['total_theoretical_hours']) * 100, 1
                )
            
            # Redondear totales
            overall_summary['total_theoretical_hours'] = round(overall_summary['total_theoretical_hours'], 1)
            overall_summary['total_actual_hours'] = round(overall_summary['total_actual_hours'], 1)
            overall_summary['total_indra_hours'] = round(overall_summary['total_indra_hours'], 1)
            overall_summary['total_inditex_hours'] = round(overall_summary['total_inditex_hours'], 1)
            
            # Añadir estado de eficiencia general
            if overall_summary['overall_efficiency'] >= 95:
                overall_summary['overall_efficiency_status'] = 'Excelente'
            elif overall_summary['overall_efficiency'] >= 85:
                overall_summary['overall_efficiency_status'] = 'Bueno'
            else:
                overall_summary['overall_efficiency_status'] = 'Mejorable'
            
            # Obtener días laborables del mes
            overall_summary['working_days'] = self.get_working_days_in_month(year, month)
            
            return {
                'teams': teams_data,
                'overall_summary': overall_summary
            }
            
        except Exception as e:
            print(f"Error calculating all teams summary: {e}")
            return None
    
    def is_holiday(self, date_obj, autonomous_community):
        """Verifica si una fecha es festivo"""
        try:
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
            community_code = autonomous_community
            if autonomous_community in community_mapping:
                community_code = community_mapping[autonomous_community]
            
            # Buscar festivo con código o nombre completo
            holiday = Holiday.query.filter(
                Holiday.date == date_obj,
                db.or_(
                    Holiday.autonomous_community == community_code,  # Buscar por código
                    Holiday.autonomous_community == autonomous_community,  # Buscar por nombre completo
                    Holiday.autonomous_community.is_(None)  # Festivos nacionales
                )
            ).first()
            
            # Debug específico para el 25 de julio
            if date_obj.month == 7 and date_obj.day == 25:
                print(f"🔍 DEBUG 25 julio: Buscando festivo para {date_obj}")
                print(f"   Comunidad empleado: '{autonomous_community}'")
                print(f"   Código mapeado: '{community_code}'")
                
                # Buscar todos los festivos de esa fecha
                all_holidays = Holiday.query.filter(Holiday.date == date_obj).all()
                print(f"   Festivos encontrados para {date_obj}:")
                for h in all_holidays:
                    print(f"     - {h.name} (comunidad: '{h.autonomous_community}', tipo: {h.type})")
                
                if holiday:
                    print(f"   ✅ FESTIVO ENCONTRADO: {holiday.name}")
                else:
                    print(f"   ❌ NO SE ENCONTRÓ FESTIVO")
            
            return holiday is not None
        except Exception as e:
            print(f"Error checking holiday: {e}")
            return False
    
    def get_working_days_in_month(self, year, month):
        """Obtiene el número de días laborables en un mes"""
        try:
            days_in_month = calendar.monthrange(year, month)[1]
            working_days = 0
            
            for day in range(1, days_in_month + 1):
                date_obj = date(year, month, day)
                weekday = date_obj.weekday()
                
                # Verificar si es fin de semana
                if weekday >= 5:
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(date_obj, None):  # Verificar festivos nacionales
                    continue
                
                working_days += 1
            
            return working_days
        except Exception as e:
            print(f"Error calculating working days: {e}")
            return 0


    def calculate_worked_indra_hours(self, employee, year, month):
        """Calcula las horas trabajadas INDRA (horas teóricas INDRA menos deducciones)"""
        try:
            # Las horas trabajadas INDRA son las horas teóricas INDRA menos deducciones
            # Ya están calculadas correctamente en calculate_indra_hours
            return self.calculate_indra_hours(employee, year, month)
        except Exception as e:
            print(f"Error calculating worked INDRA hours: {e}")
            return 0
    
    def calculate_worked_inditex_hours(self, employee, year, month):
        """Calcula las horas trabajadas INDITEX (horas teóricas INDITEX menos deducciones)"""
        try:
            # Las horas trabajadas INDITEX son las horas teóricas INDITEX menos deducciones
            # Ya están calculadas correctamente en calculate_inditex_hours
            return self.calculate_inditex_hours(employee, year, month)
        except Exception as e:
            print(f"Error calculating worked INDITEX hours: {e}")
            return 0
    
    def calculate_theoretical_indra_hours(self, employee, year, month):
        """Calcula las horas teóricas INDRA (sin deducciones)"""
        try:
            # Obtener días del mes
            days_in_month = calendar.monthrange(year, month)[1]
            total_hours = 0
            
            for day in range(1, days_in_month + 1):
                date_obj = date(year, month, day)
                weekday = date_obj.weekday()  # 0=Lunes, 6=Domingo
                
                # Verificar si es fin de semana
                if weekday >= 5:  # Sábado o Domingo
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(date_obj, employee.autonomous_community):
                    continue
                
                # Calcular horas base del día (sin deducciones)
                is_summer = month in [7, 8]
                if is_summer:
                    total_hours += 7
                else:
                    if weekday < 4:  # Lunes a Jueves
                        total_hours += employee.hours_mon_thu
                    else:  # Viernes
                        total_hours += employee.hours_fri
            
            return total_hours
            
        except Exception as e:
            print(f"Error calculating theoretical INDRA hours: {e}")
            return 0
    
    def calculate_theoretical_inditex_hours(self, employee, year, month):
        """Calcula las horas teóricas INDITEX (sin deducciones)"""
        try:
            # Calcular período INDITEX: del 26 del mes anterior al 25 del mes actual
            if month == 1:
                prev_year = year - 1
                prev_month = 12
            else:
                prev_year = year
                prev_month = month - 1
            
            # Período: 26 del mes anterior al 25 del mes actual
            start_date = date(prev_year, prev_month, 26)
            end_date = date(year, month, 25)
            
            total_hours = 0
            current_date = start_date
            
            while current_date <= end_date:
                weekday = current_date.weekday()
                
                # Verificar si es fin de semana
                if weekday >= 5:
                    current_date += timedelta(days=1)
                    continue
                
                # Verificar si es festivo
                if self.is_holiday(current_date, employee.autonomous_community):
                    current_date += timedelta(days=1)
                    continue
                
                # Calcular horas base del día (sin deducciones)
                current_month = current_date.month
                is_summer = current_month in [7, 8]
                
                if is_summer:
                    total_hours += 7
                else:
                    if weekday < 4:  # Lunes a Jueves
                        total_hours += employee.hours_mon_thu
                    else:  # Viernes
                        total_hours += employee.hours_fri
                
                current_date += timedelta(days=1)
            
            return total_hours
            
        except Exception as e:
            print(f"Error calculating theoretical INDITEX hours: {e}")
            return 0
    
    def calculate_employee_dashboard_data(self, employee, year, month):
        """Calcula los datos de un empleado para el Dashboard"""
        try:
            # Calcular horas teóricas (sin deducciones)
            theoretical_indra = self.calculate_theoretical_indra_hours(employee, year, month)
            theoretical_inditex = self.calculate_theoretical_inditex_hours(employee, year, month)
            
            # Calcular horas trabajadas (con deducciones)
            worked_indra = self.calculate_worked_indra_hours(employee, year, month)
            worked_inditex = self.calculate_worked_inditex_hours(employee, year, month)
            
            # Calcular eficiencia
            efficiency_indra = (worked_indra / theoretical_indra * 100) if theoretical_indra > 0 else 0
            efficiency_inditex = (worked_inditex / theoretical_inditex * 100) if theoretical_inditex > 0 else 0
            efficiency_avg = (efficiency_indra + efficiency_inditex) / 2
            
            # Determinar estado
            if efficiency_avg >= 95:
                status = 'Excelente'
            elif efficiency_avg >= 85:
                status = 'Bueno'
            else:
                status = 'Mejorable'
            
            return {
                'employee_id': employee.id,
                'full_name': employee.full_name,
                'team_name': employee.team_name,
                'theoretical_indra_hours': round(theoretical_indra, 1),
                'theoretical_inditex_hours': round(theoretical_inditex, 1),
                'worked_indra_hours': round(worked_indra, 1),
                'worked_inditex_hours': round(worked_inditex, 1),
                'efficiency_percentage': round(efficiency_avg, 1),
                'status': status,
                'year': year,
                'month': month
            }
            
        except Exception as e:
            print(f"Error calculating employee dashboard data: {e}")
            return None
    
    def calculate_team_dashboard_data(self, team_name, year, month):
        """Calcula los datos de un equipo para el Dashboard"""
        try:
            employees = Employee.query.filter_by(team_name=team_name).all()
            
            if not employees:
                return None
            
            team_data = {
                'team_name': team_name,
                'employee_count': len(employees),
                'employees': [],
                'total_theoretical_indra': 0,
                'total_theoretical_inditex': 0,
                'total_worked_indra': 0,
                'total_worked_inditex': 0,
                'efficiency_percentage': 0,
                'status': 'Bueno',
                'year': year,
                'month': month
            }
            
            for employee in employees:
                employee_data = self.calculate_employee_dashboard_data(employee, year, month)
                if employee_data:
                    team_data['employees'].append(employee_data)
                    team_data['total_theoretical_indra'] += employee_data['theoretical_indra_hours']
                    team_data['total_theoretical_inditex'] += employee_data['theoretical_inditex_hours']
                    team_data['total_worked_indra'] += employee_data['worked_indra_hours']
                    team_data['total_worked_inditex'] += employee_data['worked_inditex_hours']
            
            # Calcular eficiencia del equipo
            total_theoretical = team_data['total_theoretical_indra'] + team_data['total_theoretical_inditex']
            total_worked = team_data['total_worked_indra'] + team_data['total_worked_inditex']
            
            if total_theoretical > 0:
                team_data['efficiency_percentage'] = round((total_worked / total_theoretical) * 100, 1)
            
            # Determinar estado del equipo
            if team_data['efficiency_percentage'] >= 95:
                team_data['status'] = 'Excelente'
            elif team_data['efficiency_percentage'] >= 85:
                team_data['status'] = 'Bueno'
            else:
                team_data['status'] = 'Mejorable'
            
            # Redondear totales
            team_data['total_theoretical_indra'] = round(team_data['total_theoretical_indra'], 1)
            team_data['total_theoretical_inditex'] = round(team_data['total_theoretical_inditex'], 1)
            team_data['total_worked_indra'] = round(team_data['total_worked_indra'], 1)
            team_data['total_worked_inditex'] = round(team_data['total_worked_inditex'], 1)
            
            return team_data
            
        except Exception as e:
            print(f"Error calculating team dashboard data: {e}")
            return None
    
    def calculate_dashboard_summary(self, year, month):
        """Calcula el resumen completo para el Dashboard"""
        try:
            # Obtener todos los equipos únicos
            teams = db.session.query(Employee.team_name).distinct().all()
            teams_data = []
            
            overall_summary = {
                'total_employees': 0,
                'total_theoretical_indra': 0,
                'total_theoretical_inditex': 0,
                'total_worked_indra': 0,
                'total_worked_inditex': 0,
                'overall_efficiency': 0,
                'active_teams': 0,
                'working_days': self.get_working_days_in_month(year, month),
                'year': year,
                'month': month
            }
            
            for (team_name,) in teams:
                team_data = self.calculate_team_dashboard_data(team_name, year, month)
                if team_data:
                    teams_data.append(team_data)
                    overall_summary['total_employees'] += team_data['employee_count']
                    overall_summary['total_theoretical_indra'] += team_data['total_theoretical_indra']
                    overall_summary['total_theoretical_inditex'] += team_data['total_theoretical_inditex']
                    overall_summary['total_worked_indra'] += team_data['total_worked_indra']
                    overall_summary['total_worked_inditex'] += team_data['total_worked_inditex']
                    overall_summary['active_teams'] += 1
            
            # Calcular eficiencia general
            total_theoretical = overall_summary['total_theoretical_indra'] + overall_summary['total_theoretical_inditex']
            total_worked = overall_summary['total_worked_indra'] + overall_summary['total_worked_inditex']
            
            if total_theoretical > 0:
                overall_summary['overall_efficiency'] = round((total_worked / total_theoretical) * 100, 1)
            
            # Determinar estado general
            if overall_summary['overall_efficiency'] >= 95:
                overall_summary['overall_status'] = 'Excelente'
            elif overall_summary['overall_efficiency'] >= 85:
                overall_summary['overall_status'] = 'Bueno'
            else:
                overall_summary['overall_status'] = 'Mejorable'
            
            # Redondear totales
            overall_summary['total_theoretical_indra'] = round(overall_summary['total_theoretical_indra'], 1)
            overall_summary['total_theoretical_inditex'] = round(overall_summary['total_theoretical_inditex'], 1)
            overall_summary['total_worked_indra'] = round(overall_summary['total_worked_indra'], 1)
            overall_summary['total_worked_inditex'] = round(overall_summary['total_worked_inditex'], 1)
            
            return {
                'teams': teams_data,
                'overall_summary': overall_summary
            }
            
        except Exception as e:
            print(f"Error calculating dashboard summary: {e}")
            return None

