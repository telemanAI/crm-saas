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

  // 1. EMAIL REGISTRAZIONE ADMIN - Template Premium Light
  async sendVerificationEmail(to: string, token: string, firstName: string): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    console.log('=== INVIO EMAIL ADMIN ===');
    console.log('To:', to);
    console.log('From:', this.senderEmail);
    
    try {
      const result = await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: 'Benvenuto in TELEMANAI - Conferma il tuo account',
        html: `
          <!DOCTYPE html>
          <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                    
                    <!-- Header Gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); padding: 48px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.025em; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">TELEMANAI</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px; font-weight: 400;">Gestione pratiche telecomunicazioni</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 48px 40px;">
                        
                        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Ciao ${firstName},</h2>
                        
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                          Grazie per aver scelto <strong style="color: #4f46e5;">TELEMANAI</strong>. Il tuo account è stato creato con successo. Per attivare la piattaforma e iniziare a gestire le tue pratiche, conferma il tuo indirizzo email.
                        </p>

                        <!-- Status Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 12px; margin: 32px 0; border-left: 4px solid #4f46e5;">
                          <tr>
                            <td style="padding: 24px;">
                              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">STATO ACCOUNT</p>
                              <p style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 500;">⏳ In attesa di verifica email</p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Conferma Email e Attiva Account</a>
                            </td>
                          </tr>
                        </table>

                        <!-- Alternative Link -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                          <tr>
                            <td>
                              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
                              <p style="margin: 0; word-break: break-all; font-family: monospace; font-size: 13px; color: #4f46e5; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${verifyUrl}</p>
                            </td>
                          </tr>
                        </table>

                        <!-- Security Note -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fcd34d;">
                          <tr>
                            <td style="padding: 16px;">
                              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                <strong>⚠️ Importante:</strong> Questo link scade tra 24 ore. Se non hai richiesto questa registrazione, puoi ignorare questa email.
                              </p>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">TELEMANAI - Soluzioni per Telecomunicazioni</p>
                        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">© 2026 Tutti i diritti riservati</p>
                      </td>
                    </tr>

                  </table>
                  
                </td>
              </tr>
            </table>

          </body>
          </html>
        `,
      });
      console.log('Email admin inviata con successo:', result);
      return true;
    } catch (error) {
      console.error('Errore invio email admin:', error);
      return false;
    }
  }

  // 2. EMAIL INVITO OPERATORE - Template Dark Premium
  async sendOperatorVerificationEmail(
    to: string, 
    firstName: string, 
    tempPassword: string, 
    shopName: string,
    token: string
  ): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    console.log('=== INVIO EMAIL OPERATORE ===');
    console.log('To:', to);
    console.log('Shop:', shopName);
    
    try {
      await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: `Sei stato invitato in ${shopName} - TELEMANAI`,
        html: `
          <!DOCTYPE html>
          <html lang="it">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; -webkit-font-smoothing: antialiased;">
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
                    
                    <!-- Header Dark -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #3730a3 0%, #7c3aed 100%); padding: 40px; text-align: center; border-bottom: 1px solid #334155;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">TELEMANAI</h1>
                        <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">Accesso operatore autorizzato</p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 40px;">
                        
                        <h2 style="color: #f8fafc; margin: 0 0 16px 0; font-size: 22px; font-weight: 600;">Benvenuto, ${firstName}</h2>
                        
                        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                          Hai ricevuto l'accesso alla piattaforma <strong style="color: #818cf8;">TELEMANAI</strong> per il negozio <strong style="color: #f8fafc;">${shopName}</strong>.
                        </p>

                        <!-- Credentials Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px;">
                              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Credenziali di Accesso</p>
                              
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid #1e293b;">
                                    <span style="color: #64748b; font-size: 13px;">Email:</span>
                                    <span style="color: #f8fafc; font-size: 15px; font-weight: 600; margin-left: 8px;">${to}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #64748b; font-size: 13px;">Password:</span>
                                    <span style="color: #fbbf24; font-size: 15px; font-weight: 600; margin-left: 8px; font-family: monospace; letter-spacing: 0.05em;">${tempPassword}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Security Alert -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(251, 191, 36, 0.1); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3); margin: 24px 0;">
                          <tr>
                            <td style="padding: 16px;">
                              <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.5;">
                                <strong>🔐 Sicurezza:</strong> Conserva queste credenziali in un luogo sicuro. Dopo il primo accesso, ti consigliamo di modificare la password.
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${verifyUrl}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); border: 1px solid rgba(255,255,255,0.1);">Verifica Account e Accedi</a>
                            </td>
                          </tr>
                        </table>

                        <!-- Steps -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0; border-top: 1px solid #334155; padding-top: 24px;">
                          <tr>
                            <td>
                              <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin: 0 0 16px 0;">Procedura di attivazione</p>
                              <ol style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 14px; line-height: 1.8;">
                                <li>Clicca sul pulsante "Verifica Account" sopra</li>
                                <li>Inserisci le credenziali fornite in questa email</li>
                                <li>Cambia la password al primo accesso</li>
                              </ol>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                    <tr>
                      <td style="background-color: #0f172a; padding: 24px 40px; text-align: center; border-top: 1px solid #334155;">
                        <p style="color: #475569; font-size: 13px; margin: 0;">Hai problemi con l'accesso? Contatta l'amministratore del negozio.</p>
                      </td>
                    </tr>

                  </table>
                  
                </td>
              </tr>
            </table>

          </body>
          </html>
        `,
      });
      console.log('Email operatore inviata con successo');
      return true;
    } catch (error) {
      console.error('Errore invio email operatore:', error);
      return false;
    }
  }

  // =============================================================
  // NUOVO: OTP login via email (codice 6 cifre)
  // =============================================================
  async sendOtpEmail(to: string, code: string): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: `Il tuo codice di accesso: ${code}`,
        html: `
          <!DOCTYPE html>
          <html lang="it">
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;">
              <tr><td align="center" style="padding:40px 20px;">
                <table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.06);">
                  <tr><td style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:-0.5px;">TELEMANAI</h1>
                  </td></tr>
                  <tr><td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Il tuo codice di accesso</h2>
                    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">Usa il seguente codice per accedere alla piattaforma. Scade tra 10 minuti.</p>
                    <div style="background:#0f172a;color:#fbbf24;font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;border-radius:12px;font-family:'Courier New',monospace;">${code}</div>
                    <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;text-align:center;">Non hai richiesto questo codice? Ignora pure questa email.</p>
                  </td></tr>
                  <tr><td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} TELEMANAI</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>
        `,
      });
      return true;
    } catch (error) {
      console.error('Errore invio OTP:', error);
      return false;
    }
  }

  // =============================================================
  // NUOVO: Invite operatore via link one-time
  // =============================================================
  async sendInviteEmail(
    to: string,
    inviteUrl: string,
    shopName: string,
    shopCode: string,
    role: string,
    adminNote?: string | null,
  ): Promise<boolean> {
    const roleLabel = role === 'OPERATOR' ? 'Operatore' : role === 'ADMIN' ? 'Amministratore' : 'Founder';
    const noteBlock = adminNote
      ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;">Nota dall'amministratore</p><p style="margin:0;color:#78350f;font-size:14px;font-style:italic;">"${adminNote}"</p></div>`
      : '';
    try {
      await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: `Sei stato invitato a lavorare in ${shopName}`,
        html: `
          <!DOCTYPE html>
          <html lang="it">
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;">
              <tr><td align="center" style="padding:40px 20px;">
                <table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.06);">
                  <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:28px;letter-spacing:-0.5px;">Invito TELEMANAI</h1>
                  </td></tr>
                  <tr><td style="padding:40px;">
                    <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px;">Sei stato invitato a unirti al team di:</p>
                    <div style="background:#eef2ff;border-radius:12px;padding:20px;margin:20px 0;">
                      <p style="margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Negozio</p>
                      <p style="margin:4px 0 12px;color:#0f172a;font-size:22px;font-weight:700;">${shopName}</p>
                      <p style="margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Codice negozio</p>
                      <p style="margin:4px 0 12px;color:#4f46e5;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">${shopCode}</p>
                      <p style="margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Ruolo</p>
                      <p style="margin:4px 0 0;color:#0f172a;font-size:16px;font-weight:600;">${roleLabel}</p>
                    </div>
                    ${noteBlock}
                    <div style="text-align:center;margin:32px 0;">
                      <a href="${inviteUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Accetta invito e accedi</a>
                    </div>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">Questo link è valido per 72 ore. Se non riconosci questo invito, ignora pure l'email.</p>
                    <p style="color:#64748b;font-size:12px;margin:24px 0 0;word-break:break-all;">${inviteUrl}</p>
                  </td></tr>
                  <tr><td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} TELEMANAI</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>
        `,
      });
      return true;
    } catch (error) {
      console.error('Errore invio invito:', error);
      return false;
    }
  }

  // 3. EMAIL SEMPLICE (senza verifica) - mantenuta per compatibilità
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
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">TELEMANAI</h1>
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
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background-color: #667eea; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Accedi al CRM
                  </a>
                </div>
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