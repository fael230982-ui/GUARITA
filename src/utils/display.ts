import { AuthSession, Delivery, PersonSearchResult, Unit, VisitForecast } from "../types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function displayUnit(unitName?: string | null, unitId?: string | null) {
  if (unitName) {
    return unitName;
  }

  if (!unitId) {
    return "Unidade não informada";
  }

  return UUID_PATTERN.test(unitId) ? "Unidade vinculada" : unitId;
}

export function displayDeliveryUnit(delivery: Delivery) {
  return displayUnit(delivery.recipientUnitName, delivery.recipientUnitId);
}

export function getVisitForecastCanonicalId(forecast: VisitForecast) {
  return forecast.visitForecastId ?? forecast.id;
}

export function getDeliveryPrimaryWithdrawalCode(delivery: Delivery) {
  return delivery.withdrawalCode ?? delivery.pickupCode;
}

export function getMaskedDeliveryWithdrawalCode(delivery: Delivery) {
  const code = getDeliveryPrimaryWithdrawalCode(delivery);
  if (!code) {
    return "";
  }

  return "*".repeat(Math.max(code.length, 6));
}

export function getDeliveryWithdrawalQrCodeUrl(delivery: Delivery) {
  return delivery.withdrawalQrCodeUrl ?? delivery.qrCodeUrl;
}

export function hasDeliveryWithdrawalData(delivery: Delivery) {
  return Boolean(getDeliveryPrimaryWithdrawalCode(delivery) || getDeliveryWithdrawalQrCodeUrl(delivery));
}

export function hasDeliveryLegacyWithdrawalCodeConflict(delivery: Delivery) {
  return Boolean(delivery.pickupCode && delivery.withdrawalCode && delivery.pickupCode !== delivery.withdrawalCode);
}

export function isDeliveryAwaitingWithdrawal(delivery: Delivery) {
  const status = String(delivery.status ?? "").toUpperCase();

  if (delivery.withdrawnAt) {
    return false;
  }

  return status !== "WITHDRAWN" && status !== "DELIVERED" && status !== "COMPLETED";
}

export function canShowDeliveryRenotify(delivery: Delivery, session?: AuthSession) {
  const config = session?.deliveryRenotification;
  if (config?.enabled === false) {
    return false;
  }

  if (delivery.syncPending || !isDeliveryAwaitingWithdrawal(delivery)) {
    return false;
  }

  const allowedStatuses = (config?.allowedStatuses ?? [])
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const currentStatus = String(delivery.status ?? "").trim().toUpperCase();
  if (allowedStatuses.length && currentStatus && !allowedStatuses.includes(currentStatus)) {
    return false;
  }

  const cooldownMinutes = config?.cooldownMinutes ?? null;
  if (cooldownMinutes && delivery.notificationSentAt) {
    const diffMs = Date.now() - new Date(delivery.notificationSentAt).getTime();
    if (diffMs < cooldownMinutes * 60 * 1000) {
      return false;
    }
  }

  return true;
}

export function displayPersonUnit(person: PersonSearchResult) {
  if (person.unitName) return person.unitName;
  if (person.unitNames?.length) return person.unitNames.join(", ");
  if (person.unit) return displayUnitName(person.unit);
  return displayUnit(undefined, person.unitId ?? person.unitIds?.[0]);
}

export function displayUnitName(unit: Unit) {
  const main = unit.nome || unit.name;
  const parts = [unit.blocoNome, unit.quadraNome, unit.ruaNome, unit.loteNome].filter(Boolean);
  return parts.length ? `${main} - ${parts.join(" / ")}` : main;
}

