import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OtpCode } from '../entities/otp-code.entity';
import { EmailService } from '../../email/email.service';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
    private readonly emailService: EmailService,
  ) {}

  async requestOtp(email: string): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.otpRepo.update({ email: normalized, used: false }, { used: true });

    const otp = this.otpRepo.create({
      email: normalized,
      codeHash,
      expiresAt,
      used: false,
      attemptCount: 0,
    });
    await this.otpRepo.save(otp);

    const sent = await this.emailService.sendOtpEmail(normalized, code);
    if (!sent) {
      throw new BadRequestException(
        "Impossibile inviare il codice. Verifica l'indirizzo email o riprova.",
      );
    }
    return { message: 'Codice inviato. Controlla la tua casella email.' };
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const otp = await this.otpRepo.findOne({
      where: { email: normalized, used: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp) throw new BadRequestException('Codice non valido o scaduto');
    if (otp.expiresAt < new Date()) {
      otp.used = true;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Codice scaduto. Richiedine uno nuovo.');
    }
    if (otp.attemptCount >= MAX_ATTEMPTS) {
      otp.used = true;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Troppi tentativi errati. Richiedi un nuovo codice.');
    }
    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      otp.attemptCount += 1;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Codice errato');
    }
    otp.used = true;
    await this.otpRepo.save(otp);
  }

  async cleanupExpired(): Promise<number> {
    const res = await this.otpRepo.delete({ expiresAt: LessThan(new Date()) });
    return res.affected || 0;
  }
}