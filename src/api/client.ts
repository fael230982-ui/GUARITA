import {
  AccessLog,
  AuthSession,
  Delivery,
  DeliveryDraft,
  DeliveryLabelOcrResult,
  FaceResponse,
  PermissionMatrixItem,
  PersonAccessSummary,
  PersonDocumentOcrSuggestion,
  PersonDraft,
  PhotoSearchResponse,
  PersonSearchResult,
  PhotoAsset,
  CondominiumOperationalConfig,
  StreamCapabilities,
  SyncReconciliation,
  SyncCapabilities,
  Unit,
  UnitResidentOption,
  VisitForecast
} from "../types";

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://sapinhoprod.v8seguranca.com.br/api/v1";

type PublicUserResponse = {
  id: string;
  name: string;
  email: string;
  personId?: string | null;
  personName?: string | null;
  role: string;
  permissions: string[];
  effectiveAccess?: Record<string, boolean>;
  allowedProfiles?: string[];
  allowedClients?: string[];
  scope?: string | null;
  scopeType?: string | null;
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
};

type PublicLoginResponse = {
  token: string;
  user: PublicUserResponse;
};

type PublicPermissionMatrixItemResponse = {
  role: string;
  permissions?: string[];
};

type PublicUnitResidentOptionResponse = {
  id: string;
  name: string;
  unitId: string;
  unitName?: string | null;
};

