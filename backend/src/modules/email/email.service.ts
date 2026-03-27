import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private senderEmail: string;
  private frontendUrl: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    this.frontendUrl = process.env.FRONTEND_URL || 'https://www.telemanai.it';
  }

  async validateEmailConfiguration(): Promise<{ valid: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
      return { valid: false, error: 'RESEND_API_KEY mancante' };
    }
    
    if (!this.senderEmail.includes('@telemanai.it')) {
      return { valid: false, error: 'SENDER_EMAIL deve essere @telemanai.it' };
    }
    
    return { valid: true };
  }

  async sendVerificationEmail(to: string, token: string, firstName: string): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    console.log('=== INVIO EMAIL ===');
    console.log('To:', to);
    console.log('From:', this.senderEmail);
    console.log('API Key presente:', !!process.env.RESEND_API_KEY);
    
    try {
      const result = await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: 'Conferma la tua email - TELEMANAI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<!-- NUOVO (il tuo gradient) -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
  <h1 style="color: #ffffff; margin: 0; font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">TELEMANAI</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Gestione pratiche semplice e veloce</p>
</div>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Ciao ${firstName}!</h2>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                  Grazie per esserti registrato su TELEMANAI. Per completare la registrazione e attivare il tuo account, clicca sul pulsante qui sotto:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Conferma Email
                  </a>
                </div>
                <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:
                </p>
                <p style="color: #4f46e5; font-size: 14px; word-break: break-all;">
                  ${verifyUrl}
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                <p style="color: #a0aec0; font-size: 12px;">
                  Questo link scadrà tra 24 ore. Se non hai richiesto questa email, puoi ignorarla.
                </p>
              </div>
              <div style="background-color: #f7fafc; padding: 20px; text-align: center;">
                <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                  © 2026 TELEMANAI - Tutti i diritti riservati
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log('Email inviata con successo:', result);
      return true;
    } catch (error) {
      console.error('Errore invio email:', error);
      return false;
    }
  }

async sendOperatorVerificationEmail(
  to: string, 
  firstName: string, 
  tempPassword: string, 
  shopName: string,
  token: string
): Promise<boolean> {
  const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
  
  try {
    await this.resend.emails.send({
      from: `TELEMANAI <${this.senderEmail}>`,
      to: [to],
      subject: `Benvenuto in ${shopName} - Verifica il tuo account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">TELEMANAI</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Gestione pratiche semplice e veloce</p>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Benvenuto ${firstName}!</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Sei stato aggiunto come operatore nel negozio <strong>${shopName}</strong>.
              </p>
              
              <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="color: #4a5568; margin: 0 0 10px 0;"><strong>Le tue credenziali:</strong></p>
                <p style="color: #1e293b; margin: 5px 0;">Email: <strong>${to}</strong></p>
                <p style="color: #1e293b; margin: 5px 0;">Password temporanea: <strong>${tempPassword}</strong></p>
              </div>

              <p style="color: #e53e3e; font-size: 14px; background-color: #fff5f5; padding: 10px; border-radius: 6px; border-left: 4px solid #e53e3e;">
                ⚠️ Devi verificare il tuo account prima di accedere.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #667eea; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Verifica Account e Accedi
                </a>
              </div>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                Se il pulsante non funziona, copia questo link:<br>
                <span style="color: #667eea; word-break: break-all;">${verifyUrl}</span>
              </p>
            </div>
            <div style="background-color: #f7fafc; padding: 20px; text-align: center;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                © 2026 TELEMANAI - Tutti i diritti riservati
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Errore invio email verifica operatore:', error);
    return false;
  }
}


  async sendOperatorWelcomeEmail(to: string, firstName: string, tempPassword: string, shopName: string): Promise<boolean> {
    const loginUrl = `${this.frontendUrl}/login`;
    
    try {
      await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: `Benvenuto in ${shopName} - TELEMANAI`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background-color: #1e293b; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">TELEMANAI</h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Benvenuto ${firstName}!</h2>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                  Sei stato aggiunto come operatore nel negozio <strong>${shopName}</strong>.
                </p>
                <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="color: #4a5568; margin: 0 0 10px 0;"><strong>Le tue credenziali:</strong></p>
                  <p style="color: #1e293b; margin: 5px 0;">Email: <strong>${to}</strong></p>
                  <p style="color: #1e293b; margin: 5px 0;">Password temporanea: <strong>${tempPassword}</strong></p>
                </div>
                <p style="color: #e53e3e; font-size: 14px;">
                  ⚠️ Ti consigliamo di cambiare la password al primo accesso.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Accedi al CRM
                  </a>
                </div>
              </div>
              <div style="background-color: #f7fafc; padding: 20px; text-align: center;">
                <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                  © 2026 TELEMANAI - Tutti i diritti riservati
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      return true;
    } catch (error) {
      console.error('Errore invio email operatore:', error);
      return false;
    }
  }
}