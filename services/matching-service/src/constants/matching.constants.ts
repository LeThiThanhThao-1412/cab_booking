export const MATCHING_CONFIG = {
  DEFAULT_SEARCH_RADIUS: 5, // km
  MAX_SEARCH_RADIUS: 10, // km
  MIN_SEARCH_RADIUS: 1, // km
  SEARCH_EXPAND_STEP: 2, // km - mở rộng dần nếu không tìm thấy
  MAX_EXPAND_ATTEMPTS: 3,
  
  // Scoring weights
  WEIGHTS: {
    DISTANCE: 0.4,      // 40% - khoảng cách
    RATING: 0.3,        // 30% - đánh giá
    ACCEPTANCE_RATE: 0.2, // 20% - tỷ lệ nhận chuyến
    EXPERIENCE: 0.1,    // 10% - số chuyến đã hoàn thành
  },
  
  // Timeouts
  DRIVER_RESPONSE_TIMEOUT: 30, // seconds
  MATCHING_TIMEOUT: 60, // seconds
};

export const REDIS_KEYS = {
  DRIVER_LOCATIONS: 'driver:locations',
  DRIVER_STATUS: (driverId: string) => `driver:status:${driverId}`,
  DRIVER_INFO: (driverId: string) => `driver:info:${driverId}`,
  PENDING_BOOKING: (bookingId: string) => `pending:booking:${bookingId}`,
  MATCHING_ATTEMPT: (bookingId: string) => `matching:attempt:${bookingId}`,
};

export const RABBITMQ_EXCHANGES = {
  MATCHING_EVENTS: 'matching.events',
  BOOKING_EVENTS: 'booking.events',
  DRIVER_EVENTS: 'driver.events',
};

export const ROUTING_KEYS = {
  // Matching events
  MATCHING_STARTED: 'matching.started',
  MATCHING_DRIVER_FOUND: 'matching.driver.found',
  MATCHING_DRIVER_ACCEPTED: 'matching.driver.accepted',
  MATCHING_DRIVER_REJECTED: 'matching.driver.rejected',
  MATCHING_NO_DRIVER: 'matching.no.driver',
  MATCHING_COMPLETED: 'matching.completed',
  MATCHING_FAILED: 'matching.failed',
  
  // Booking events to listen
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  
  // Driver events to listen
  DRIVER_ONLINE: 'driver.online',
  DRIVER_OFFLINE: 'driver.offline',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
};