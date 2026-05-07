const APP_NAME = 'LedgerPro';

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.EMAIL_FROM || `${APP_NAME} <noreply@ledgerpro.app>`;

async function send(to, subject, html) {
  const client = getClient();
  if (!client) {
    // Dev fallback — log to console when Resend is not configured
    console.log(`\n[EMAIL] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
    return;
  }
  await client.emails.send({ from: FROM(), to, subject, html });
}

exports.sendWelcomeEmail = ({ to, name, orgName }) =>
  send(to, `Welcome to ${APP_NAME}`, `
    <h2>Welcome, ${name}!</h2>
    <p>Your account and organisation <strong>${orgName}</strong> are ready.</p>
    <p>Sign in at <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
  `);

exports.sendInviteEmail = ({ to, inviteUrl, orgName, invitedByName }) =>
  send(to, `You've been invited to join ${orgName} on ${APP_NAME}`, `
    <h2>You're invited!</h2>
    <p><strong>${invitedByName}</strong> has invited you to join <strong>${orgName}</strong> on ${APP_NAME}.</p>
    <p><a href="${inviteUrl}" style="background:#3498db;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">Accept Invitation</a></p>
    <p style="color:#888;font-size:12px">This link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>
  `);

exports.sendPasswordResetEmail = ({ to, resetUrl }) =>
  send(to, `Reset your ${APP_NAME} password`, `
    <h2>Password Reset</h2>
    <p>We received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
    <p><a href="${resetUrl}" style="background:#e74c3c;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a></p>
    <p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
  `);

exports.sendVerificationEmail = ({ to, verifyUrl }) =>
  send(to, `Verify your ${APP_NAME} email address`, `
    <h2>Verify your email</h2>
    <p>Thanks for signing up! Please verify your email address to unlock all features.</p>
    <p><a href="${verifyUrl}" style="background:#27ae60;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;margin:16px 0">Verify Email Address</a></p>
    <p style="color:#888;font-size:12px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  `);

exports.sendInvoiceEmail = ({ to, customerName, invoiceNumber, orgName, pdfBuffer }) =>
  getClient()
    ? getClient().emails.send({
        from: FROM(),
        to,
        subject: `Invoice ${invoiceNumber} from ${orgName}`,
        html: `
          <h2>Invoice ${invoiceNumber}</h2>
          <p>Dear ${customerName},</p>
          <p>Please find your invoice attached.</p>
          <p>Thank you for your business.</p>
          <p>— ${orgName}</p>
        `,
        attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer.toString('base64') }]
      })
    : console.log(`[EMAIL] Invoice ${invoiceNumber} → ${to} (attachment: ${pdfBuffer.length} bytes)`);
