import AsyncStorage from "@react-native-async-storage/async-storage";

import { AccessLog, AlertTriageRecord, AuthSession, CondominiumOperationalConfig, Delivery, DeliveryDraftSnapshot, FaceDraftSnapshot, OfflineOperation, OperationalAlert, PermissionMatrixItem, PersonCreateDraftSnapshot, PersonSearchResult, StreamCapabilities, SyncCapabilities, VisitForecast } from "../types";

const keys = {
  session: "guarita:session",
  lastEmail: "guarita:last-email",
  lastTab: "guarita:last-tab",
  movement: "guarita:movement",
  permissionsMatrix: "guarita:permissions-matrix",
  condominiumConfig: "guarita:condominium-config",
  streamCapabilities: "guarita:stream-capabilities",
  syncCapabilities: "guarita:sync-capabilities",
  movementView: "guarita:movement-view",
  alertsView: "guarita:alerts-view",
  alertsCache: "guarita:alerts-cache",
  alertsTriage: "guarita:alerts-triage",
  deliveries: "guarita:deliveries",
  peopleCache: "guarita:people-cache",
  historyView: "guarita:history-view",
  localDeliveries: "guarita:local-deliveries",
  deliveryDraft: "guarita:delivery-draft",
  faceDraft: "guarita:face-draft",
  personCreateDraft: "guarita:person-create-draft",
  queue: "guarita:queue"
};

function parseStoredJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function saveSession(session: AuthSession) {
  await AsyncStorage.setItem(keys.session, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | undefined> {
  const raw = await AsyncStorage.getItem(keys.session);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return isRecord(parsed) ? (parsed as AuthSession) : undefined;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    keys.session,
    keys.lastTab,
    keys.deliveryDraft,
    keys.faceDraft,
    keys.personCreateDraft,
    keys.movementView,
    keys.alertsView,
    keys.alertsTriage,
    keys.historyView
  ]);
}

export async function saveLastEmail(email: string) {
  await AsyncStorage.setItem(keys.lastEmail, email);
}

export async function loadLastEmail(): Promise<string> {
  return (await AsyncStorage.getItem(keys.lastEmail)) ?? "";
}

export async function saveMovementCache(data: { forecasts: VisitForecast[]; logs: AccessLog[] }) {
  await AsyncStorage.setItem(
    keys.movement,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function savePermissionsMatrixCache(data: PermissionMatrixItem[]) {
  await AsyncStorage.setItem(
    keys.permissionsMatrix,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function loadPermissionsMatrixCache(): Promise<{ data: PermissionMatrixItem[]; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.permissionsMatrix);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed) return undefined;
  if (Array.isArray(parsed)) {
    return { data: parsed };
  }

  if (!isRecord(parsed)) return undefined;
  return {
    data: Array.isArray(parsed.data) ? (parsed.data as PermissionMatrixItem[]) : [],
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
  };
}

export async function saveCondominiumConfigCache(data: CondominiumOperationalConfig) {
  await AsyncStorage.setItem(
    keys.condominiumConfig,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function loadCondominiumConfigCache(): Promise<{ data: CondominiumOperationalConfig; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.condominiumConfig);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return { data: parsed.data as CondominiumOperationalConfig, savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined };
  }

  return { data: parsed as CondominiumOperationalConfig };
}

export async function saveStreamCapabilitiesCache(data: StreamCapabilities) {
  await AsyncStorage.setItem(
    keys.streamCapabilities,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function loadStreamCapabilitiesCache(): Promise<{ data: StreamCapabilities; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.streamCapabilities);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return { data: parsed.data as StreamCapabilities, savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined };
  }

  return { data: parsed as StreamCapabilities };
}

export async function saveSyncCapabilitiesCache(data: SyncCapabilities) {
  await AsyncStorage.setItem(
    keys.syncCapabilities,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function loadSyncCapabilitiesCache(): Promise<{ data: SyncCapabilities; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.syncCapabilities);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return { data: parsed.data as SyncCapabilities, savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined };
  }

  return { data: parsed as SyncCapabilities };
}

export async function saveAlertsCache(data: { logs?: AccessLog[]; alerts?: OperationalAlert[] }) {
  await AsyncStorage.setItem(
    keys.alertsCache,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

export async function loadAlertsCache(): Promise<{ logs?: AccessLog[]; alerts?: OperationalAlert[]; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.alertsCache);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return { ...(parsed.data as { logs?: AccessLog[]; alerts?: OperationalAlert[] }), savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined };
  }

  return parsed as { logs?: AccessLog[]; alerts?: OperationalAlert[]; savedAt?: string };
}

export async function loadMovementCache(): Promise<{ forecasts: VisitForecast[]; logs: AccessLog[]; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.movement);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return {
      ...(parsed.data as { forecasts: VisitForecast[]; logs: AccessLog[] }),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
    };
  }

  return parsed as { forecasts: VisitForecast[]; logs: AccessLog[] };
}

export async function saveMovementViewState(state: { searchQuery: string; operatorId?: string }) {
  await AsyncStorage.setItem(
    keys.movementView,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      data: state
    })
  );
}

export async function loadMovementViewState(): Promise<{ searchQuery: string; updatedAt?: string; operatorId?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.movementView);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return {
      ...(parsed.data as { searchQuery: string; operatorId?: string }),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined
    };
  }

  return parsed as { searchQuery: string; operatorId?: string };
}

export async function saveAlertsViewState(state: { filter: string; query: string; operatorId?: string }) {
  await AsyncStorage.setItem(
    keys.alertsView,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      data: state
    })
  );
}

