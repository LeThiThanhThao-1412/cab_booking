'use client'

import { SearchForm } from '@/components/booking/search-form'
import { Car, Shield, Clock, CreditCard } from 'lucide-react'

const features = [
  { icon: Car, title: 'Đa dạng phương tiện', description: 'Xe máy, ô tô 4 chỗ, 7 chỗ, xe sang' },
  { icon: Shield, title: 'An toàn tuyệt đối', description: 'Tài xế được kiểm tra lý lịch, bảo hiểm đầy đủ' },
  { icon: Clock, title: 'Đặt xe nhanh chóng', description: 'Chỉ 30 giây để đặt xe, tài xế đến trong 5 phút' },
  { icon: CreditCard, title: 'Thanh toán linh hoạt', description: 'Tiền mặt, thẻ, ví điện tử, trả sau' },
]

const vehicleTypes = [
  { name: 'Xe Máy', icon: '🛵', price: '12.000đ', time: '2-3 phút' },
  { name: 'Xe 4 Chỗ', icon: '🚗', price: '35.000đ', time: '3-5 phút' },
  { name: 'Xe 7 Chỗ', icon: '🚐', price: '45.000đ', time: '5-7 phút' },
]

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-yellow-50 via-white to-green-50">
        <div className="container py-8 lg:py-12">
          <SearchForm />
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Chọn loại xe phù hợp</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {vehicleTypes.map((vehicle, index) => (
            <div key={index} className="p-6 bg-white rounded-lg border hover:border-primary hover:shadow-lg transition-all cursor-pointer">
              <div className="text-4xl mb-4">{vehicle.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{vehicle.name}</h3>
              <p className="text-gray-600 text-sm mb-1">Giá cước: <span className="font-semibold">{vehicle.price}</span>/km</p>
              <p className="text-gray-600 text-sm">Thời gian đón: {vehicle.time}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-12">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">Tại sao chọn chúng tôi?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-12 text-center">
        <div className="bg-primary rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng cho chuyến đi của bạn?</h2>
          <p className="text-lg mb-6 opacity-90">Tải app ngay để nhận ưu đãi 50% cho chuyến đi đầu tiên</p>
          <div className="flex justify-center gap-4">
            <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition">📱 App Store</button>
            <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition">📱 Google Play</button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div><h3 className="font-bold mb-4">Cab Booking</h3><p className="text-sm text-gray-400">Dịch vụ đặt xe công nghệ hàng đầu</p></div>
            <div><h4 className="font-semibold mb-4">Dịch vụ</h4><ul className="space-y-2 text-sm text-gray-400"><li>Đặt xe</li><li>Giao hàng</li><li>Đi chợ hộ</li></ul></div>
            <div><h4 className="font-semibold mb-4">Hỗ trợ</h4><ul className="space-y-2 text-sm text-gray-400"><li>Trung tâm trợ giúp</li><li>Liên hệ</li><li>Điều khoản</li></ul></div>
            <div><h4 className="font-semibold mb-4">Theo dõi</h4><ul className="space-y-2 text-sm text-gray-400"><li>Facebook</li><li>Instagram</li><li>Zalo</li></ul></div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">© 2024 Cab Booking. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}