### Hey, how's it going? 👋

Software Developer & Senior QA at Ambush · Java / Spring Boot · sports & travel.

Reach me on [LinkedIn](https://linkedin.com/in/priscilla-ferreira-soares) or [about.me](https://about.me/priscillasoares).

---

# LUDI

Marketplace **two-sided** de reserva de quadras esportivas — MVP em **Porto Alegre (pt-BR)**.

Monorepo Turborepo:

| App / package | Stack |
|---------------|--------|
| `apps/mobile` | Expo (React Native) + TypeScript |
| `apps/api` | NestJS + Prisma + PostgreSQL |
| `apps/partner-web` | Next.js App Router — painel do parceiro |
| `packages/shared` | Tipos e constantes de domínio compartilhados |

## Decisões de MVP (resumo)

- Conta dual usuário/parceiro (mesmo app Expo)
- CPF validado (algoritmo + bureau stub); JWT
- Hold de **15 min** aguardando parceiro
- Pagamento **Pix only** (Asaas real se `ASAAS_API_KEY`; senão stub + webhook stub)
- Comissão **5%** + taxa mensal de mapa **1% do GMV**
- Cancelamento ≥24h = 100% refund; &lt;24h = multa 45% / 55% refund; no-show = 0

State machine: `requested → hold_15m → accepted → payment_pending → confirmed | expired | cancelled | no_show`

## Pré-requisitos

- Node.js ≥ 20
- PostgreSQL 16 (+ Redis opcional — sem Redis usa Postgres advisory lock)
- Docker Compose **ou** Postgres local
- npm 10+

## Subir infra local

```bash
cp .env.example .env
cp .env.example apps/api/.env

# Opção A — Docker
docker compose up -d

# Opção B — Postgres local
# createuser ludi with password ludi; create database ludi owner ludi;
```

## Instalar e migrar

```bash
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Seed cria esportes (âncora: **futebol society**), venues em POA (Planetball, Arena Moinhos, Quadra Jardim Botânico) e usuários demo:

| Conta | E-mail | Senha | CPF |
|-------|--------|-------|-----|
| Parceiro | parceiro@planetball.com.br | ludi123 | 52998224725 |
| Jogador | jogador@ludi.app | ludi123 | 39053344705 |

## Rodar API

```bash
npm run dev -w @ludi/api
# http://localhost:3000/health
# http://localhost:3000/docs  (Swagger)
```

## Happy path — booking (curl)

Com a API no ar e o seed aplicado:

```bash
API=http://localhost:3000

# 1) Login jogador + parceiro
PLAYER=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"cpf":"39053344705","password":"ludi123"}')
PARTNER=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"cpf":"52998224725","password":"ludi123"}')
PT=$(echo "$PLAYER" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken')
KT=$(echo "$PARTNER" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken')

# 2) Pegar uma quadra
COURT=$(curl -s $API/venues/planetball | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).courts[0].id')
START=$(node -pe 'const d=new Date();d.setDate(d.getDate()+3);d.setHours(19,0,0,0);d.toISOString()')
END=$(node -pe 'const d=new Date();d.setDate(d.getDate()+3);d.setHours(20,0,0,0);d.toISOString()')

# 3) Solicitar → hold_15m
BOOKING=$(curl -s -X POST $API/bookings -H "Authorization: Bearer $PT" \
  -H 'Content-Type: application/json' \
  -d "{\"courtId\":\"$COURT\",\"startsAt\":\"$START\",\"endsAt\":\"$END\"}")
ID=$(echo "$BOOKING" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).id')

# 4) Parceiro aceita → payment_pending + Pix stub (comissão 5%)
curl -s -X POST $API/bookings/$ID/accept -H "Authorization: Bearer $KT"

# 5) Jogador gera Pix e simula pagamento
curl -s -X POST $API/bookings/$ID/pix -H "Authorization: Bearer $PT"
curl -s -X POST $API/bookings/$ID/pay-stub -H "Authorization: Bearer $PT"
# status final: confirmed / paid
```

Alternativa ao `pay-stub`: `POST /payments/stub/paid` com `{ "bookingId": "..." }` ou webhook `POST /payments/asaas/webhook`.

Job de expiração: a cada minuto libera holds vencidos (`hold_15m` + `holdExpiresAt`) e pagamentos após `paymentDueAt`.

## Rodar app mobile

```bash
npm run dev -w @ludi/mobile
npm run dev -w @ludi/partner-web   # http://localhost:3001
```

Telas Fase 1b: login/cadastro CPF → JWT, **Início** (próximas + pagamento pendente + atalhos), esportes com filtros (horário livre / distância), detalhe → reserva, histórico + Pix stub, **mapa com pins** (`react-native-maps` + cache AsyncStorage), perfil com troca de papel, inbox parceiro, **CRUD de locais** no app; partner-web permanece no painel Next.js.

Defina `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`; no device use o IP da máquina).

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Integrações Asaas / 360dialog / Google Maps / bureau CPF ficam em **stub** quando as keys estão vazias. Locks de slot: Redis se `REDIS_URL` conecta; senão Postgres `pg_advisory_lock`.

## Docs de produto

- [Product brief (Figma)](docs/figma-product-brief.md)

## Próximas fatias (ainda Fase 1 / 2)

- Chat in-app, WhatsApp live, partner CRUD de quadras/agenda, Google Maps nativo, taxa mensal 1% GMV cobrada

## Happy path — mapa, filtros, CRUD parceiro, taxa 1% GMV

```bash
API=http://localhost:3000

PARTNER=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"cpf":"52998224725","password":"ludi123"}')
KT=$(echo "$PARTNER" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).accessToken')

# Pins do mapa (cacheados no app via AsyncStorage)
curl -s "$API/venues/map/pins?lat=-30.03&lng=-51.22&radiusKm=10" | head -c 400; echo

# Filtros: esporte + horário livre + distância
FREE=$(node -pe 'const d=new Date();d.setDate(d.getDate()+1);d.setHours(19,0,0,0);d.toISOString()')
curl -s "$API/venues?sport=futebol-society&freeAt=$FREE&lat=-30.03&lng=-51.22&radiusKm=15" | head -c 400; echo

# CRUD parceiro — criar local + quadra
VENUE=$(curl -s -X POST $API/partner/venues -H "Authorization: Bearer $KT" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Arena Teste","address":"Rua X, 1","neighborhood":"Centro","lat":-30.03,"lng":-51.22,"photoUrls":["https://example.com/a.jpg"]}')
VID=$(echo "$VENUE" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).id')
curl -s -X POST $API/partner/venues/$VID/courts -H "Authorization: Bearer $KT" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Fut 5","sportSlug":"futebol-society","priceCents":15000}'

# Job taxa mensal 1% GMV (mês anterior) + enforce overdue
curl -s -X POST $API/billing/map-fees/run -H "Authorization: Bearer $KT"
curl -s -X POST $API/billing/map-fees/enforce-overdue -H "Authorization: Bearer $KT"
# Pagar fatura stub: POST /partner/map-fees/:id/pay-stub
```

Notificações (e-mail + WhatsApp 360dialog) em stub nos eventos: parceiro aceitou, pagamento pendente, confirmada, cancelada — veja logs `[email:stub]` / `[whatsapp:stub]`.

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Integrações Asaas / 360dialog / e-mail / Google Maps / bureau CPF ficam em **stub** quando as keys estão vazias. Locks de slot: Redis se `REDIS_URL` conecta; senão Postgres `pg_advisory_lock`.

## Docs de produto

- [Product brief (Figma)](docs/figma-product-brief.md)

## Próximas fatias (ainda Fase 1 / 2)

- Chat in-app, WhatsApp/e-mail live keys, Google Maps API key nativa, conciliação financeira

