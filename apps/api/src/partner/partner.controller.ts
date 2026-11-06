import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { MapFeeService } from '../billing/map-fee.service';
import { PartnerService } from './partner.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateCourtDto } from './dto/create-court.dto';
import { SetAvailabilityDto } from './dto/availability.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { AddPhotoDto } from './dto/add-photo.dto';

@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.PARTNER)
export class PartnerController {
  constructor(
    private readonly partner: PartnerService,
    private readonly mapFeeService: MapFeeService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: RequestUser) {
    return this.partner.dashboard(user.userId);
  }

  @Get('venues')
  listVenues(@CurrentUser() user: RequestUser) {
    return this.partner.listMyVenues(user.userId);
  }

  @Post('venues')
  createVenue(@CurrentUser() user: RequestUser, @Body() dto: CreateVenueDto) {
    return this.partner.createVenue(user.userId, dto);
  }

  @Get('venues/:venueId')
  getVenue(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
  ) {
    return this.partner.getOne(user.userId, venueId);
  }

  @Patch('venues/:venueId')
  updateVenue(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.partner.updateVenue(user.userId, venueId, dto);
  }

  @Post('venues/:venueId/photos')
  addPhoto(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.partner.addPhoto(user.userId, venueId, dto.url);
  }

  @Post('venues/:venueId/courts')
  createCourt(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.partner.createCourt(user.userId, venueId, dto);
  }

  @Patch('courts/:courtId')
  updateCourt(
    @CurrentUser() user: RequestUser,
    @Param('courtId') courtId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.partner.updateCourt(user.userId, courtId, dto);
  }

  @Post('courts/:courtId/availability')
  setAvailability(
    @CurrentUser() user: RequestUser,
    @Param('courtId') courtId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.partner.setAvailability(user.userId, courtId, dto);
  }

  /** Phase 1b mobile uses PUT with dayOfWeek/startMin aliases. */
  @Put('courts/:courtId/availability')
  setAvailabilityPut(
    @CurrentUser() user: RequestUser,
    @Param('courtId') courtId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.partner.setAvailability(user.userId, courtId, dto);
  }

  @Post('courts/:courtId/blocks')
  createBlock(
    @CurrentUser() user: RequestUser,
    @Param('courtId') courtId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.partner.createBlock(user.userId, courtId, dto);
  }

  @Delete('blocks/:blockId')
  deleteBlock(
    @CurrentUser() user: RequestUser,
    @Param('blockId') blockId: string,
  ) {
    return this.partner.deleteBlock(user.userId, blockId);
  }

  @Get('venues/:venueId/map-fees')
  listMapFees(
    @CurrentUser() user: RequestUser,
    @Param('venueId') venueId: string,
  ) {
    return this.partner.listMapFees(user.userId, venueId);
  }

  @Post('map-fees/:id/pay-stub')
  payMapFee(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mapFeeService.markPaid(user.userId, id);
  }
}
