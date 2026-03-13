import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. HELMET - Headers di sicurezza (XSS, Clickjacking, HSTS)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['self'],
        styleSrc: ['self', 'unsafe-inline'],
        scriptSrc: ['self'],
        imgSrc: ['self', 'data:', 'https:'],
        fontSrc: ['self', 'https:', 'data:'],
        connectSrc: ['self', process.env.ALLOWED_ORIGINS || 'http://localhost:3000'],
      },
    },
    crossOriginEmbedderPolicy: false, // Necessario per alcune API esterne
    hsts: {
      maxAge: 31536000, // 1 anno HTTPS forzato
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // 2. CORS configurabile via env (sicuro per produzione)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (es. mobile apps) o origini whitelistate
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(?? CORS bloccato per: );
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400 // 24 ore cache preflight
  });

  // 3. API Versioning (per futuro v2)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // 4. Validazione globale (sanitizzazione input)
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,              // Rimuove campi non decorati
    transform: true,              // Trasforma tipi automaticamente
    forbidNonWhitelisted: true,   // Rifiuta richieste con campi extra (protezione injection)
    transformOptions: {
      enableImplicitConversion: false, // Sicurezza: no conversione implicita
    },
  }));

  // 5. Prefisso API e logging sicuro
  app.setGlobalPrefix('api');
  
  // Logging IP e richieste (per audit sicurezza)
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent']?.substring(0, 50) || 'unknown';
    console.log([]  -   - UA: );
    next();
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(
  =========================================
  ?? CRM-SAAS Backend Avviato
  =========================================
  ?? Porta: 
  ?? Ambiente: 
  ???  Helmet: Attivo
  ?? CORS Origini: 
  =========================================
  );
}

bootstrap();