import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Practice } from './entities/practice.entity';
import { User } from '../users/entities/user.entity';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { PracticeResponseDto } from './dto/practice-response.dto';
import { CustomersService } from '../customers/customers.service';

// Interfaccia estesa per i dati della linea precedente (migrazione)
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

  async create(tenantId: string, userId: string, dto: CreatePracticeDto): Promise<PracticeResponseDto> {
    let customer = null;
    if (dto.customerData?.fiscalCode && dto.customerData.fiscalCode.length === 16) {
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

    // Cast esplicito per risolvere il problema di tipo
    const oldLineDataTyped = dto.oldLineData as OldLineDataDto;

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
      oldLineData: dto.lineData?.lineType === 'MIGRAZIONE' ? {
        oldPhoneNumber: oldLineDataTyped?.oldPhoneNumber,
        migrationCode: oldLineDataTyped?.migrationCode,
        gestore: oldLineDataTyped?.gestore,
        gestoreAltro: oldLineDataTyped?.gestoreAltro,
        fiscalCodeOldLine: oldLineDataTyped?.fiscalCodeOldLine,
        prodottiRestituire: oldLineDataTyped?.prodottiRestituire,
        notes: oldLineDataTyped?.notes,
      } : {},
      paymentMethod: {
        iban: dto.paymentData?.iban || null,
        postePay: dto.paymentData?.postePay || null,
        bollettino: dto.paymentData?.bollettino || false,
      },
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

    if (!practice) {
      throw new NotFoundException('Pratica non trovata');
    }

    return practice;
  }

  async getById(tenantId: string, id: string): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, id);
    return new PracticeResponseDto(practice);
  }

  async updateStep(tenantId: string, userId: string, practiceId: string, dto: UpdateStepDto): Promise<PracticeResponseDto> {
    console.log(`[DEBUG] updateStep chiamato - Step: ${dto.stepNumber}, Pratica: ${practiceId}`);
    console.log(`[DEBUG] Dati ricevuti:`, JSON.stringify(dto.data));
    
    const practice = await this.findById(tenantId, practiceId);

    switch (dto.stepNumber) {
      case 1:
        console.log('[DEBUG] Step 1 - Aggiornamento dati offerta');
        if (dto.data?.type) practice.type = dto.data.type;
        if (dto.data?.offerCode) practice.offerCode = dto.data.offerCode;
        if (dto.data?.offerName) practice.offerName = dto.data.offerName;
        if (dto.data?.offerCanone) practice.offerCanone = dto.data.offerCanone;
        if (dto.data?.offerAttivazione) practice.offerAttivazione = dto.data.offerAttivazione;
        if (dto.data?.offerVincolo) practice.offerVincolo = dto.data.offerVincolo;
        if (dto.data?.offerNote) practice.offerNote = dto.data.offerNote;
        if (dto.data?.offerDisattivazione) practice.offerDisattivazione = dto.data.offerDisattivazione;
        if (dto.data?.offerType) practice.offerType = dto.data.offerType;
        if (dto.data?.offerScadenza) practice.offerScadenza = dto.data.offerScadenza;
        break;
      
      case 2:
        practice.soldBy = dto.data?.soldBy;
        practice.enteredBy = dto.data?.enteredBy;
        practice.soldById = dto.data?.soldById;
        practice.enteredById = dto.data?.enteredById;
        break;
      
      case 3:
        console.log('[DEBUG] Step 3 - Gestione cliente');
        if (dto.data?.customerData) {
          const customerData = dto.data.customerData;
          const newFiscalCode = customerData.fiscalCode?.toUpperCase().trim();
          
          console.log('[DEBUG] CF ricevuto:', newFiscalCode);
          
          if (newFiscalCode && newFiscalCode.length === 16) {
            let customer = await this.customersService.findByFiscalCode(tenantId, newFiscalCode);
            
            if (!customer) {
              console.log('[DEBUG] Creazione nuovo cliente');
              try {
                customer = await this.customersService.create(tenantId, {
                  firstName: customerData.firstName,
                  lastName: customerData.lastName,
                  fiscalCode: newFiscalCode,
                  phonePrimary: customerData.phone,
                  email: customerData.email,
                }, userId);
                console.log('[DEBUG] Cliente creato:', customer.id);
              } catch (err) {
                console.error('[DEBUG] Errore creazione cliente:', err);
              }
            } else {
              console.log('[DEBUG] Aggiornamento cliente esistente:', customer.id);
              try {
                await this.customersService.update(tenantId, customer.id, {
                  firstName: customerData.firstName,
                  lastName: customerData.lastName,
                  phonePrimary: customerData.phone,
                  email: customerData.email,
                }, userId);
                console.log('[DEBUG] Cliente aggiornato');
                customer = await this.customersService.findByFiscalCode(tenantId, newFiscalCode);
              } catch (err) {
                console.error('[DEBUG] Errore aggiornamento cliente:', err);
              }
            }
            
            if (customer) {
              practice.customerId = customer.id;
              console.log('[DEBUG] CustomerId assegnato alla pratica:', customer.id);
            }
          } else {
            console.log('[DEBUG] CF non valido o mancante');
          }
          
          practice.customerSnapshot = {
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            fiscalCode: newFiscalCode,
            phonePrimary: customerData.phone,
            email: customerData.email,
          };
        }
        
        if (dto.data?.notes && dto.data.notes.trim() !== '') {
          // Recupera l'utente loggato per avere il nome corretto
          const currentUser = await this.userRepo.findOne({ where: { id: userId } });
          const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Operatore';
          
          const newNote = {
            text: dto.data.notes.trim(),
            createdAt: new Date(),
            createdBy: userName,
            createdById: userId
          };
          
          if (!practice.notesHistory) {
            practice.notesHistory = [];
          }
          
          practice.notesHistory.push(newNote);
          practice.notes = dto.data.notes;
          console.log('[DEBUG] Nota aggiunta alla cronologia');
        }
        break;
      
      case 4:
        // Step 4: gestisce sia pacchetti SKY che dati linea standard
        if (dto.data?.additionalPackages) {
          // Flusso SKY TV - Pacchetti aggiuntivi
          practice.additionalPackages = dto.data.additionalPackages;
        } else {
          // Flusso standard - Dati linea
          practice.lineType = dto.data?.lineType;
          practice.installationAddress = dto.data?.installationAddress;
          practice.technology = dto.data?.technology;
          practice.newLineNotes = dto.data?.notes;
        }
        break;
      
      case 5:
        // Step 5: gestisce sia WASH (SKY) che vecchia linea (standard)
        if (dto.data?.washConfig) {
          // Flusso SKY TV - Configurazione WASH
          practice.washConfig = dto.data.washConfig;
        } else {
          // Flusso standard - Dati vecchia linea (migrazione)
          practice.oldLineData = dto.data?.oldLineData || dto.data;
        }
        break;
      
      case 6:
        practice.paymentMethod = dto.data?.paymentMethod || dto.data;
        break;
      
      case 7:
        if (dto.data) {
          practice.privacyData = {
            gdprConsent: dto.data.gdprConsent || dto.data.privacyData?.gdprConsent || false,
            marketingConsent: dto.data.marketingConsent || dto.data.privacyData?.marketingConsent || false
          };
        }
        break;
      
      case 8:
        console.log('[DEBUG] Step 8 - Appuntamento Installazione');
        practice.appointmentData = {
          data: dto.data?.data,
          ora: dto.data?.ora,
          oraFine: dto.data?.oraFine,
          accordi: dto.data?.accordi,
          lavorazioniPost: dto.data?.lavorazioniPost
        };
        break;
      
      case 9:
        console.log('[DEBUG] Step 9 - Completamento Pratica');
        practice.status = 'completed';
        practice.operationalStatus = 'IN_PROGRESS';
        practice.currentStep = 9;
        
        const finalSteps = new Set(practice.completedSteps.map((s: any) => Number(s)));
        finalSteps.add(9);
        practice.completedSteps = Array.from(finalSteps);
        
        console.log('[DEBUG] Pratica completata, steps:', practice.completedSteps);
        break;
    }

    if (!practice.completedSteps.includes(dto.stepNumber)) {
      practice.completedSteps = [...practice.completedSteps, dto.stepNumber];
    }
    
    practice.currentStep = Math.min(8, Math.max(practice.currentStep, dto.stepNumber === 9 ? 9 : dto.stepNumber + 1));

    if (practice.status === 'draft' && dto.stepNumber >= 2 && dto.stepNumber < 8) {
      practice.status = 'in_progress';
    }

    if (dto.stepNumber === 9) {
      console.log('[EMERGENCY] Forzatura step 9');
      practice.status = 'completed';
      practice.currentStep = 9;
      practice.operationalStatus = 'IN_PROGRESS';
      practice.completedSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      console.log('[EMERGENCY] Pratica modificata:', {
        status: practice.status,
        currentStep: practice.currentStep,
        completedSteps: practice.completedSteps
      });
    }

    console.log('[DEBUG] Salvataggio pratica...');
    const saved = await this.practiceRepo.save(practice);
    console.log('[DEBUG] Salvato:', {
      id: saved.id,
      status: saved.status,
      completedSteps: saved.completedSteps
    });

    const updated = await this.findById(tenantId, practiceId);
    console.log('[DEBUG] Dopo reload:', {
      status: updated.status,
      completedSteps: updated.completedSteps
    });
    
    console.log(`[DEBUG] Pratica salvata. Status: ${practice.status}, CustomerId: ${practice.customerId}`);
    
    return new PracticeResponseDto(updated);
  }

  async updateOperationalStatus(
    tenantId: string, 
    practiceId: string, 
    status: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED'
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    practice.operationalStatus = status;
    
    if (status === 'ACTIVATED' || status === 'REJECTED') {
      practice.status = 'completed';
    }
    
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
    
    // Verifica che solo l'autore possa eliminare
    const note = practice.notesHistory[noteIndex];
    if (note.createdById !== userId) {
      throw new Error('Non autorizzato a eliminare questa nota');
    }
    
    practice.notesHistory.splice(noteIndex, 1);
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async forceComplete(tenantId: string, practiceId: string): Promise<PracticeResponseDto> {
    console.log(`[FORCE] Forzamento completamento pratica ${practiceId}`);
    const practice = await this.findById(tenantId, practiceId);
    
    practice.status = 'completed';
    practice.operationalStatus = 'IN_PROGRESS';
    practice.currentStep = 9;
    if (!practice.completedSteps.includes(8)) {
      practice.completedSteps = [...practice.completedSteps, 8];
    }
    
    await this.practiceRepo.save(practice);
    console.log(`[FORCE] Pratica ${practiceId} forzata a completed`);
    
    const updated = await this.findById(tenantId, practiceId);
    return new PracticeResponseDto(updated);
  }
}