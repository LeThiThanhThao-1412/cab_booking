import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: configService.get('EMAIL_PORT', 587),
      secure: false,
      auth: {
        user: configService.get('EMAIL_USER'),
        pass: configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    try {
      this.logger.log(`Sending email to ${to}: ${subject}`);

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM', 'noreply@cab-booking.com'),
        to,
        subject,
        text,
        html: html || this.formatHtml(text),
      });

      this.logger.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Email failed: ${error.message}`);
      return false;
    }
  }

  private formatHtml(text: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CAB Booking</h1>
          </div>
          <div class="content">
            <p>${text.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CAB Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}