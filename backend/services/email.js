const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendWelcomeEmail = async (user) => {
  try {
    await transporter.sendMail({
      from: `"Mundo Onírico" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🦉 Bienvenido a Mundo Onírico',
      html: `
        <div style="font-family: 'Georgia', serif; background: #07060f; color: #f1f5f9; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 40px;">
            <h1 style="color: #e0a96d; font-size: 24px; text-align: center;">🌙 Mundo Onírico</h1>
            <p style="text-align: center; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">El Espejo del Subconsciente</p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 24px 0;">
            <h2 style="color: #f5d6b3; font-size: 18px;">Bienvenido, ${user.name} ✦</h2>
            <p style="color: #cbd5e1; line-height: 1.8; font-size: 14px;">
              Tu portal personal de interpretación onírica ha sido creado.<br><br>
              Ahora puedes enviar tus sueños para que sean interpretados y recibir respuestas personalizadas directamente en tu tablero.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard.html" style="background: linear-gradient(135deg, #e0a96d, #d4863a); color: #07060f; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                Ir a mi portal ✦
              </a>
            </div>
            <p style="color: #64748b; font-size: 11px; text-align: center;">
              Cada sueño es una pieza sagrada de tu universo personal.<br>
              — Tu intérprete onírico
            </p>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error.message);
  }
};

const sendInterpretationNotification = async (user, dream) => {
  try {
    await transporter.sendMail({
      from: `"Mundo Onírico" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🦉 Tu interpretación para "${dream.title}" está lista`,
      html: `
        <div style="font-family: 'Georgia', serif; background: #07060f; color: #f1f5f9; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 40px;">
            <h1 style="color: #e0a96d; font-size: 24px; text-align: center;">🌙 Mundo Onírico</h1>
            <p style="text-align: center; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">Tu interpretación está lista</p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 24px 0;">
            <h2 style="color: #f5d6b3; font-size: 18px;">Hola, ${user.name} ✦</h2>
            <p style="color: #cbd5e1; line-height: 1.8; font-size: 14px;">
              He terminado de analizar tu sueño <strong style="color: #e0a96d;">"${dream.title}"</strong>.<br><br>
              He canalizado una interpretación profunda y personalizada para ti. Puedes leerla completa ingresando a tu tablero personal.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard.html" style="background: linear-gradient(135deg, #e0a96d, #d4863a); color: #07060f; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                Ver mi interpretación ✦
              </a>
            </div>
            <p style="color: #64748b; font-size: 11px; text-align: center;">
              Gracias por confiar en mí para guiarte a través del éter de tu subconsciente.
            </p>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Error enviando notificación:', error.message);
  }
};

module.exports = { transporter, sendWelcomeEmail, sendInterpretationNotification };
