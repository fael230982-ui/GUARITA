export type AuthSession = {
  token: string;
  operatorId: string;
  operatorName: string;
  role: "OPERADOR" | "PORTARIA" | "ADMIN" | string;
  permissions?: string[];
  effectiveAccess?: Record<string, boolean>;
  allowedProfiles?: string[];
  allowedClients?: string[];
  scope?: string | null;
  scopeType?: "UNSCOPED" | "CONDOMINIUM" | "UNIT" | "STREET" | string | null;
  condominiumId?: string | null;
  condominiumIds?: string[];
  unitId?: string | null;
  unitIds?: string[];
  unitName?: string | null;
  unitNames?: string[];
  selectedUnitId?: string | null;
  selectedUnitName?: string | null;
  requiresUnitSelection?: boolean;
  streetIds?: string[];
  profileSource?: string | null;
  enabledModules?: string[];
  residentManagementSettings?: Record<string, boolean>;
  slimMode?: boolean;
  deliveryRenotification?: {
    enabled?: boolean;
    maxPerDay?: number | null;
    cooldownMinutes?: number | null;
    allowedStatuses?: string[];
  } | null;
};

export type PermissionMatrixItem = {
  role: string;
  permissions?: string[];
};

export type PhotoAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  base64?: string;
  capturedAt?: string;
};

export type DeliveryDraft = {
  unitId: string;
  recipientName: string;
  recipientPersonId: string;
  clientRequestId?: string;
  deliveryCompany: string;
  trackingCode: string;
  labelPhoto?: PhotoAsset;
  packagePhoto?: PhotoAsset;
};

export type Delivery = {
  id: string;
  clientRequestId?: string | null;
  recipientUnitId: string;
  recipientUnitName?: string | null;
  recipientPersonId?: string | null;
  deliveryCompany: string;
  trackingCode?: string | null;
  status: string;
  photoUrl?: string;
  receivedAt?: string;
  receivedBy?: string;
  pickupCode?: string;
  withdrawalCode?: string;
  qrCodeUrl?: string;
  withdrawalQrCodeUrl?: string;
  notificationStatus?: string;
  notificationSentAt?: string | null;
  withdrawnAt?: string | null;
  withdrawnBy?: string | null;
  withdrawnByName?: string | null;
  withdrawalValidationMethod?: string | null;
  withdrawalValidatedAt?: string | null;
  withdrawalValidatedByUserId?: string | null;
  withdrawalValidatedByUserName?: string | null;
  withdrawalFailureReason?: string | null;
  createdAt?: string;
  performedAt?: string | null;
  clientType?: string | null;
  deviceName?: string | null;
  evidenceUrl?: string | null;
  syncPending?: boolean;
  syncFailed?: boolean;
  syncFailureMessage?: string | null;
};

