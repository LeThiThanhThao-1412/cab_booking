@echo off
echo ===== TESTING DATABASE CONNECTIONS =====
echo.

echo 1. Testing PostgreSQL...
docker exec cab-postgres pg_isready -U admin
if %errorlevel% equ 0 (echo ✅ PostgreSQL OK) else (echo ❌ PostgreSQL FAILED)
echo.

echo 2. Testing MongoDB...
docker exec cab-mongodb mongosh --eval "db.adminCommand('ping')" --quiet
if %errorlevel% equ 0 (echo ✅ MongoDB OK) else (echo ❌ MongoDB FAILED)
echo.

echo 3. Testing Redis...
docker exec cab-redis redis-cli -a password123 ping | findstr PONG
if %errorlevel% equ 0 (echo ✅ Redis OK) else (echo ❌ Redis FAILED)
echo.

echo 4. Testing RabbitMQ...
docker exec cab-rabbitmq rabbitmq-diagnostics ping
if %errorlevel% equ 0 (echo ✅ RabbitMQ OK) else (echo ❌ RabbitMQ FAILED)
echo.

echo ===== ALL TESTS COMPLETED =====
pause