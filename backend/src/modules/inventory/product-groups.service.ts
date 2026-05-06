import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductGroup } from './entities/product-group.entity';
import { ProductCustomField } from './entities/product-custom-field.entity';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';

/**
 * Gestione gruppi prodotti del catalogo (es. Telefoni, Accessori).
 * Tutti i metodi sono scoped per `tenantId` (shop attivo dell'utente).
 */
@Injectable()
export class ProductGroupsService {
  constructor(
    @InjectRepository(ProductGroup)
    private readonly groupRepo: Repository<ProductGroup>,
    @InjectRepository(ProductCustomField)
    private readonly fieldRepo: Repository<ProductCustomField>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(tenantId: string): Promise<ProductGroup[]> {
    return this.groupRepo.find({
      where: { tenantId },
      relations: ['customFields'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ProductGroup> {
    const group = await this.groupRepo.findOne({
      where: { id, tenantId },
      relations: ['customFields'],
    });
    if (!group) throw new NotFoundException('Gruppo non trovato');
    return group;
  }

  async create(tenantId: string, dto: CreateProductGroupDto): Promise<ProductGroup> {
    const newGroupId = await this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(ProductGroup);
      const fieldRepo = manager.getRepository(ProductCustomField);

      // Calcolo sortOrder se non fornito (in coda)
      let sortOrder = dto.sortOrder;
      if (sortOrder === undefined) {
        const last = await groupRepo
          .createQueryBuilder('g')
          .where('g.tenantId = :tenantId', { tenantId })
          .orderBy('g.sortOrder', 'DESC')
          .getOne();
        sortOrder = last ? last.sortOrder + 1 : 0;
      }

      const group = groupRepo.create({
        tenantId,
        name: dto.name.trim(),
        sortOrder,
      });
      const saved = await groupRepo.save(group);

      if (dto.customFields?.length) {
        const fields = dto.customFields.map((f, idx) =>
          fieldRepo.create({
            groupId: saved.id,
            fieldKey: f.fieldKey.trim(),
            fieldLabel: f.fieldLabel.trim(),
            fieldType: f.fieldType,
            isRequired: f.isRequired ?? false,
            sortOrder: f.sortOrder ?? idx,
          }),
        );
        await fieldRepo.save(fields);
      }

      return saved.id;
    });

    return this.findOne(tenantId, newGroupId);
  }

  async update(tenantId: string, id: string, dto: UpdateProductGroupDto): Promise<ProductGroup> {
    await this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(ProductGroup);
      const fieldRepo = manager.getRepository(ProductCustomField);

      const group = await groupRepo.findOne({ where: { id, tenantId } });
      if (!group) throw new NotFoundException('Gruppo non trovato');

      if (dto.name !== undefined) group.name = dto.name.trim();
      if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;
      group.updatedAt = new Date();
      await groupRepo.save(group);

      // Se l'aggiornamento include il set completo dei campi custom, sostituiscili
      if (dto.customFields) {
        await fieldRepo.delete({ groupId: id });
        if (dto.customFields.length) {
          const fields = dto.customFields.map((f, idx) =>
            fieldRepo.create({
              groupId: id,
              fieldKey: f.fieldKey.trim(),
              fieldLabel: f.fieldLabel.trim(),
              fieldType: f.fieldType,
              isRequired: f.isRequired ?? false,
              sortOrder: f.sortOrder ?? idx,
            }),
          );
          await fieldRepo.save(fields);
        }
      }
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    const group = await this.groupRepo.findOne({ where: { id, tenantId } });
    if (!group) throw new NotFoundException('Gruppo non trovato');
    // FIX Problema 2 — fail-safe per il delete del gruppo.
    // Anche se l'entity ha onDelete: 'SET NULL' nella relation, la constraint
    // potrebbe NON essere applicata sul DB di produzione (creato prima).
    // Per essere sicuri: settiamo a NULL il groupId di tutti i prodotti collegati
    // PRIMA del delete del gruppo. Così evitiamo FK violation e permettiamo
    // all'utente di ricreare il gruppo immediatamente dopo.
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE inventory_items SET group_id = NULL WHERE group_id = $1 AND tenant_id = $2`,
        [id, tenantId],
      );
      // I custom_fields hanno cascade dall'entity ProductGroup
      await manager.getRepository(ProductGroup).remove(group);
    });
    return { message: 'Gruppo eliminato' };
  }

  async reorder(tenantId: string, items: { id: string; sortOrder: number }[]): Promise<{ message: string }> {
    if (!items?.length) throw new BadRequestException('Nessun elemento da riordinare');
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ProductGroup);
      for (const it of items) {
        await repo.update({ id: it.id, tenantId }, { sortOrder: it.sortOrder });
      }
    });
    return { message: 'Ordine aggiornato' };
  }
}
