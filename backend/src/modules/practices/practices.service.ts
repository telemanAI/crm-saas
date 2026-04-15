import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Practice } from './entities/practice.entity';
import { User } from '../users/entities/user.entity';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { PracticeResponseDto } from './dto/practice-response.dto';
import { CustomersService } from '../customers/customers.service';

interface OldLineDataDto {
  oldPhoneNumber?: string;
  migrationCode?: string;
  gestore?: string;
  gestoreAltro?: string;
  fiscalCodeOldLine?: string;
  prodottiRestituire?: string;
  notes?: string;
}

@Injectable()
export class PracticesService {
  constructor(
    @InjectRepository(Practice)
    private practiceRepo: Repository<Practice>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private customersService: CustomersService,
  ) {}

  private calculateStatoGlobale(convergenza: { attiva: boolean; tipo?: 'daChiudere' | 'chiusa' | null; numero?: string } | null): 'completo' | 'non_completo' | null {
    if (!convergenza?.attiva) return null;
    if (!convergenza.tipo) return 'non_completo';
    if (convergenza.tipo === 'chiusa' && convergenza.numero?.length > 0) return 'completo';
    return 'non_completo';
  }

  async create(tenantId: string, userId: string, dto: CreatePracticeDto): Promise<PracticeResponseDto> {
    let customer = null;
    if (dto.customerData?.fiscalCode?.length === 16) {
      customer = await this.customersService.findByFiscalCode(tenantId, dto.customerData.fiscalCode.toUpperCase().trim());
      if (!customer) {
        customer = await this.customersService.create(tenantId, {
          firstName: dto.customerData.firstName || 'Temp',
          lastName: dto.customerData.lastName || 'Temp',
          fiscalCode: dto.customerData.fiscalCode.toUpperCase().trim(),
          phonePrimary: dto.customerData.phone,
          email: dto.customerData.email,
        }, userId);
      }
    }

    const statoGlobale = this.calculateStatoGlobale(dto.convergenza || null);

    const practice = this.practiceRepo.create({
      tenantId,
      customerId: customer?.id || null,
      createdBy: userId,
      type: dto.type,
      offerCode: dto.offerCode,
      offerName: dto.offerName,
      offerCanone: dto.offerCanone,
      offerAttivazione: dto.offerAttivazione,
      offerVincolo: dto.offerVincolo,
      offerNote: dto.offerNote,
      offerDisattivazione: dto.offerDisattivazione,
      offerType: dto.offerType,
      offerScadenza: dto.offerScadenza,
      soldBy: dto.soldBy,
      enteredBy: dto.enteredBy,
      soldById: dto.soldById,
      enteredById: dto.enteredById,
      customerSnapshot: customer ? {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phonePrimary: customer.phonePrimary,
        email: customer.email,
        fiscalCode: customer.fiscalCode,
      } : {},
      lineType: dto.lineData?.lineType,
      installationAddress: dto.lineData?.installationAddress,
      technology: dto.lineData?.technology,
      oldLineData: dto.lineData?.lineType === 'MIGRAZIONE' ? dto.oldLineData : {},
      paymentMethod: {
        iban: dto.paymentData?.iban || null,
        postePay: dto.paymentData?.postePay || null,
        bollettino: dto.paymentData?.bollettino || false,
      },
      convergenza: dto.convergenza || null,
      lavorazioniPostAttivazione: dto.lavorazioniPostAttivazione || null,
      statoGlobale: statoGlobale,
      currentStep: 1,
      completedSteps: [1],
      status: 'in_progress',
      operationalStatus: 'PENDING',
    });

    const saved = await this.practiceRepo.save(practice);
    const full = await this.findById(tenantId, saved.id);
    return new PracticeResponseDto(full);
  }

  async findAll(tenantId: string, filters?: { type?: string; status?: string }): Promise<PracticeResponseDto[]> {
    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;

    const practices = await this.practiceRepo.find({
      where,
      relations: ['customer', 'creator', 'assignedUser'],
      order: { createdAt: 'DESC' },
    });

    return practices.map(p => new PracticeResponseDto(p));
  }

