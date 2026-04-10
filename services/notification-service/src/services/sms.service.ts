import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      this.logger.log(`Sending SMS to ${phoneNumber}: ${message.substring(0, 50)}...`);
      
      // Mock: Trong thực tế, gọi Twilio hoặc SMS API
      // const twilio = new Twilio(...);
      // await twilio.messages.create({
      //   body: message,
      //   to: phoneNumber,
      //   from: this.configService.get('TWILIO_PHONE_NUMBER'),
      // });
      
      this.logger.log(`✅ SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`SMS failed: ${error.message}`);
      return false;
    }
  }
}