#!/bin/bash

echo "🚀 Testing Application Control de Horarios"
echo "=========================================="

# Test backend
echo ""
echo "🔧 Testing Backend (Flask)..."
echo "URL: http://127.0.0.1:8000"

# Health check
echo "  📋 Health check:"
health_response=$(curl -s http://127.0.0.1:8000/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "  ✅ Health: $health_response"
else
  echo "  ❌ Backend not responding"
  exit 1
fi

# API info
echo "  📋 API info:"
api_response=$(curl -s http://127.0.0.1:8000/api 2>/dev/null | head -c 100)
if [ $? -eq 0 ]; then
  echo "  ✅ API: $api_response..."
else
  echo "  ❌ API not responding"
fi

# Test frontend
echo ""
echo "🎨 Testing Frontend (React)..."
echo "URL: http://localhost:5173"

frontend_response=$(curl -s -I http://localhost:5173 2>/dev/null | head -1)
if [ $? -eq 0 ]; then
  echo "  ✅ Frontend: $frontend_response"
else
  echo "  ❌ Frontend not responding"
  exit 1
fi

# Test database connectivity
echo ""
echo "🗄️ Testing Database..."
db_test=$(curl -s http://127.0.0.1:8000/api/countries 2>/dev/null)
if [[ $db_test == *"success"* ]] || [[ $db_test == *"["* ]]; then
  echo "  ✅ Database connected and responding"
else
  echo "  ⚠️  Database might have issues"
fi

echo ""
echo "🎉 Application is running successfully!"
echo "   👤 Access the app at: http://localhost:5173"
echo "   🔧 Backend API at: http://127.0.0.1:8000"
echo ""
echo "🔐 Default login credentials (if needed):"
echo "   Email: admin@example.com"
echo "   Password: password"