from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Employee(db.Model):
    __tablename__ = 'employees'
    
    id = db.Column(db.Integer, primary_key=True)
    team_name = db.Column(db.String(100), nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False)
    hours_mon_thu = db.Column(db.Float, nullable=False)
    hours_fri = db.Column(db.Float, nullable=False)
    vacation_days = db.Column(db.Integer, nullable=False)
    free_hours = db.Column(db.Integer, nullable=False)
    autonomous_community_id = db.Column(db.Integer, db.ForeignKey('autonomous_communities.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    autonomous_community = db.relationship('AutonomousCommunity', backref='employees')
    
    # Relación con entradas de calendario
    calendar_entries = db.relationship('CalendarEntry', backref='employee', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Employee {self.full_name} - {self.team_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'team_name': self.team_name,
            'full_name': self.full_name,
            'hours_mon_thu': self.hours_mon_thu,
            'hours_fri': self.hours_fri,
            'vacation_days': self.vacation_days,
            'free_hours': self.free_hours,
            'autonomous_community_id': self.autonomous_community_id,
            'autonomous_community_name': self.autonomous_community.name if self.autonomous_community else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_weekly_hours(self):
        """Calcula las horas semanales totales"""
        return (self.hours_mon_thu * 4) + self.hours_fri
    
    def get_monthly_hours(self, year, month):
        """Calcula las horas mensuales teóricas (sin considerar ausencias)"""
        import calendar
        # Contar días laborables del mes
        working_days = 0
        days_in_month = calendar.monthrange(year, month)[1]
        
        for day in range(1, days_in_month + 1):
            date_obj = datetime(year, month, day)
            weekday = date_obj.weekday()  # 0=Lunes, 6=Domingo
            
            if weekday < 4:  # Lunes a Jueves
                working_days += self.hours_mon_thu
            elif weekday == 4:  # Viernes
                working_days += self.hours_fri
            # Sábado y Domingo no se cuentan
        
        return working_days
    
    @staticmethod
    def get_autonomous_communities():
        """Retorna el mapeo de comunidades autónomas"""
        return {
            'Andalucía': 'AN',
            'Aragón': 'AR',
            'Asturias': 'AS',
            'Baleares': 'IB',
            'Canarias': 'CN',
            'Cantabria': 'CB',
            'Castilla-La Mancha': 'CM',
            'Castilla y León': 'CL',
            'Cataluña': 'CT',
            'Comunidad Valenciana': 'VC',
            'Extremadura': 'EX',
            'Galicia': 'GA',
            'La Rioja': 'RI',
            'Madrid': 'MD',
            'Murcia': 'MC',
            'Navarra': 'NC',
            'País Vasco': 'PV',
            'Ceuta': 'CE',
            'Melilla': 'ML'
        }

class CalendarEntry(db.Model):
    __tablename__ = 'calendar_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    activity_type = db.Column(db.String(10), nullable=False)  # V, F, HLD, G, V!, C
    hours = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Índice único para evitar duplicados
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='unique_employee_date'),
        db.Index('idx_employee_date', 'employee_id', 'date'),
    )
    
    def __repr__(self):
        return f'<CalendarEntry {self.employee_id} - {self.date} - {self.activity_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'date': self.date.isoformat() if self.date else None,
            'activity_type': self.activity_type,
            'hours': self.hours,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @staticmethod
    def get_activity_types():
        """Retorna los tipos de actividades válidos"""
        return {
            'V': {'name': 'Vacaciones', 'color': '#c8e6c9', 'requires_hours': False},
            'F': {'name': 'Ausencias', 'color': '#fff9c4', 'requires_hours': False},
            'HLD': {'name': 'Horas Libre Disposición', 'color': '#4caf50', 'requires_hours': True},
            'G': {'name': 'Guardia', 'color': '#ffcc80', 'requires_hours': True},
            'V!': {'name': 'Formación/Evento', 'color': '#e1bee7', 'requires_hours': False},
            'C': {'name': 'Permiso/Otro', 'color': '#bbdefb', 'requires_hours': False}
        }

class AutonomousCommunity(db.Model):
    __tablename__ = 'autonomous_communities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

    def __repr__(self):
        return f'<AutonomousCommunity {self.name}>'

class Province(db.Model):
    __tablename__ = 'provinces'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    autonomous_community_id = db.Column(db.Integer, db.ForeignKey('autonomous_communities.id'), nullable=False)
    autonomous_community = db.relationship('AutonomousCommunity', backref='provinces')

    def __repr__(self):
        return f'<Province {self.name} ({self.autonomous_community_id})>'

class Holiday(db.Model):
    __tablename__ = 'holidays'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    autonomous_community_id = db.Column(db.Integer, db.ForeignKey('autonomous_communities.id'), nullable=True, index=True)
    province_id = db.Column(db.Integer, db.ForeignKey('provinces.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    autonomous_community = db.relationship('AutonomousCommunity', backref='holidays')
    province = db.relationship('Province', backref='holidays')

    # Índice único para evitar duplicados
    __table_args__ = (
        db.UniqueConstraint('date', 'autonomous_community_id', 'province_id', name='unique_date_community_province'),
        db.Index('idx_date_community_province', 'date', 'autonomous_community_id', 'province_id'),
    )
    
    def __repr__(self):
        return f'<Holiday {self.name} - {self.date} - {self.autonomous_community_id} - {self.province_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'name': self.name,
            'autonomous_community': self.autonomous_community_id,
            'province': self.province_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

