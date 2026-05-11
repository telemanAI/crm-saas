/**
 * Catalogo offerte STATICO usato dal wizard fisso.
 * Copia FEDELE da `pages/operator/practices/new.tsx` (PC) — NON modificare a mano.
 * Quando il PC viene aggiornato, ri-allinea anche questo file.
 *
 * Nota: il PC fonde anche le offerte DB con questo statico in `activeOffersCatalog`
 * (vedi loadDbOffers in new.tsx). Il wizard mobile v2 dovrà fare la stessa fusione.
 */

interface OfferStatic {
  name: string;
  canone: string;
  attivazione: string;
  vincolo: string;
  note: string;
  disattivazione: string;
  type: string;
  scadenza?: string;
}

export const offersCatalog: Record<string, OfferStatic[]> = {
  TIM: [
    { name: "TIM WIFI CASA+NETFLIX", canone: "€27,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA+NETFLIX+DISNEY", canone: "€31,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA+NETFLIX+DISNEY+PRIME", canone: "€33,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA IN CONVERGENZA", canone: "€24,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA DA PROPORR+TIM VISION XS", canone: "€24,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM PREMIUM BASE (MODEM NON INCLUSO)", canone: "€25,90", attivazione: "0€", vincolo: "24 MESI", note: "", disattivazione: "10€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI SPECIAL CARTA GIOVANI (UNDER 35)", canone: "€21,90", attivazione: "€39", vincolo: "24 MESI", note: "CAUZIONE 99€", disattivazione: "10€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM FWA SECONDA CASA", canone: "€14,90", attivazione: "0€", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM FIBRA SECONDA CASA", canone: "€22,90", attivazione: "0€", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "MODEM WIFI 7 INCLUSO", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA ULTRA", canone: "€36,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "MODEM WIFI 7+EXTENDER INCLUSO", disattivazione: "23€", type: "consumer" }
  ],
  Vodafone: [
    { name: "INTERNET UNLIMITED CASA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA ULTRA", canone: "€36,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA", canone: "€24,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" }
  ],
  WindTre: [
    { name: "CONVERGENZA SPECIAL FWA", canone: "€19,99 DOPO 12 MESI €23,99", attivazione: "€0", vincolo: "48 MESI", note: "SIM €7,99 AL MESE CON TUTTO ILLIMITATO (100GB FULL SPEED)", disattivazione: "RATE RESIDUE MODEM+ANTENNA", type: "consumer" },
    { name: "CONVERGENZA SPECIAL FTTH", canone: "€19,99 DOPO 12 MESI €23,99", attivazione: "€1,99 PER 24 MESI", vincolo: "48 MESI", note: "SIM €7,99 AL MESE CON TUTTO ILLIMITATO (100GB FULL SPEED)", disattivazione: "RATE RESIDUE MODEM", type: "consumer" },
    { name: "SUPER FIBRA", canone: "€28,99", attivazione: "€1,99 PER 24 MESI", vincolo: "48 MESI", note: "", disattivazione: "RATE RESIDUE MODEM", type: "consumer" }
  ],
  Iliad: [
    { name: "ILIAD FIBRA SUPER", canone: "€34,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA SUPER CON 2 RIPETITORI INCLUSI E MODEM 4G CON 350GB INCLUSI (IN CONVERGENZA)", canone: "€29,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "SOLO CON SIM DA ALMENO €9,99 DOMICILIATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA", canone: "€26,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA (IN CONVERGENZA CON OFFERTA DOMICILIATA)", canone: "€22,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "SOLO CON SIM DA ALMENO €9,99 DOMICILIATA", disattivazione: "€25,99", type: "consumer" }
  ],
  Optima: [
    { name: "SUPER CASA SMART IN CONVERGENZA LUCE/GAS", canone: "€23,95 DOPO 12 MESI €13,95", attivazione: "€29,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM 3,95", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "consumer" },
    { name: "SUPER CONNESSI CONVERGENZA CON SIM", canone: "€31,90", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM INCLUSO NO RATA", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "consumer" },
    { name: "SUPER IMPRESA SMART IN CONVERGENZA LUCE/GAS", canone: "23,95+IVA DOPO 12 MESI 3,95 SOLO RATA MODEM", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM 3,95", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "business" },
    { name: "SUPER CONNESSI BUSINESS", canone: "26,9+ IVA", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM INCLUSO NO RATA", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "business" }
  ],
  Iren: [
    { name: "IREN CONNECT YOU IN CONVERGENZA CON LUCE", canone: "€18,99 DOPO 12 MESI €20,99", attivazione: "€49", vincolo: "VINCOLO 24 MESI", note: "NO LINEA VOCE SOLO DATI - DA INSERIRE CONTESTUALMENTE CON SEV FULL ENERGY LUCE", disattivazione: "€27,90 + €5,9 PER OGNI MESE RESIDUO", type: "consumer" }
  ],
  SKY: [
    { name: "SKY WIFI CON CONSEGNA HUB (OPEN FIBER)", canone: "€27,90 PER 18 MESI", attivazione: "0€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI + SKY TV", canone: "€29,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI + SKY TV + NETFLIX", canone: "€34,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + CINEMA + UHD", canone: "€35,80 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + SPORT + UHD", canone: "€35,80 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + CALCIO", canone: "€29,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + NETFLIX + CINEMA", canone: "€19,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "15/2", type: "consumer" },
    { name: "SKY WIFI CON SPEDIZIONE HUB (FASTWEB)", canone: "€24,50", attivazione: "29€", vincolo: "NESSUN VINCOLO", note: "NESSUN AUMENTO", disattivazione: "22€", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI BUSINESS CON CONSEGNA HUB (OPEN FIBER)", canone: "€21,50 PER 12 MESI DOPO €28,60", attivazione: "0€", vincolo: "NESSUN VINCOLO", note: "DOPO 12 MESI €28,60", disattivazione: "22€", scadenza: "31/1", type: "business" }
  ]
};

export const PROVIDER_KEY_TO_NAME: Record<string, keyof typeof offersCatalog> = {
  TIM_FIBRA: 'TIM',
  VODAFONE: 'Vodafone',
  WINDTRE: 'WindTre',
  ILIAD: 'Iliad',
  OPTIMA: 'Optima',
  IREN: 'Iren',
  SKY: 'SKY',
};
