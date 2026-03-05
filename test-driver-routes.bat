@echo off
echo Testing Driver Service Routes...
echo.

set TOKEN=YOUR_TOKEN_HERE

echo 1. GET /drivers/profile
curl -X GET http://localhost:3003/drivers/profile -H "Authorization: Bearer %TOKEN%"
echo.
echo.

echo 2. PATCH /drivers/status
curl -X PATCH http://localhost:3003/drivers/status -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"status\":\"online\"}"
echo.
echo.

echo 3. PATCH /drivers/location
curl -X PATCH http://localhost:3003/drivers/location -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"latitude\":10.8231,\"longitude\":106.6297}"
echo.
echo.

echo 4. GET /drivers/nearby?lat=10.8231&lng=106.6297
curl -X GET "http://localhost:3003/drivers/nearby?lat=10.8231&lng=106.6297" -H "Authorization: Bearer %TOKEN%"
echo.
echo.

pause