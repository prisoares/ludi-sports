import { PrismaClient, AccountRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function main() {
  console.log('Seeding LUDI (Porto Alegre)...');

  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.court.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.sport.deleteMany();
  await prisma.user.deleteMany();

  const sports = await Promise.all(
    [
      { slug: 'futebol-society', name: 'Futebol society', iconKey: 'soccer', sortOrder: 1 },
      { slug: 'futevolei', name: 'Futevôlei', iconKey: 'futevolei', sortOrder: 2 },
      { slug: 'beach-tennis', name: 'Beach Tennis', iconKey: 'beach-tennis', sortOrder: 3 },
      { slug: 'futsal', name: 'Futsal', iconKey: 'futsal', sortOrder: 4 },
      { slug: 'volei', name: 'Vôlei', iconKey: 'volleyball', sortOrder: 5 },
      { slug: 'basquete', name: 'Basquete', iconKey: 'basketball', sortOrder: 6 },
    ].map((s) => prisma.sport.create({ data: s })),
  );

  const society = sports.find((s) => s.slug === 'futebol-society')!;
  const futevolei = sports.find((s) => s.slug === 'futevolei')!;
  const beach = sports.find((s) => s.slug === 'beach-tennis')!;

  const partnerHash = await hashPassword('ludi123');
  const playerHash = await hashPassword('ludi123');

  const partner = await prisma.user.create({
    data: {
      email: 'parceiro@planetball.com.br',
      name: 'Parceiro Planetball',
      cpf: '52998224725',
      phone: '51999990001',
      passwordHash: partnerHash,
      roles: [AccountRole.USER, AccountRole.PARTNER],
      activeRole: AccountRole.PARTNER,
    },
  });

  const player = await prisma.user.create({
    data: {
      email: 'jogador@ludi.app',
      name: 'Jogador Demo',
      cpf: '39053344705',
      phone: '51999990002',
      passwordHash: playerHash,
      roles: [AccountRole.USER],
      activeRole: AccountRole.USER,
    },
  });

  const planetball = await prisma.venue.create({
    data: {
      slug: 'planetball',
      name: 'Planetball',
      description:
        'Complexo esportivo em Porto Alegre com quadras de futebol society e areia.',
      address: 'Av. Ipiranga, 6681 — Partenon',
      neighborhood: 'Partenon',
      city: 'Porto Alegre',
      state: 'RS',
      lat: -30.0585,
      lng: -51.1736,
      photoUrls: [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
      ],
      ownerId: partner.id,
      courts: {
        create: [
          {
            name: 'Fut 5 A',
            sportId: society.id,
            priceCents: 18000,
          },
          {
            name: 'Fut 5 B',
            sportId: society.id,
            priceCents: 18000,
          },
          {
            name: 'Areia 1',
            sportId: futevolei.id,
            priceCents: 12000,
          },
        ],
      },
    },
    include: { courts: true },
  });

  const arenaMoinhos = await prisma.venue.create({
    data: {
      slug: 'arena-moinhos',
      name: 'Arena Moinhos',
      description: 'Quadras society próximas a Moinhos de Vento.',
      address: 'Rua Padre Chagas, 200 — Moinhos de Vento',
      neighborhood: 'Moinhos de Vento',
      city: 'Porto Alegre',
      state: 'RS',
      lat: -30.0277,
      lng: -51.2029,
      photoUrls: [
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
      ],
      ownerId: partner.id,
      courts: {
        create: [
          {
            name: 'Society Principal',
            sportId: society.id,
            priceCents: 22000,
          },
          {
            name: 'Beach 1',
            sportId: beach.id,
            priceCents: 14000,
          },
        ],
      },
    },
  });

  const quadraBotanico = await prisma.venue.create({
    data: {
      slug: 'quadra-jardim-botanico',
      name: 'Quadra Jardim Botânico',
      description: 'Campo society perto do Jardim Botânico / PUCRS.',
      address: 'Av. Protásio Alves, 2100 — Petrópolis',
      neighborhood: 'Petrópolis',
      city: 'Porto Alegre',
      state: 'RS',
      lat: -30.0482,
      lng: -51.1789,
      photoUrls: [
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
      ],
      ownerId: partner.id,
      courts: {
        create: [
          {
            name: 'Society',
            sportId: society.id,
            priceCents: 15000,
          },
        ],
      },
    },
  });

  console.log('Seed OK:', {
    sports: sports.length,
    venues: [planetball.name, arenaMoinhos.name, quadraBotanico.name],
    users: [partner.email, player.email],
  });

  // Default weekly availability Mon–Sun 08:00–22:00 for all courts (map freeAt filters)
  const allCourts = await prisma.court.findMany();
  for (const court of allCourts) {
    await prisma.courtAvailability.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        courtId: court.id,
        weekday,
        startMinute: 8 * 60,
        endMinute: 22 * 60,
      })),
    });
  }
  console.log('Weekly availability seeded for', allCourts.length, 'courts');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
