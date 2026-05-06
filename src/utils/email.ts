import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.debug(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw new Error('Email could not be sent');
  }
};

// ── Email templates ────────────────────────────────────────────────────────────

export const sendVerificationEmail = async (
  to: string,
  name: string,
  token: string
): Promise<void> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: 'Verify your ShiftOS account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
        <h2 style="margin-bottom:8px">Welcome to ShiftOS, ${name}!</h2>
        <p style="color:#555">Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#185FA5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Verify Email
        </a>
        <p style="font-size:12px;color:#999">Or copy this link: ${verifyUrl}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#bbb">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string
): Promise<void> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: 'Reset your ShiftOS password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
        <h2 style="margin-bottom:8px">Password reset request</h2>
        <p style="color:#555">Hi ${name}, we received a request to reset your password. Click the button below. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#185FA5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Reset Password
        </a>
        <p style="font-size:12px;color:#999">Or copy this link: ${resetUrl}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#bbb">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
  });
};
