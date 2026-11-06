import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MapFeeStatus, PaymentStatus, BookingStatus } from '@prisma/client';
import { MONTHLY_MAP_FEE_GMV_RATE } from '@ludi/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsProvider } from '../payments/payments.provider';
import { priorMonthWindow } from './map-fee.util';

@Injectable()
export class MapFeeService {
  private readonly logger = new Logger(MapFeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsProvider,
  ) {}

  /**
   * Compute prior calendar month paid booking GMV per venue × 1%,
   * create Asaas Pix stub charge for the partner.
   */
  async generateForPriorMonth(ref = new Date()) {
    const { year, month, periodStart, periodEnd, dueAt } =
      priorMonthWindow(ref);

    const venues = await this.prisma.venue.findMany({
      where: { ownerId: { not: null } },
      include: { owner: true },
    });

    const created: string[] = [];

    for (const venue of venues) {
      const existing = await this.prisma.mapFeeInvoice.findUnique({
        where: {
          venueId_year_month: { venueId: venue.id, year, month },
        },
      });
      if (existing) continue;

      const paid = await this.prisma.booking.findMany({
        where: {
          venueId: venue.id,
          status: BookingStatus.confirmed,
          payment: { status: PaymentStatus.paid, paidAt: { gte: periodStart, lt: periodEnd } },
        },
        select: { priceCents: true },
      });
      const gmvCents = paid.reduce((s, b) => s + b.priceCents, 0);
      const feeCents = Math.round(gmvCents * MONTHLY_MAP_FEE_GMV_RATE);

      // Always create an invoice row (even R$0) so ops can track months.
      const charge =
        feeCents > 0
          ? await this.payments.createPixCharge({
              bookingId: `mapfee_${venue.id}_${year}_${month}`,
              amountCents: feeCents,
              customerCpf: venue.owner?.cpf ?? '00000000000',
              customerName: venue.owner?.name ?? venue.name,
              description: `LUDI taxa mapa 1% GMV ${month}/${year} — ${venue.name}`,
            })
          : null;

      const status: MapFeeStatus =
        feeCents === 0
          ? MapFeeStatus.paid
          : charge?.status === 'stub'
            ? MapFeeStatus.stub
            : MapFeeStatus.pending;

      const invoice = await this.prisma.mapFeeInvoice.create({
        data: {
          venueId: venue.id,
          year,
          month,
          gmvCents,
          feeCents,
          status,
          dueAt,
          paidAt: feeCents === 0 ? new Date() : null,
          asaasChargeId: charge?.chargeId,
          pixCopyPaste: charge?.pixCopyPaste,
        },
      });
      created.push(invoice.id);
      this.logger.log(
        `Map fee ${venue.slug} ${month}/${year}: GMV=${gmvCents} fee=${feeCents}`,
      );
    }

    return { year, month, created: created.length, invoiceIds: created };
  }

  /** Mark unpaid past-due invoices overdue and hide venues from map. */
  async enforceOverdue(now = new Date()) {
    const overdue = await this.prisma.mapFeeInvoice.findMany({
      where: {
        status: { in: [MapFeeStatus.pending, MapFeeStatus.stub] },
        dueAt: { lt: now },
        feeCents: { gt: 0 },
        paidAt: null,
      },
    });

    let hidden = 0;
    for (const inv of overdue) {
      await this.prisma.mapFeeInvoice.update({
        where: { id: inv.id },
        data: { status: MapFeeStatus.overdue },
      });
      await this.prisma.venue.update({
        where: { id: inv.venueId },
        data: { mapVisible: false },
      });
      hidden += 1;
    }
    if (hidden) {
      this.logger.warn(`Map fee overdue: hid ${hidden} venue(s) from map`);
    }
    return { overdue: overdue.length, hidden };
  }

  async markPaid(userId: string, invoiceId: string) {
    const invoice = await this.prisma.mapFeeInvoice.findUnique({
      where: { id: invoiceId },
      include: { venue: true },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (invoice.venue.ownerId !== userId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.mapFeeInvoice.update({
      where: { id: invoiceId },
      data: {
        status: MapFeeStatus.paid,
        paidAt: new Date(),
      },
    });

    // Re-list if no other overdue invoices remain.
    const stillOverdue = await this.prisma.mapFeeInvoice.count({
      where: {
        venueId: invoice.venueId,
        status: MapFeeStatus.overdue,
        id: { not: invoiceId },
      },
    });
    if (stillOverdue === 0) {
      await this.prisma.venue.update({
        where: { id: invoice.venueId },
        data: { mapVisible: true },
      });
    }

    return {
      id: updated.id,
      status: updated.status,
      paidAt: updated.paidAt?.toISOString() ?? null,
      mapVisible: stillOverdue === 0,
    };
  }

  /** 1st of each month 03:00 — generate prior-month fees. */
  @Cron('0 3 1 * *')
  async cronGenerate() {
    await this.generateForPriorMonth();
  }

  /** Daily 04:00 — hide venues with unpaid past-due map fee. */
  @Cron('0 4 * * *')
  async cronEnforce() {
    await this.enforceOverdue();
  }
}
