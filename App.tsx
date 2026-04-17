import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { apiClient } from "./src/api/client";
import { branding } from "./src/branding/config";
import { colors } from "./src/theme";
import { AuthSession, CondominiumOperationalConfig, Delivery, QueueState, StreamCapabilities, SyncCapabilities } from "./src/types";
import { flushOfflineQueue, getQueueState, hydrateQueueState, subscribeQueueState } from "./src/utils/offlineQueue";
import {
  clearSession,
  loadCondominiumConfigCache,
  loadLocalDeliveries,
  loadPermissionsMatrixCache,
  loadStreamCapabilitiesCache,
  loadSyncCapabilitiesCache,
  loadSession,
  saveCondominiumConfigCache,
  saveLocalDeliveries,
  savePermissionsMatrixCache,
  saveStreamCapabilitiesCache,
  saveSyncCapabilitiesCache,
  saveSession
} from "./src/utils/storage";
import { DeliveryScreen } from "./src/screens/DeliveryScreen";
import { FaceScreen } from "./src/screens/FaceScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MovementScreen } from "./src/screens/MovementScreen";
import { OperationEventsStatus, setOperationEventsCapabilities, startOperationEvents, stopOperationEvents, subscribeOperationEventsStatus } from "./src/utils/operationEvents";
import { canManageDeliveries, canManageFaces, setPermissionsMatrix } from "./src/utils/permissions";
import { isUnitSelectionPending, sessionScopeLabel } from "./src/utils/sessionScope";

type Tab = "movement" | "delivery" | "history" | "face";

const tabs: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "movement", label: branding.labels.home, icon: "home-outline" },
  { id: "delivery", label: branding.labels.deliveries, icon: "cube-outline" },
  { id: "history", label: branding.labels.accesses, icon: "swap-horizontal-outline" },
  { id: "face", label: branding.labels.people, icon: "people-outline" }
];

