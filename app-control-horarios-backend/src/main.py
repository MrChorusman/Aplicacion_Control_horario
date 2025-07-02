from flask import Flask, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Crear la aplicación Flask
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
CORS(app)

# Configuración de la base de datos con pool optimizado
database_url = os.getenv('DATABASE_URL')
if database_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    # Configuración del pool de conexiones para evitar MaxClients
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 5,          # Reducir pool size
        'pool_timeout': 20,      # Timeout para obtener conexión
        'pool_recycle': 300,     # Reciclar conexiones cada 5 min
        'max_overflow': 0,       # Sin conexiones adicionales
        'pool_pre_ping': True    # Verificar conexiones antes de usar
    }
    print("🔗 Conectando a Supabase PostgreSQL con pool optimizado...")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///control_horarios.db'
    print("🔗 Usando SQLite local...")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Importar e inicializar la base de datos
from src.models.employee import db
db.init_app(app)

# Importar modelos después de inicializar db
from src.models.employee import Employee, CalendarEntry, Holiday

# Importar rutas
from src.routes.employee import employee_bp
from src.routes.calendar import calendar_bp
from src.routes.forecast import forecast_bp
from src.routes.holiday import holiday_bp
from src.routes.auth import auth_bp

# Registrar blueprints
app.register_blueprint(employee_bp, url_prefix='/api')
app.register_blueprint(calendar_bp, url_prefix='/api')
app.register_blueprint(forecast_bp, url_prefix='/api')
app.register_blueprint(holiday_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')

# Crear las tablas e inicializar festivos
with app.app_context():
    try:
        db.create_all()
        print("✅ Tablas de base de datos creadas/verificadas exitosamente")
        
        # Verificar festivos existentes
        holiday_count = Holiday.query.count()
        if holiday_count > 0:
            print(f"✅ Ya existen {holiday_count} festivos en la base de datos")
        else:
            print("⚠️ No hay festivos en la base de datos")
            
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")

@app.route('/')
def index():
    return jsonify({
        'message': 'API Control de Horarios',
        'status': 'running',
        'version': '1.0.0'
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'database': 'connected' if database_url else 'local'
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)

