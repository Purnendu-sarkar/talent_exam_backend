import config from '../../../config';
import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  if (config.env === 'development' && !config.email.smtp_host) {
    // Development fallback
    console.log(`\n📧 [MOCK EMAIL to ${to}]`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.smtp_host,
      port: config.email.smtp_port,
      secure: config.email.smtp_port === 465,
      auth: {
        user: config.email.smtp_user,
        pass: config.email.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    // In production, you might want to throw an error here, but for OTP
    // we often swallow or log it so we don't crash the server.
    throw new Error('Failed to send email');
  }
};