export default function App() {
  const [session, setSession] = useState<AuthSession | undefined>();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("movement");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [queueState, setQueueState] = useState<QueueState>(getQueueState());
  const [deliverySearchSeed, setDeliverySearchSeed] = useState({ query: "", version: 0 });
  const [faceSearchSeed, setFaceSearchSeed] = useState({ query: "", version: 0 });
  const [hasDeliveryDraft, setHasDeliveryDraft] = useState(false);
  const [hasFaceDraft, setHasFaceDraft] = useState(false);
  const [eventsStatus, setEventsStatus] = useState<OperationEventsStatus>({ state: "idle" });
  const [streamCapabilities, setStreamCapabilities] = useState<StreamCapabilities | undefined>();
  const [syncCapabilities, setSyncCapabilities] = useState<SyncCapabilities | undefined>();
  const [condominiumConfig, setCondominiumConfig] = useState<CondominiumOperationalConfig | undefined>();
  const previousEventsStateRef = useRef<OperationEventsStatus["state"]>("idle");

  const todayDeliveries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return deliveries.filter((item) => (item.createdAt ?? "").slice(0, 10) === today);
  }, [deliveries]);
  const availableTabs = useMemo(() => {
    if (!session) return tabs;

    return tabs.filter((tab) => {
      if (tab.id === "delivery") return branding.features.deliveries && canManageDeliveries(session) && isOperationalModuleEnabled(session, "deliveries");
      if (tab.id === "face") return branding.features.people && canManageFaces(session) && isOperationalModuleEnabled(session, "people");
      if (tab.id === "history") return branding.features.accesses && isOperationalModuleEnabled(session, "accesses");
      return true;
    });
  }, [session]);
  const pendingSyncDeliveries = useMemo(
    () => deliveries.filter((item) => item.syncPending).length,
    [deliveries]
  );
  const draftSummary = useMemo(() => {
    const parts = [];
    if (hasDeliveryDraft) parts.push("encomenda");
    if (hasFaceDraft) parts.push("pessoa");
    return parts;
  }, [hasDeliveryDraft, hasFaceDraft]);
  const activePageTitle = useMemo(() => {
    const labels: Record<Tab, string> = {
      movement: branding.labels.home,
      delivery: branding.labels.deliveries,
      history: branding.labels.accesses,
      face: branding.labels.people
    };

    return labels[activeTab];
  }, [activeTab]);

  function handleLogin(nextSession: AuthSession) {
    const sessionWithToken = nextSession;
    setSession(sessionWithToken);
    apiClient.setToken(sessionWithToken.token);
    startOperationEvents(sessionWithToken.token);
    setActiveTab("movement");
    void saveSession(sessionWithToken);
    void refreshPermissionsMatrix();
    void refreshSessionProfile(sessionWithToken);
    void refreshPlatformContracts(sessionWithToken);
  }

  function logout() {
    apiClient.setToken(undefined);
    stopOperationEvents();
    setPermissionsMatrix([]);
    setSession(undefined);
    setActiveTab("movement");
    setDeliverySearchSeed({ query: "", version: 0 });
    setFaceSearchSeed({ query: "", version: 0 });
    setHasDeliveryDraft(false);
    setHasFaceDraft(false);
    setCondominiumConfig(undefined);
    setStreamCapabilities(undefined);
    setSyncCapabilities(undefined);
    setOperationEventsCapabilities(undefined);
    void clearSession();
  }

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      logout();
    });

    return () => {
      apiClient.setUnauthorizedHandler(undefined);
    };
  }, []);

  function addDelivery(delivery: Delivery) {
    setDeliveries((current) => {
      const alreadyExists = current.some(
        (item) =>
          item.id === delivery.id ||
          (item.clientRequestId?.trim() && delivery.clientRequestId?.trim() && item.clientRequestId.trim() === delivery.clientRequestId.trim())
      );

      if (alreadyExists) {
        return current.map((item) =>
          item.id === delivery.id ||
          (item.clientRequestId?.trim() && delivery.clientRequestId?.trim() && item.clientRequestId.trim() === delivery.clientRequestId.trim())
            ? { ...item, ...delivery }
            : item
        );
      }

      return [delivery, ...current];
    });
  }

  function openDeliveryWithSearch(value: string) {
    setDeliverySearchSeed((current) => ({ query: value, version: current.version + 1 }));
    setActiveTab("delivery");
  }

  function openFaceWithSearch(value: string) {
    setFaceSearchSeed((current) => ({ query: value, version: current.version + 1 }));
    setActiveTab("face");
  }

  function openDelivery() {
    setDeliverySearchSeed((current) => ({ query: "", version: current.version + 1 }));
    setActiveTab("delivery");
  }

  function openFace() {
    setFaceSearchSeed((current) => ({ query: "", version: current.version + 1 }));
    setActiveTab("face");
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await hydrateQueueState();
        const cachedPermissionsMatrix = await loadPermissionsMatrixCache();
        const cachedStreamCapabilities = await loadStreamCapabilitiesCache();
        const cachedSyncCapabilities = await loadSyncCapabilitiesCache();
        const cachedCondominiumConfig = await loadCondominiumConfigCache();
        if (cachedPermissionsMatrix?.data?.length) {
          setPermissionsMatrix(cachedPermissionsMatrix.data);
        }
        if (cachedStreamCapabilities?.data) {
          setStreamCapabilities(cachedStreamCapabilities.data);
          setOperationEventsCapabilities(cachedStreamCapabilities.data);
        }
        if (cachedSyncCapabilities?.data) {
          setSyncCapabilities(cachedSyncCapabilities.data);
        }
        if (cachedCondominiumConfig?.data) {
          setCondominiumConfig(cachedCondominiumConfig.data);
        }
        const saved = await loadSession();
        const local = await loadLocalDeliveries();
        setDeliveries(local);
        if (saved) {
          const hydratedSession = buildSessionWithConfig(saved, cachedCondominiumConfig?.data);
          apiClient.setToken(saved.token);
          startOperationEvents(saved.token);
          setSession(hydratedSession);
          void refreshPermissionsMatrix();
          void refreshSessionProfile(hydratedSession);
          void refreshPlatformContracts(hydratedSession);
          setActiveTab("movement");
        }
      } finally {
        setBootstrapping(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => subscribeQueueState(setQueueState), []);
  useEffect(() => subscribeOperationEventsStatus(setEventsStatus), []);

  useEffect(() => {
    const previous = previousEventsStateRef.current;
    previousEventsStateRef.current = eventsStatus.state;

    if (!session || queueState.pendingCount === 0) {
      return;
    }

    if (eventsStatus.state === "connected" && previous !== "connected") {
      void flushOfflineQueue();
    }
  }, [eventsStatus.state, queueState.pendingCount, session]);

  useEffect(() => {
    if (!session?.token) {
      stopOperationEvents();
      return;
    }

    if (streamCapabilities?.enabled === false) {
      stopOperationEvents();
      return;
    }

    startOperationEvents(session.token);
    return () => {
      stopOperationEvents();
    };
  }, [session?.token, streamCapabilities?.enabled]);

  useEffect(() => {
    if (!session) return;

    void flushOfflineQueue();

    const timer = setInterval(() => {
      void flushOfflineQueue();
    }, 45000);

    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("movement");
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    void saveLocalDeliveries(deliveries);
  }, [deliveries]);

  function syncNow() {
    void flushOfflineQueue();
  }

  async function refreshPermissionsMatrix() {
    try {
      const matrix = await apiClient.listPermissionsMatrix();
      setPermissionsMatrix(matrix);
      await savePermissionsMatrixCache(matrix);
    } catch {
      const cached = await loadPermissionsMatrixCache();
      if (cached?.data?.length) {
        setPermissionsMatrix(cached.data);
      }
    }
  }

  async function refreshSessionProfile(baseSession: AuthSession) {
    try {
      const me = await apiClient.getMe();
      const enrichedSession = buildSessionWithConfig({
        ...baseSession,
        ...me,
        token: baseSession.token
      }, condominiumConfig);
      setSession(enrichedSession);
      await saveSession(enrichedSession);
    } catch {
      // Keep the current session snapshot when profile refresh is unavailable.
    }
  }

  async function refreshPlatformContracts(baseSession: AuthSession) {
    try {
      const [streamResult, syncResult, condominiumResult] = await Promise.allSettled([
        apiClient.getStreamCapabilities(),
        apiClient.getSyncCapabilities(),
        baseSession.condominiumId ? apiClient.getCondominiumOperationalConfig(baseSession.condominiumId) : Promise.resolve(undefined)
      ]);

      let nextCondominiumConfig = condominiumConfig;

      if (streamResult.status === "fulfilled") {
        setStreamCapabilities(streamResult.value);
        setOperationEventsCapabilities(streamResult.value);
        await saveStreamCapabilitiesCache(streamResult.value);
      }

      if (syncResult.status === "fulfilled") {
        setSyncCapabilities(syncResult.value);
        await saveSyncCapabilitiesCache(syncResult.value);
      }

      if (condominiumResult.status === "fulfilled" && condominiumResult.value) {
        nextCondominiumConfig = condominiumResult.value;
        setCondominiumConfig(condominiumResult.value);
        await saveCondominiumConfigCache(condominiumResult.value);
      }

      const mergedSession = buildSessionWithConfig(baseSession, nextCondominiumConfig);
      setSession((current) => (current ? buildSessionWithConfig(current, nextCondominiumConfig) : current));
      await saveSession(mergedSession);
    } catch {
      // Keep last known capabilities/configuration until the next successful refresh.
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {bootstrapping ? (
          <View style={styles.bootWrap}>
            <Image source={branding.logos.primary} style={styles.bootLogo} resizeMode="contain" />
            <Text style={styles.bootTitle}>{branding.appName}</Text>
            <Text style={styles.bootText}>{branding.bootSubtitle}</Text>
          </View>
        ) : !session ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <View style={styles.app}>
            <View style={styles.header}>
              <View style={styles.headerBrand}>
                <Image source={branding.logos.primary} style={styles.headerLogo} resizeMode="contain" />
                <View>
                  <Text style={styles.brand}>{tabPageTitle(activeTab) ?? activePageTitle}</Text>
                  <Text style={styles.operator}>{session.operatorName || "Portaria"} - {roleLabel(session.role)}</Text>
                  {sessionScopeLabel(session) ? <Text style={styles.scope}>{sessionScopeLabel(session)}</Text> : null}
                  <View style={styles.eventsIndicatorRow}>
                    <View style={[styles.eventsDot, eventDotStyle(eventsStatus.state)]} />
                    <Text style={styles.eventsText}>{eventStatusLabel(eventsStatus, streamCapabilities)}</Text>
                  </View>
                </View>
              </View>
              {!session.slimMode ? <View style={styles.headerMeta}>
                <Text style={styles.headerMetaLabel}>Hoje</Text>
                <Text style={styles.headerMetaValue}>
                  {new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit"
                  })}
                </Text>
                <Text style={styles.headerMetaSubtle}>
                  {new Date().toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </Text>
              </View> : null}
              <Pressable onPress={logout} style={styles.logout}>
                <Text style={styles.logoutText}>Sair</Text>
              </Pressable>
            </View>

            {queueState.pendingCount || queueState.syncing || queueState.lastError ? (
              <View style={[styles.syncBar, queueState.lastError && styles.syncBarWarning]}>
                <View style={styles.syncTextWrap}>
                  <Text style={styles.syncTitle}>
                    {queueState.syncing
                      ? "Sincronizando dados pendentes"
                      : queueState.pendingCount
                        ? `${queueState.pendingCount} envio${queueState.pendingCount === 1 ? "" : "s"} pendente${queueState.pendingCount === 1 ? "" : "s"}`
                        : "Sincronização concluída"}
                  </Text>
                  <Text style={styles.syncMeta}>
                    {queueState.lastError
                      ? "Nem tudo foi enviado ainda. O app vai tentar novamente."
                      : queueState.lastSyncAt
                        ? `Última tentativa às ${new Date(queueState.lastSyncAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}`
                        : "Os registros offline serão enviados assim que a conexão responder."}
                  </Text>
                  {queueState.pendingCount ? (
                    <Text style={styles.syncPendingHint}>
                      Os itens offline continuam visíveis até a sincronização terminar.
                    </Text>
                  ) : null}
                  {syncCapabilities?.tokenHeaderName ? (
                    <Text style={styles.syncPendingHint}>
                      Reconciliação canônica ativa por {syncCapabilities.tokenHeaderName}.
                    </Text>
                  ) : null}
                  {queueState.pendingByType && queueState.pendingCount ? (
                    <Text style={styles.syncPendingBreakdown}>
                      {buildPendingBreakdown(queueState)}
                    </Text>
                  ) : null}
                  {queueState.lastError ? <Text style={styles.syncErrorDetail}>{queueState.lastError}</Text> : null}
                </View>
                <Pressable onPress={syncNow} disabled={queueState.syncing} style={styles.syncButton}>
                  <Text style={styles.syncButtonText}>{queueState.syncing ? "..." : queueState.lastError ? "Tentar de novo" : "Sincronizar"}</Text>
                </Pressable>
              </View>
            ) : null}
            {isUnitSelectionPending(session) ? (
              <View style={styles.scopeBar}>
                <View style={styles.syncTextWrap}>
                  <Text style={styles.scopeTitle}>Escopo de unidade pendente</Text>
                  <Text style={styles.syncMeta}>
                    Este acesso exige unidade selecionada na sessão. Enquanto isso não vier do backend, algumas ações ficam em modo consulta.
                  </Text>
                </View>
              </View>
            ) : null}
            {draftSummary.length ? (
              <View style={styles.draftBar}>
                <View style={styles.syncTextWrap}>
                  <Text style={styles.draftTitle}>Rascunho em andamento</Text>
                  <Text style={styles.syncMeta}>
                    Há trabalho salvo em {draftSummary.join(" e ")} neste aparelho.
                  </Text>
                </View>
                {hasDeliveryDraft ? (
                  <Pressable onPress={() => setActiveTab("delivery")} style={styles.draftShortcut}>
                    <Text style={styles.draftShortcutText}>Encomenda</Text>
                  </Pressable>
                ) : null}
                {hasFaceDraft ? (
                  <Pressable onPress={() => setActiveTab("face")} style={styles.draftShortcut}>
                    <Text style={styles.draftShortcutText}>Pessoas</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.body}>
              {activeTab === "delivery" ? (
                <DeliveryScreen
                  session={session}
                  isActive={activeTab === "delivery"}
                  onCreated={addDelivery}
                  initialSearchQuery={deliverySearchSeed.query}
                  initialSearchVersion={deliverySearchSeed.version}
                  onDraftStateChange={setHasDeliveryDraft}
                />
              ) : null}
              {activeTab === "movement" ? (
                <MovementScreen
                  session={session}
                  variant="home"
                  onOpenDelivery={openDelivery}
                  onOpenFace={openFace}
                  onOpenDeliveryWithSearch={openDeliveryWithSearch}
                  onOpenFaceWithSearch={openFaceWithSearch}
                />
              ) : null}
              {activeTab === "history" ? (
                <HistoryScreen
                  session={session}
                  deliveries={deliveries}
                  onLocalDeliveriesChange={setDeliveries}
                />
              ) : null}
              {activeTab === "face" ? (
                <FaceScreen
                  session={session}
                  initialSearchQuery={faceSearchSeed.query}
                  initialSearchVersion={faceSearchSeed.version}
                  onDraftStateChange={setHasFaceDraft}
                />
              ) : null}
            </View>

            <View style={styles.tabBar}>
              {availableTabs.map((tab) => {
                const active = activeTab === tab.id;
                const badgeCount =
                  tab.id === "history"
                    ? pendingSyncDeliveries
                    : tab.id === "delivery"
                      ? Number(hasDeliveryDraft)
                      : tab.id === "face"
                        ? Number(hasFaceDraft)
                        : 0;
                const isDraftBadge = tab.id === "delivery" || tab.id === "face";
                const shouldShowTabBadge = tab.id === "history" ? badgeCount > 0 : false;
                return (
                  <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tab, active && styles.tabActive]}>
                    <Ionicons name={tab.icon} size={20} color={active ? colors.primaryDark : colors.muted} />
                    <View style={styles.tabLabelWrap}>
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tabBarLabel(tab.id)}</Text>
                      {shouldShowTabBadge ? (
                        <View style={[styles.tabBadge, isDraftBadge && styles.tabBadgeDraft]}>
                          <Text style={[styles.tabBadgeText, isDraftBadge && styles.tabBadgeDraftText]}>
                            {isDraftBadge ? "R" : badgeCount > 99 ? "99+" : badgeCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {branding.showDeveloperSignature && !session.slimMode ? (
              <View style={styles.signatureBar}>
                <Text style={styles.signatureText}>
                  <Text style={styles.signaturePrefix}>{branding.developerSignaturePrefix}</Text>
                  <Text style={styles.signatureBrand}>{branding.developerSignatureName}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  bootWrap: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24
  },
  bootLogo: {
    height: 54,
    width: 110
  },
  bootTitle: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "900"
  },
  bootText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center"
  },
  app: {
    flex: 1
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerBrand: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  headerLogo: {
    height: 24,
    width: 42
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  operator: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    marginTop: 1
  },
  scope: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  eventsIndicatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  eventsDot: {
    borderRadius: 999,
    height: 8,
    width: 8
  },
  eventsText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  headerMeta: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  headerMetaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  headerMetaValue: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 1
  },
  headerMetaSubtle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1
  },
  logout: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  body: {
    flex: 1
  },
  syncBar: {
    alignItems: "center",
    backgroundColor: "#F0F6FF",
    borderBottomColor: "#C9DCF4",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  syncBarWarning: {
    backgroundColor: "#FFF7E8",
    borderBottomColor: "#F0D39A"
  },
  scopeBar: {
    alignItems: "center",
    backgroundColor: "#FFF7E8",
    borderBottomColor: "#F0D39A",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  scopeTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "900"
  },
  syncTextWrap: {
    flex: 1,
    gap: 2
  },
  syncTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  syncMeta: {
    color: colors.muted,
    fontSize: 12
  },
  syncPendingHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700"
  },
  syncPendingBreakdown: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  syncErrorDetail: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16
  },
  syncButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  syncButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  draftBar: {
    alignItems: "center",
    backgroundColor: "#F1F5FC",
    borderBottomColor: "#D6E1F2",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  draftTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  draftShortcut: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D6E1F2",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  draftShortcutText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 8
  },
  tab: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    gap: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 1,
    paddingVertical: 5
  },
  tabLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#E8F1FB"
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  tabLabelActive: {
    color: colors.primaryDark
  },
  tabBadge: {
    alignItems: "center",
    backgroundColor: "#FFF3D8",
    borderRadius: 7,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  tabBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900"
  },
  tabBadgeDraft: {
    backgroundColor: "#E9F0FB"
  },
  tabBadgeAlert: {
    backgroundColor: "#FCEEEE"
  },
  tabBadgeDraftText: {
    color: colors.primaryDark
  },
  tabBadgeAlertText: {
    color: colors.danger
  },
  signatureBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingBottom: 6
  },
  signatureText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700"
  },
  signaturePrefix: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700"
  },
  signatureBrand: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "700"
  }
});

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    MASTER: "Administrador geral",
    ADMIN: "Administrador",
    OPERACIONAL: "Operacional",
    CENTRAL: "Central",
    OPERADOR: "Operador",
    PORTARIA: "Portaria"
  };

  return labels[role] ?? "Usuário";
}

