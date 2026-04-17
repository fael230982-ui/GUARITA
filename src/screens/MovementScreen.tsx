import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { apiClient } from "../api/client";
import { branding } from "../branding/config";
import { AccessLog, AuthSession, PersonSearchResult, VisitForecast } from "../types";
import { colors } from "../theme";
import { buildOfflineAuditContext } from "../utils/audit";
import {
  displayPersonUnit,
  displayUnit,
  isDeliveryAwaitingWithdrawal,
  getVisitForecastCanonicalId,
  personAttentionText,
  personCategoryText,
  sortPeopleByQuery,
  statusText
} from "../utils/display";
import { enqueueOfflineOperation, subscribeQueueState } from "../utils/offlineQueue";
import { isMovementOperationEvent, subscribeOperationEvents } from "../utils/operationEvents";
import { canManageDeliveries, canManageFaces, canManageForecasts, isReadOnlyRole } from "../utils/permissions";
import { isUnitSelectionPending } from "../utils/sessionScope";
import { loadMovementCache, loadMovementViewState, saveMovementCache, saveMovementViewState } from "../utils/storage";

type LoadState = {
  forecasts: VisitForecast[];
  logs: AccessLog[];
};

type FocusSection = "home" | "scheduled" | "arrived" | "inside" | "completed" | "accesses";
type VisitCategoryFilter = "all" | "resident" | "provider" | "other";

type Props = {
  session: AuthSession;
  variant?: "home" | "access";
  onOpenDelivery: () => void;
  onOpenFace: () => void;
  onOpenDeliveryWithSearch: (value: string) => void;
  onOpenFaceWithSearch: (value: string) => void;
};