export function searchableUnitText(unit: Unit) {
  return [
    unit.id,
    unit.nome,
    unit.name,
    unit.address,
    unit.condominioNome,
    unit.ruaNome,
    unit.blocoNome,
    unit.quadraNome,
    unit.loteNome
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function sortUnitsByQuery(units: Unit[], query: string) {
  const text = normalizeSearchText(query);
  if (!text) {
    return [...units].sort((left, right) => displayUnitName(left).localeCompare(displayUnitName(right), "pt-BR"));
  }

  return [...units].sort((left, right) => {
    const leftScore = unitMatchScore(left, text);
    const rightScore = unitMatchScore(right, text);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return displayUnitName(left).localeCompare(displayUnitName(right), "pt-BR");
  });
}

export function personCategoryText(person: PersonSearchResult) {
  const category = person.categoryLabel ?? person.type ?? person.category;
  const labels: Record<string, string> = {
    RESIDENT: "Morador",
    VISITOR: "Visitante",
    SERVICE_PROVIDER: "Prestador",
    DELIVERER: "Entregador",
    RENTER: "Locatário",
    MORADOR: "Morador",
    VISITANTE: "Visitante",
    PRESTADOR: "Prestador",
    LOCATARIO: "Locatário"
  };

  return category ? labels[category] ?? category : "Pessoa";
}

export function documentTypeText(value?: string | null) {
  const labels: Record<string, string> = {
    CPF: "CPF",
    RG: "RG",
    CNH: "CNH",
    PASSPORT: "Passaporte"
  };

  return value ? labels[value] ?? value : "";
}

export function sortPeopleByQuery(people: PersonSearchResult[], query: string) {
  const text = normalizeSearchText(query);
  if (!text) {
    return [...people].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  return [...people].sort((left, right) => {
    const leftScore = personMatchScore(left, text);
    const rightScore = personMatchScore(right, text);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}

export function statusText(status?: string | null) {
  const labels: Record<string, string> = {
    RECEIVED: "Recebida",
    NOTIFIED: "Morador avisado",
    READY_FOR_WITHDRAWAL: "Pronta para retirada",
    WITHDRAWN: "Retirada",
    SCHEDULED: "Prevista",
    PENDING_ARRIVAL: "Prevista",
    ARRIVED: "Chegou",
    COMPLETED: "Concluído",
    EXPIRED: "Encerrado",
    CANCELLED: "Cancelado",
    NO_SHOW: "Não veio",
    ALLOWED: "Liberado",
    DENIED: "Negado",
    OPEN: "Aberto",
    NEW: "Novo",
    UNDER_REVIEW: "Em análise",
    ON_HOLD: "Em espera",
    RESOLVED: "Resolvido"
  };

  return status ? labels[status] ?? status : "";
}

export function withdrawalMethodText(method?: string | null) {
  const labels: Record<string, string> = {
    CODE: "Código",
    QR_CODE: "QR code",
    MANUAL: "Confirmação manual",
    FACIAL: "Reconhecimento facial"
  };

  return method ? labels[method] ?? method : "";
}

export function alertTypeText(value?: string | null) {
  const labels: Record<string, string> = {
    ACCESS_DENIED: "Acesso negado",
    ACCESS_EVENT: "Evento de acesso",
    UNKNOWN_PERSON: "Pessoa desconhecida",
    CAMERA_OFFLINE: "Câmera offline",
    PANIC: "Pânico"
  };

  return value ? labels[value] ?? value : "";
}

export function alertSeverityText(value?: string | null) {
  const labels: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    CRITICAL: "Crítica"
  };

  return value ? labels[value] ?? value : "";
}

export function personValidityText(person: PersonSearchResult) {
  if (person.endDate && isPastDate(person.endDate)) {
    return `Cadastro encerrado em ${formatShortDate(person.endDate)}`;
  }

  if (person.startDate && isFutureDate(person.startDate)) {
    return `Válido a partir de ${formatShortDate(person.startDate)}`;
  }

  if (person.endDate) {
    return `Válido até ${formatShortDate(person.endDate)}`;
  }

  return "";
}

export function personAttentionText(person: PersonSearchResult) {
  const status = (person.status ?? "").toUpperCase();
  const labels: Record<string, string> = {
    INACTIVE: "Cadastro inativo. Confira antes de seguir.",
    BLOCKED: "Cadastro bloqueado. Validar com a administração.",
    PENDING: "Cadastro pendente de liberação.",
    DENIED: "Cadastro com restrição de acesso."
  };

  if (labels[status]) {
    return labels[status];
  }

  if (person.endDate && isPastDate(person.endDate)) {
    return "Cadastro vencido. Confira a autorização antes de prosseguir.";
  }

  if (person.startDate && isFutureDate(person.startDate)) {
    return "Cadastro ainda não entrou em vigência.";
  }

  return "";
}

export function personFaceStatusText(person: PersonSearchResult) {
  const faceStatus = String(person.faceStatus ?? "").toUpperCase();

  const labels: Record<string, string> = {
    NOT_REGISTERED: "Sem credencial facial cadastrada",
    PENDING_PROCESSING: "Cadastro facial em processamento",
    READY: "Credencial facial já cadastrada",
    FAILED: "Falha no cadastro facial",
    BLOCKED: "Cadastro facial bloqueado",
    NO_PHOTO: "Pessoa sem foto cadastrada",
    PHOTO_ONLY: "Foto cadastrada sem credencial facial sincronizada",
    FACE_PENDING_SYNC: "Cadastro facial aguardando sincronização",
    FACE_SYNCED: "Credencial facial sincronizada",
    FACE_ERROR: "Falha na sincronização facial"
  };

  if (labels[faceStatus]) {
    return labels[faceStatus];
  }

  if (person.hasFacialCredential) {
    return "Credencial facial já cadastrada";
  }

  if (person.faceListId || person.faceListItemId) {
    return "Cadastro facial em integração";
  }

  return "Sem credencial facial cadastrada";
}

export function personFaceStatusTechnicalText(person: PersonSearchResult) {
  return person.faceStatus ? person.faceStatus.toUpperCase() : "";
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function sanitizeDocumentInput(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatPhone(value?: string | null) {
  if (!value) {
    return "";
  }

  const digits = sanitizePhoneInput(value);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskDocument(value?: string | null) {
  if (!value) {
    return "";
  }

  const clean = sanitizeDocumentInput(value);
  if (clean.length === 11 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }

  if (clean.length === 14 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }

  return clean;
}

export function isValidEmail(value?: string | null) {
  if (!value?.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function unitMatchScore(unit: Unit, query: string) {
  const rawFields = [
    unit.nome,
    unit.name,
    unit.address,
    unit.condominioNome,
    unit.ruaNome,
    unit.blocoNome,
    unit.quadraNome,
    unit.loteNome,
    unit.id
  ]
    .filter(Boolean)
    .map((item) => normalizeSearchText(String(item)));

  if (rawFields.some((item) => item === query)) {
    return 5;
  }

  if (rawFields.some((item) => item.startsWith(query))) {
    return 4;
  }

  if (normalizeSearchText(displayUnitName(unit)).includes(query)) {
    return 3;
  }

  if (rawFields.some((item) => item.includes(query))) {
    return 2;
  }

  return 1;
}

function personMatchScore(person: PersonSearchResult, query: string) {
  const rawFields = [
    person.name,
    person.document,
    person.email,
    person.phone,
    person.unitName,
    ...(person.unitNames ?? []),
    person.categoryLabel,
    person.statusLabel,
    person.unit ? displayUnitName(person.unit) : undefined
  ]
    .filter(Boolean)
    .map((item) => normalizeSearchText(String(item)));

  if (rawFields.some((item) => item === query)) {
    return 5;
  }

  const normalizedName = normalizeSearchText(person.name);
  if (normalizedName.startsWith(query)) {
    return 4;
  }

  if (rawFields.some((item) => item.startsWith(query))) {
    return 3;
  }

  if (rawFields.some((item) => item.includes(query))) {
    return 2;
  }

  return 1;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function isPastDate(value: string) {
  return new Date(value).getTime() < Date.now();
}

function isFutureDate(value: string) {
  return new Date(value).getTime() > Date.now();
}
