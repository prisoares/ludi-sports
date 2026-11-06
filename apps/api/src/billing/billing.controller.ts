import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { MapFeeService } from './map-fee.service';

class YearMonthDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  yearMonth!: string;
}

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly mapFees: MapFeeService,
  ) {}

  /** Partner-web monthly invoices (kept from main). */
  @Get('partner/billing/venues/:venueId/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.PARTNER)
  @ApiBearerAuth()
  list(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
  ) {
    return this.billing.listInvoices(user.userId, venueId);
  }

  @Post('partner/billing/venues/:venueId/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.PARTNER)
  @ApiBearerAuth()
  create(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
    @Body() dto: YearMonthDto,
  ) {
    return this.billing.createOrRefreshInvoice(
      user.userId,
      venueId,
      dto.yearMonth,
    );
  }

  /** Phase 1b map-fee cron (manual trigger). */
  @Post('billing/map-fees/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Gera faturas 1% GMV do mês anterior (job manual; também cron dia 1)',
  })
  runMapFees() {
    return this.mapFees.generateForPriorMonth();
  }

  @Post('billing/map-fees/enforce-overdue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marca faturas vencidas e remove locais do mapa',
  })
  enforceMapFees() {
    return this.mapFees.enforceOverdue();
  }
}