export function MovementScreen({
  session,
  variant = "home",
  onOpenDelivery,
  onOpenFace,
  onOpenDeliveryWithSearch,
  onOpenFaceWithSearch
}: Props) {
  const [data, setData] = useState<LoadState>({ forecasts: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [searchAggregateMeta, setSearchAggregateMeta] = useState<{ deliveries: number; accessLogs: number } | undefined>();
  const [searchTouched, setSearchTouched] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"live" | "cache">("live");
  const [viewHydrated, setViewHydrated] = useState(false);
  const [restoredSearch, setRestoredSearch] = useState(false);
  const [queuePending, setQueuePending] = useState(0);
  const [queueLastError, setQueueLastError] = useState<string | undefined>();
  const [pendingDeliveryCount, setPendingDeliveryCount] = useState(0);
  const [focus, setFocus] = useState<FocusSection>(variant === "access" ? "accesses" : "home");
  const [visitCategoryFilter, setVisitCategoryFilter] = useState<VisitCategoryFilter>("resident");
  const [loadError, setLoadError] = useState<string | undefined>();

  const todayForecasts = useMemo(
    () => data.forecasts.filter((item) => isTodayIso(item.expectedEntryAt)),
    [data.forecasts]
  );
  const completed = useMemo(
    () =>
      [...todayForecasts.filter((item) => item.status === "COMPLETED" || item.status === "EXPIRED" || Boolean(item.departedAt))].sort(
        (left, right) => new Date(right.departedAt ?? right.expectedExitAt).getTime() - new Date(left.departedAt ?? left.expectedExitAt).getTime()
      ),
    [todayForecasts]
  );
  const arrived = useMemo(
    () =>
      [...todayForecasts.filter(
        (item) =>
          (item.status === "ARRIVED" || Boolean(item.arrivedAt)) &&
          !completed.some((completedItem) => getVisitForecastCanonicalId(completedItem) === getVisitForecastCanonicalId(item))
      )].sort((left, right) => new Date(left.arrivedAt ?? left.expectedEntryAt).getTime() - new Date(right.arrivedAt ?? right.expectedEntryAt).getTime()),
    [completed, todayForecasts]
  );
  const pending = useMemo(
    () =>
      [...todayForecasts.filter((item) => (item.status === "SCHEDULED" || item.status === "PENDING_ARRIVAL") && !item.arrivedAt)].sort(
        (left, right) => new Date(left.expectedEntryAt).getTime() - new Date(right.expectedEntryAt).getTime()
      ),
    [todayForecasts]
  );
  const insideNow = useMemo(
    () =>
      [...todayForecasts.filter((item) => item.status === "ARRIVED" && !item.departedAt)].sort(
        (left, right) => new Date(left.expectedExitAt).getTime() - new Date(right.expectedExitAt).getTime()
      ),
    [todayForecasts]
  );
  const recentRelevantLogs = useMemo(
    () =>
      data.logs
        .filter((item) => isTodayIso(item.timestamp) && isResidentOrProviderLog(item))
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, 8),
    [data.logs]
  );
  const providerAccessCount = useMemo(
    () => recentRelevantLogs.filter((item) => isProviderLog(item)).length,
    [recentRelevantLogs]
  );
  const residentAccessCount = useMemo(
    () => recentRelevantLogs.filter((item) => isResidentLog(item)).length,
    [recentRelevantLogs]
  );
  const allowVisitActions = canManageForecasts(session);
  const allowDeliveryShortcut = canManageDeliveries(session);
  const allowFaceShortcut = canManageFaces(session);
  const canRunSearch = Boolean(searchQuery.trim().length >= 2);

  const scheduledResidentsAndProviders = useMemo(
    () => filterForecastsByCategory(pending, visitCategoryFilter),
    [pending, visitCategoryFilter]
  );
  const arrivedResidentsAndProviders = useMemo(
    () => filterForecastsByCategory(arrived, visitCategoryFilter),
    [arrived, visitCategoryFilter]
  );
  const insideResidentsAndProviders = useMemo(
    () => filterForecastsByCategory(insideNow, visitCategoryFilter),
    [insideNow, visitCategoryFilter]
  );
  const completedResidentsAndProviders = useMemo(
    () => filterForecastsByCategory(completed, visitCategoryFilter),
    [completed, visitCategoryFilter]
  );

  async function load(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const [forecastsResult, logsResult, deliveriesResult] = await Promise.allSettled([
        apiClient.listVisitForecasts(),
        apiClient.listAccessLogs(),
        apiClient.listDeliveries()
      ]);
      const cached = await loadMovementCache();
      const forecasts = forecastsResult.status === "fulfilled" ? forecastsResult.value : cached?.forecasts ?? [];
      const logs = logsResult.status === "fulfilled" ? logsResult.value : cached?.logs ?? [];
      const pendingCount =
        deliveriesResult.status === "fulfilled"
          ? deliveriesResult.value.filter(isDeliveryAwaitingWithdrawal).length
          : pendingDeliveryCount;

      if (forecastsResult.status === "rejected" && logsResult.status === "rejected" && !cached) {
        throw (forecastsResult.reason ?? logsResult.reason);
      }

      setData({ forecasts, logs });
      setPendingDeliveryCount(pendingCount);
      setLastLoadedAt(new Date().toISOString());
      setDataSource(forecastsResult.status === "fulfilled" || logsResult.status === "fulfilled" ? "live" : "cache");
      setLoadError(undefined);
      await saveMovementCache({ forecasts, logs });
    } catch (error) {
      const cached = await loadMovementCache();
      if (cached?.forecasts?.length || cached?.logs?.length) {
        setData({ forecasts: cached.forecasts, logs: cached.logs });
        setDataSource("cache");
        setLastLoadedAt(cached.savedAt);
        setLoadError(undefined);
      } else {
        setData({ forecasts: [], logs: [] });
        setDataSource("cache");
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar as visitas.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function changeForecastStatus(item: VisitForecast, status: "ARRIVED" | "EXPIRED") {
    const forecastKey = getVisitForecastCanonicalId(item);

    try {
      setSavingStatusId(forecastKey);
      const updated = await apiClient.updateVisitForecastStatus(item.id, status);
      setData((current) => ({
        ...current,
        forecasts: current.forecasts.map((forecast) =>
          getVisitForecastCanonicalId(forecast) === forecastKey ? { ...forecast, ...updated } : forecast
        )
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a visita.";

      if (isOfflineError(message)) {
        await enqueueOfflineOperation({
          id: `queued-visit-${getVisitForecastCanonicalId(item)}-${Date.now()}`,
          type: "updateVisitForecastStatus",
          createdAt: new Date().toISOString(),
          payload: {
            id: item.id,
            visitForecastId: forecastKey,
            status,
            audit: buildOfflineAuditContext({
              session,
              unitId: item.unitId
            })
          }
        });
        setData((current) => ({
          ...current,
          forecasts: current.forecasts.map((forecast) =>
            getVisitForecastCanonicalId(forecast) === forecastKey
              ? {
                  ...forecast,
                  status,
                  arrivedAt: status === "ARRIVED" ? new Date().toISOString() : forecast.arrivedAt,
                  departedAt: status === "EXPIRED" ? new Date().toISOString() : forecast.departedAt
                }
              : forecast
          )
        }));
        Alert.alert("Sem conexão", "A atualização foi salva no aparelho e será sincronizada quando a internet voltar.");
      } else {
        Alert.alert("Visita", message);
      }
    } finally {
      setSavingStatusId(undefined);
    }
  }

  async function runGlobalSearch() {
    if (searchQuery.trim().length < 2) {
      Alert.alert("Busca", "Digite pelo menos 2 caracteres.");
      return;
    }

    try {
      setSearchingPeople(true);
      setSearchTouched(true);
      const aggregate = await apiClient.searchOperation(searchQuery.trim(), 20);
      const people = sortPeopleByQuery(aggregate.people, searchQuery.trim());
      setSearchResults(people.slice(0, 6));
      setSearchAggregateMeta({
        deliveries: aggregate.deliveries.length,
        accessLogs: aggregate.accessLogs.length
      });
    } catch (error) {
      setSearchResults([]);
      setSearchAggregateMeta(undefined);
      Alert.alert("Busca", error instanceof Error ? error.message : "Não foi possível buscar agora.");
    } finally {
      setSearchingPeople(false);
    }
  }

  function clearGlobalSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchAggregateMeta(undefined);
    setSearchTouched(false);
    setRestoredSearch(false);
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchAggregateMeta(undefined);
      setSearchTouched(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    async function hydrateViewState() {
      const saved = await loadMovementViewState();
      if (saved?.operatorId && saved.operatorId !== session.operatorId) {
        setViewHydrated(true);
        return;
      }
      if (saved?.searchQuery && !isOlderThanHours(saved.updatedAt, 12)) {
        setSearchQuery(saved.searchQuery);
        setRestoredSearch(true);
      }
      setViewHydrated(true);
    }

    void hydrateViewState();
  }, [session.operatorId]);

  useEffect(() => {
    if (!viewHydrated || !searchQuery.trim() || searchQuery.trim().length < 2 || searchTouched) {
      return;
    }

    void runGlobalSearch();
  }, [searchQuery, searchTouched, viewHydrated]);

  useEffect(() => {
    if (!viewHydrated) {
      return;
    }

    void saveMovementViewState({ searchQuery, operatorId: session.operatorId });
  }, [searchQuery, session.operatorId, viewHydrated]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(false);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let previousPending = 0;

    return subscribeQueueState((state) => {
      setQueuePending(state.pendingCount);
      setQueueLastError(state.lastError);
      if (!state.syncing && previousPending > 0 && state.pendingCount < previousPending) {
        void load(false);
      }
      previousPending = state.pendingCount;
    });
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeOperationEvents((event) => {
      if (!isMovementOperationEvent(event)) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        void load(false);
      }, 1500);
    });

    return () => {
      unsubscribe();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);

  const detailTitle = focus === "scheduled"
    ? "Previstos"
    : focus === "arrived"
      ? "Chegaram"
      : focus === "inside"
        ? "No local"
        : focus === "completed"
          ? "Saídas"
          : focus === "accesses"
            ? "Acessos"
          : "";

  const detailItems = focus === "scheduled"
    ? scheduledResidentsAndProviders
    : focus === "arrived"
      ? arrivedResidentsAndProviders
      : focus === "inside"
        ? insideResidentsAndProviders
      : focus === "completed"
          ? completedResidentsAndProviders
          : [];

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={24} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.help}>{variant === "access" ? "Busca, previsões e últimos acessos." : "Ações rápidas e visão do dia."}</Text>
            {lastLoadedAt ? <Text style={styles.updatedAt}>Atualizado às {formatTime(lastLoadedAt)}</Text> : null}
            <Text style={styles.updatedAt}>{dataSource === "live" ? "Origem: sistema" : "Origem: aparelho"}</Text>
          </View>
          <Pressable onPress={() => { void load(); }} disabled={loading} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
            <Text style={styles.refreshText}>{loading ? "..." : "Atualizar"}</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View style={styles.warningStrip}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>{loadError}</Text>
          </View>
        ) : null}
        {lastLoadedAt && isStale(lastLoadedAt) ? (
          <View style={styles.warningStrip}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>Os dados podem estar desatualizados. Atualize quando a conexão responder.</Text>
          </View>
        ) : null}
        {dataSource === "cache" ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Modo offline</Text>
            <Text style={styles.infoText}>Esta tela está usando os dados salvos no aparelho. Atualize assim que a conexão voltar.</Text>
          </View>
        ) : null}
        {queuePending ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Pendências locais</Text>
            <Text style={styles.infoText}>{queuePending} registro{queuePending === 1 ? "" : "s"} ainda aguardando sincronização com o sistema.</Text>
          </View>
        ) : null}
        {queueLastError ? (
          <View style={styles.warningStrip}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>Última falha de sincronização: {queueLastError}</Text>
          </View>
        ) : null}

        {isReadOnlyRole(session) ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Modo consulta</Text>
            <Text style={styles.infoText}>Este acesso pode consultar informações, sem registrar novas ações.</Text>
          </View>
        ) : null}
        {isUnitSelectionPending(session) ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Unidade pendente</Text>
            <Text style={styles.infoText}>A sessão exige unidade selecionada. Enquanto isso não vier do backend, algumas ações ficam restritas.</Text>
          </View>
        ) : null}

        {variant === "home" ? (
          <View style={styles.quickActions}>
            {branding.features.deliveries && allowDeliveryShortcut ? <QuickAction icon="cube-outline" label={branding.labels.deliveries} tone="delivery" badge={pendingDeliveryCount ? String(pendingDeliveryCount) : undefined} onPress={onOpenDelivery} /> : null}
            {branding.features.people && allowFaceShortcut ? <QuickAction icon="people-outline" label={branding.labels.people} tone="people" onPress={onOpenFace} /> : null}
            {branding.features.accesses ? <QuickAction icon="swap-horizontal-outline" label={branding.labels.accesses} tone="access" onPress={() => setFocus("accesses")} /> : null}
          </View>
        ) : null}

        {variant === "home" && pendingDeliveryCount ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Encomendas na portaria</Text>
            <Text style={styles.infoText}>{pendingDeliveryCount} aguardando retirada.</Text>
          </View>
        ) : null}

        {focus === "home" && variant === "home" ? (
          <>
            {recentRelevantLogs.length ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Últimos acessos</Text>
                <Text style={styles.summaryText}>Feed rápido de moradores e prestadores.</Text>
                <View style={styles.feedMetaRow}>
                  <Text style={styles.feedMetaText}>Moradores: {residentAccessCount}</Text>
                  <Text style={styles.feedMetaText}>Prestadores: {providerAccessCount}</Text>
                </View>
                <View style={styles.list}>
                  {recentRelevantLogs.map((item) => (
                    <AccessFeedItem key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Últimos acessos</Text>
                <Text style={styles.summaryText}>Nenhuma entrada ou saída recente de locatários e prestadores foi encontrada hoje.</Text>
              </View>
            )}
          </>
        ) : focus === "accesses" ? (
          <>
            <Section
              title={branding.labels.accesses}
              actionLabel="Voltar"
              onAction={() => setFocus("home")}
              empty=""
            >
              <View style={styles.searchPanel}>
                <Text style={styles.searchPanelTitle}>Buscar pessoa</Text>
                <SearchField value={searchQuery} onChangeText={setSearchQuery} onSubmit={runGlobalSearch} onClear={clearGlobalSearch} />
                <Text style={styles.searchMinHint}>Digite pelo menos 2 caracteres.</Text>
                {restoredSearch && searchQuery ? (
                  <View style={styles.searchRestoreRow}>
                    <Text style={styles.searchMinHint}>Última busca restaurada neste aparelho.</Text>
                    <Pressable onPress={clearGlobalSearch} style={({ pressed }) => [styles.clearRestoredSearch, pressed && styles.pressed]}>
                      <Text style={styles.clearRestoredSearchText}>Limpar</Text>
                    </Pressable>
                  </View>
                ) : null}
                <View style={styles.searchPanelRow}>
                  <Pressable
                    disabled={!canRunSearch || searchingPeople}
                    onPress={() => { void runGlobalSearch(); }}
                    style={({ pressed }) => [styles.primaryButton, (!canRunSearch || searchingPeople) && styles.disabledAction, pressed && styles.pressed]}
                  >
                    <Text style={styles.primaryButtonText}>{searchingPeople ? "Buscando..." : "Buscar"}</Text>
                  </Pressable>
                </View>
                {searchTouched && !searchingPeople && !searchResults.length ? (
                  <View style={styles.searchEmpty}>
                    <Text style={styles.searchEmptyTitle}>Nenhum resultado</Text>
                    <Text style={styles.searchEmptyText}>A busca não encontrou pessoas com esse termo.</Text>
                  </View>
                ) : null}
                {searchAggregateMeta ? (
                  <Text style={styles.searchPanelText}>
                    Também foram encontrados {searchAggregateMeta.deliveries} registro{searchAggregateMeta.deliveries === 1 ? "" : "s"} de encomenda e {searchAggregateMeta.accessLogs} acesso{searchAggregateMeta.accessLogs === 1 ? "" : "s"}.
                  </Text>
                ) : null}
                {searchResults.length ? (
                  <View style={styles.list}>
                    {searchResults.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <View style={styles.cardHead}>
                          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.badge}>{personCategoryText(item)}</Text>
                        </View>
                        <Text style={styles.meta}>Unidade: {displayPersonUnit(item)}</Text>
                        {personAttentionText(item) ? <Text style={styles.actionHint}>{personAttentionText(item)}</Text> : null}
                        <View style={styles.resultActions}>
                          {branding.features.deliveries && allowDeliveryShortcut ? <QuickMini label={branding.labels.deliveries} onPress={() => onOpenDeliveryWithSearch(displayPersonUnit(item) || item.name)} /> : null}
                          {branding.features.people && allowFaceShortcut ? <QuickMini label={branding.labels.people} onPress={() => onOpenFaceWithSearch(item.name)} /> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Previsões do dia</Text>
                <View style={styles.filterRow}>
                  <FilterChip active={visitCategoryFilter === "resident"} label="Locatários" onPress={() => setVisitCategoryFilter("resident")} />
                  <FilterChip active={visitCategoryFilter === "provider"} label="Prestadores" onPress={() => setVisitCategoryFilter("provider")} />
                  <FilterChip active={visitCategoryFilter === "all"} label="Todos" onPress={() => setVisitCategoryFilter("all")} />
                </View>
              </View>

              <View style={styles.stats}>
                <Stat icon="calendar-outline" label="Previstos" value={scheduledResidentsAndProviders.length} onPress={() => setFocus("scheduled")} />
                <Stat icon="walk-outline" label="Chegaram" value={arrivedResidentsAndProviders.length} onPress={() => setFocus("arrived")} />
                <Stat icon="business-outline" label="No local" value={insideResidentsAndProviders.length} onPress={() => setFocus("inside")} />
                <Stat icon="exit-outline" label="Saídas" value={completedResidentsAndProviders.length} onPress={() => setFocus("completed")} />
              </View>

              <Text style={styles.summaryTitle}>Últimos acessos</Text>
              {recentRelevantLogs.length ? (
                <View style={styles.list}>
                  {recentRelevantLogs.map((item) => (
                    <AccessFeedItem key={`detail-${item.id}`} item={item} />
                  ))}
                </View>
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Sem acessos recentes</Text>
                  <Text style={styles.infoText}>Nenhuma entrada ou saída recente de locatários e prestadores foi encontrada hoje.</Text>
                </View>
              )}
            </Section>
          </>
        ) : (
          <Section
            title={detailTitle}
            actionLabel="Voltar"
            onAction={() => setFocus("accesses")}
            empty={`Nenhum registro em ${detailTitle.toLowerCase()} para o filtro atual.`}
          >
            {detailItems.map((item) => (
              <ForecastItem
                key={`${focus}-${getVisitForecastCanonicalId(item)}`}
                item={item}
                tone={focus === "completed" ? "success" : focus === "inside" ? "inside" : undefined}
                actionLabel={
                  allowVisitActions
                    ? focus === "scheduled"
                      ? "Registrar chegada"
                      : focus === "arrived" || focus === "inside"
                        ? "Registrar saída"
                        : undefined
                    : undefined
                }
                loading={savingStatusId === getVisitForecastCanonicalId(item)}
                onAction={
                  allowVisitActions
                    ? focus === "scheduled"
                      ? () => void changeForecastStatus(item, "ARRIVED")
                      : focus === "arrived" || focus === "inside"
                        ? () => void changeForecastStatus(item, "EXPIRED")
                        : undefined
                    : undefined
                }
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SearchField({
  value,
  onChangeText,
  onSubmit,
  onClear
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchInputOuter}>
      <Ionicons name="search-outline" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Digite para localizar"
        placeholderTextColor="#6F7C8E"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInputText}
      />
      {value ? (
        <Pressable onPress={onClear} style={({ pressed }) => [styles.clearSearchButton, pressed && styles.pressed]}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickMini({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickMini, pressed && styles.pressed]}>
      <Text style={styles.quickMiniText}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  tone,
  badge,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: "delivery" | "people" | "access";
  badge?: string;
  onPress: () => void;
}) {
  const palette = quickActionPalette(tone);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed
      ]}
    >
      <Ionicons name={icon} size={20} color={palette.ink} />
      <Text style={[styles.quickActionText, { color: palette.ink }]}>{label}</Text>
      {badge ? (
        <View style={[styles.quickActionBadge, { backgroundColor: palette.ink }]}>
          <Text style={styles.quickActionBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  icon,
  label,
  value,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.primaryDark} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  empty,
  children
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {hasItems ? <View style={styles.list}>{items}</View> : <View style={styles.emptyCard}><Text style={styles.empty}>{empty}</Text></View>}
    </View>
  );
}

function ForecastItem({
  item,
  tone,
  actionLabel,
  loading,
  onAction
}: {
  item: VisitForecast;
  tone?: "success" | "inside";
  actionLabel?: string;
  loading?: boolean;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.card, tone === "success" && styles.cardSuccess, tone === "inside" && styles.cardInside]}>
      <View style={styles.cardHead}>
        <Text style={styles.name} numberOfLines={1}>{item.visitorName}</Text>
        <Text style={styles.badge}>{statusText(item.status)}</Text>
      </View>
      <Text style={styles.meta}>Unidade: {displayUnit(item.unitName, item.unitId)}</Text>
      {item.residentUserName ? <Text style={styles.meta}>Responsável: {item.residentUserName}</Text> : null}
      <Text style={styles.meta}>Tipo: {normalizeVisitCategory(item)}</Text>
      <Text style={styles.meta}>Entrada prevista: {formatTime(item.expectedEntryAt)}</Text>
      <Text style={styles.meta}>Saída prevista: {formatTime(item.expectedExitAt)}</Text>
      {item.arrivedAt ? <Text style={styles.arrived}>Chegou às {formatTime(item.arrivedAt)}</Text> : null}
      {item.departedAt ? <Text style={styles.meta}>Saiu às {formatTime(item.departedAt)}</Text> : null}
      {item.notes ? <Text style={styles.meta}>Observação: {item.notes}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable disabled={loading} onPress={onAction} style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}>
          <Text style={styles.cardActionText}>{loading ? "Salvando..." : actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AccessFeedItem({ item }: { item: AccessLog }) {
  const action = item.direction === "EXIT" ? "Saiu" : "Entrou";
  const category = accessLogCategoryText(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.name} numberOfLines={1}>{item.personName ?? item.userName ?? item.classificationLabel}</Text>
        <Text style={styles.badge}>{action}</Text>
      </View>
      <Text style={styles.meta}>Tipo: {category}</Text>
      <Text style={styles.meta}>Unidade: {displayUnit(item.unitLabel, item.unitId)}</Text>
      <Text style={styles.meta}>Horário: {formatTime(item.timestamp)}</Text>
      <Text style={styles.meta}>Situação: {statusText(item.result)}</Text>
    </View>
  );
}

function filterForecastsByCategory(items: VisitForecast[], filter: VisitCategoryFilter) {
  if (filter === "all") return items;
  if (filter === "resident") return items.filter((item) => isResidentVisit(item));
  if (filter === "provider") return items.filter((item) => isProviderVisit(item));
  return items.filter((item) => !isResidentVisit(item) && !isProviderVisit(item));
}

function isResidentVisit(item: VisitForecast) {
  const value = `${item.category} ${item.categoryLabel}`.toLowerCase();
  return value.includes("locat") || value.includes("morad") || value.includes("resident");
}

function isProviderVisit(item: VisitForecast) {
  const value = `${item.category} ${item.categoryLabel}`.toLowerCase();
  return value.includes("prest") || value.includes("service");
}

function accessLogCategoryText(item: AccessLog) {
  if (isResidentLog(item)) return "Locatário";
  if (isProviderLog(item)) return "Prestador";
  return item.classificationLabel || "Pessoa";
}

function isResidentLog(item: AccessLog) {
  const value = `${item.classification} ${item.classificationLabel}`.toLowerCase();
  return value.includes("locat") || value.includes("morad") || value.includes("resident");
}

function isProviderLog(item: AccessLog) {
  const value = `${item.classification} ${item.classificationLabel}`.toLowerCase();
  return value.includes("prest") || value.includes("service");
}

function isResidentOrProviderLog(item: AccessLog) {
  return isResidentLog(item) || isProviderLog(item);
}

function normalizeVisitCategory(item: VisitForecast) {
  if (isResidentVisit(item)) return "Locatário ou morador";
  if (isProviderVisit(item)) return "Prestador";
  return item.categoryLabel || "Outro";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isOfflineError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("network request failed") || normalized.includes("failed to fetch") || normalized.includes("timeout");
}

function isStale(value: string) {
  return Date.now() - new Date(value).getTime() > 5 * 60 * 1000;
}

function isOlderThanHours(value: string | undefined, hours: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() > hours * 60 * 60 * 1000;
}

function isTodayIso(value: string) {
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function quickActionPalette(tone: "delivery" | "people" | "access") {
  if (tone === "delivery") {
    return {
      background: "#EAF3FF",
      border: "#BCD4F0",
      ink: "#1E5FA8"
    };
  }

  if (tone === "people") {
    return {
      background: "#EEF7F1",
      border: "#C9E2CF",
      ink: "#2C6A4B"
    };
  }

  return {
    background: "#FFF4E8",
    border: "#F0D3AE",
    ink: "#9A5A1A"
  };
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14, padding: 16, paddingBottom: 160 },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  help: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 4 },
  updatedAt: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  refresh: { alignItems: "center", borderColor: colors.line, borderRadius: 8, borderWidth: 1, minWidth: 96, paddingHorizontal: 12, paddingVertical: 9 },
  refreshText: { color: colors.primaryDark, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.78 },
  disabledAction: { opacity: 0.55 },
  warningStrip: { alignItems: "center", backgroundColor: "#FFF7E8", borderColor: "#F0D39A", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  warningText: { color: colors.warning, flex: 1, fontSize: 13, fontWeight: "800" },
  infoCard: { backgroundColor: "#F4F7FB", borderColor: colors.line, borderRadius: 8, borderWidth: 1, gap: 4, padding: 12 },
  infoTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: "900" },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "center", minWidth: "48%", minHeight: 60, paddingHorizontal: 12, paddingVertical: 10 },
  quickActionText: { color: colors.primaryDark, fontSize: 15, fontWeight: "900" },
  searchPanel: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 },
  searchPanelTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  searchPanelText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  searchMinHint: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  searchRestoreRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  clearRestoredSearch: { paddingHorizontal: 2, paddingVertical: 2 },
  clearRestoredSearchText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  searchPanelRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end" },
  searchInputOuter: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 12 },
  searchInputText: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 0 },
  clearSearchButton: { alignItems: "center", justifyContent: "center" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 8, justifyContent: "center", minWidth: 104, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  searchEmpty: { backgroundColor: "#F4F7FB", borderColor: colors.line, borderRadius: 8, borderWidth: 1, gap: 4, padding: 12 },
  searchEmptyTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  searchEmptyText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  resultActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  quickMini: { backgroundColor: "#F4F7FB", borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  quickMiniText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  quickActionBadge: { borderRadius: 999, minWidth: 22, paddingHorizontal: 7, paddingVertical: 3 },
  quickActionBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "center" },
  summaryCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  summaryText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  feedMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  feedMetaText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { backgroundColor: "#F4F7FB", borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "#E8F1FB", borderColor: "#C9DCF4" },
  filterChipText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: colors.primaryDark },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1, minWidth: "47%", padding: 12 },
  statValue: { color: colors.primaryDark, fontSize: 26, fontWeight: "900", textAlign: "center" },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: 2, textAlign: "center" },
  section: { gap: 8 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sectionAction: { paddingHorizontal: 2, paddingVertical: 2 },
  sectionActionText: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  list: { gap: 10 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 8, borderWidth: 1, gap: 5, padding: 12 },
  cardSuccess: { borderColor: "#C9DCF4", backgroundColor: "#FAFCFF" },
  cardInside: { borderColor: "#BBDDD3", backgroundColor: "#F7FAFE" },
  cardHead: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  name: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "800" },
  badge: { backgroundColor: "#E8F1FB", borderRadius: 8, color: colors.primaryDark, fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4 },
  meta: { color: colors.muted, fontSize: 13 },
  arrived: { color: colors.primaryDark, fontSize: 13, fontWeight: "800" },
  actionHint: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  cardAction: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: 8, marginTop: 6, paddingHorizontal: 12, paddingVertical: 8 },
  cardActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  emptyCard: { backgroundColor: "#F4F7FB", borderColor: colors.line, borderRadius: 8, borderWidth: 1, padding: 12 },
  empty: { color: colors.muted, fontSize: 14 }
});