function tabBarLabel(tab: Tab) {
  const labels: Record<Tab, string> = {
    movement: branding.labels.home,
    delivery: branding.labels.deliveries,
    history: branding.labels.accesses,
    face: branding.labels.people
  };

  return labels[tab];
}

function tabPageTitle(tab: Tab) {
  const labels: Record<Tab, string> = {
    movement: branding.labels.home,
    delivery: branding.labels.deliveries,
    history: branding.labels.accesses,
    face: branding.labels.people
  };

  return labels[tab];
}


function buildPendingBreakdown(queueState: QueueState) {
  const parts = [];
  if (queueState.pendingByType?.deliveries) parts.push(`${queueState.pendingByType.deliveries} encomenda${queueState.pendingByType.deliveries === 1 ? "" : "s"}`);
  if (queueState.pendingByType?.people) parts.push(`${queueState.pendingByType.people} cadastro${queueState.pendingByType.people === 1 ? "" : "s"} de pessoa`);
  if (queueState.pendingByType?.faces) parts.push(`${queueState.pendingByType.faces} face${queueState.pendingByType.faces === 1 ? "" : "s"}`);
  if (queueState.pendingByType?.forecasts) parts.push(`${queueState.pendingByType.forecasts} atualização${queueState.pendingByType.forecasts === 1 ? "" : "s"} de visita`);
  return parts.join(" | ");
}

