import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Practice, PracticeCategory, OperationalStatus, SkyTvStatus } from './entities/practice.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { PracticeResponseDto } from './dto/practice-response.dto';
import { CustomersService } from '../customers/customers.service';
import { CompetitionEntriesService } from '../competitions/services/competition-entries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { emitNotification } from '../notifications/notifications.controller';

@Injectable()
export class PracticesService {
  constructor(
    @InjectRepository(Practice)
    private practiceRepo: Repository<Practice>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Offer)
    private offerRepo: Repository<Offer>,
    private customersService: CustomersService,
    @Inject(forwardRef(() => CompetitionEntriesService))
    private competitionEntries: CompetitionEntriesService,
    @Optional()
    private notificationsService?: NotificationsService,
  ) {}

  /**
   * Risolve l'offerId per una pratica:
   *  1. Se il DTO passa esplicitamente offerId → usa quello
   *  2. Altrimenti tenta lookup per nome esatto (le offerte sono globali, no tenant)
   * Ritorna null se nessun match (la pratica viene creata senza offerId
   * collegato — match gare farà fallback su practice.type).
   */
  private async resolveOfferId(
    _tenantId: string,
    dto: { offerId?: string; offerName?: string; offerCode?: string; type?: string },
  ): Promise<string | null> {
    if (dto.offerId) return dto.offerId;
    const name = (dto.offerName || dto.offerCode || '').trim();
    if (!name || name.toUpperCase() === 'ALTRO') return null;

    // Lookup globale per nome esatto (case insensitive)
    const byName = await this.offerRepo
      .createQueryBuilder('o')
      .where('UPPER(o.name) = UPPER(:n)', { n: name })
      .getOne();
    if (byName) return byName.id;

    return null;
  }

  private calculateStatoGlobale(
    convergenza: { attiva: boolean; tipo?: 'daChiudere' | 'chiusa' | null; numero?: string } | null,
  ): 'completo' | 'non_completo' | null {
    if (!convergenza?.attiva) return null;
    if (!convergenza.tipo) return 'non_completo';
    if (convergenza.tipo === 'chiusa' && convergenza.numero?.length > 0) return 'completo';
    return 'non_completo';
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePracticeDto,
  ): Promise<PracticeResponseDto> {
    const category: PracticeCategory = dto.category || 'FIXED_LINE';

    let customer = null;
    if (dto.customerData?.fiscalCode?.length === 16) {
      customer = await this.customersService.findByFiscalCode(
        tenantId,
        dto.customerData.fiscalCode.toUpperCase().trim(),
      );
      if (!customer) {
        customer = await this.customersService.create(
          tenantId,
          {
            firstName: dto.customerData.firstName || 'Temp',
            lastName: dto.customerData.lastName || 'Temp',
            fiscalCode: dto.customerData.fiscalCode.toUpperCase().trim(),
            phonePrimary: dto.customerData.phone,
            email: dto.customerData.email,
            address: dto.customerData?.address || null,
          },
          userId,
        );
      }
    }

    const statoGlobale = this.calculateStatoGlobale(dto.convergenza || null);

    // FIX PROBLEMA 3 — risolvi offerId (esplicito o lookup automatico per nome).
    // Senza questo, le promo "specifiche per offerta" non conteggiavano mai.
    const resolvedOfferId = await this.resolveOfferId(tenantId, dto);

    const baseFields = {
      tenantId,
      category,
      customerId: customer?.id || null,
      createdBy: userId,
      type: dto.type || null,
      offerId: resolvedOfferId,
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
      customerSnapshot: customer
        ? {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phonePrimary: customer.phonePrimary,
            email: customer.email,
            fiscalCode: customer.fiscalCode,
            address: customer.address,
          }
        : {},
      convergenza: dto.convergenza || null,
      lavorazioniPostAttivazione: dto.lavorazioniPostAttivazione || null,
      statoGlobale,
      currentStep: 1,
      completedSteps: [1],
      status: 'in_progress' as const,
      operationalStatus: 'PENDING' as const,
    };

    let categorySpecific: Partial<Practice> = {};
    if (category === 'FIXED_LINE') {
      categorySpecific = {
        lineType: dto.lineData?.lineType,
        installationAddress: dto.lineData?.installationAddress,
        technology: dto.lineData?.technology,
        oldLineData: dto.lineData?.lineType === 'MIGRAZIONE' ? dto.oldLineData : {},
        paymentMethod: {
          iban: dto.paymentData?.iban || null,
          postePay: dto.paymentData?.postePay || null,
          bollettino: dto.paymentData?.bollettino || false,
        },
      };
    } else if (category === 'MOBILE') {
      categorySpecific = {
        mobileData: dto.mobileData || {},
        paymentMethod: dto.mobileData?.ibanCdc
          ? { iban: dto.mobileData.ibanCdc, postePay: null, bollettino: false }
          : {},
      };
    } else if (category === 'ENERGY') {
      categorySpecific = {
        energyData: dto.energyData || {},
        paymentMethod: dto.energyData?.ibanCdc
          ? {
              iban: dto.energyData.ibanCdc !== 'BOLLETTINO' ? dto.energyData.ibanCdc : null,
              postePay: null,
              bollettino: dto.energyData.ibanCdc === 'BOLLETTINO',
            }
          : {},
      };
    }

    const practice = this.practiceRepo.create({ ...baseFields, ...categorySpecific });
    const saved = await this.practiceRepo.save(practice);
    const full = await this.findById(tenantId, saved.id);
    return new PracticeResponseDto(full);
  }

  async findAll(
    tenantId: string,
    filters?: {
      type?: string;
      status?: string;
      category?: PracticeCategory | string;
      skyTvStatus?: string;
    },
  ): Promise<PracticeResponseDto[]> {
    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.skyTvStatus) where.skyTvStatus = filters.skyTvStatus;

    const practices = await this.practiceRepo.find({
      where,
      relations: ['customer', 'creator', 'assignedUser'],
      order: { createdAt: 'DESC' },
    });

    return practices.map((p) => new PracticeResponseDto(p));
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

  async updateStep(
    tenantId: string,
    userId: string,
    practiceId: string,
    dto: UpdateStepDto,
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    const category: PracticeCategory = (practice.category as PracticeCategory) || 'FIXED_LINE';

    if (category === 'MOBILE') {
      await this.applyMobileStep(practice, dto, userId);
    } else if (category === 'ENERGY') {
      await this.applyEnergyStep(practice, dto, userId);
    } else {
      await this.applyFixedLineStep(practice, dto, userId, tenantId);
    }

    // FIX PROBLEMA 3 — dopo aver applicato lo step, se i campi offerta sono
    // stati toccati nello step, ri-risolvi offerId. Senza questo, le promo
    // "specifiche per offerta" non conteggiavano mai.
    const stepData = (dto.data || {}) as any;
    const offerTouched =
      stepData.offerId !== undefined ||
      stepData.offerName !== undefined ||
      stepData.offerCode !== undefined;
    if (offerTouched) {
      if (stepData.offerId && typeof stepData.offerId === 'string') {
        // ID esplicito dal wizard — fonte più affidabile
        practice.offerId = stepData.offerId;
      } else if (practice.offerName || practice.offerCode) {
        // Lookup automatico per nome (utile per fixed_line con catalogo hardcoded)
        practice.offerId = await this.resolveOfferId(tenantId, {
          offerName: practice.offerName,
          offerCode: practice.offerCode,
          type: practice.type,
        });
      }
    }

    if (dto.data?.completed === true) {
      practice.status = 'completed';
      practice.operationalStatus = 'IN_PROGRESS';
      practice.currentStep = dto.stepNumber;
      if (!practice.completedSteps.includes(dto.stepNumber)) {
        practice.completedSteps = [...practice.completedSteps, dto.stepNumber];
      }
      for (let i = 1; i < dto.stepNumber; i++) {
        if (!practice.completedSteps.includes(i)) {
          practice.completedSteps.push(i);
        }
      }
    } else {
      if (!practice.completedSteps.includes(dto.stepNumber)) {
        practice.completedSteps = [...practice.completedSteps, dto.stepNumber];
      }
      const maxCompleted = Math.max(...practice.completedSteps, 0);
      const maxStepByCategory = category === 'FIXED_LINE' ? 9 : 6;
      practice.currentStep = Math.max(
        practice.currentStep,
        Math.min(maxCompleted + 1, maxStepByCategory),
      );
    }

    if (practice.status === 'draft' && dto.stepNumber >= 2) {
      practice.status = 'in_progress';
    }

    // ===== SPRINT — Ricalcolo automatico stato globale dopo step =====
    this.recomputeGlobalStatus(practice);

    await this.practiceRepo.save(practice);

    // Notifica real-time: pratica completata dall'operatore
    if (dto.data?.completed === true && this.notificationsService) {
      try {
        const notif = await this.notificationsService.create({
          tenantId: practice.tenantId,
          userId: practice.soldById || userId,
          type: NotificationType.PRACTICE_COMPLETED,
          title: 'Pratica completata',
          message: `Hai completato la pratica "${practice.offerName || '—'}" (${practice.category || ''}).`,
          linkUrl: `/operator/practices/${practice.id}`,
          linkLabel: 'Vedi pratica',
        });
        emitNotification(practice.soldById || userId, notif);
      } catch {
        // ignore silently — notification failure should not break practice save
      }
    }

    await this.competitionEntries.syncPracticeEntries(practiceId).catch((err) => {
      // Phase G — non swallowiamo: logghiamo per diagnosi gare
      // eslint-disable-next-line no-console
      console.error(`[CompetitionSync] updateStep practiceId=${practiceId} → sync failed:`, err);
    });
    const updated = await this.findById(tenantId, practiceId);
    return new PracticeResponseDto(updated);
  }

  private async applyMobileStep(
    practice: Practice,
    dto: UpdateStepDto,
    userId: string,
  ): Promise<void> {
    const d = dto.data || {};

    // ===== SPRINT — Supporto Quick Edit per Mobile =====
    // I campi sono solo quelli rilevanti per Mobile (no oldLine*, no installationAddress).
    if (dto.stepKey === 'quick-edit') {
      if (d.operationalStatus !== undefined) practice.operationalStatus = d.operationalStatus;
      if (d.soldById !== undefined) practice.soldById = d.soldById;
      if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
      if (d.paymentMethod !== undefined) {
        practice.paymentMethod = { ...(practice.paymentMethod || {}), ...d.paymentMethod };
      }
      return;
    }

    if (dto.stepNumber === 1) {
      if (d.type !== undefined) practice.type = d.type;
      if (d.offerCode !== undefined) practice.offerCode = d.offerCode;
      if (d.offerName !== undefined) practice.offerName = d.offerName;
      if (d.offerCanone !== undefined) practice.offerCanone = d.offerCanone;
      if (d.offerType !== undefined) practice.offerType = d.offerType;
      if (d.offertaAltro !== undefined) {
        practice.mobileData = { ...(practice.mobileData || {}), offertaAltro: d.offertaAltro };
      }
      return;
    }

    if (dto.stepNumber === 2) {
      if (d.soldBy !== undefined) practice.soldBy = d.soldBy;
      if (d.enteredBy !== undefined) practice.enteredBy = d.enteredBy;
      if (d.soldById !== undefined) practice.soldById = d.soldById;
      if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
      return;
    }

    if (dto.stepNumber === 3) {
      await this.applyCustomerStep(practice, dto, userId);
      return;
    }

    if (dto.stepNumber >= 4 && dto.stepNumber <= 6) {
      const mergeableKeys = [
        'tipoLinea',
        'numeroDaPortare',
        'codiceFiscaleVecchiaLinea',
        'gestoreProvenienza',
        'gestoreProvenienzaAltro',
        'noteMnp',
        'gestoreNuovaLinea',
        'gestoreNuovaLineaAltro',
        'ricarica',
        'ricaricaAltro',
        'timUnica',
        'timUnicaAltro',
        'numeroReteFissaTimUnica',
        'ibanCdc',
        'noteMetodoPagamento',
        'noteGeneriche',
        'accordiCliente',
        'offertaAltro',
      ];
      const delta: Record<string, any> = {};
      for (const k of mergeableKeys) if (d[k] !== undefined) delta[k] = d[k];
      if (Object.keys(delta).length) {
        practice.mobileData = { ...(practice.mobileData || {}), ...delta };
      }
      if (d.ibanCdc !== undefined) {
        practice.paymentMethod = {
          ...(practice.paymentMethod || {}),
          iban: d.ibanCdc,
        };
      }
      if (d.lavorazioniPostAttivazione !== undefined) {
        practice.lavorazioniPostAttivazione = d.lavorazioniPostAttivazione;
      }
    }
  }

  private async applyEnergyStep(
    practice: Practice,
    dto: UpdateStepDto,
    userId: string,
  ): Promise<void> {
    const d = dto.data || {};

    // ===== SPRINT — Supporto Quick Edit per Energy =====
    if (dto.stepKey === 'quick-edit') {
      if (d.operationalStatus !== undefined) practice.operationalStatus = d.operationalStatus;
      if (d.soldById !== undefined) practice.soldById = d.soldById;
      if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
      if (d.paymentMethod !== undefined) {
        practice.paymentMethod = { ...(practice.paymentMethod || {}), ...d.paymentMethod };
      }
      return;
    }

    if (dto.stepNumber === 1) {
      if (d.type !== undefined) practice.type = d.type;
      if (d.offerCode !== undefined) practice.offerCode = d.offerCode;
      if (d.offerName !== undefined) practice.offerName = d.offerName;
      if (d.tipoOfferta !== undefined || d.tipoOffertaAltro !== undefined) {
        practice.energyData = {
          ...(practice.energyData || {}),
          ...(d.tipoOfferta !== undefined ? { tipoOfferta: d.tipoOfferta } : {}),
          ...(d.tipoOffertaAltro !== undefined ? { tipoOffertaAltro: d.tipoOffertaAltro } : {}),
        };
      }
      return;
    }

    if (dto.stepNumber === 2) {
      if (d.soldBy !== undefined) practice.soldBy = d.soldBy;
      if (d.enteredBy !== undefined) practice.enteredBy = d.enteredBy;
      if (d.soldById !== undefined) practice.soldById = d.soldById;
      if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
      return;
    }

    if (dto.stepNumber === 3) {
      await this.applyCustomerStep(practice, dto, userId);
      return;
    }

    if (dto.stepNumber >= 4 && dto.stepNumber <= 6) {
      const mergeableKeys = [
        'tipoAttivazione',
        'tipoAttivazioneAltro',
        'codiceFiscaleVecchioContratto',
        'numeroContatore',
        'potenzaContatore',
        'potenzaContatoreAltro',
        'gestoreProvenienza',
        'gestoreProvenienzaAltro',
        'gestoreNuovoContratto',
        'gestoreNuovoContrattoAltro',
        'tipoOfferta',
        'tipoOffertaAltro',
        'ibanCdc',
        'noteMetodoPagamento',
        'noteGeneriche',
        'accordiCliente',
      ];
      const delta: Record<string, any> = {};
      for (const k of mergeableKeys) if (d[k] !== undefined) delta[k] = d[k];
      if (Object.keys(delta).length) {
        practice.energyData = { ...(practice.energyData || {}), ...delta };
      }
      if (d.ibanCdc !== undefined) {
        practice.paymentMethod = {
          iban: d.ibanCdc !== 'BOLLETTINO' ? d.ibanCdc : null,
          postePay: null,
          bollettino: d.ibanCdc === 'BOLLETTINO',
        };
      }
      if (d.lavorazioniPostAttivazione !== undefined) {
        practice.lavorazioniPostAttivazione = d.lavorazioniPostAttivazione;
      }
    }
  }

  private async applyCustomerStep(
    practice: Practice,
    dto: UpdateStepDto,
    userId: string,
  ): Promise<void> {
    const d = dto.data || {};
    if (d.customerData) {
      const cd = d.customerData;
      const newCf = cd.fiscalCode?.toUpperCase().trim();

      if (newCf?.length === 16) {
        let customer = await this.customersService.findByFiscalCode(practice.tenantId, newCf);
        if (!customer) {
          customer = await this.customersService.create(
            practice.tenantId,
            {
              firstName: cd.firstName || 'Temp',
              lastName: cd.lastName || 'Temp',
              fiscalCode: newCf,
              phonePrimary: cd.phone,
              email: cd.email,
              address: cd.address || null,
            },
            userId,
          );
        } else {
          await this.customersService.update(
            practice.tenantId,
            customer.id,
            {
              firstName: cd.firstName,
              lastName: cd.lastName,
              phonePrimary: cd.phone,
              email: cd.email,
              address: cd.address || null,
            },
            userId,
          );
        }
        if (customer) practice.customerId = customer.id;
      }

      practice.customerSnapshot = {
        ...practice.customerSnapshot,
        firstName: cd.firstName !== undefined ? cd.firstName : practice.customerSnapshot?.firstName,
        lastName: cd.lastName !== undefined ? cd.lastName : practice.customerSnapshot?.lastName,
        fiscalCode: newCf !== undefined ? newCf : practice.customerSnapshot?.fiscalCode,
        phonePrimary: cd.phone !== undefined ? cd.phone : practice.customerSnapshot?.phonePrimary,
        email: cd.email !== undefined ? cd.email : practice.customerSnapshot?.email,
        address: cd.address !== undefined ? cd.address : practice.customerSnapshot?.address,
      };
    }

    if (d.notes?.trim()) {
      const currentUser = await this.userRepo.findOne({ where: { id: userId } });
      const userName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'Operatore';
      const newNote = {
        text: d.notes.trim(),
        createdAt: new Date(),
        createdBy: userName,
        createdById: userId,
      };
      if (!practice.notesHistory) practice.notesHistory = [];
      practice.notesHistory.push(newNote);
      practice.notes = d.notes;
    }
  }

  private async applyFixedLineStep(
    practice: Practice,
    dto: UpdateStepDto,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    // Opzione A: se il frontend invia stepKey, usa il mapping per chiave
    // invece del numero fisso. Questo gestisce gli step dinamici del wizard.
    if (dto.stepKey) {
      await this.applyFixedLineStepByKey(practice, dto, userId, tenantId);
      return;
    }

    // Fallback: logica legacy per numero fisso (retrocompatibilità)
    switch (dto.stepNumber) {
      case 1:
        if (dto.data?.type !== undefined) practice.type = dto.data.type;
        if (dto.data?.offerCode !== undefined) practice.offerCode = dto.data.offerCode;
        if (dto.data?.offerName !== undefined) practice.offerName = dto.data.offerName;
        if (dto.data?.offerCanone !== undefined) practice.offerCanone = dto.data.offerCanone;
        if (dto.data?.offerAttivazione !== undefined)
          practice.offerAttivazione = dto.data.offerAttivazione;
        if (dto.data?.offerVincolo !== undefined) practice.offerVincolo = dto.data.offerVincolo;
        if (dto.data?.offerNote !== undefined) practice.offerNote = dto.data.offerNote;
        if (dto.data?.offerDisattivazione !== undefined)
          practice.offerDisattivazione = dto.data.offerDisattivazione;
        if (dto.data?.offerType !== undefined) practice.offerType = dto.data.offerType;
        if (dto.data?.offerScadenza !== undefined)
          practice.offerScadenza = dto.data.offerScadenza;
        break;

      case 2:
        if (dto.data?.soldBy !== undefined) practice.soldBy = dto.data.soldBy;
        if (dto.data?.enteredBy !== undefined) practice.enteredBy = dto.data.enteredBy;
        if (dto.data?.soldById !== undefined) practice.soldById = dto.data.soldById;
        if (dto.data?.enteredById !== undefined) practice.enteredById = dto.data.enteredById;
        break;

      case 3:
        await this.applyCustomerStep(practice, dto, userId);
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
        if (dto.data?.oldLineStatus !== undefined) practice.oldLineStatus = dto.data.oldLineStatus;
        if (dto.data?.oldLineTechnology !== undefined) practice.oldLineTechnology = dto.data.oldLineTechnology;
        break;

      case 6:
      case 7:
      case 8:
      case 9:
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
            marketingConsent:
              dto.data?.marketingConsent ?? dto.data?.privacyData?.marketingConsent ?? false,
          };
        }
        break;
    }
  }

  /**
   * Valida i vincoli per impostare globalStatus = COMPLETATA.
   * La regola si adatta alla categoria della pratica:
   *  - FIXED_LINE: 9 step + linea attivata (+ vecchia linea disattivata se Migrazione)
   *  - MOBILE / ENERGY: 6 step + linea attivata (no concetto di vecchia linea fisica)
   *  - Pratiche FIXED_LINE senza migrazione: stessa logica ma nessun controllo oldLineStatus
   * Ritorna array di messaggi di errore (vuoto = OK).
   */
  private validateGlobalStatusCompletion(practice: Practice): string[] {
    const errors: string[] = [];

    const category: PracticeCategory = (practice.category as PracticeCategory) || 'FIXED_LINE';
    const totalSteps = category === 'FIXED_LINE' ? 9 : 6;
    const completedCount = practice.completedSteps?.length || 0;
    if (completedCount < totalSteps) {
      errors.push(`Impossibile completare: ${totalSteps - completedCount} step non compilati`);
    }

    // La nuova linea / attivazione deve essere ATTIVATA
    if (practice.operationalStatus !== 'ACTIVATED') {
      errors.push('Impossibile completare: la nuova linea non risulta attiva');
    }

    // Vecchia linea: vincolo SOLO per FIXED_LINE con lineType === 'MIGRAZIONE'.
    // Per pratiche senza migrazione (NUOVA / Mobile / Energy) il check viene
    // saltato: niente vecchia linea = vincolo automaticamente soddisfatto.
    if (category === 'FIXED_LINE' && practice.lineType === 'MIGRAZIONE' && practice.oldLineStatus !== 'DISATTIVATA') {
      errors.push('Impossibile completare: la vecchia linea non risulta disattivata');
    }

    return errors;
  }

  /**
   * Helper interno: ricalcola e applica globalStatus quando lo stato operativo
   * cambia. Se tutti i vincoli sono soddisfatti la pratica diventa COMPLETATA
   * automaticamente. Se invece torna a non-attivata (KO, rejected, ecc.)
   * la pratica viene riportata a NON_COMPLETATA.
   * Non solleva eccezioni — è "silent" e va chiamato a fine save.
   */
  private recomputeGlobalStatus(practice: Practice): void {
    const errors = this.validateGlobalStatusCompletion(practice);
    practice.globalStatus = errors.length === 0 ? 'COMPLETATA' : 'NON_COMPLETATA';
  }

  /**
   * Aggiorna lo stato globale della pratica (NON_COMPLETATA / COMPLETATA).
   * Per impostare COMPLETATA tutti i vincoli devono essere soddisfatti.
   * Se i vincoli non sono soddisfatti viene lanciata ForbiddenException con
   * l'elenco dei blocchi rimanenti.
   */
  async updateGlobalStatus(
    tenantId: string,
    practiceId: string,
    newStatus: 'NON_COMPLETATA' | 'COMPLETATA',
  ): Promise<PracticeResponseDto & { errors?: string[] }> {
    const practice = await this.findById(tenantId, practiceId);

    if (newStatus === 'COMPLETATA') {
      const errors = this.validateGlobalStatusCompletion(practice);
      if (errors.length > 0) {
        throw new ForbiddenException({
          message: 'Pratica non completabile',
          errors,
        });
      }
    }

    practice.globalStatus = newStatus;
    await this.practiceRepo.save(practice);
    const updated = await this.findById(tenantId, practiceId);
    return new PracticeResponseDto(updated);
  }

  /**
   * Restituisce eventuali blocchi alla COMPLETAZIONE senza modificare il DB.
   * Usato dal frontend per mostrare il banner informativo nel dettaglio.
   */
  async getCompletionBlockers(
    tenantId: string,
    practiceId: string,
  ): Promise<{ canComplete: boolean; errors: string[] }> {
    const practice = await this.findById(tenantId, practiceId);
    const errors = this.validateGlobalStatusCompletion(practice);
    return { canComplete: errors.length === 0, errors };
  }

  private async applyFixedLineStepByKey(
    practice: Practice,
    dto: UpdateStepDto,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const key = dto.stepKey!;
    const d = dto.data || {};

    switch (key) {
      case 'offer':
        if (d.type !== undefined) practice.type = d.type;
        if (d.offerCode !== undefined) practice.offerCode = d.offerCode;
        if (d.offerName !== undefined) practice.offerName = d.offerName;
        if (d.offerCanone !== undefined) practice.offerCanone = d.offerCanone;
        if (d.offerAttivazione !== undefined) practice.offerAttivazione = d.offerAttivazione;
        if (d.offerVincolo !== undefined) practice.offerVincolo = d.offerVincolo;
        if (d.offerNote !== undefined) practice.offerNote = d.offerNote;
        if (d.offerDisattivazione !== undefined) practice.offerDisattivazione = d.offerDisattivazione;
        if (d.offerType !== undefined) practice.offerType = d.offerType;
        if (d.offerScadenza !== undefined) practice.offerScadenza = d.offerScadenza;
        break;

      case 'sellers':
        if (d.soldBy !== undefined) practice.soldBy = d.soldBy;
        if (d.enteredBy !== undefined) practice.enteredBy = d.enteredBy;
        if (d.soldById !== undefined) practice.soldById = d.soldById;
        if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
        break;

      case 'customer':
        await this.applyCustomerStep(practice, dto, userId);
        break;

      case 'packages':
        if (d.additionalPackages !== undefined) practice.additionalPackages = d.additionalPackages;
        break;

      case 'wash':
        if (d.washConfig !== undefined) practice.washConfig = d.washConfig;
        break;

      case 'line-new':
        if (d.lineType !== undefined) practice.lineType = d.lineType ?? null;
        if (d.installationAddress !== undefined) practice.installationAddress = d.installationAddress ?? null;
        if (d.technology !== undefined) practice.technology = d.technology ?? null;
        if (d.notes !== undefined) practice.newLineNotes = d.notes ?? null;
        if (d.convergenza !== undefined) {
          practice.convergenza = d.convergenza;
          practice.statoGlobale = this.calculateStatoGlobale(practice.convergenza);
        }
        if (d.lavorazioniPostAttivazione !== undefined) practice.lavorazioniPostAttivazione = d.lavorazioniPostAttivazione;
        break;

      case 'line-old':
        if (d.oldLineData !== undefined || d.oldPhoneNumber !== undefined) {
          const old = d.oldLineData || d;
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
        if (d.oldLineStatus !== undefined) practice.oldLineStatus = d.oldLineStatus;
        if (d.oldLineTechnology !== undefined) practice.oldLineTechnology = d.oldLineTechnology;
        break;

      case 'payment':
        if (d.paymentMethod !== undefined || d.iban !== undefined) {
          practice.paymentMethod = {
            iban: d.paymentMethod?.iban ?? d.iban ?? null,
            postePay: d.paymentMethod?.postePay ?? d.postePay ?? null,
            bollettino: d.paymentMethod?.bollettino ?? d.bollettino ?? false,
          };
        }
        break;

      case 'privacy':
        if (d.gdprConsent !== undefined || d.marketingConsent !== undefined) {
          practice.privacyData = {
            gdprConsent: d.gdprConsent ?? d.privacyData?.gdprConsent ?? false,
            marketingConsent: d.marketingConsent ?? d.privacyData?.marketingConsent ?? false,
          };
        }
        break;

      case 'appointment':
        if (d.data !== undefined || d.ora !== undefined) {
          practice.appointmentData = {
            data: d.data ?? practice.appointmentData?.data,
            ora: d.ora ?? practice.appointmentData?.ora,
            oraFine: d.oraFine ?? practice.appointmentData?.oraFine,
            accordi: d.accordi ?? practice.appointmentData?.accordi,
          };
        }
        break;

      case 'quick-edit':
        // Quick Edit: merge profondo dei dati esistenti
        if (d.operationalStatus !== undefined) practice.operationalStatus = d.operationalStatus;
        if (d.lineStatus !== undefined) practice.operationalStatus = d.lineStatus;
        if (d.oldLineStatus !== undefined) practice.oldLineStatus = d.oldLineStatus;
        if (d.oldLineTechnology !== undefined) practice.oldLineTechnology = d.oldLineTechnology;
        if (d.soldById !== undefined) practice.soldById = d.soldById;
        if (d.enteredById !== undefined) practice.enteredById = d.enteredById;
        if (d.paymentMethod !== undefined) {
          practice.paymentMethod = { ...(practice.paymentMethod || {}), ...d.paymentMethod };
        }
        if (d.installationAddress !== undefined) {
          practice.installationAddress = { ...(practice.installationAddress || {}), ...d.installationAddress };
        }
        if (d.appointmentData !== undefined) {
          practice.appointmentData = { ...(practice.appointmentData || {}), ...d.appointmentData };
        }
        break;

      default:
        // Se la chiave non è riconosciuta, fallback per retrocompatibilità
        break;
    }
  }

  async updateConvergence(
    tenantId: string,
    practiceId: string,
    numero: string,
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    if (!practice.convergenza?.attiva) throw new Error('Convergenza non attiva');
    if (practice.convergenza.tipo !== 'daChiudere') throw new Error('Non in stato Da Chiudere');

    practice.convergenza = { ...practice.convergenza, tipo: 'chiusa', numero };
    practice.statoGlobale = this.calculateStatoGlobale(practice.convergenza);

    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async updateOperationalStatus(
    tenantId: string,
    practiceId: string,
    status: OperationalStatus,
    koReason?: string,
    skyTvStatus?: SkyTvStatus,
    userId?: string,
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);

    const isKo = status === 'REJECTED' || status.includes('KO');
    if (isKo && (!koReason || koReason.trim().length === 0)) {
      throw new ForbiddenException('La motivazione KO è obbligatoria per gli stati KO');
    }

    practice.operationalStatus = status;

    if (isKo && koReason) {
      const currentUser = userId
        ? await this.userRepo.findOne({ where: { id: userId } })
        : null;
      const userName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'Sistema';
      const koNote = {
        text: `[${status}] ${koReason.trim()}`,
        createdAt: new Date(),
        createdBy: userName,
        createdById: userId || 'system',
        isKoReason: true,
      };
      if (!practice.notesHistory) practice.notesHistory = [];
      practice.notesHistory.push(koNote);
    }

    if (skyTvStatus !== undefined) {
      practice.skyTvStatus = skyTvStatus;
    }

    if (status === 'ACTIVATED' || isKo) {
      practice.status = 'completed';
    }

    // ===== SPRINT — Ricalcolo automatico stato globale =====
    // Quando l'operatore cambia lo stato operativo, ricalcoliamo se la
    // pratica deve essere marcata COMPLETATA (linea attiva + step ok +
    // vecchia linea disattivata se Migrazione) o tornare NON_COMPLETATA.
    this.recomputeGlobalStatus(practice);

    await this.practiceRepo.save(practice);
    await this.competitionEntries.syncPracticeEntries(practiceId).catch((err) => {
      // Phase G — non swallowiamo: logghiamo per diagnosi gare
      // eslint-disable-next-line no-console
      console.error(`[CompetitionSync] updateOperationalStatus practiceId=${practiceId} → sync failed:`, err);
    });
    return new PracticeResponseDto(practice);
  }

  async updateSkyTvStatus(
    tenantId: string,
    practiceId: string,
    skyTvStatus: SkyTvStatus | null,
    skyTvKoReason?: string,
    userId?: string,
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);

    const isSkyTvKo = !!skyTvStatus && skyTvStatus.startsWith('KO_');
    if (isSkyTvKo && (!skyTvKoReason || skyTvKoReason.trim().length === 0)) {
      throw new ForbiddenException('La motivazione è obbligatoria per gli stati KO Sky TV');
    }

    practice.skyTvStatus = skyTvStatus;

    if (isSkyTvKo && skyTvKoReason) {
      const currentUser = userId
        ? await this.userRepo.findOne({ where: { id: userId } })
        : null;
      const userName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'Sistema';
      const koNote = {
        text: `[SKY TV ${skyTvStatus}] ${skyTvKoReason.trim()}`,
        createdAt: new Date(),
        createdBy: userName,
        createdById: userId || 'system',
        isSkyTvKoReason: true,
        skyTvStatus: skyTvStatus as string,
      };
      if (!practice.notesHistory) practice.notesHistory = [];
      practice.notesHistory.push(koNote);
    }

    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async delete(tenantId: string, practiceId: string): Promise<void> {
    const practice = await this.findById(tenantId, practiceId);
    await this.competitionEntries.removeForPractice(practiceId).catch(() => {});
    await this.practiceRepo.remove(practice);
  }

  async deleteNote(
    tenantId: string,
    practiceId: string,
    noteIndex: number,
    userId: string,
  ): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    if (!practice.notesHistory || noteIndex < 0 || noteIndex >= practice.notesHistory.length) {
      throw new NotFoundException('Nota non trovata');
    }
    if (practice.notesHistory[noteIndex].createdById !== userId) {
      throw new ForbiddenException('Non autorizzato a cancellare note di altri');
    }
    practice.notesHistory.splice(noteIndex, 1);
    await this.practiceRepo.save(practice);
    return new PracticeResponseDto(practice);
  }

  async count(): Promise<number> {
    return await this.practiceRepo.count();
  }

  async forceComplete(tenantId: string, practiceId: string): Promise<PracticeResponseDto> {
    const practice = await this.findById(tenantId, practiceId);
    practice.status = 'completed';
    practice.operationalStatus = 'IN_PROGRESS';
    const maxStep = practice.category === 'FIXED_LINE' ? 9 : 6;
    practice.currentStep = maxStep;
    if (!practice.completedSteps.includes(maxStep)) {
      practice.completedSteps = [...practice.completedSteps, maxStep];
    }
    await this.practiceRepo.save(practice);
    await this.competitionEntries.syncPracticeEntries(practiceId).catch((err) => {
      // Phase G — non swallowiamo: logghiamo per diagnosi gare
      // eslint-disable-next-line no-console
      console.error(`[CompetitionSync] forceComplete practiceId=${practiceId} → sync failed:`, err);
    });
    return new PracticeResponseDto(await this.findById(tenantId, practiceId));
  }

  /**
   * FIX BUG GARE — Ripara lo storico:
   *  1) Per ogni pratica con offerId=NULL ma offerName valorizzato, prova a
   *     risolvere offerId per nome (case-insensitive). Aggiorna se trova match.
   *  2) Ritorna il numero di pratiche aggiornate. Il caller decide se
   *     ricalcolare le gare separatamente.
   *
   * NOTA: scope è opzionale (tenantId). Se omesso → scansiona tutto.
   */
  async repairOfferLinks(tenantId?: string): Promise<{
    scanned: number;
    updated: number;
    sample: Array<{ id: string; offerName: string; resolvedOfferId: string }>;
  }> {
    const qb = this.practiceRepo
      .createQueryBuilder('p')
      .where('p.offerId IS NULL')
      .andWhere('p.offerName IS NOT NULL')
      .andWhere("TRIM(p.offerName) <> ''")
      .andWhere("UPPER(p.offerName) <> 'ALTRO'");
    if (tenantId) qb.andWhere('p.tenantId = :tid', { tid: tenantId });
    const practices = await qb.getMany();

    let updated = 0;
    const sample: Array<{ id: string; offerName: string; resolvedOfferId: string }> = [];
    for (const p of practices) {
      const resolved = await this.resolveOfferId('' as any, {
        offerName: p.offerName,
        offerCode: p.offerCode,
        type: p.type,
      });
      if (resolved) {
        p.offerId = resolved;
        await this.practiceRepo.save(p);
        updated++;
        if (sample.length < 10) {
          sample.push({ id: p.id, offerName: p.offerName, resolvedOfferId: resolved });
        }
      }
    }
    return { scanned: practices.length, updated, sample };
  }
}
