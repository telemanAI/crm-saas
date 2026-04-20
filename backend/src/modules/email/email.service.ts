 // 3. EMAIL SEMPLICE (senza verifica) - mantenuta per compatibilità
  async sendOperatorWelcomeEmail(to: string, firstName: string, tempPassword: string, shopName: string): Promise<boolean> {" --new-str "  // =============================================================
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
          <html lang=\"it\">
          <head><meta charset=\"utf-8\"></head>
          <body style=\"margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;\">
            <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fafc;\">
              <tr><td align=\"center\" style=\"padding:40px 20px;\">
                <table width=\"560\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.06);\">
                  <tr><td style=\"background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:32px;text-align:center;\">
                    <h1 style=\"margin:0;color:#fff;font-size:26px;letter-spacing:-0.5px;\">TELEMANAI</h1>
                  </td></tr>
                  <tr><td style=\"padding:40px;\">
                    <h2 style=\"margin:0 0 12px;color:#0f172a;font-size:20px;\">Il tuo codice di accesso</h2>
                    <p style=\"color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;\">Usa il seguente codice per accedere alla piattaforma. Scade tra 10 minuti.</p>
                    <div style=\"background:#0f172a;color:#fbbf24;font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px;border-radius:12px;font-family:'Courier New',monospace;\">${code}</div>
                    <p style=\"color:#94a3b8;font-size:13px;margin:24px 0 0;text-align:center;\">Non hai richiesto questo codice? Ignora pure questa email.</p>
                  </td></tr>
                  <tr><td style=\"background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;\">
                    <p style=\"margin:0;color:#94a3b8;font-size:12px;\">© ${new Date().getFullYear()} TELEMANAI</p>
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
      ? `<div style=\"background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:16px 0;\"><p style=\"margin:0 0 6px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;\">Nota dall'amministratore</p><p style=\"margin:0;color:#78350f;font-size:14px;font-style:italic;\">\"${adminNote}\"</p></div>`
      : '';
    try {
      await this.resend.emails.send({
        from: `TELEMANAI <${this.senderEmail}>`,
        to: [to],
        subject: `Sei stato invitato a lavorare in ${shopName}`,
        html: `
          <!DOCTYPE html>
          <html lang=\"it\">
          <head><meta charset=\"utf-8\"></head>
          <body style=\"margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;\">
            <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fafc;\">
              <tr><td align=\"center\" style=\"padding:40px 20px;\">
                <table width=\"600\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.06);\">
                  <tr><td style=\"background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px;text-align:center;\">
                    <h1 style=\"margin:0;color:#fff;font-size:28px;letter-spacing:-0.5px;\">Invito TELEMANAI</h1>
                  </td></tr>
                  <tr><td style=\"padding:40px;\">
                    <p style=\"color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px;\">Sei stato invitato a unirti al team di:</p>
                    <div style=\"background:#eef2ff;border-radius:12px;padding:20px;margin:20px 0;\">
                      <p style=\"margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;\">Negozio</p>
                      <p style=\"margin:4px 0 12px;color:#0f172a;font-size:22px;font-weight:700;\">${shopName}</p>
                      <p style=\"margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;\">Codice negozio</p>
                      <p style=\"margin:4px 0 12px;color:#4f46e5;font-size:18px;font-weight:700;font-family:'Courier New',monospace;\">${shopCode}</p>
                      <p style=\"margin:0;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;\">Ruolo</p>
                      <p style=\"margin:4px 0 0;color:#0f172a;font-size:16px;font-weight:600;\">${roleLabel}</p>
                    </div>
                    ${noteBlock}
                    <div style=\"text-align:center;margin:32px 0;\">
                      <a href=\"${inviteUrl}\" style=\"display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;\">Accetta invito e accedi</a>
                    </div>
                    <p style=\"color:#94a3b8;font-size:13px;line-height:1.5;margin:0;\">Questo link è valido per 72 ore. Se non riconosci questo invito, ignora pure l'email.</p>
                    <p style=\"color:#64748b;font-size:12px;margin:24px 0 0;word-break:break-all;\">${inviteUrl}</p>
                  </td></tr>
                  <tr><td style=\"background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;\">
                    <p style=\"margin:0;color:#94a3b8;font-size:12px;\">© ${new Date().getFullYear()} TELEMANAI</p>
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
  async sendOperatorWelcomeEmail(to: string, firstName: string, tempPassword: string, shopName: string): Promise<boolean> {"
