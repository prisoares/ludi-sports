export type AccountKind = 'user' | 'partner';

export type RootStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  RegisterForm: { role: 'USER' | 'PARTNER' };
  Login: undefined;
  MainTabs: undefined;
  VenueDetail: { slug: string };
  PartnerInbox: undefined;
  PartnerVenues: undefined;
  PartnerVenueDetail: { venueId: string };
};

export type MainTabParamList = {
  Inicio: undefined;
  Mapa: undefined;
  Esportes: undefined;
  Historico: undefined;
  Perfil: undefined;
};

export const STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitada',
  hold_15m: 'Aguardando parceiro',
  accepted: 'Aceita',
  payment_pending: 'Pagamento pendente',
  confirmed: 'Confirmada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
  no_show: 'No-show',
};
