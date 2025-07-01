from flask import Flask, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from dotenv import load_dotenv
from flask_security import Security, SQLAlchemyUserDatastore, utils
from flask_bcrypt import Bcrypt
from datetime import timedelta # Importar timedelta

# Cargar variables de entorno
load_dotenv()

# Crear la aplicación Flask
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# --- Configuración de Flask-Security-Too ---
# Es CRUCIAL que SECRET_KEY y SECURITY_PASSWORD_SALT se definan en el archivo .env
# EJEMPLO para .env:
# FLASK_APP=src/main.py
# FLASK_DEBUG=True
# DATABASE_URL="postgresql://user:pass@host:port/dbname"
# SECRET_KEY="una_cadena_secreta_muy_larga_y_aleatoria_aqui"
# SECURITY_PASSWORD_SALT="otro_valor_secreto_largo_y_aleatorio_aqui"

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SECURITY_PASSWORD_SALT'] = os.getenv('SECURITY_PASSWORD_SALT')

if not app.config['SECRET_KEY'] or not app.config['SECURITY_PASSWORD_SALT']:
    print("⚠️ ADVERTENCIA: SECRET_KEY o SECURITY_PASSWORD_SALT no están configuradas en las variables de entorno. Usando valores por defecto NO SEGUROS.")
    app.config['SECRET_KEY'] = 'fallback-secret-key-dev-only'
    app.config['SECURITY_PASSWORD_SALT'] = 'fallback-salt-dev-only'


app.config['SECURITY_PASSWORD_HASH'] = 'bcrypt'
app.config['SECURITY_TOKEN_AUTHENTICATION_HEADER'] = "Authorization"
app.config['SECURITY_USER_IDENTITY_ATTRIBUTES'] = [
    {"email": {"required": True, "allow_unverified": True}}
]
app.config['SECURITY_LOGIN_URL'] = '/api/login'
app.config['SECURITY_LOGOUT_URL'] = '/api/logout'
app.config['SECURITY_REGISTER_URL'] = '/api/register'
app.config['SECURITY_SEND_REGISTER_EMAIL'] = False
app.config['SECURITY_CONFIRMABLE'] = False
app.config['SECURITY_REGISTERABLE'] = True
app.config['SECURITY_RECOVERABLE'] = False
app.config['SECURITY_CHANGEABLE'] = True
app.config['SECURITY_TRACKABLE'] = False

# Para una API JSON que usa tokens Bearer, la protección CSRF tradicional de sesión no es necesaria
# para los endpoints de la API. Los endpoints de Flask-Security (login, register)
# pueden seguir usando CSRF si se accede a ellos como formularios HTML, pero nuestro frontend
# los llamará con JSON.
app.config['SECURITY_CSRF_PROTECT_MECHANISMS'] = [] # Deshabilitar CSRF de sesión para Flask-Security
app.config['SECURITY_CSRF_IGNORE_UNAUTH_ENDPOINTS'] = True # Ya estaba
app.config['WTF_CSRF_ENABLED'] = False # Deshabilitar CSRF global de WTF-Flask, bueno para API
app.config['SECURITY_SESSION_PROTECTION'] = None # O 'basic'. 'strong' requiere más configuración de sesión. Para API sin estado, la sesión no se usa para autenticar peticiones.


# Configuración para JWT (Flask-Security-Too maneja esto internamente si se usan sus endpoints de token)
# Si quisiéramos generar tokens manualmente o tener más control:
app.config["JWT_ALGORITHM"] = "HS256" # Asegurarse que coincide con lo que espera el cliente si se personaliza
app.config["JWT_EXPIRATION_DELTA"] = timedelta(days=1)
app.config["JWT_AUTH_HEADER_PREFIX"] = "Bearer"
app.config["SECURITY_URL_PREFIX"] = "/api/auth" # Cambiar prefijo para las rutas de Flask-Security-Too para evitar colisiones

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "*")}}) # Ajustar origins para producción

# Bcrypt (Flask-Security-Too ya lo maneja si se configura SECURITY_PASSWORD_HASH = 'bcrypt')
# bcrypt = Bcrypt(app) # No es necesario si Flask-Security se encarga

# Configuración de la base de datos con pool optimizado
database_url = os.getenv('DATABASE_URL')
if database_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 5,
        'pool_timeout': 20,
        'pool_recycle': 300,
        'max_overflow': 0,
        'pool_pre_ping': True
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
from src.models.employee import Employee, CalendarEntry, Holiday, User, Role # Añadir User y Role
from datetime import datetime # Añadir datetime

# Configurar Flask-Security-Too
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

# Función para crear roles y usuario admin inicial (opcional)
def create_initial_roles_and_user(app_context_user_datastore):
    """Crea roles y un usuario admin si no existen."""
    with app.app_context(): # Asegurar que estamos en contexto de aplicación
        # Crear roles si no existen
        admin_role = app_context_user_datastore.find_or_create_role(name='admin', description='Administrator')
        user_role = app_context_user_datastore.find_or_create_role(name='user', description='Regular user')

        # Crear un usuario admin de prueba si no existe ninguno
        # En producción, esto debería manejarse de forma más segura o eliminarse.
        if not app_context_user_datastore.get_user('admin@example.com'):
            print("👤 Creando usuario admin de prueba: admin@example.com / password")
            import uuid
            fs_uniquifier = str(uuid.uuid4())

            app_context_user_datastore.create_user(
                email='admin@example.com',
                password=utils.hash_password('password'),
                roles=[admin_role, user_role],
                fs_uniquifier=fs_uniquifier,
                active=True,
                confirmed_at=datetime.utcnow()
            )
        db.session.commit()

# Importar rutas
from src.routes.employee import employee_bp
from src.routes.calendar import calendar_bp
from src.routes.forecast import forecast_bp
from src.routes.holiday import holiday_bp

# Registrar blueprints
app.register_blueprint(employee_bp, url_prefix='/api')
app.register_blueprint(calendar_bp, url_prefix='/api')
app.register_blueprint(forecast_bp, url_prefix='/api')
app.register_blueprint(holiday_bp, url_prefix='/api')

# Crear las tablas e inicializar festivos
with app.app_context():
    try:
        db.create_all()
        print("✅ Tablas de base de datos creadas/verificadas exitosamente")

        # Crear roles y usuario admin inicial
        if user_datastore: # Asegurarse que user_datastore está disponible
            create_initial_roles_and_user(user_datastore)
        else:
            print("⚠️ user_datastore no disponible, no se crearon roles/usuario iniciales.")

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

