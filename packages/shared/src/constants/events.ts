export const RABBITMQ_EXCHANGES = {
  AUTH_EVENTS: 'auth.events',
  USER_EVENTS: 'user.events',
  DRIVER_EVENTS: 'driver.events',
  RIDE_EVENTS: 'ride.events',
  PAYMENT_EVENTS: 'payment.events',
} as const;

export const ROUTING_KEYS = {
  AUTH: {
    USER_REGISTERED: 'auth.user.registered',
    USER_LOGIN: 'auth.user.login',
  },
  RIDE: {
    CREATED: 'ride.created',
    ASSIGNED: 'ride.assigned',
    COMPLETED: 'ride.completed',
  },
} as const;