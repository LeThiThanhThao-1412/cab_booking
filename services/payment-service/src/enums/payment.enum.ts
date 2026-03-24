export enum PaymentStatus {
  PENDING = 'pending',           // Chờ xử lý
  PROCESSING = 'processing',     // Đang xử lý
  COMPLETED = 'completed',       // Thành công
  FAILED = 'failed',             // Thất bại
  REFUNDED = 'refunded',         // Đã hoàn tiền
  CANCELLED = 'cancelled',       // Đã hủy
}

export enum PaymentMethod {
  CASH = 'cash',                 // Tiền mặt
  CARD = 'card',                 // Thẻ ngân hàng
  WALLET = 'wallet',             // Ví điện tử
  MOMO = 'momo',                 // MoMo
  ZALOPAY = 'zalopay',           // ZaloPay
  VNPAY = 'vnpay',               // VNPay
}

export enum TransactionType {
  PAYMENT = 'payment',           // Thanh toán
  REFUND = 'refund',             // Hoàn tiền
  WITHDRAWAL = 'withdrawal',     // Rút tiền
  DEPOSIT = 'deposit',           // Nạp tiền
}

export enum SagaStepStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATED = 'compensated',
}