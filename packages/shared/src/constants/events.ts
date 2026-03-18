export const RABBITMQ_EXCHANGES = {
  AUTH_EVENTS: 'auth.events',
  USER_EVENTS: 'user.events',
  DRIVER_EVENTS: 'driver.events',
  RIDE_EVENTS: 'ride.events',
  PAYMENT_EVENTS: 'payment.events',
  MATCHING_EVENTS: 'matching.events',
  BOOKING_EVENTS: 'booking.events',
} as const;

export const ROUTING_KEYS = {
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  
  // Matching events
  MATCHING_REQUEST: 'matching.request',
  MATCHING_STARTED: 'matching.started',
  MATCHING_DRIVER_FOUND: 'matching.driver.found',
  MATCHING_DRIVER_ACCEPTED: 'matching.driver.accepted',
  MATCHING_DRIVER_REJECTED: 'matching.driver.rejected',
  MATCHING_NO_DRIVER: 'matching.no.driver',
  MATCHING_COMPLETED: 'matching.completed',
  MATCHING_FAILED: 'matching.failed',

  // Driver responses
  DRIVER_RESPONSE_ACCEPTED: 'driver.response.accepted',
  DRIVER_RESPONSE_REJECTED: 'driver.response.rejected',
} as const;