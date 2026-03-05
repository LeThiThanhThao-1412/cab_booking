-- Script tạo nhiều databases cho các services
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE payment_db;
CREATE DATABASE review_db;
CREATE DATABASE driver_db;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE user_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE review_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE driver_db TO admin;

-- Kết nối vào từng database để tạo extensions
\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c user_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c payment_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c review_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c driver_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- Cho Geo-spatial (nếu cần)