type PublicSyncReconciliationResponse = {
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


type PublicSyncEndpointCapabilityResponse = {
  endpoint: string;
  exposure: string;
  authMode: string;
};

type PublicSyncCapabilitiesResponse = {
  enabled: boolean;
  tokenHeaderName?: string;
  tokenDeliveryMode?: string;
  tokenLifecycle?: string;
  eventIngress?: PublicSyncEndpointCapabilityResponse;
  reconciliation?: PublicSyncEndpointCapabilityResponse;
  supportedAggregateTypes?: string[];
  supportedSyncStatuses?: string[];
  retryableSyncStatuses?: string[];
  finalSyncStatuses?: string[];
};

type PublicOperationStreamFieldRuleResponse = {
  canonical?: boolean;
  requirement: "REQUIRED" | "CONDITIONAL" | "OPTIONAL" | "LEGACY_TEMPORARY" | string;
  aliasFor?: string | null;
};

type PublicOperationStreamCapabilitiesResponse = {
  enabled?: boolean;
  canonicalTypeField?: string;
  canonicalTimeField?: string;
  permissionsMatrixPrimary?: boolean;
  effectiveAccessCompanion?: boolean;
  fieldRules?: Record<string, PublicOperationStreamFieldRuleResponse>;
};

type PublicDeliveryRenotificationSettingsResponse = {
  enabled?: boolean;
  maxPerDay?: number | null;
  cooldownMinutes?: number | null;
  allowedStatuses?: string[] | null;
};

type PublicCondominiumResponse = {
  id: string;
  name: string;
  enabledModules?: string[];
  residentManagementSettings?: Record<string, boolean>;
  slimMode?: boolean;
  deliveryRenotification?: PublicDeliveryRenotificationSettingsResponse | null;
};

type PublicAlertResponse = {
  id?: string;
  alertId?: string;
  title?: string;
  description?: string | null;
  alertType?: string;
  alertSeverity?: string;
  workflowStatus?: "NEW" | "ON_HOLD" | "RESOLVED" | string;
  occurredAt?: string;
  entityType?: string;
  entityId?: string;
  unitId?: string | null;
  cameraId?: string | null;
  snapshotUrl?: string | null;
  liveUrl?: string | null;
  replayUrl?: string | null;
  replayAvailable?: boolean;
  openedAt?: string | null;
  openedByUserId?: string | null;
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  resolutionNote?: string | null;
  resolutionPreset?: string | null;
};
type OperationSearchResponse = {
  people: PersonSearchResult[];
  deliveries: Delivery[];
  accessLogs: AccessLog[];
};

type PhotoUploadResponse = {
  photoUrl: string;
};

type PublicDeliveryOcrResponse = {
  rawText: string;
  normalizedText: string;
  trackingCodeCandidates: string[];
  carrierHint?: string | null;
  confidence?: number | null;
  recipientName?: string | null;
  recipientPersonId?: string | null;
  recipientUnitId?: string | null;
  unitName?: string | null;
  unitHint?: string | null;
  unitSuggestions?: Array<{
    id?: string | null;
    unitId?: string | null;
    name?: string | null;
    unitName?: string | null;
    label?: string | null;
  }> | null;
  residentSuggestions?: PublicUnitResidentOptionResponse[] | null;
};

type PublicDeliveryMultipartOcrResponse = {
  deliveryCompany?: string | null;
  trackingCode?: string | null;
  recipientName?: string | null;
  recipientPersonId?: string | null;
  recipientUnitId?: string | null;
  unitName?: string | null;
  unitHint?: string | null;
  confidence?: number | null;
  unitSuggestions?: Array<{
    id?: string | null;
    unitId?: string | null;
    name?: string | null;
    unitName?: string | null;
    label?: string | null;
  }> | null;
  residentSuggestions?: PublicUnitResidentOptionResponse[] | null;
  rawText: string;
  normalizedText?: string | null;
};

type PublicPersonDocumentOcrSuggestionResponse = {
  photoUrl?: string | null;
  rawText: string;
  normalizedText: string;
  confidence?: number | null;
  prefill?: {
    name?: string | null;
    document?: string | null;
    documentType?: "CPF" | "RG" | "CNH" | string | null;
    birthDate?: string | null;
  } | null;
  nameCandidates?: string[] | null;
  documentCandidates?: string[] | null;
  suggestedName?: string | null;
  suggestedDocument?: string | null;
  suggestedDocumentType?: "CPF" | "RG" | "CNH" | string | null;
  suggestedBirthDate?: string | null;
};

type PublicPersonDocumentOcrRequest = {
  photoUrl?: string | null;
  photoBase64?: string | null;
  fileName?: string | null;
  cameraId?: string | null;
};

type PublicOperationPhotoSearchRequest = {
  photoUrl?: string | null;
  photoBase64?: string | null;
  cameraId?: string | null;
  fileName?: string | null;
  maxMatches?: number;
};

type PublicOperationPhotoSearchMatchResponse = {
  confidence: number;
  person: (Partial<PersonSearchResult> & { id: string; name: string }) | null;
  residentUnit?: Partial<Unit> | null;
  activeVisitForecasts?: Array<Partial<VisitForecast>> | null;
  possibleDestination?: string | null;
};

type PublicOperationPhotoSearchResponse = {
  matched: boolean;
  matchStrategy: string;
  capturedPhotoUrl: string;
  matches?: PublicOperationPhotoSearchMatchResponse[] | null;
};

type PublicOperationalReportRequest = {
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  visibility: string;
  metadata?: Record<string, unknown>;
};

type BackgroundJobResponse = {
  id: string;
  jobType: string;
  status: string;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};

type ApiOptions = {
  baseUrl?: string;
  token?: string;
};

const REQUEST_TIMEOUT_MS = 20000;
const OCR_REQUEST_TIMEOUT_MS = 45000;
const MAX_OPERATION_SEARCH_LIMIT = 50;

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = parseBody(text);

  if (!response.ok) {
    const rawMessage = body?.message ?? body?.error ?? `Erro HTTP ${response.status}`;
    const message = normalizeApiErrorMessage(response.status, rawMessage);
    throw new Error(message);
  }

  return body as T;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;
  private onUnauthorized?: () => void;

  constructor(options: ApiOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_API_URL);
    this.token = options.token;
  }

  setToken(token?: string) {
    this.token = token;
  }

  setUnauthorizedHandler(handler?: () => void) {
    this.onUnauthorized = handler;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const result = await this.request<PublicLoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    return mapUserToSession(result.user, result.token);
  }

  async getMe(): Promise<Omit<AuthSession, "token">> {
    const result = await this.request<PublicUserResponse>("/auth/me");
    const mapped = mapUserToSession(result, this.token ?? "");

    return {
      operatorId: mapped.operatorId,
      operatorName: mapped.operatorName,
      role: mapped.role,
      permissions: mapped.permissions,
      effectiveAccess: mapped.effectiveAccess,
      allowedProfiles: mapped.allowedProfiles,
      allowedClients: mapped.allowedClients,
      scope: mapped.scope,
      scopeType: mapped.scopeType,
      condominiumId: mapped.condominiumId,
      condominiumIds: mapped.condominiumIds,
      unitId: mapped.unitId,
      unitIds: mapped.unitIds,
      selectedUnitId: mapped.selectedUnitId,
      selectedUnitName: mapped.selectedUnitName,
      requiresUnitSelection: mapped.requiresUnitSelection,
      streetIds: mapped.streetIds,
      profileSource: mapped.profileSource
    };
  }

  async listPermissionsMatrix(): Promise<PermissionMatrixItem[]> {
    const result = await this.request<PublicPermissionMatrixItemResponse[]>("/auth/permissions-matrix");
    return result.map((item) => ({
      role: item.role,
      permissions: item.permissions ?? []
    }));
  }


  async getSyncCapabilities(): Promise<SyncCapabilities> {
    const result = await this.request<PublicSyncCapabilitiesResponse>("/auth/sync-capabilities");
    return {
      enabled: result.enabled,
      tokenHeaderName: result.tokenHeaderName,
      tokenDeliveryMode: result.tokenDeliveryMode,
      tokenLifecycle: result.tokenLifecycle,
      eventIngress: result.eventIngress,
      reconciliation: result.reconciliation,
      supportedAggregateTypes: result.supportedAggregateTypes ?? [],
      supportedSyncStatuses: result.supportedSyncStatuses ?? [],
      retryableSyncStatuses: result.retryableSyncStatuses ?? [],
      finalSyncStatuses: result.finalSyncStatuses ?? []
    };
  }

  async getStreamCapabilities(): Promise<StreamCapabilities> {
    const result = await this.request<PublicOperationStreamCapabilitiesResponse>("/auth/stream-capabilities");
    return {
      enabled: result.enabled ?? true,
      canonicalTypeField: result.canonicalTypeField ?? "eventType",
      canonicalTimeField: result.canonicalTimeField ?? "occurredAt",
      permissionsMatrixPrimary: result.permissionsMatrixPrimary ?? true,
      effectiveAccessCompanion: result.effectiveAccessCompanion ?? true,
      fieldRules: result.fieldRules ?? {}
    };
  }

  async getCondominiumOperationalConfig(condominiumId: string): Promise<CondominiumOperationalConfig> {
    const result = await this.request<PublicCondominiumResponse>(`/condominiums/${encodeURIComponent(condominiumId)}`);
    return {
      id: result.id,
      name: result.name,
      enabledModules: result.enabledModules ?? [],
      residentManagementSettings: result.residentManagementSettings ?? {},
      slimMode: result.slimMode ?? false,
      deliveryRenotification: result.deliveryRenotification
        ? {
            enabled: result.deliveryRenotification.enabled ?? true,
            maxPerDay: result.deliveryRenotification.maxPerDay ?? null,
            cooldownMinutes: result.deliveryRenotification.cooldownMinutes ?? null,
            allowedStatuses: result.deliveryRenotification.allowedStatuses ?? []
          }
        : null
    };
  }

  async uploadPhoto(photo: PhotoAsset): Promise<string> {
    return this.uploadPhotoTo("/people/photo/upload", photo);
  }

  async uploadDeliveryPhoto(photo: PhotoAsset): Promise<string> {
    return this.uploadPhotoTo("/deliveries/photo/upload", photo);
  }

  private async uploadPhotoTo(path: string, photo: PhotoAsset): Promise<string> {
    if (!photo.base64) {
      throw new Error("A foto precisa ser capturada novamente para envio.");
    }

    const response = await this.request<PhotoUploadResponse>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoBase64: photo.base64,
        fileName: photo.fileName
      })
    });

    return normalizeHttpPhotoUrl(response.photoUrl, this.baseUrl);
  }

  async createDelivery(draft: DeliveryDraft, receivedBy: string): Promise<Delivery> {
    const photoUrl = draft.packagePhoto ? await this.uploadDeliveryPhoto(draft.packagePhoto) : undefined;
    const deliveryCompany = draft.deliveryCompany.trim() || "Não informada";

    return this.request<Delivery>("/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientUnitId: draft.unitId,
        recipientPersonId: draft.recipientPersonId || null,
        deliveryCompany,
        trackingCode: draft.trackingCode.trim() || null,
        clientRequestId: draft.clientRequestId?.trim() || null,
        status: "RECEIVED",
        receivedAt: new Date().toISOString(),
        receivedBy,
        photoUrl: photoUrl ?? null
      })
    });
  }

  async readDeliveryLabel(photo: PhotoAsset): Promise<DeliveryLabelOcrResult> {
    if (!photo.base64) {
      throw new Error("A foto da etiqueta precisa ser capturada novamente.");
    }

    try {
      const formData = new FormData();
      formData.append("photo", {
        uri: photo.uri,
        name: photo.fileName,
        type: photo.mimeType
      } as unknown as Blob);

      const result = await this.request<PublicDeliveryMultipartOcrResponse>("/deliveries/ocr", {
        method: "POST",
        body: formData
      }, OCR_REQUEST_TIMEOUT_MS);

      return {
        rawText: result.rawText,
        normalizedText: result.normalizedText ?? undefined,
        confidence: result.confidence ?? undefined,
        unitHint: result.unitHint ?? undefined,
        unitSuggestions: (result.unitSuggestions ?? []).map((item) => ({
          id: item.id ?? undefined,
          unitId: item.unitId ?? undefined,
          name: item.name ?? undefined,
          unitName: item.unitName ?? undefined,
          label: item.label ?? undefined
        })),
        residentSuggestions: (result.residentSuggestions ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          unitId: item.unitId,
          unitName: item.unitName ?? undefined
        })),
        suggestions: {
          recipientName: result.recipientName ?? undefined,
          recipientPersonId: result.recipientPersonId ?? undefined,
          recipientUnitId: result.recipientUnitId ?? undefined,
          unitName: result.unitName ?? undefined,
          deliveryCompany: result.deliveryCompany ?? undefined,
          trackingCode: result.trackingCode ?? undefined
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const timeout = message.includes("tempo esgotado") || message.includes("timed out") || message.includes("abort");
      if (timeout) {
        throw new Error("O OCR demorou demais para responder. Tente novamente com internet estavel ou siga no preenchimento manual.");
      }
      const shouldFallback =
        message.includes("not found") ||
        message.includes("405") ||
        message.includes("method not allowed") ||
        message.includes("unsupported media type") ||
        message.includes("bad request");

      if (!shouldFallback) {
        throw error;
      }
    }

    const result = await this.request<PublicDeliveryOcrResponse>("/deliveries/ocr-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoBase64: photo.base64,
        fileName: photo.fileName
      })
    }, OCR_REQUEST_TIMEOUT_MS);

    return {
      rawText: result.rawText,
      normalizedText: result.normalizedText,
      trackingCodeCandidates: result.trackingCodeCandidates,
      carrierHint: result.carrierHint ?? undefined,
      confidence: result.confidence ?? undefined,
      unitHint: result.unitHint ?? undefined,
      unitSuggestions: (result.unitSuggestions ?? []).map((item) => ({
        id: item.id ?? undefined,
        unitId: item.unitId ?? undefined,
        name: item.name ?? undefined,
        unitName: item.unitName ?? undefined,
        label: item.label ?? undefined
      })),
      residentSuggestions: (result.residentSuggestions ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        unitId: item.unitId,
        unitName: item.unitName ?? undefined
      })),
      suggestions: {
        recipientName: result.recipientName ?? undefined,
        recipientPersonId: result.recipientPersonId ?? undefined,
        recipientUnitId: result.recipientUnitId ?? undefined,
        unitName: result.unitName ?? undefined,
        deliveryCompany: result.carrierHint ?? undefined,
        trackingCode: result.trackingCodeCandidates[0] ?? undefined
      }
    };
  }

  async listDeliveries(): Promise<Delivery[]> {
    const result = await this.request<PaginatedResponse<Delivery>>("/deliveries?page=1&limit=100");
    return result.data;
  }

  async searchPeople(query: string, limit = 20): Promise<PersonSearchResult[]> {
    const result = await this.searchOperation(query, Math.min(limit, MAX_OPERATION_SEARCH_LIMIT));
    return result.people;
  }

  async listPeople(params: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
  } = {}): Promise<PaginatedResponse<PersonSearchResult>> {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("limit", String(params.limit ?? 100));

    if (params.category) {
      search.set("category", params.category);
    }

    if (params.status) {
      search.set("status", params.status);
    }

    return this.request<PaginatedResponse<PersonSearchResult>>(`/people?${search.toString()}`);
  }

  async listUnitResidents(unitId: string, selectedUnitId?: string | null): Promise<UnitResidentOption[]> {
    const query = `/people/unit-residents?unitId=${encodeURIComponent(unitId)}`;
    const headers = selectedUnitId ? { "X-Selected-Unit-Id": selectedUnitId } : undefined;
    const result = await this.request<PublicUnitResidentOptionResponse[]>(
      query,
      headers ? { headers } : undefined
    );

    return result.map((item) => ({
      id: item.id,
      name: item.name,
      unitId: item.unitId,
      unitName: item.unitName ?? undefined
    }));
  }

  async searchOperation(query: string, limit = 20): Promise<OperationSearchResponse> {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_OPERATION_SEARCH_LIMIT);
    return this.request<OperationSearchResponse>(
      `/operation/search?q=${encodeURIComponent(query)}&limit=${safeLimit}`
    );
  }

  async createPerson(draft: PersonDraft): Promise<PersonSearchResult> {
    const photoUrl = draft.photo ? await this.uploadPhoto(draft.photo) : null;

    return this.request<PersonSearchResult>("/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase() || null,
        document: draft.document.trim() || null,
        documentType: draft.document ? draft.documentType : null,
        birthDate: normalizeBirthDateForApi(draft.birthDate) || null,
        category: draft.category,
        phone: draft.phone.trim() || null,
        unitId: draft.unitId || null,
        photoUrl
      })
    });
  }

  async updatePersonStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<PersonSearchResult> {
    return this.request<PersonSearchResult>(`/people/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  async readPersonDocument(photo: PhotoAsset): Promise<PersonDocumentOcrSuggestion> {
    if (!photo.base64) {
      throw new Error("A foto do documento precisa ser capturada novamente.");
    }

    let uploadedPhotoUrl: string | undefined;
    try {
      uploadedPhotoUrl = await this.uploadPhoto(photo);
    } catch {
      uploadedPhotoUrl = undefined;
    }

    const payload: PublicPersonDocumentOcrRequest = uploadedPhotoUrl
      ? {
          photoUrl: uploadedPhotoUrl,
          fileName: photo.fileName
        }
      : {
          photoBase64: photo.base64,
          fileName: photo.fileName
        };

    const result = await this.request<PublicPersonDocumentOcrSuggestionResponse>(
      "/people/document-ocr",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      OCR_REQUEST_TIMEOUT_MS
    );

    return {
      photoUrl: result.photoUrl ?? undefined,
      rawText: result.rawText,
      normalizedText: result.normalizedText,
      confidence: result.confidence ?? undefined,
      prefill: result.prefill
        ? {
            name: result.prefill.name ?? undefined,
            document: result.prefill.document ?? undefined,
            documentType: result.prefill.documentType ?? undefined,
            birthDate: result.prefill.birthDate ?? undefined
          }
        : undefined,
      nameCandidates: result.nameCandidates ?? [],
      documentCandidates: result.documentCandidates ?? [],
      suggestedName: result.suggestedName ?? undefined,
      suggestedDocument: result.suggestedDocument ?? undefined,
      suggestedDocumentType: result.suggestedDocumentType ?? undefined,
      suggestedBirthDate: result.suggestedBirthDate ?? undefined
    };
  }

  async searchPeopleByPhoto(photo: PhotoAsset, maxMatches = 5): Promise<PhotoSearchResponse> {
    if (!photo.base64) {
      throw new Error("A foto precisa ser capturada novamente para identificação.");
    }

    let uploadedPhotoUrl: string | undefined;
    try {
      uploadedPhotoUrl = await this.uploadPhoto(photo);
    } catch {
      uploadedPhotoUrl = undefined;
    }

    const payload: PublicOperationPhotoSearchRequest = uploadedPhotoUrl
      ? {
          photoUrl: uploadedPhotoUrl,
          fileName: photo.fileName,
          maxMatches: Math.min(Math.max(Math.round(maxMatches), 1), 10)
        }
      : {
          photoBase64: photo.base64,
          fileName: photo.fileName,
          maxMatches: Math.min(Math.max(Math.round(maxMatches), 1), 10)
        };

    const result = await this.request<PublicOperationPhotoSearchResponse>(
      "/operation/people/search-by-photo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      OCR_REQUEST_TIMEOUT_MS
    );

    return {
      matched: result.matched,
      matchStrategy: result.matchStrategy,
      capturedPhotoUrl: result.capturedPhotoUrl,
      matches: (result.matches ?? []).flatMap((item) => {
        if (!item.person?.id || !item.person?.name) {
          return [];
        }

        return [
          {
            confidence: item.confidence,
            person: mapPhotoSearchPerson(item.person),
            residentUnit: mapPhotoSearchUnit(item.residentUnit),
            activeVisitForecasts: (item.activeVisitForecasts ?? []).map(mapPhotoSearchForecast),
            possibleDestination: item.possibleDestination ?? null
          }
        ];
      })
    };
  }

  async createOperationalAccessReport(input: {
    action: "ENTRY" | "EXIT";
    personId: string;
    personName: string;
    unitId?: string | null;
    unitName?: string | null;
    category?: string | null;
  }) {
    const title = input.action === "ENTRY" ? `Entrada liberada - ${input.personName}` : `Saída registrada - ${input.personName}`;
    const descriptionPrefix = input.action === "ENTRY" ? "Entrada registrada pela portaria" : "Saída registrada pela portaria";
    const metadata = {
      kind: "access",
      action: input.action,
      personId: input.personId,
      unitId: input.unitId ?? null,
      category: input.category ?? "VISITOR"
    };

    const payload: PublicOperationalReportRequest = {
      title,
      description: `${descriptionPrefix} para ${input.personName}. Destino: ${input.unitName || "Não informada"}.\n\nPORTARIA_ACCESS ${JSON.stringify(metadata)}`,
      category: "Acesso",
      status: "registrado",
      priority: "low",
      visibility: "interna",
      metadata
    };

    return this.requestToAbsoluteUrl<Record<string, unknown>>(`${getApiRootUrl(this.baseUrl)}/api/admin/relatorios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async listUnits(): Promise<Unit[]> {
    return this.request<Unit[]>("/units");
  }

  async searchUnits(query: string, limit = 20): Promise<Unit[]> {
    return this.request<Unit[]>(`/operation/units?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async reconcileSyncRequest(clientRequestId: string): Promise<SyncReconciliation> {
    return this.request<PublicSyncReconciliationResponse>(
      `/internal/sync/reconcile/${encodeURIComponent(clientRequestId)}`,
      {},
      REQUEST_TIMEOUT_MS,
      { suppressUnauthorizedHandler: true }
    );
  }

  async getPersonAccessSummary(personId: string): Promise<PersonAccessSummary> {
    return this.request<PersonAccessSummary>(`/people/${encodeURIComponent(personId)}/access-summary`);
  }

  async sendFace(personId: string, facePhoto: PhotoAsset): Promise<FaceResponse> {
    const photoUrl = await this.uploadPhoto(facePhoto);
    const payload = JSON.stringify({
      personId,
      photoUrl
    });

    try {
      const response = await this.request<FaceResponse>("/facial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

      return {
        ...response,
        personId,
        mode: "sync",
        photoUrl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const shouldFallback =
        message.includes("not found") || message.includes("405") || message.includes("method not allowed");

      if (!shouldFallback) {
        throw error;
      }
    }

    const response = await this.request<BackgroundJobResponse>("/facial/register-async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    return {
      personId,
      status: response.status,
      mode: "async",
      jobId: response.id,
      jobStatus: response.status,
      photoUrl
    };
  }

  async listVisitForecasts(): Promise<VisitForecast[]> {
    const result = await this.request<PaginatedResponse<VisitForecast>>("/visit-forecasts?page=1&limit=100");
    return result.data;
  }

  async updateVisitForecastStatus(id: string, status: "ARRIVED" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "NO_SHOW") {
    return this.request<VisitForecast>(`/visit-forecasts/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  async renotifyDelivery(id: string) {
    return this.request<{
      ok: boolean;
      deliveryId: string;
      notifiedUsersCount: number;
      notificationSentAt?: string | null;
    }>(`/deliveries/${encodeURIComponent(id)}/renotify`, {
      method: "POST"
    });
  }


  async updateAlertWorkflow(
    id: string,
    workflowStatus: "NEW" | "ON_HOLD" | "RESOLVED",
    resolutionNote?: string | null,
    resolutionPreset?: string | null
  ) {
    return this.request<PublicAlertResponse>(`/alerts/${encodeURIComponent(id)}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowStatus,
        resolutionNote: resolutionNote ?? null,
        resolutionPreset: resolutionPreset ?? null
      })
    });
  }
  async validateDeliveryWithdrawal(id: string, code?: string, manualConfirmation?: boolean) {
    return this.request<{
      valid: boolean;
      deliveryId: string;
      status?: string | null;
      withdrawnAt?: string | null;
      withdrawnBy?: string | null;
      withdrawnByName?: string | null;
      withdrawalValidatedAt?: string | null;
      withdrawalValidatedByUserId?: string | null;
      withdrawalValidatedByUserName?: string | null;
      withdrawalValidationMethod?: string | null;
      withdrawalFailureReason?: string | null;
      message?: string | null;
    }>(`/deliveries/${encodeURIComponent(id)}/validate-withdrawal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code || null,
        validationMethod: manualConfirmation ? "MANUAL" : "CODE",
        manualConfirmation: Boolean(manualConfirmation)
      })
    });
  }

  async listAlerts(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  } = {}) {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("limit", String(params.limit ?? 100));

    if (params.type) {
      search.set("type", params.type);
    }

    if (params.status) {
      search.set("status", params.status);
    }

    const result = await this.request<PaginatedResponse<PublicAlertResponse>>(`/alerts?${search.toString()}`);
    return result.data.map((item) => ({
      alertId: item.alertId ?? item.id ?? "",
      alertType: item.alertType ?? "GENERIC",
      alertSeverity: (item as PublicAlertResponse & { alertSeverity?: string }).alertSeverity ?? "MEDIUM",
      alertStatus: item.workflowStatus ?? "NEW",
      occurredAt: item.occurredAt ?? item.openedAt ?? new Date().toISOString(),
      entityType: item.entityType ?? "ALERT",
      entityId: item.entityId ?? item.alertId ?? item.id ?? "",
      title: item.title ?? null,
      description: item.description ?? null,
      unitId: item.unitId ?? null,
      cameraId: item.cameraId ?? null,
      snapshotUrl: item.snapshotUrl ?? null,
      liveUrl: item.liveUrl ?? null,
      replayUrl: item.replayUrl ?? null,
      message: item.description ?? null,
      payload: {
        replayAvailable: item.replayAvailable ?? null,
        openedAt: item.openedAt ?? null,
        openedByUserId: item.openedByUserId ?? null,
        resolvedAt: item.resolvedAt ?? null,
        resolvedByUserId: item.resolvedByUserId ?? null,
        resolutionNote: item.resolutionNote ?? null,
        resolutionPreset: item.resolutionPreset ?? null
      }
    }));
  }

  async listAccessLogs(): Promise<AccessLog[]> {
    const result = await this.request<PaginatedResponse<AccessLog>>("/access-logs?page=1&limit=50");
    return result.data;
  }

  private async requestToAbsoluteUrl<T>(
    url: string,
    init: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
    options: { suppressUnauthorizedHandler?: boolean } = {}
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Tempo esgotado ao falar com o servidor.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 && this.token && !options.suppressUnauthorizedHandler) {
      this.onUnauthorized?.();
    }

    return parseResponse<T>(response);
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS,
    options: { suppressUnauthorizedHandler?: boolean } = {}
  ): Promise<T> {
    return this.requestToAbsoluteUrl<T>(`${this.baseUrl}${path}`, init, timeoutMs, options);
  }
}

