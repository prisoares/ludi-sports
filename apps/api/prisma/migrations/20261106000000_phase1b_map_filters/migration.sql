-- Phase 1b map filters delta on top of partner-retention (CourtAvailability/CourtBlock already exist).

CREATE TYPE "MapFeeStatus" AS ENUM ('pending', 'paid', 'overdue', 'stub');

ALTER TABLE "Venue" ADD COLUMN "mapVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "MapFeeInvoice" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "gmvCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "status" "MapFeeStatus" NOT NULL DEFAULT 'pending',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "asaasChargeId" TEXT,
    "pixCopyPaste" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapFeeInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MapFeeInvoice_status_dueAt_idx" ON "MapFeeInvoice"("status", "dueAt");
CREATE UNIQUE INDEX "MapFeeInvoice_venueId_year_month_key" ON "MapFeeInvoice"("venueId", "year", "month");
CREATE INDEX "Venue_mapVisible_active_idx" ON "Venue"("mapVisible", "active");

ALTER TABLE "MapFeeInvoice" ADD CONSTRAINT "MapFeeInvoice_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