function eventStatusLabel(status: OperationEventsStatus, capabilities?: StreamCapabilities) {
  const lastEventDiffMs = status.lastEventAt ? Date.now() - new Date(status.lastEventAt).getTime() : Number.POSITIVE_INFINITY;
  const recentlyActive = Number.isFinite(lastEventDiffMs) && lastEventDiffMs < 2 * 60 * 1000;

  if (status.state === "connected") {
    return status.lastEventAt
      ? `Operacional em tempo real até ${new Date(status.lastEventAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}`
      : "Operacional em tempo real";
  }

  if (status.state === "connecting") {
    return "Atualização automática";
  }

  if (status.state === "reconnecting") {
    return recentlyActive
      ? "Atualização automática"
      : status.lastEventAt
      ? `Tempo real oscilando desde ${new Date(status.lastEventAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}`
      : "Tempo real oscilando";
  }

  if (status.state === "unsupported") {
    return "Tempo real indisponível neste aparelho";
  }

  if (capabilities && capabilities.enabled === false) {
    return "Tempo real desativado pelo contrato";
  }

  return "Tempo real inativo";
}

function eventDotStyle(state: OperationEventsStatus["state"]) {
  if (state === "connected") {
    return { backgroundColor: "#2F7ED8" };
  }

  if (state === "connecting" || state === "reconnecting") {
    return { backgroundColor: "#E4A11B" };
  }

  if (state === "unsupported") {
    return { backgroundColor: "#C97B12" };
  }

  return { backgroundColor: "#AAB4B0" };
}

