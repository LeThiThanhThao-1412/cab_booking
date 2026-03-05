// Kết nối đến admin database
db = db.getSiblingDB('admin');

// Xác thực với root user
db.auth('admin', 'password123');

// Tạo databases và users cho các services
const databases = ['booking', 'notification', 'ride'];

databases.forEach(dbName => {
  db = db.getSiblingDB(dbName);
  
  // Tạo user cho service
  db.createUser({
    user: 'service_user',
    pwd: 'service_password123',
    roles: [
      { role: 'readWrite', db: dbName },
      { role: 'dbAdmin', db: dbName }
    ]
  });
  
  // Tạo collections mẫu
  if (dbName === 'booking') {
    db.createCollection('bookings');
    db.createCollection('booking_history');
    db.bookings.createIndex({ "customerId": 1 });
    db.bookings.createIndex({ "status": 1 });
    db.bookings.createIndex({ "createdAt": 1 });
  }
  
  if (dbName === 'ride') {
    db.createCollection('rides');
    db.createCollection('ride_tracking');
    db.rides.createIndex({ "driverId": 1 });
    db.rides.createIndex({ "status": 1 });
    db.rides.createIndex({ "createdAt": 1 });
  }
  
  if (dbName === 'notification') {
    db.createCollection('notifications');
    db.createCollection('notification_templates');
    db.notifications.createIndex({ "userId": 1 });
    db.notifications.createIndex({ "read": 1 });
    db.notifications.createIndex({ "createdAt": 1 });
  }
});

print('✅ MongoDB initialization completed!');