/**
 * Configurazione JWT centralizzata.
 * L'app deve fallire immediatamente all'avvio se JWT_SECRET manca,
 * per evitare che venga usato un segreto hardcoded noto (rischio sicurezza).
 */
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error(
    'JWT_SECRET non configurata. Impostala nelle variabili d\'ambiente del server.',
  );
}
export const JWT_SECRET = secret;
