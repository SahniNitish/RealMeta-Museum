import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import Logger from '../utils/logger';

const ses = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const SENDER = 'noreply@realmeta.ca';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://museum.realmeta.ca';

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  adminName: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Inter',Arial,sans-serif;color:#f5f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#161b27;border-radius:16px;overflow:hidden;border:1px solid #2a2f3d;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px;background:linear-gradient(135deg,#b8892a,#e2b04a);text-align:center;">
              <div style="width:56px;height:56px;background:rgba(0,0,0,0.25);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:32px;font-weight:700;color:#fff;line-height:1;">R</span>
              </div>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;">RealMeta</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">AI-Powered Museum Guide</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;font-size:22px;color:#f5f0e8;">Reset your password, ${adminName}</h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#8a8fa8;">
                We received a request to reset the password for your RealMeta account. Click the button below to set a new password.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#b8892a,#e2b04a);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                  Reset Password
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#8a8fa8;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#b8892a;">${resetUrl}</p>

              <hr style="border:none;border-top:1px solid #2a2f3d;margin:24px 0;" />

              <p style="margin:0;font-size:12px;color:#8a8fa8;line-height:1.6;">
                This link expires in <strong style="color:#f5f0e8;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#0f1117;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a4f5e;">
                &copy; ${new Date().getFullYear()} RealMeta &middot; realmeta.ca
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const command = new SendEmailCommand({
    Source: SENDER,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Reset your RealMeta password', Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: {
          Data: `Hi ${adminName},\n\nReset your RealMeta password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\n— RealMeta`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    await ses.send(command);
    Logger.info(`Password reset email sent to ${to}`);
  } catch (err) {
    Logger.error(`Failed to send password reset email to ${to}: ${err}`);
    throw err;
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  adminName: string
): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Inter',Arial,sans-serif;color:#f5f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#161b27;border-radius:16px;overflow:hidden;border:1px solid #2a2f3d;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px;background:linear-gradient(135deg,#b8892a,#e2b04a);text-align:center;">
              <div style="width:56px;height:56px;background:rgba(0,0,0,0.25);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:32px;font-weight:700;color:#fff;line-height:1;">R</span>
              </div>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;">RealMeta</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">AI-Powered Museum Guide</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;font-size:22px;color:#f5f0e8;">Verify your email, ${adminName}</h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#8a8fa8;">
                Thanks for signing up! Click the button below to verify your email address and activate your RealMeta museum admin account.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}"
                   style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#b8892a,#e2b04a);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                  Verify Email Address
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#8a8fa8;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#b8892a;">${verifyUrl}</p>

              <hr style="border:none;border-top:1px solid #2a2f3d;margin:24px 0;" />

              <p style="margin:0;font-size:12px;color:#8a8fa8;line-height:1.6;">
                This link expires in <strong style="color:#f5f0e8;">24 hours</strong>. If you didn't create a RealMeta account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#0f1117;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a4f5e;">
                © ${new Date().getFullYear()} RealMeta · realmeta.ca
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const command = new SendEmailCommand({
    Source: SENDER,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Verify your RealMeta account', Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: {
          Data: `Hi ${adminName},\n\nVerify your RealMeta account by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— RealMeta`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    await ses.send(command);
    Logger.info(`Verification email sent to ${to}`);
  } catch (err) {
    Logger.error(`Failed to send verification email to ${to}: ${err}`);
    throw err;
  }
}
