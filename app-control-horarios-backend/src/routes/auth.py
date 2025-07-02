from flask import Blueprint, request, jsonify
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/admin/validate', methods=['POST'])
def validate_admin():
    data = request.get_json()
    password = data.get('password')
    if password == os.getenv('ADMIN_PASSWORD'):
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Contraseña incorrecta'}), 401