function mapUserToSession(user: PublicUserResponse, token: string): AuthSession {
  return {
    token,
    operatorId: user.id,
    operatorName: user.name,
    role: user.role,
    permissions: user.permissions,
    effectiveAccess: user.effectiveAccess ?? {},
    allowedProfiles: user.allowedProfiles,
    allowedClients: user.allowedClients,
    scope: user.scope ?? null,
    scopeType: user.scopeType ?? null,
    condominiumId: user.condominiumId ?? null,
    condominiumIds: user.condominiumIds ?? [],
    unitId: user.unitId ?? null,
    unitIds: user.unitIds ?? [],
    selectedUnitId: user.selectedUnitId ?? null,
    selectedUnitName: user.selectedUnitName ?? null,
    requiresUnitSelection: user.requiresUnitSelection ?? false,
    streetIds: user.streetIds ?? [],
    profileSource: user.profileSource ?? null
  };
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function parseBody(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function normalizeApiErrorMessage(status: number, message?: string) {
  const normalized = (message ?? "").toLowerCase();

  if (status === 401 || normalized.includes("token invalid") || normalized.includes("token expir") || normalized.includes("jwt") || normalized.includes("unauthorized")) {
    return "Sessão expirada. Faça login novamente.";
  }

  if (status >= 500 || normalized.includes("internal server error")) {
    return "Serviço temporariamente indisponível. Tente novamente em instantes.";
  }

  return message || `Erro HTTP ${status}`;
}

export const apiClient = new ApiClient();

function getApiRootUrl(baseUrl: string) {
  return baseUrl.replace(/\/api\/v\d+(?:\.\d+)?$/i, "");
}

function normalizeHttpPhotoUrl(photoUrl: string | undefined, baseUrl: string) {
  const value = (photoUrl ?? "").trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiRoot = getApiRootUrl(baseUrl).replace(/\/+$/, "");

  if (value.startsWith("/")) {
    return `${apiRoot}${value}`;
  }

  return `${apiRoot}/${value.replace(/^\/+/, "")}`;
}

function mapPhotoSearchPerson(person: Partial<PersonSearchResult> & { id: string; name: string }): PersonSearchResult {
  return {
    id: person.id,
    name: person.name,
    document: person.document,
    documentType: person.documentType ?? null,
    birthDate: person.birthDate ?? null,
    email: person.email ?? null,
    unitId: person.unitId,
    unitIds: person.unitIds ?? [],
    unitName: person.unitName,
    unitNames: person.unitNames ?? [],
    unit: person.unit,
    type: person.type,
    category: person.category,
    categoryLabel: person.categoryLabel,
    status: person.status,
    statusLabel: person.statusLabel,
    phone: person.phone ?? null,
    photoUrl: person.photoUrl ?? null,
    pendingDeliveries: person.pendingDeliveries ?? 0,
    linkedUnreadAlerts: person.linkedUnreadAlerts ?? 0,
    accessGroupIds: person.accessGroupIds ?? [],
    accessGroupNames: person.accessGroupNames ?? [],
    faceListId: person.faceListId ?? null,
    faceListItemId: person.faceListItemId ?? null,
    hasFacialCredential: person.hasFacialCredential ?? false,
    faceStatus: person.faceStatus ?? null,
    startDate: person.startDate ?? null,
    endDate: person.endDate ?? null
  };
}

function mapPhotoSearchUnit(unit?: Partial<Unit> | null): Unit | null {
  if (!unit?.id) {
    return null;
  }

  return {
    id: unit.id,
    name: unit.name ?? unit.nome ?? "",
    nome: unit.nome,
    address: unit.address ?? null,
    condominioNome: unit.condominioNome ?? null,
    ruaNome: unit.ruaNome ?? null,
    blocoNome: unit.blocoNome ?? null,
    quadraNome: unit.quadraNome ?? null,
    loteNome: unit.loteNome ?? null
  };
}

function mapPhotoSearchForecast(item: Partial<VisitForecast>): VisitForecast {
  return {
    id: item.id ?? item.visitForecastId ?? `forecast-${Math.random().toString(36).slice(2, 10)}`,
    visitForecastId: item.visitForecastId,
    unitId: item.unitId ?? "",
    unitName: item.unitName ?? null,
    residentUserName: item.residentUserName ?? null,
    visitorName: item.visitorName ?? "",
    visitorDocument: item.visitorDocument ?? null,
    visitorPhone: item.visitorPhone ?? null,
    category: item.category ?? "VISITOR",
    categoryLabel: item.categoryLabel ?? item.category ?? "Visitante",
    notes: item.notes ?? null,
    expectedEntryAt: item.expectedEntryAt ?? new Date().toISOString(),
    expectedExitAt: item.expectedExitAt ?? item.expectedEntryAt ?? new Date().toISOString(),
    status: item.status ?? "SCHEDULED",
    arrivedAt: item.arrivedAt ?? null,
    departedAt: item.departedAt ?? null,
    createdAt: item.createdAt ?? item.expectedEntryAt ?? new Date().toISOString()
  };
}

function normalizeBirthDateForApi(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) {
    return undefined;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (!day || !month || !year || month > 12 || day > 31 || year < 1900) {
    return undefined;
  }

  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const isSameDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  return isSameDate ? normalized : undefined;
}



