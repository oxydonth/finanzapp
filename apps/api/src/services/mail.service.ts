import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function send(opts: { to: string; subject: string; html: string; text: string }) {
  if (!resend) {
    console.log(`[MAIL] To: ${opts.to} | Subject: ${opts.subject}`);
    console.log(`[MAIL] ${opts.text}`);
    return;
  }
  const { error } = await resend.emails.send({ from: env.MAIL_FROM, ...opts });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;
  const appUrl = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';

  await send({
    to: email,
    subject: 'Bitte bestätige deine E-Mail-Adresse – Finanzapp',
    text: [
      `Hallo ${firstName},`,
      '',
      'Bitte bestätige deine E-Mail-Adresse, indem du auf folgenden Link klickst:',
      verifyUrl,
      '',
      'Der Link ist 24 Stunden gültig.',
      '',
      'Falls du kein Konto bei Finanzapp erstellt hast, kannst du diese E-Mail ignorieren.',
      '',
      'Dein Finanzapp-Team',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#4f46e5;padding:32px 40px">
      <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Finanzapp</span>
    </div>
    <div style="padding:40px">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.4px">
        E-Mail-Adresse bestätigen
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
        Hallo ${firstName},<br><br>
        danke für deine Registrierung bei Finanzapp! Bitte bestätige deine E-Mail-Adresse, damit du alle Funktionen nutzen kannst.
      </p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-0.2px">
        E-Mail bestätigen
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.6">
        Der Link ist 24 Stunden gültig. Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.<br><br>
        Oder kopiere diesen Link in deinen Browser:<br>
        <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all">${verifyUrl}</a>
      </p>
    </div>
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
        © 2026 Finanzapp · DSGVO-konform · <a href="${appUrl}" style="color:#94a3b8">finanzapp.de</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  const resetUrl = `${frontendBase}/reset-password?token=${token}`;

  await send({
    to: email,
    subject: 'Passwort zurücksetzen – Finanzapp',
    text: [
      `Hallo ${firstName},`,
      '',
      'Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf folgenden Link:',
      resetUrl,
      '',
      'Der Link ist 1 Stunde gültig.',
      '',
      'Falls du keine Zurücksetzung angefordert hast, kannst du diese E-Mail ignorieren.',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#4f46e5;padding:32px 40px">
      <span style="font-size:18px;font-weight:700;color:#ffffff">Finanzapp</span>
    </div>
    <div style="padding:40px">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a">Passwort zurücksetzen</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
        Hallo ${firstName},<br><br>
        du hast eine Passwortzurücksetzung angefordert. Klicke auf den Button um dein Passwort zu ändern.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700">
        Passwort zurücksetzen
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">
        Der Link ist 1 Stunde gültig. Falls du keine Zurücksetzung angefordert hast, ignoriere diese E-Mail bitte.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
