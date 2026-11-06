import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { CITY } from '@ludi/shared';
import { PrismaService } from '../prisma/prisma.service';
import { distanceKm } from './geo';

const ACTIVE_SLOT_STATUSES: BookingStatus[] = [
  BookingStatus.requested,
  BookingStatus.hold_15m,
  BookingStatus.accepted,
  BookingStatus.payment_pending,
  BookingStatus.confirmed,
];

export type VenueListQuery = {
  sport?: string;
  /** ISO datetime — venue must have a free court window covering this instant. */
  freeAt?: string;
  lat?: number;
  lng?: number;
  /** Max distance in km from lat/lng (default center POA if lat/lng omitted and radius set). */
  radiusKm?: number;
  /** Include venues with mapVisible=false (default false). */
  includeHidden?: boolean;
};

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: VenueListQuery = {}) {
    const {
      sport: sportSlug,
      freeAt,
      lat,
      lng,
      radiusKm,
      includeHidden,
    } = query;

    const venues = await this.prisma.venue.findMany({
      where: {
        active: true,
        city: 'Porto Alegre',
        ...(includeHidden ? {} : { mapVisible: true }),
        ...(sportSlug
          ? { courts: { some: { sport: { slug: sportSlug }, active: true } } }
          : {}),
      },
      include: {
        courts: {
          where: { active: true },
          include: {
            sport: { select: { slug: true, name: true } },
            availabilities: true,
            blocks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const freeAtDate = freeAt ? new Date(freeAt) : null;
    let mapped = venues.map((v) => this.toListDto(v));

    if (freeAtDate && !Number.isNaN(freeAtDate.getTime())) {
      const freeIds = new Set<string>();
      for (const v of venues) {
        for (const court of v.courts) {
          if (sportSlug && court.sport.slug !== sportSlug) continue;
          if (await this.isCourtFreeAt(court.id, court, freeAtDate)) {
            freeIds.add(v.id);
            break;
          }
        }
      }
      mapped = mapped.filter((v) => freeIds.has(v.id));
    }

    const originLat = lat ?? (radiusKm != null ? CITY.center.lat : undefined);
    const originLng = lng ?? (radiusKm != null ? CITY.center.lng : undefined);

    if (originLat != null && originLng != null) {
      mapped = mapped.map((v) => ({
        ...v,
        distanceKm:
          Math.round(distanceKm(originLat, originLng, v.lat, v.lng) * 100) /
          100,
      }));
      if (radiusKm != null && radiusKm > 0) {
        mapped = mapped.filter((v) => (v.distanceKm ?? 0) <= radiusKm);
      }
      mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return mapped;
  }

  /** Compact pins for map tab + offline cache. */
  async mapPins(query: Omit<VenueListQuery, 'includeHidden'> = {}) {
    const list = await this.findAll(query);
    return list.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      neighborhood: v.neighborhood,
      minPriceCents: v.minPriceCents,
      sports: v.sports,
      distanceKm: v.distanceKm,
    }));
  }

  async findBySlug(slug: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, active: true },
      include: {
        courts: {
          where: { active: true },
          include: {
            sport: { select: { slug: true, name: true } },
            availabilities: { orderBy: { weekday: 'asc' } },
            blocks: { orderBy: { startsAt: 'asc' }, take: 20 },
          },
        },
      },
    });
    if (!venue) {
      throw new NotFoundException(`Local não encontrado: ${slug}`);
    }
    return {
      ...this.toListDto(venue),
      mapVisible: venue.mapVisible,
      courts: venue.courts.map((c) => ({
        id: c.id,
        name: c.name,
        sportSlug: c.sport.slug,
        sportName: c.sport.name,
        priceCents: c.priceCents,
        // Alias for Phase 1b mobile screens; also keep availabilities for partner-web.
        weeklyAvailability: c.availabilities.map((w) => ({
          dayOfWeek: w.weekday,
          startMin: w.startMinute,
          endMin: w.endMinute,
        })),
        availabilities: c.availabilities.map((w) => ({
          weekday: w.weekday,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
          priceCents: w.priceCents,
        })),
        blocks: c.blocks.map((b) => ({
          id: b.id,
          startsAt: b.startsAt.toISOString(),
          endsAt: b.endsAt.toISOString(),
          reason: b.reason,
        })),
      })),
    };
  }

  private toListDto(v: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    address: string;
    neighborhood: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
    photoUrls: string[];
    mapVisible?: boolean;
    courts: {
      id: string;
      name: string;
      priceCents: number;
      sport: { slug: string; name: string };
    }[];
  }) {
    const prices = v.courts.map((c) => c.priceCents);
    const minPriceCents = prices.length ? Math.min(...prices) : 0;
    return {
      id: v.id,
      slug: v.slug,
      name: v.name,
      description: v.description,
      address: v.address,
      neighborhood: v.neighborhood,
      city: v.city,
      state: v.state,
      lat: v.lat,
      lng: v.lng,
      photoUrls: v.photoUrls,
      mapVisible: v.mapVisible ?? true,
      minPriceCents,
      sports: [...new Set(v.courts.map((c) => c.sport.slug))],
      courts: v.courts.map((c) => ({
        id: c.id,
        name: c.name,
        sportSlug: c.sport.slug,
        sportName: c.sport.name,
        priceCents: c.priceCents,
      })),
      distanceKm: undefined as number | undefined,
    };
  }

  private async isCourtFreeAt(
    courtId: string,
    court: {
      availabilities: {
        weekday: number;
        startMinute: number;
        endMinute: number;
      }[];
      blocks: { startsAt: Date; endsAt: Date }[];
    },
    at: Date,
    slotMinutes = 60,
  ): Promise<boolean> {
    const ends = new Date(at.getTime() + slotMinutes * 60_000);
    const day = at.getDay();
    const mins = at.getHours() * 60 + at.getMinutes();

    if (court.availabilities.length > 0) {
      const window = court.availabilities.find((w) => w.weekday === day);
      if (!window) return false;
      if (mins < window.startMinute || mins + slotMinutes > window.endMinute) {
        return false;
      }
    }

    const blocked = court.blocks.some(
      (b) => b.startsAt < ends && b.endsAt > at,
    );
    if (blocked) return false;

    const overlap = await this.prisma.booking.findFirst({
      where: {
        courtId,
        status: { in: ACTIVE_SLOT_STATUSES },
        startsAt: { lt: ends },
        endsAt: { gt: at },
      },
      select: { id: true },
    });
    return !overlap;
  }
}
