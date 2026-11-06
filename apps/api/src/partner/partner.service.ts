import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateCourtDto } from './dto/create-court.dto';
import { SetAvailabilityDto } from './dto/availability.dto';
import { CreateBlockDto } from './dto/create-block.dto';

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const venueInclude = {
  courts: {
    include: {
      sport: true,
      availabilities: { orderBy: { weekday: 'asc' as const } },
      blocks: { orderBy: { startsAt: 'asc' as const } },
    },
  },
  monthlyInvoices: { orderBy: { yearMonth: 'desc' as const }, take: 6 },
  mapFeeInvoices: {
    orderBy: [{ year: 'desc' as const }, { month: 'desc' as const }],
    take: 6,
  },
};

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnsVenue(userId: string, venueId: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Local não encontrado');
    if (venue.ownerId !== userId) {
      throw new ForbiddenException('Você não gerencia este local');
    }
    return venue;
  }

  private async assertOwnsCourt(userId: string, courtId: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });
    if (!court) throw new NotFoundException('Quadra não encontrada');
    if (court.venue.ownerId !== userId) {
      throw new ForbiddenException('Você não gerencia esta quadra');
    }
    return court;
  }

  private toPartnerVenueDto(
    venue: Awaited<ReturnType<PartnerService['getVenueRaw']>>,
  ) {
    return {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      neighborhood: venue.neighborhood,
      city: venue.city,
      state: venue.state,
      lat: venue.lat,
      lng: venue.lng,
      photoUrls: venue.photoUrls,
      active: venue.active,
      mapVisible: venue.mapVisible,
      courts: venue.courts.map((c) => ({
        id: c.id,
        name: c.name,
        sportId: c.sportId,
        sport: { id: c.sport.id, slug: c.sport.slug, name: c.sport.name },
        sportSlug: c.sport.slug,
        sportName: c.sport.name,
        priceCents: c.priceCents,
        active: c.active,
        availabilities: c.availabilities,
        weeklyAvailability: c.availabilities.map((a) => ({
          dayOfWeek: a.weekday,
          startMin: a.startMinute,
          endMin: a.endMinute,
        })),
        blocks: c.blocks.map((b) => ({
          id: b.id,
          startsAt: b.startsAt.toISOString(),
          endsAt: b.endsAt.toISOString(),
          reason: b.reason,
        })),
      })),
      monthlyInvoices: venue.monthlyInvoices,
      mapFees: venue.mapFeeInvoices.map((i) => ({
        id: i.id,
        year: i.year,
        month: i.month,
        gmvCents: i.gmvCents,
        feeCents: i.feeCents,
        status: i.status,
        dueAt: i.dueAt.toISOString(),
        paidAt: i.paidAt?.toISOString() ?? null,
        pixCopyPaste: i.pixCopyPaste,
      })),
    };
  }

  private async getVenueRaw(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: venueInclude,
    });
    if (!venue) throw new NotFoundException('Local não encontrado');
    return venue;
  }

  async listMyVenues(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      include: venueInclude,
      orderBy: { name: 'asc' },
    });
    return venues.map((v) => this.toPartnerVenueDto(v));
  }

  async getOne(userId: string, venueId: string) {
    await this.assertOwnsVenue(userId, venueId);
    return this.toPartnerVenueDto(await this.getVenueRaw(venueId));
  }

  async createVenue(userId: string, dto: CreateVenueDto) {
    const base = slugify(dto.name) || 'local';
    let slug = base;
    let i = 1;
    while (await this.prisma.venue.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    const venue = await this.prisma.venue.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        neighborhood: dto.neighborhood,
        city: dto.city ?? 'Porto Alegre',
        state: dto.state ?? 'RS',
        lat: dto.lat,
        lng: dto.lng,
        photoUrls: dto.photoUrls ?? [],
        ownerId: userId,
        mapVisible: true,
        active: true,
      },
      include: venueInclude,
    });
    return this.toPartnerVenueDto(venue);
  }

  async updateVenue(
    userId: string,
    venueId: string,
    dto: Partial<CreateVenueDto>,
  ) {
    await this.assertOwnsVenue(userId, venueId);
    const venue = await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        lat: dto.lat,
        lng: dto.lng,
        photoUrls: dto.photoUrls,
      },
      include: venueInclude,
    });
    return this.toPartnerVenueDto(venue);
  }

  async addPhoto(userId: string, venueId: string, url: string) {
    const venue = await this.assertOwnsVenue(userId, venueId);
    const updated = await this.prisma.venue.update({
      where: { id: venueId },
      data: { photoUrls: [...venue.photoUrls, url] },
      include: venueInclude,
    });
    return this.toPartnerVenueDto(updated);
  }

  async createCourt(userId: string, venueId: string, dto: CreateCourtDto) {
    await this.assertOwnsVenue(userId, venueId);
    let sportId = dto.sportId;
    if (!sportId && dto.sportSlug) {
      const sport = await this.prisma.sport.findUnique({
        where: { slug: dto.sportSlug },
      });
      if (!sport) throw new BadRequestException('Esporte inválido');
      sportId = sport.id;
    }
    if (!sportId) {
      throw new BadRequestException('Informe sportId ou sportSlug');
    }
    const sport = await this.prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) throw new NotFoundException('Esporte não encontrado');

    const court = await this.prisma.court.create({
      data: {
        venueId,
        sportId,
        name: dto.name,
        priceCents: dto.priceCents,
        active: dto.active ?? true,
      },
      include: { sport: true },
    });

    // Default Mon–Sun 08:00–22:00 when none set yet
    await this.prisma.courtAvailability.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        courtId: court.id,
        weekday,
        startMinute: 8 * 60,
        endMinute: 22 * 60,
      })),
    });

    return court;
  }

  async updateCourt(
    userId: string,
    courtId: string,
    dto: Partial<CreateCourtDto>,
  ) {
    await this.assertOwnsCourt(userId, courtId);
    return this.prisma.court.update({
      where: { id: courtId },
      data: {
        name: dto.name,
        priceCents: dto.priceCents,
        active: dto.active,
        sportId: dto.sportId,
      },
      include: { sport: true },
    });
  }

  async setAvailability(
    userId: string,
    courtId: string,
    dto: SetAvailabilityDto,
  ) {
    await this.assertOwnsCourt(userId, courtId);
    const slots = dto.slots.map((s) => {
      const weekday = s.weekday ?? s.dayOfWeek;
      const startMinute = s.startMinute ?? s.startMin;
      const endMinute = s.endMinute ?? s.endMin;
      if (weekday == null || startMinute == null || endMinute == null) {
        throw new BadRequestException(
          'Cada slot precisa de weekday/dayOfWeek e start/end minutes',
        );
      }
      return {
        courtId,
        weekday,
        startMinute,
        endMinute,
        priceCents: s.priceCents,
      };
    });
    await this.prisma.$transaction([
      this.prisma.courtAvailability.deleteMany({ where: { courtId } }),
      this.prisma.courtAvailability.createMany({ data: slots }),
    ]);
    return this.prisma.courtAvailability.findMany({
      where: { courtId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async createBlock(userId: string, courtId: string, dto: CreateBlockDto) {
    await this.assertOwnsCourt(userId, courtId);
    return this.prisma.courtBlock.create({
      data: {
        courtId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason,
      },
    });
  }

  async deleteBlock(userId: string, blockId: string) {
    const block = await this.prisma.courtBlock.findUnique({
      where: { id: blockId },
      include: { court: { include: { venue: true } } },
    });
    if (!block) throw new NotFoundException('Bloqueio não encontrado');
    if (block.court.venue.ownerId !== userId) {
      throw new ForbiddenException('Você não gerencia este bloqueio');
    }
    await this.prisma.courtBlock.delete({ where: { id: blockId } });
    return { ok: true };
  }

  async listMapFees(userId: string, venueId: string) {
    await this.assertOwnsVenue(userId, venueId);
    const invoices = await this.prisma.mapFeeInvoice.findMany({
      where: { venueId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return invoices.map((i) => ({
      id: i.id,
      year: i.year,
      month: i.month,
      gmvCents: i.gmvCents,
      feeCents: i.feeCents,
      status: i.status,
      dueAt: i.dueAt.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
      pixCopyPaste: i.pixCopyPaste,
    }));
  }

  async dashboard(userId: string) {
    const venues = await this.listMyVenues(userId);
    const venueIds = venues.map((v) => v.id);
    const paid = await this.prisma.booking.findMany({
      where: {
        venueId: { in: venueIds },
        status: 'confirmed',
        payment: { status: 'paid' },
      },
      select: { priceCents: true, venueId: true, startsAt: true },
    });
    const gmvCents = paid.reduce((s, b) => s + b.priceCents, 0);
    return {
      venuesCount: venues.length,
      courtsCount: venues.reduce((s, v) => s + v.courts.length, 0),
      gmvCents,
      monthlyFeeEstimateCents: Math.round(gmvCents * 0.01),
      venues,
    };
  }
}
