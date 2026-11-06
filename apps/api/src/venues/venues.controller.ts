import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VenuesService } from './venues.service';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista locais em Porto Alegre (filtros: esporte, horário livre, distância)',
  })
  @ApiQuery({ name: 'sport', required: false })
  @ApiQuery({ name: 'freeAt', required: false, description: 'ISO datetime' })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  findAll(
    @Query('sport') sport?: string,
    @Query('freeAt') freeAt?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.venuesService.findAll({
      sport,
      freeAt,
      lat: lat != null && lat !== '' ? Number(lat) : undefined,
      lng: lng != null && lng !== '' ? Number(lng) : undefined,
      radiusKm:
        radiusKm != null && radiusKm !== '' ? Number(radiusKm) : undefined,
    });
  }

  @Get('map/pins')
  @ApiOperation({ summary: 'Pins do mapa (cache offline no app)' })
  @ApiQuery({ name: 'sport', required: false })
  @ApiQuery({ name: 'freeAt', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  mapPins(
    @Query('sport') sport?: string,
    @Query('freeAt') freeAt?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.venuesService.mapPins({
      sport,
      freeAt,
      lat: lat != null && lat !== '' ? Number(lat) : undefined,
      lng: lng != null && lng !== '' ? Number(lng) : undefined,
      radiusKm:
        radiusKm != null && radiusKm !== '' ? Number(radiusKm) : undefined,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalhe do local por slug' })
  findOne(@Param('slug') slug: string) {
    return this.venuesService.findBySlug(slug);
  }
}
