/**
 * Transactional Email Abstraction
 * Supports swappable providers (Mock/Console, Resend, SMTP, etc.)
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface IEmailProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<{ id: string; provider: string }>;
}

class ConsoleEmailProvider implements IEmailProvider {
  name = 'console';

  async sendEmail(options: SendEmailOptions): Promise<{ id: string; provider: string }> {
    const id = `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[EmailProvider:${this.name}] To: ${options.to} | Subject: ${options.subject}`);
      console.log(`[EmailProvider:${this.name}] Content:\n${options.text}`);
    }
    return { id, provider: this.name };
  }
}

export class EmailService {
  private static provider: IEmailProvider = new ConsoleEmailProvider();

  /**
   * Allows setting a custom provider (e.g. Resend, Sendgrid, SES) at runtime
   */
  static setProvider(provider: IEmailProvider) {
    this.provider = provider;
  }

  static getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Sends an account email verification email
   */
  static async sendVerificationEmail(
    to: string,
    token: string,
    userName: string
  ): Promise<{ id: string }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;

    const subject = 'Verify your email address - Guitar Learning Platform';
    const text = `Hello ${userName},\n\nPlease verify your email by clicking the following link:\n${verifyUrl}\n\nThis verification link expires in 24 hours.\nIf you did not create this account, please ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to Guitar Learning Platform!</h2>
        <p>Hello ${userName},</p>
        <p>Please click the button below to verify your email address and activate full platform access:</p>
        <div style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours. If you did not sign up, please ignore this email.</p>
      </div>
    `;

    return this.provider.sendEmail({ to, subject, text, html });
  }

  /**
   * Sends a password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    token: string,
    userName: string
  ): Promise<{ id: string }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const subject = 'Reset your password - Guitar Learning Platform';
    const text = `Hello ${userName},\n\nWe received a request to reset your password. Click the link below to choose a new password:\n${resetUrl}\n\nThis reset link expires in 1 hour.\nIf you did not request a password reset, no action is needed.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>We received a request to reset the password for your account. Click the button below to set a new password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #e11d48; font-size: 12px; margin-top: 20px;">For your security, resetting your password will automatically log out all existing sessions on other devices.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 10px;">This link expires in 1 hour. If you did not request this, please ensure your account is secure.</p>
      </div>
    `;

    return this.provider.sendEmail({ to, subject, text, html });
  }

  /**
   * Sends a security notification email (e.g. password changed, session revoked)
   */
  static async sendSecurityAlert(
    to: string,
    title: string,
    details: string
  ): Promise<{ id: string }> {
    const subject = `Security Alert: ${title} - Guitar Learning Platform`;
    const text = `Hello,\n\n${title}\n\nDetails: ${details}\n\nIf you did not initiate this change, please reset your password and contact support immediately.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e11d48;">Security Notification</h2>
        <p><strong>${title}</strong></p>
        <p>${details}</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
          If this activity was not done by you, please visit <a href="/forgot-password">Reset Password</a> immediately to secure your account.
        </p>
      </div>
    `;

    return this.provider.sendEmail({ to, subject, text, html });
  }
}