  async findById(tenantId: string, id: string): Promise<Practice> {
    const practice = await this.practiceRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'creator', 'assignedUser'],
    });
    if (!practice) throw new NotFoundException('Pratica non trovata');
    return practice;
  }

  async getById(tenantId: string, id: string): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, id);
    return new PracticeResponseDto(practice);
  }

  async updateStep(tenantId: string, userId: string, practiceId: string, dto: UpdateStepDto): Promise<PracticeResponseDto> {
    console.log(`[DEBUG] updateStep - Step: ${dto.stepNumber}, Pratica: ${practiceId}`);
    console.log(`[DEBUG] Dati:`, JSON.stringify(dto.data));
    
    const practice = await this.findById(tenantId, practiceId);

    switch (dto.stepNumber) {
    case 1:
  console.log('[DEBUG] Step 1 - Offerta');
  practice.type = dto.data?.type ?? practice.type;
  
  // 🔥 FIX: Se c'è offerCode nei dati, assumiamo cambio offerta completo
  // e resettiamo TUTTI i campi offerta ai nuovi valori (o null se mancanti)
  if (dto.data?.offerCode !== undefined) {
    practice.offerCode = dto.data.offerCode ?? null;
    practice.offerName = dto.data?.offerName ?? null;
    practice.offerCanone = dto.data?.offerCanone ?? null;
    practice.offerAttivazione = dto.data?.offerAttivazione ?? null;
    practice.offerVincolo = dto.data?.offerVincolo ?? null;
    practice.offerNote = dto.data?.offerNote ?? null;
    practice.offerDisattivazione = dto.data?.offerDisattivazione ?? null;
    practice.offerType = dto.data?.offerType ?? null;
    practice.offerScadenza = dto.data?.offerScadenza ?? null;
  }
  break;

      case 2:
        practice.soldBy = dto.data?.soldBy ?? null;
        practice.enteredBy = dto.data?.enteredBy ?? null;
        practice.soldById = dto.data?.soldById ?? null;
        practice.enteredById = dto.data?.enteredById ?? null;
        break;

      case 3:
        console.log('[DEBUG] Step 3 - Cliente');
        if (dto.data?.customerData) {
          const cd = dto.data.customerData;
          const newCf = cd.fiscalCode?.toUpperCase().trim();
          
          if (newCf?.length === 16) {
            let customer = await this.customersService.findByFiscalCode(tenantId, newCf);
            if (!customer) {
              customer = await this.customersService.create(tenantId, {
                firstName: cd.firstName, lastName: cd.lastName, fiscalCode: newCf,
                phonePrimary: cd.phone, email: cd.email,
              }, userId);
            } else {
              await this.customersService.update(tenantId, customer.id, {
                firstName: cd.firstName, lastName: cd.lastName,
                phonePrimary: cd.phone, email: cd.email,
              }, userId);
            }
            if (customer) practice.customerId = customer.id;
          }
          
          practice.customerSnapshot = {
            firstName: cd.firstName ?? practice.customerSnapshot?.firstName,
            lastName: cd.lastName ?? practice.customerSnapshot?.lastName,
            fiscalCode: newCf ?? practice.customerSnapshot?.fiscalCode,
            phonePrimary: cd.phone ?? practice.customerSnapshot?.phonePrimary,
            email: cd.email ?? practice.customerSnapshot?.email,
            ragioneSociale: cd.ragioneSociale ?? practice.customerSnapshot?.ragioneSociale,
            partitaIva: cd.partitaIva ?? practice.customerSnapshot?.partitaIva,
            formaGiuridica: cd.formaGiuridica ?? practice.customerSnapshot?.formaGiuridica,
            sedeLegale: cd.sedeLegale ?? practice.customerSnapshot?.sedeLegale,
            codiceRea: cd.codiceRea ?? practice.customerSnapshot?.codiceRea,
            pec: cd.pec ?? practice.customerSnapshot?.pec,
          };
        }
        
        if (dto.data?.notes?.trim()) {
          const currentUser = await this.userRepo.findOne({ where: { id: userId } });
          const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Operatore';
          const newNote = {
            text: dto.data.notes.trim(), createdAt: new Date(),
            createdBy: userName, createdById: userId
          };
          if (!practice.notesHistory) practice.notesHistory = [];
          practice.notesHistory.push(newNote);
          practice.notes = dto.data.notes;
        }
        break;

      case 4:
        if (dto.data?.additionalPackages !== undefined) {
          practice.additionalPackages = dto.data.additionalPackages;
        }
        if (dto.data?.lineType !== undefined || dto.data?.installationAddress !== undefined) {
          practice.lineType = dto.data?.lineType ?? null;
          practice.installationAddress = dto.data?.installationAddress ?? null;
          practice.technology = dto.data?.technology ?? null;
          practice.newLineNotes = dto.data?.notes ?? null;
        }
        if (dto.data?.convergenza !== undefined) {
          practice.convergenza = dto.data.convergenza;
          practice.statoGlobale = this.calculateStatoGlobale(practice.convergenza);
        }
        if (dto.data?.lavorazioniPostAttivazione !== undefined) {
          practice.lavorazioniPostAttivazione = dto.data.lavorazioniPostAttivazione;
        }
        break;

      case 5:
        if (dto.data?.washConfig !== undefined) {
          practice.washConfig = dto.data.washConfig;
        }
        if (dto.data?.oldLineData !== undefined || dto.data?.oldPhoneNumber !== undefined) {
          const old = dto.data?.oldLineData || dto.data;
          practice.oldLineData = {
            oldPhoneNumber: old?.oldPhoneNumber ?? null,
            migrationCode: old?.migrationCode ?? null,
            gestore: old?.gestore ?? null,
            gestoreAltro: old?.gestoreAltro ?? null,
            fiscalCodeOldLine: old?.fiscalCodeOldLine ?? null,
            prodottiRestituire: old?.prodottiRestituire ?? null,
            notes: old?.notes ?? null,
          };
        }
        break;

      case 6:
      case 7:
      case 8:
        console.log(`[DEBUG] Step ${dto.stepNumber}`);
        if (dto.data?.paymentMethod !== undefined || dto.data?.iban !== undefined) {
          practice.paymentMethod = {
            iban: dto.data?.paymentMethod?.iban ?? dto.data?.iban ?? null,
            postePay: dto.data?.paymentMethod?.postePay ?? dto.data?.postePay ?? null,
            bollettino: dto.data?.paymentMethod?.bollettino ?? dto.data?.bollettino ?? false,
          };
        }
        if (dto.data?.data !== undefined || dto.data?.ora !== undefined) {
          practice.appointmentData = {
            data: dto.data?.data ?? practice.appointmentData?.data,
            ora: dto.data?.ora ?? practice.appointmentData?.ora,
            oraFine: dto.data?.oraFine ?? practice.appointmentData?.oraFine,
            accordi: dto.data?.accordi ?? practice.appointmentData?.accordi,
          };
        }
        if (dto.data?.gdprConsent !== undefined || dto.data?.marketingConsent !== undefined) {
          practice.privacyData = {
            gdprConsent: dto.data?.gdprConsent ?? dto.data?.privacyData?.gdprConsent ?? false,
            marketingConsent: dto.data?.marketingConsent ?? dto.data?.privacyData?.marketingConsent ?? false,
          };
        }
        break;

      case 9:
        console.log('[DEBUG] Step 9');
        if (dto.data?.data !== undefined || dto.data?.ora !== undefined) {
          practice.appointmentData = {
            data: dto.data?.data ?? practice.appointmentData?.data,
            ora: dto.data?.ora ?? practice.appointmentData?.ora,
            oraFine: dto.data?.oraFine ?? practice.appointmentData?.oraFine,
            accordi: dto.data?.accordi ?? practice.appointmentData?.accordi,
          };
        }
        if (dto.data?.gdprConsent !== undefined || dto.data?.marketingConsent !== undefined) {
          practice.privacyData = {
            gdprConsent: dto.data?.gdprConsent ?? dto.data?.privacyData?.gdprConsent ?? false,
            marketingConsent: dto.data?.marketingConsent ?? dto.data?.privacyData?.marketingConsent ?? false,
          };
        }
        break;
    }

    // 🔥 CRITICAL: Gestione completamento (preserva logica originale ma più sicura)
    // Se riceviamo flag completed=true, finalizza la pratica (usato da handleSubmit nel frontend)
    if (dto.data?.completed === true) {
      console.log('[DEBUG] Completamento esplicito richiesto dallo step', dto.stepNumber);
      practice.status = 'completed';
      practice.operationalStatus = 'IN_PROGRESS';
      practice.currentStep = dto.stepNumber;
      
      // Assicurati che lo step attuale sia nei completati
      if (!practice.completedSteps.includes(dto.stepNumber)) {
        practice.completedSteps = [...practice.completedSteps, dto.stepNumber];
      }
      
      // Se completiamo, assicurati che tutti gli step precedenti siano marcati come completati
      for (let i = 1; i < dto.stepNumber; i++) {
        if (!practice.completedSteps.includes(i)) {
          practice.completedSteps.push(i);
        }
      }
    } else {
      // Comportamento normale: aggiungi step corrente ai completati se non c'è già
      if (!practice.completedSteps.includes(dto.stepNumber)) {
        practice.completedSteps = [...practice.completedSteps, dto.stepNumber];
      }
      
      // Calcola next step solo se non è completata
      const maxCompleted = Math.max(...practice.completedSteps, 0);
      practice.currentStep = Math.max(practice.currentStep, Math.min(maxCompleted + 1, 9));
    }

    if (practice.status === 'draft' && dto.stepNumber >= 2 && dto.stepNumber < 9) {
      practice.status = 'in_progress';
    }

    const saved = await this.practiceRepo.save(practice);
    console.log('[DEBUG] Salvato:', { id: saved.id, status: saved.status, steps: saved.completedSteps });
    
    const updated = await this.findById(tenantId, practiceId);
    return new PracticeResponseDto(updated);
  }

  async updateConvergence(tenantId: string, practiceId: string, numero: string): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    if (!practice.convergenza?.attiva) throw new Error('Convergenza non attiva');
    if (practice.convergenza.tipo !== 'daChiudere') throw new Error('Non in stato Da Chiudere');

    practice.convergenza = { ...practice.convergenza, tipo: 'chiusa', numero };
    practice.statoGlobale = this.calculateStatoGlobale(practice.convergenza);
    
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async updateOperationalStatus(tenantId: string, practiceId: string, status: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED'): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    practice.operationalStatus = status;
    if (status === 'ACTIVATED' || status === 'REJECTED') practice.status = 'completed';
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async delete(tenantId: string, practiceId: string): Promise<void> {
    const practice = await this.findById(tenantId, practiceId);
    await this.practiceRepo.remove(practice);
  }

  async deleteNote(tenantId: string, practiceId: string, noteIndex: number, userId: string): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    if (!practice.notesHistory || noteIndex < 0 || noteIndex >= practice.notesHistory.length) {
      throw new NotFoundException('Nota non trovata');
    }
    if (practice.notesHistory[noteIndex].createdById !== userId) {
      throw new Error('Non autorizzato');
    }
    practice.notesHistory.splice(noteIndex, 1);
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async count(): Promise<number> {
    return await this.practiceRepo.count();
  }

  async forceComplete(tenantId: string, practiceId: string): Promise<PracticeResponseDto> {
    console.log(`[FORCE] Completamento pratica ${practiceId}`);
    const practice = await this.findById(tenantId, practiceId);
    practice.status = 'completed';
    practice.operationalStatus = 'IN_PROGRESS';
    practice.currentStep = 9;
    if (!practice.completedSteps.includes(9)) {
      practice.completedSteps = [...practice.completedSteps, 9];
    }
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(await this.findById(tenantId, practiceId));
  }
}