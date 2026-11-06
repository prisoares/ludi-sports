const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body &&
      'message' in body &&
      (body as { message: string | string[] }).message
        ? Array.isArray((body as { message: string[] }).message)
          ? (body as { message: string[] }).message.join(', ')
          : String((body as { message: string }).message)
        : res.statusText;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone: string | null;
  roles: string[];
  activeRole: 'USER' | 'PARTNER';
};

export type AuthResponse = { accessToken: string; user: AuthUser };

export type Sport = {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
};

export type VenueFilters = {
  sport?: string;
  freeAt?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export type Venue = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  photoUrls: string[];
  minPriceCents: number;
  sports: string[];
  distanceKm?: number;
  mapVisible?: boolean;
  courts: {
    id: string;
    name: string;
    sportSlug: string;
    sportName: string;
    priceCents: number;
  }[];
};

export type MapPin = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  neighborhood: string;
  minPriceCents: number;
  sports: string[];
  distanceKm?: number;
};

export type Booking = {
  id: string;
  status: string;
  venueName: string;
  venueSlug?: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  holdExpiresAt?: string | null;
  paymentDueAt?: string | null;
  priceCents: number;
  commissionCents: number;
  payment?: {
    status: string;
    pixCopyPaste?: string | null;
    amountCents: number;
  } | null;
  user?: { id: string; name: string };
};

export type PartnerVenue = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  photoUrls: string[];
  active: boolean;
  mapVisible: boolean;
  courts: {
    id: string;
    name: string;
    sportSlug: string;
    sportName: string;
    priceCents: number;
    active: boolean;
    weeklyAvailability: { dayOfWeek: number; startMin: number; endMin: number }[];
    blocks: {
      id: string;
      startsAt: string;
      endsAt: string;
      reason: string | null;
    }[];
  }[];
  mapFees: {
    id: string;
    year: number;
    month: number;
    gmvCents: number;
    feeCents: number;
    status: string;
    dueAt: string;
    paidAt: string | null;
    pixCopyPaste: string | null;
  }[];
};

export const api = {
  register: (body: {
    name: string;
    email: string;
    cpf: string;
    password: string;
    phone?: string;
    role: 'USER' | 'PARTNER';
  }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (cpf: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ cpf, password }),
    }),

  me: (token: string) => request<AuthUser>('/auth/me', { token }),

  switchRole: (token: string, role: 'USER' | 'PARTNER') =>
    request<AuthResponse>('/auth/switch-role', {
      method: 'POST',
      token,
      body: JSON.stringify({ role }),
    }),

  sports: () => request<Sport[]>('/sports'),

  venues: (filters: VenueFilters | string = {}) => {
    const f: VenueFilters =
      typeof filters === 'string' ? { sport: filters } : filters;
    return request<Venue[]>(`/venues${qs(f)}`);
  },

  mapPins: (filters: VenueFilters = {}) =>
    request<MapPin[]>(`/venues/map/pins${qs(filters)}`),

  venue: (slug: string) => request<Venue>(`/venues/${slug}`),

  createBooking: (
    token: string,
    body: { courtId: string; startsAt: string; endsAt: string },
  ) =>
    request<Booking>('/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  myBookings: (token: string) =>
    request<Booking[]>('/bookings/mine', { token }),

  partnerInbox: (token: string) =>
    request<Booking[]>('/bookings/partner/inbox', { token }),

  acceptBooking: (token: string, id: string) =>
    request<Booking>(`/bookings/${id}/accept`, { method: 'POST', token }),

  rejectBooking: (token: string, id: string) =>
    request<Booking>(`/bookings/${id}/reject`, { method: 'POST', token }),

  createPix: (token: string, id: string) =>
    request<{
      bookingId: string;
      amountCents: number;
      pixCopyPaste: string | null;
      status: string;
    }>(`/bookings/${id}/pix`, { method: 'POST', token }),

  payStub: (token: string, id: string) =>
    request<Booking>(`/bookings/${id}/pay-stub`, { method: 'POST', token }),

  partnerVenues: (token: string) =>
    request<PartnerVenue[]>('/partner/venues', { token }),

  partnerVenue: (token: string, id: string) =>
    request<PartnerVenue>(`/partner/venues/${id}`, { token }),

  createVenue: (
    token: string,
    body: {
      name: string;
      description?: string;
      address: string;
      neighborhood: string;
      lat: number;
      lng: number;
      photoUrls?: string[];
    },
  ) =>
    request<PartnerVenue>('/partner/venues', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  updateVenue: (
    token: string,
    id: string,
    body: Partial<{
      name: string;
      description: string;
      address: string;
      neighborhood: string;
      lat: number;
      lng: number;
      photoUrls: string[];
    }>,
  ) =>
    request<PartnerVenue>(`/partner/venues/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),

  addVenuePhoto: (token: string, id: string, url: string) =>
    request<PartnerVenue>(`/partner/venues/${id}/photos`, {
      method: 'POST',
      token,
      body: JSON.stringify({ url }),
    }),

  createCourt: (
    token: string,
    venueId: string,
    body: { name: string; sportSlug: string; priceCents: number },
  ) =>
    request(`/partner/venues/${venueId}/courts`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  updateCourt: (
    token: string,
    courtId: string,
    body: { name?: string; priceCents?: number; active?: boolean },
  ) =>
    request(`/partner/courts/${courtId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),

  setAvailability: (
    token: string,
    courtId: string,
    slots: { dayOfWeek: number; startMin: number; endMin: number }[],
  ) =>
    request(`/partner/courts/${courtId}/availability`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ slots }),
    }),

  createBlock: (
    token: string,
    courtId: string,
    body: { startsAt: string; endsAt: string; reason?: string },
  ) =>
    request(`/partner/courts/${courtId}/blocks`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  payMapFeeStub: (token: string, invoiceId: string) =>
    request(`/partner/map-fees/${invoiceId}/pay-stub`, {
      method: 'POST',
      token,
    }),

  runMapFeeJob: (token: string) =>
    request<{ year: number; month: number; created: number }>(
      '/billing/map-fees/run',
      { method: 'POST', token },
    ),
};

export { API_URL };