function buildSessionWithConfig(
  session: AuthSession,
  config?: CondominiumOperationalConfig
): AuthSession {
  if (!config) {
    return session;
  }

  return {
    ...session,
    enabledModules: config.enabledModules ?? session.enabledModules ?? [],
    residentManagementSettings:
      config.residentManagementSettings ?? session.residentManagementSettings ?? {},
    slimMode: config.slimMode ?? session.slimMode ?? false,
    deliveryRenotification:
      config.deliveryRenotification ?? session.deliveryRenotification ?? null
  };
}

function isOperationalModuleEnabled(
  session: AuthSession,
  module: "deliveries" | "people" | "accesses"
) {
  const enabledModules = session.enabledModules ?? [];
  if (!enabledModules.length) {
    return true;
  }

  const aliases: Record<typeof module, string[]> = {
    deliveries: ["DELIVERIES", "DELIVERY", "PACKAGES", "ENCOMENDAS"],
    people: ["PEOPLE", "PERSON", "PERSONS", "RESIDENTS", "FACES", "FACIAL", "USERS"],
    accesses: ["ACCESS", "ACCESSES", "ACCESS_CONTROL", "VISITS", "VISIT_FORECASTS", "OPERATIONS", "PORTARIA", "GUARITA"]
  };

  const normalized = enabledModules.map((item) => item.trim().toUpperCase());
  return aliases[module].some((alias) => normalized.includes(alias));
}