export async function loadAlertsViewState(): Promise<{ filter: string; query: string; updatedAt?: string; operatorId?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.alertsView);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return {
      ...(parsed.data as { filter: string; query: string; operatorId?: string }),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined
    };
  }

  return parsed as { filter: string; query: string; operatorId?: string };
}

export async function saveAlertsTriage(records: Record<string, AlertTriageRecord>) {
  await AsyncStorage.setItem(keys.alertsTriage, JSON.stringify(records));
}

export async function loadAlertsTriage(): Promise<Record<string, AlertTriageRecord>> {
  const raw = await AsyncStorage.getItem(keys.alertsTriage);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return isRecord(parsed) ? (parsed as Record<string, AlertTriageRecord>) : {};
}

export async function loadAlertsTriageForOperator(operatorId: string): Promise<Record<string, AlertTriageRecord>> {
  const records = await loadAlertsTriage();
  return Object.fromEntries(
    Object.entries(records).filter(([, record]) => !record.operatorId || record.operatorId === operatorId)
  );
}

export async function saveAlertsTriageForOperator(operatorId: string, current: Record<string, AlertTriageRecord>) {
  const existing = await loadAlertsTriage();
  const preserved = Object.fromEntries(
    Object.entries(existing).filter(([, record]) => record.operatorId && record.operatorId !== operatorId)
  );

  await saveAlertsTriage({
    ...preserved,
    ...current
  });
}

export async function saveDeliveriesCache(deliveries: Delivery[]) {
  await AsyncStorage.setItem(
    keys.deliveries,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data: deliveries
    })
  );
}

export async function loadDeliveriesCache(): Promise<{ data: Delivery[]; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.deliveries);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed) return undefined;
  if (Array.isArray(parsed)) {
    return { data: parsed };
  }

  if (!isRecord(parsed)) return undefined;
  return {
    data: Array.isArray(parsed.data) ? (parsed.data as Delivery[]) : [],
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
  };
}

export async function savePeopleCache(people: PersonSearchResult[]) {
  await AsyncStorage.setItem(
    keys.peopleCache,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data: people
    })
  );
}

export async function loadPeopleCache(): Promise<{ data: PersonSearchResult[]; savedAt?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.peopleCache);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed) return undefined;
  if (Array.isArray(parsed)) {
    return { data: parsed as PersonSearchResult[] };
  }

  if (!isRecord(parsed)) return undefined;
  return {
    data: Array.isArray(parsed.data) ? (parsed.data as PersonSearchResult[]) : [],
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
  };
}

export async function saveHistoryViewState(state: { filter: string; query: string; operatorId?: string }) {
  await AsyncStorage.setItem(
    keys.historyView,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      data: state
    })
  );
}

export async function loadHistoryViewState(): Promise<{ filter: string; query: string; updatedAt?: string; operatorId?: string } | undefined> {
  const raw = await AsyncStorage.getItem(keys.historyView);
  if (!raw) return undefined;

  const parsed = parseStoredJson(raw);
  if (!parsed || !isRecord(parsed)) return undefined;

  if ("data" in parsed && isRecord(parsed.data)) {
    return {
      ...(parsed.data as { filter: string; query: string; operatorId?: string }),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined
    };
  }

  return parsed as { filter: string; query: string; operatorId?: string };
}

export async function saveLocalDeliveries(deliveries: Delivery[]) {
  await AsyncStorage.setItem(keys.localDeliveries, JSON.stringify(deliveries));
}

export async function loadLocalDeliveries(): Promise<Delivery[]> {
  const raw = await AsyncStorage.getItem(keys.localDeliveries);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return Array.isArray(parsed) ? (parsed as Delivery[]) : [];
}

export async function saveDeliveryDraft(snapshot: DeliveryDraftSnapshot) {
  await AsyncStorage.setItem(keys.deliveryDraft, JSON.stringify(snapshot));
}

export async function loadDeliveryDraft(): Promise<DeliveryDraftSnapshot | undefined> {
  const raw = await AsyncStorage.getItem(keys.deliveryDraft);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return isRecord(parsed) ? (parsed as DeliveryDraftSnapshot) : undefined;
}

export async function clearDeliveryDraft() {
  await AsyncStorage.removeItem(keys.deliveryDraft);
}

export async function saveFaceDraft(snapshot: FaceDraftSnapshot) {
  await AsyncStorage.setItem(keys.faceDraft, JSON.stringify(snapshot));
}

export async function loadFaceDraft(): Promise<FaceDraftSnapshot | undefined> {
  const raw = await AsyncStorage.getItem(keys.faceDraft);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return isRecord(parsed) ? (parsed as FaceDraftSnapshot) : undefined;
}

export async function clearFaceDraft() {
  await AsyncStorage.removeItem(keys.faceDraft);
}

export async function savePersonCreateDraft(snapshot: PersonCreateDraftSnapshot) {
  await AsyncStorage.setItem(keys.personCreateDraft, JSON.stringify(snapshot));
}

export async function loadPersonCreateDraft(): Promise<PersonCreateDraftSnapshot | undefined> {
  const raw = await AsyncStorage.getItem(keys.personCreateDraft);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return isRecord(parsed) ? (parsed as PersonCreateDraftSnapshot) : undefined;
}

export async function clearPersonCreateDraft() {
  await AsyncStorage.removeItem(keys.personCreateDraft);
}

export async function saveOfflineQueue(queue: OfflineOperation[]) {
  await AsyncStorage.setItem(keys.queue, JSON.stringify(queue));
}

export async function loadOfflineQueue(): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(keys.queue);
  const parsed = raw ? parseStoredJson(raw) : undefined;
  return Array.isArray(parsed) ? (parsed as OfflineOperation[]) : [];
}