export type PersonSearchResult = {
  id: string;
  name: string;
  document?: string;
  documentType?: string | null;
  birthDate?: string | null;
  email?: string | null;
  unitId?: string;
  unitIds?: string[];
  unitName?: string;
  unitNames?: string[];
  unit?: Unit;
  type?: "MORADOR" | "VISITANTE" | "PRESTADOR" | "LOCATARIO" | string;
  category?: string;
  categoryLabel?: string;
  status?: string;
  statusLabel?: string;
  phone?: string | null;
  photoUrl?: string | null;
  pendingDeliveries?: number;
  linkedUnreadAlerts?: number;
  accessGroupIds?: string[];
  accessGroupNames?: string[];
  faceListId?: number | null;
  faceListItemId?: number | null;
  hasFacialCredential?: boolean;
  faceStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type UnitResidentOption = {
  id: string;
  name: string;
  unitId: string;
  unitName?: string | null;
};

export type OperationMessageOrigin = "APP" | "WHATSAPP" | "PORTARIA" | string;
export type OperationMessageDirection = "PORTARIA_TO_RESIDENT" | "RESIDENT_TO_PORTARIA" | string;

export type OperationMessage = {
  id: string;
  unitId: string;
  unitName?: string | null;
  senderUserId?: string | null;
  senderUserName?: string | null;
  recipientPersonId?: string | null;
  recipientPersonName?: string | null;
  recipientPhone?: string | null;
  direction: OperationMessageDirection;
  origin: OperationMessageOrigin;
  body: string;
  status: string;
  externalMessageId?: string | null;
  externalMetadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type WhatsAppConnection = {
  enabled: boolean;
  instance?: string | null;
  state?: string | null;
  qrCodeText?: string | null;
  qrCodeImageDataUrl?: string | null;
  pairingCode?: string | null;
};

export type Unit = {
  id: string;
  name: string;
  nome?: string;
  address?: string | null;
  condominioNome?: string | null;
  ruaNome?: string | null;
  blocoNome?: string | null;
  quadraNome?: string | null;
  loteNome?: string | null;
};

export type PersonDraft = {
  name: string;
  document: string;
  documentType: "CPF" | "RG" | "CNH";
  birthDate: string;
  phone: string;
  email: string;
  category: "RESIDENT" | "VISITOR" | "SERVICE_PROVIDER" | "DELIVERER" | "RENTER";
  unitId?: string;
  photo?: PhotoAsset;
};

export type FaceResponse = {
  id?: string;
  personId: string;
  faceId?: string;
  status: string;
  faceStatus?: string;
  photoUrl?: string;
  mode?: "sync" | "async";
  jobId?: string;
  jobStatus?: string;
  quality?: {
    approved: boolean;
    score: number;
  };
};

export type PhotoSearchMatch = {
  confidence: number;
  person: PersonSearchResult;
  residentUnit?: Unit | null;
  activeVisitForecasts: VisitForecast[];
  possibleDestination?: string | null;
};

export type PhotoSearchResponse = {
  matched: boolean;
  matchStrategy: string;
  capturedPhotoUrl: string;
  matches: PhotoSearchMatch[];
};

export type PersonAccessSummary = {
  personId: string;
  personName?: string | null;
  totalAccesses: number;
  entries: number;
  exits: number;
  denied: number;
  lastAccessAt?: string | null;
  lastDirection?: string | null;
  lastResult?: string | null;
  lastEntryAt?: string | null;
  lastExitAt?: string | null;
  isInsideNow?: boolean;
  accessesToday?: number;
  pendingDeliveries?: number;
  linkedUnreadAlerts?: number;
  operatorUserId?: string | null;
  operatorUserName?: string | null;
};

export type VisitForecast = {
  id: string;
  visitForecastId?: string;
  unitId: string;
  unitName?: string | null;
  residentUserName?: string | null;
  visitorName: string;
  visitorDocument?: string | null;
  visitorPhone?: string | null;
  category: string;
  categoryLabel: string;
  notes?: string | null;
  expectedEntryAt: string;
  expectedExitAt: string;
  status: "SCHEDULED" | "PENDING_ARRIVAL" | "ARRIVED" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "NO_SHOW" | string;
  arrivedAt?: string | null;
  departedAt?: string | null;
  createdAt: string;
};

export type AccessLog = {
  id: string;
  alertId?: string | null;
  cameraId?: string | null;
  personId?: string | null;
  personName?: string | null;
  userName?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  doorName?: string | null;
  deviceName?: string | null;
  classification: string;
  classificationLabel: string;
  direction: "ENTRY" | "EXIT" | string;
  result: "ALLOWED" | "DENIED" | string;
  location?: string | null;
  message?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  webRtcUrl?: string | null;
  imageStreamUrl?: string | null;
  mjpegUrl?: string | null;
  snapshotUrl?: string | null;
  thumbnailUrl?: string | null;
  timestamp: string;
};

export type OperationalAlert = {
  alertId: string;
  alertType: string;
  alertSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  alertStatus: "NEW" | "ON_HOLD" | "RESOLVED" | string;
  occurredAt: string;
  entityType: "ACCESS_LOG" | string;
  entityId: string;
  title?: string | null;
  description?: string | null;
  personId?: string | null;
  personName?: string | null;
  unitId?: string | null;
  unitLabel?: string | null;
  cameraId?: string | null;
  liveUrl?: string | null;
  hlsUrl?: string | null;
  webRtcUrl?: string | null;
  imageStreamUrl?: string | null;
  mjpegUrl?: string | null;
  snapshotUrl?: string | null;
  thumbnailUrl?: string | null;
  message?: string | null;
  localUpdatedAt?: string | null;
  localOperatorId?: string | null;
  payload: Record<string, unknown>;
};

export type AlertTriageRecord = {
  alertId: string;
  status: "NEW" | "ON_HOLD" | "RESOLVED";
  updatedAt: string;
  operatorId?: string;
};

export type AlertViewFilter = "all" | "new" | "on_hold" | "resolved" | "high" | "critical";

export type CameraMediaSource = {
  liveUrl?: string | null;
  hlsUrl?: string | null;
  webRtcUrl?: string | null;
  imageStreamUrl?: string | null;
  mjpegUrl?: string | null;
  snapshotUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type SyncReconciliation = {
  found: boolean;
  clientRequestId: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  eventType?: string | null;
  syncStatus?: string | null;
  retryable?: boolean;
  isFinal?: boolean;
  isApplied?: boolean;
  errorType?: string | null;
  errorMessage?: string | null;
  originNodeId?: string | null;
  sourceUpdatedAt?: string | null;
  syncedAt?: string | null;
};

export type SyncCapabilities = {
  enabled: boolean;
  tokenHeaderName?: string;
  tokenDeliveryMode?: string;
  tokenLifecycle?: string;
  eventIngress?: {
    endpoint: string;
    exposure: string;
    authMode: string;
  };
  reconciliation?: {
    endpoint: string;
    exposure: string;
    authMode: string;
  };
  supportedAggregateTypes?: string[];
  supportedSyncStatuses?: string[];
  retryableSyncStatuses?: string[];
  finalSyncStatuses?: string[];
};

export type PersonDocumentOcrSuggestion = {
  rawText: string;
  normalizedText: string;
  prefill?: {
    name?: string | null;
    document?: string | null;
    documentType?: "CPF" | "RG" | "CNH" | string | null;
    birthDate?: string | null;
  };
  nameCandidates?: string[];
  documentCandidates?: string[];
  confidence?: number | null;
  suggestedName?: string | null;
  suggestedDocument?: string | null;
  suggestedDocumentType?: "CPF" | "RG" | "CNH" | string | null;
  suggestedBirthDate?: string | null;
  photoUrl?: string | null;
};

export type StreamCapabilities = {
  canonicalTypeField: string;
  canonicalTimeField: string;
  enabled?: boolean;
  permissionsMatrixPrimary: boolean;
  effectiveAccessCompanion: boolean;
  fieldRules?: Record<
    string,
    {
      canonical?: boolean;
      requirement: "REQUIRED" | "CONDITIONAL" | "OPTIONAL" | "LEGACY_TEMPORARY" | string;
      aliasFor?: string | null;
    }
  >;
};

export type CondominiumOperationalConfig = {
  id: string;
  name?: string;
  enabledModules?: string[];
  residentManagementSettings?: Record<string, boolean>;
  slimMode?: boolean;
  deliveryRenotification?: {
    enabled?: boolean;
    maxPerDay?: number | null;
    cooldownMinutes?: number | null;
    allowedStatuses?: string[];
  } | null;
};

export type OfflineAuditContext = {
  performedAt: string;
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  clientType: string;
  deviceName: string;
  condominiumId?: string | null;
  unitId?: string | null;
  evidenceUrl?: string | null;
};

export type OfflineOperation =
  | {
      id: string;
      type: "createDelivery";
      createdAt: string;
      payload: {
        draft: DeliveryDraft;
        receivedBy: string;
        audit: OfflineAuditContext;
      };
    }
  | {
      id: string;
      type: "createPerson";
      createdAt: string;
      payload: {
        draft: PersonDraft;
        audit: OfflineAuditContext;
      };
    }
  | {
      id: string;
      type: "sendFace";
      createdAt: string;
      payload: {
        personId: string;
        facePhoto: PhotoAsset;
        audit: OfflineAuditContext;
      };
    }
  | {
      id: string;
      type: "updateVisitForecastStatus";
      createdAt: string;
      payload: {
        id: string;
        visitForecastId?: string;
        status: "ARRIVED" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "NO_SHOW";
        audit: OfflineAuditContext;
      };
    }
  | {
      id: string;
      type: "registerPresenceAccess";
      createdAt: string;
      payload: {
        personId: string;
        personName: string;
        unitId?: string | null;
        unitName?: string | null;
        category?: string | null;
        action: "ENTRY" | "EXIT";
        audit: OfflineAuditContext;
      };
    };

export type QueueState = {
  pendingCount: number;
  pendingByType?: {
    deliveries: number;
    people: number;
    faces: number;
    forecasts: number;
    accesses: number;
  };
  syncing: boolean;
  lastSyncAt?: string;
  lastError?: string;
};

export type DeliveryLabelOcrResult = {
  rawText?: string;
  normalizedText?: string;
  confidence?: number;
  trackingCodeCandidates?: string[];
  carrierHint?: string | null;
  unitHint?: string | null;
  unitSuggestions?: Array<{
    id?: string;
    unitId?: string | null;
    name?: string | null;
    unitName?: string | null;
    label?: string | null;
  }>;
  residentSuggestions?: UnitResidentOption[];
  suggestions?: {
    recipientName?: string;
    recipientPersonId?: string;
    recipientUnitId?: string;
    unitName?: string;
    deliveryCompany?: string;
    trackingCode?: string;
  };
};

export type DeliveryDraftSnapshot = {
  operatorId?: string;
  draft: DeliveryDraft;
  recipientQuery: string;
  unitQuery: string;
  selectedPerson?: PersonSearchResult;
  selectedUnit?: Unit;
  unitMismatchConfirmed?: boolean;
  updatedAt: string;
};

export type PersonCreateDraftSnapshot = {
  operatorId?: string;
  draft: PersonDraft;
  unitQuery: string;
  selectedUnit?: Unit;
  updatedAt: string;
};

export type FaceDraftSnapshot = {
  operatorId?: string;
  query: string;
  selected?: PersonSearchResult;
  photo?: PhotoAsset;
  consent: boolean;
  updatedAt: string;
};
