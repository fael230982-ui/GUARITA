import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { apiClient } from "../api/client";
import { AccessLog, AlertTriageRecord, AlertViewFilter, AuthSession, OperationalAlert } from "../types";
import { colors } from "../theme";
import { normalizeAccessLogToOperationalAlert } from "../utils/alerts";
import { cameraMediaFieldText, getPreferredCameraMedia, hasAnyCameraMedia } from "../utils/cameraMedia";
import { alertSeverityText, alertTypeText, displayUnit, statusText } from "../utils/display";
import { isAlertOperationEvent, subscribeOperationEvents } from "../utils/operationEvents";
import { isTodayIso } from "../utils/operational";
import {
  loadAlertsCache,
  loadAlertsTriageForOperator,
  loadAlertsViewState,
  saveAlertsCache,
  saveAlertsTriageForOperator,
  saveAlertsViewState
} from "../utils/storage";
import { TextField } from "../components/TextField";

type Props = {
  session: AuthSession;
  initialFilter?: AlertViewFilter;
  initialQuery?: string;
  initialVersion?: number;
  onAlertCountChange?: (count: number) => void;
};

export function AlertsScreen({
  session,
  initialFilter = "all",
  initialQuery = "",
  initialVersion = 0,
  onAlertCountChange
}: Props) {
  const [backendAlerts, setBackendAlerts] = useState<OperationalAlert[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | undefined>();
  const [lastLoadedAt, setLastLoadedAt] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"live" | "cache">("live");
  const [filter, setFilter] = useState<AlertViewFilter>("all");
  const [query, setQuery] = useState("");
  const [triage, setTriage] = useState<Record<string, AlertTriageRecord>>({});
  const [viewHydrated, setViewHydrated] = useState(false);
  const [restoredView, setRestoredView] = useState(false);
  const [contextApplied, setContextApplied] = useState(false);

  const alerts = useMemo(() => {
    const baseAlerts = backendAlerts.length
      ? backendAlerts.filter((item) => isTodayIso(item.occurredAt))
      : logs
          .filter((item) => isTodayIso(item.timestamp) && item.result === "DENIED")
          .map(normalizeAccessLogToOperationalAlert);

    return baseAlerts
      .map((item) => {
        const localTriage = triage[item.alertId];
        return localTriage
          ? {
              ...item,
              alertStatus: localTriage.status,
              localUpdatedAt: localTriage.updatedAt,
              localOperatorId: localTriage.operatorId
            }
          : item;
      })
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  }, [backendAlerts, logs, triage]);

  const filteredAlerts = useMemo(() => {
    const base =
      filter === "new"
        ? alerts.filter((item) => item.alertStatus === "NEW")
        : filter === "on_hold"
          ? alerts.filter((item) => item.alertStatus === "ON_HOLD")
          : filter === "resolved"
            ? alerts.filter((item) => item.alertStatus === "RESOLVED")
        : filter === "high"
          ? alerts.filter((item) => item.alertSeverity === "HIGH")
          : filter === "critical"
            ? alerts.filter((item) => item.alertSeverity === "CRITICAL")
            : alerts;

    const text = query.trim().toLowerCase();
    if (!text || text.length < 2) {
      return base;
    }

    return base.filter((item) =>
      [
        item.alertId,
        item.alertType,
        item.alertSeverity,
        item.alertStatus,
        item.cameraId,
        item.entityId,
        item.personName,
        item.unitLabel,
        item.message
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [alerts, filter, query]);

  const criticalCount = useMemo(() => alerts.filter((item) => item.alertSeverity === "CRITICAL").length, [alerts]);
  const highCount = useMemo(() => alerts.filter((item) => item.alertSeverity === "HIGH").length, [alerts]);
  const openCount = useMemo(() => alerts.filter((item) => item.alertStatus === "NEW").length, [alerts]);
  const reviewCount = useMemo(() => alerts.filter((item) => item.alertStatus === "ON_HOLD").length, [alerts]);
  const resolvedCount = useMemo(() => alerts.filter((item) => item.alertStatus === "RESOLVED").length, [alerts]);

  useEffect(() => {
    onAlertCountChange?.(openCount);
  }, [onAlertCountChange, openCount]);

  useEffect(() => {
    async function hydrateTriage() {
      const saved = await loadAlertsTriageForOperator(session.operatorId);
      setTriage(saved);
    }

    void hydrateTriage();
  }, [session.operatorId]);

  useEffect(() => {
    async function persist() {
      await saveAlertsTriageForOperator(session.operatorId, triage);
    }

    void persist();
  }, [session.operatorId, triage]);

  async function load(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const result = await apiClient.listAlerts({ page: 1, limit: 100 });
      setBackendAlerts(result);
      setLogs([]);
      setLastLoadedAt(new Date().toISOString());
      setDataSource("live");
      await saveAlertsCache({ alerts: result });
    } catch {
      try {
        const fallbackLogs = await apiClient.listAccessLogs();
        setBackendAlerts([]);
        setLogs(fallbackLogs);
        setLastLoadedAt(new Date().toISOString());
        setDataSource("live");
        await saveAlertsCache({ logs: fallbackLogs });
      } catch {
        const cached = await loadAlertsCache();
        if (cached?.alerts?.length) {
          setBackendAlerts(cached.alerts);
          setLogs([]);
          setLastLoadedAt(cached.savedAt);
          setDataSource("cache");
        } else if (cached?.logs?.length) {
          setBackendAlerts([]);
          setLogs(cached.logs);
          setLastLoadedAt(cached.savedAt);
          setDataSource("cache");
        }
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    async function hydrateViewState() {
      const saved = await loadAlertsViewState();
      if (saved?.operatorId && saved.operatorId !== session.operatorId) {
        setViewHydrated(true);
        return;
      }
      if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
        if (
          saved.filter === "all" ||
          saved.filter === "new" ||
          saved.filter === "on_hold" ||
          saved.filter === "resolved" ||
          saved.filter === "high" ||
          saved.filter === "critical"
        ) {
          setFilter(saved.filter);
        }
        setQuery(saved.query ?? "");
        if (saved.filter !== "all" || saved.query?.trim()) {
          setRestoredView(true);
        }
      }
      setViewHydrated(true);
    }

    void hydrateViewState();
  }, [session.operatorId]);

  useEffect(() => {
    if (!viewHydrated) {
      return;
    }

    void saveAlertsViewState({ filter, query, operatorId: session.operatorId });
  }, [filter, query, session.operatorId, viewHydrated]);

  useEffect(() => {
    setRestoredView(false);
    setContextApplied(Boolean(initialQuery.trim()) || initialFilter !== "all");
    setFilter(initialFilter);
    setQuery(initialQuery);
  }, [initialFilter, initialQuery, initialVersion]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeOperationEvents((event) => {
      if (!isAlertOperationEvent(event)) {
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Alertas</Text>
          <Text style={styles.subtitle}>Alertas operacionais derivados dos eventos do dia.</Text>
          {lastLoadedAt ? <Text style={styles.updatedAt}>Atualizado às {formatTime(lastLoadedAt)}</Text> : null}
          <Text style={styles.updatedAt}>{dataSource === "live" ? "Origem: sistema" : "Origem: cache do aparelho"}</Text>
        </View>
        <Pressable onPress={() => { void load(); }} disabled={loading} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
          <Text style={styles.refreshText}>{loading ? "..." : "Atualizar"}</Text>
        </Pressable>
      </View>

      {lastLoadedAt && isStale(lastLoadedAt) ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Dados podem estar antigos</Text>
          <Text style={styles.warningText}>Atualize quando a conexão responder para revisar alertas mais recentes.</Text>
        </View>
      ) : null}
      {dataSource === "cache" ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Usando dados do aparelho</Text>
          <Text style={styles.warningText}>A tela está usando o cache local salvo anteriormente. Confirme no sistema quando a conexão voltar.</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <SummaryCard label="Novos" value={openCount} tone="danger" />
        <SummaryCard label="Em espera" value={reviewCount} tone="warning" />
        <SummaryCard label="Alta" value={highCount} tone="warning" />
        <SummaryCard label="Crítica" value={criticalCount} tone="danger" />
      </View>

      <View style={styles.operationalCard}>
        <Text style={styles.operationalTitle}>Leitura operacional</Text>
        <Text style={styles.operationalText}>
          {openCount
            ? `${openCount} alerta${openCount === 1 ? "" : "s"} novo${openCount === 1 ? "" : "s"} hoje. Priorize severidade crítica e alta.`
            : "Nenhum alerta operacional novo hoje."}
        </Text>
      </View>

      {contextApplied ? (
        <View style={styles.contextCard}>
          <Text style={styles.contextTitle}>Recorte vindo de outra tela</Text>
          <Text style={styles.contextText}>
            Esta lista foi aberta com contexto operacional já aplicado para acelerar a triagem.
          </Text>
          <Pressable
            onPress={() => {
              setContextApplied(false);
              setFilter("all");
              setQuery("");
            }}
            style={styles.contextAction}
          >
            <Text style={styles.contextActionText}>Limpar recorte</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.filters}>
        <FilterChip label={`Tudo (${alerts.length})`} active={filter === "all"} onPress={() => { setRestoredView(false); setFilter("all"); }} />
        <FilterChip label={`Novos (${openCount})`} active={filter === "new"} onPress={() => { setRestoredView(false); setFilter("new"); }} />
        <FilterChip label={`Em espera (${reviewCount})`} active={filter === "on_hold"} onPress={() => { setRestoredView(false); setFilter("on_hold"); }} />
        <FilterChip label={`Resolvidos (${resolvedCount})`} active={filter === "resolved"} onPress={() => { setRestoredView(false); setFilter("resolved"); }} />
        <FilterChip label={`Alta (${highCount})`} active={filter === "high"} onPress={() => { setRestoredView(false); setFilter("high"); }} />
        <FilterChip label={`Crítica (${criticalCount})`} active={filter === "critical"} onPress={() => { setRestoredView(false); setFilter("critical"); }} />
      </View>

      <View style={styles.searchBox}>
        <TextField
          label="Buscar alerta"
          value={query}
          onChangeText={(value) => {
            setRestoredView(false);
            setQuery(value);
          }}
          placeholder="Pessoa, unidade, motivo ou tipo"
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {restoredView && (filter !== "all" || query.trim()) ? (
        <View style={styles.searchHintRow}>
          <Text style={styles.searchResultHint}>Filtro ou busca restaurados automaticamente do último uso nesta tela.</Text>
          <Pressable
            onPress={() => {
              setRestoredView(false);
              setFilter("all");
              setQuery("");
            }}
            style={styles.clearSearch}
          >
            <Text style={styles.clearSearchText}>Limpar</Text>
          </Pressable>
        </View>
      ) : null}
      {(filter !== "all" || query.trim()) ? (
        <Pressable
          onPress={() => {
            setRestoredView(false);
            setFilter("all");
            setQuery("");
          }}
          style={styles.clearFilters}
        >
          <Text style={styles.clearFiltersText}>Limpar filtros e busca</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.alertId}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum alerta encontrado</Text>
            <Text style={styles.emptyText}>
              {query.trim() ? "Tente outro termo de busca ou ajuste o filtro atual." : "Não há alertas operacionais com o recorte atual."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AlertCard
            item={item}
            busy={updatingAlertId === item.alertId}
            onMarkReview={() => {
              void updateTriage(item.alertId, "ON_HOLD");
            }}
            onMarkResolved={() => {
              void updateTriage(item.alertId, "RESOLVED");
            }}
            onReopen={() => {
              void updateTriage(item.alertId, "NEW");
            }}
          />
        )}
      />
    </View>
    </KeyboardAvoidingView>
  );

  async function updateTriage(alertId: string, status: AlertTriageRecord["status"]) {
    try {
      setUpdatingAlertId(alertId);
      const response = await apiClient.updateAlertWorkflow(alertId, status);
      const updatedAt = new Date().toISOString();

      setTriage((current) => ({
        ...current,
        [alertId]: {
          alertId,
          status,
          updatedAt,
          operatorId: session.operatorId
        }
      }));

      if (backendAlerts.length) {
        setBackendAlerts((current) =>
          current.map((item) =>
            item.alertId === alertId
              ? {
                  ...item,
                  alertStatus: response.workflowStatus ?? status,
                  description: response.description ?? item.description ?? null,
                  message: response.description ?? item.message ?? null,
                  localUpdatedAt: updatedAt,
                  localOperatorId: session.operatorId
                }
              : item
          )
        );
      }
    } catch (error) {
      Alert.alert("Alertas", error instanceof Error ? error.message : "Não foi possível atualizar o workflow do alerta.");
    } finally {
      setUpdatingAlertId(undefined);
    }
  }
}

function FilterChip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "warning" | "danger";
}) {
  return (
    <View style={[styles.summaryCard, tone === "danger" ? styles.summaryDanger : styles.summaryWarning]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AlertCard({
  item,
  busy,
  onMarkReview,
  onMarkResolved,
  onReopen
}: {
  item: OperationalAlert;
  busy?: boolean;
  onMarkReview: () => void;
  onMarkResolved: () => void;
  onReopen: () => void;
}) {
  const preferredMedia = getPreferredCameraMedia(item);

  return (
    <View style={[styles.card, item.alertSeverity === "CRITICAL" && styles.cardCritical]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.personName ?? item.title ?? alertTypeText(item.alertType)}
        </Text>
        <Text style={[styles.badge, item.alertSeverity === "CRITICAL" ? styles.badgeCritical : styles.badgeDanger]}>
          {alertSeverityText(item.alertSeverity)}
        </Text>
      </View>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, styles.tagDanger]}>{alertTypeText(item.alertType)}</Text>
        <Text style={styles.tag}>{statusText(item.alertStatus)}</Text>
      {item.cameraId ? <Text style={styles.tag}>Câmera vinculada</Text> : null}
        {item.snapshotUrl ? <Text style={styles.tag}>Snapshot disponível</Text> : null}
        {preferredMedia ? <Text style={styles.tag}>Mídia preferida: {cameraMediaFieldText(preferredMedia.field)}</Text> : null}
      </View>
      <Text style={styles.meta}>Horário: {formatTime(item.occurredAt)}</Text>
      <Text style={styles.meta}>Unidade: {displayUnit(item.unitLabel, item.unitId)}</Text>
      {item.cameraId && !hasAnyCameraMedia(item) ? <Text style={styles.meta}>Evento com câmera vinculada, sem mídia publicada no payload atual.</Text> : null}
      {item.localUpdatedAt ? <Text style={styles.meta}>Tratativa atualizada às {formatTime(item.localUpdatedAt)}</Text> : null}
      {item.message ? <Text style={styles.message}>Motivo: {item.message}</Text> : null}
      {busy ? <Text style={styles.meta}>Atualizando tratativa...</Text> : null}
      <Text style={styles.actionHint}>{alertActionText(item.alertStatus)}</Text>
      <View style={styles.actionsRow}>
        {item.alertStatus !== "ON_HOLD" ? (
          <Pressable disabled={busy} onPress={onMarkReview} style={[styles.actionChip, styles.actionChipNeutral, busy && styles.actionChipDisabled]}>
            <Text style={styles.actionChipText}>Em espera</Text>
          </Pressable>
        ) : null}
        {item.alertStatus !== "RESOLVED" ? (
          <Pressable disabled={busy} onPress={onMarkResolved} style={[styles.actionChip, styles.actionChipSuccess, busy && styles.actionChipDisabled]}>
            <Text style={[styles.actionChipText, styles.actionChipTextSuccess]}>Resolver</Text>
          </Pressable>
        ) : null}
        {item.alertStatus !== "NEW" ? (
          <Pressable disabled={busy} onPress={onReopen} style={[styles.actionChip, styles.actionChipDanger, busy && styles.actionChipDisabled]}>
            <Text style={[styles.actionChipText, styles.actionChipTextDanger]}>Voltar para fila</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isOlderThanHours(value: string | undefined, hours: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() > hours * 60 * 60 * 1000;
}

function isStale(value: string) {
  return Date.now() - new Date(value).getTime() > 5 * 60 * 1000;
}

function alertActionText(status: string) {
  if (status === "ON_HOLD") {
    return "Ação atual: alerta em espera. Conferir evidências e retomar quando necessário.";
  }

  if (status === "RESOLVED") {
    return "Ação atual: alerta resolvido. Reabrir se surgir nova evidência.";
  }

  return "Ação atual: manter como alerta operacional novo até a conferência manual.";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  headerText: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2
  },
  updatedAt: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  refresh: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  refreshText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.78
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  summaryCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    justifyContent: "center",
    padding: 10
  },
  summaryWarning: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F0D39A"
  },
  summaryDanger: {
    backgroundColor: "#FCEEEE",
    borderColor: "#F3C8C5"
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  operationalCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 14,
    padding: 12
  },
  operationalTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  operationalText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  warningCard: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F0D39A",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 14,
    padding: 12
  },
  warningTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "900"
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18
  },
  contextCard: {
    backgroundColor: "#F0F6FF",
    borderColor: "#C9DCF4",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginBottom: 14,
    padding: 12
  },
  contextTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  contextText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  contextAction: {
    alignSelf: "flex-start",
    paddingVertical: 2
  },
  contextActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: "#FCEEEE",
    borderColor: "#F3C8C5"
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  filterChipTextActive: {
    color: colors.danger
  },
  searchBox: {
    marginBottom: 12
  },
  searchHintRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  searchResultHint: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "700"
  },
  clearSearch: {
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  clearSearchText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  clearFilters: {
    alignSelf: "flex-start",
    marginBottom: 12
  },
  clearFiltersText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  list: {
    gap: 12,
    paddingBottom: 24
  },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 24
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center"
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: "#F0D0CD",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  cardCritical: {
    borderColor: colors.danger,
    borderWidth: 2
  },
  cardHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800"
  },
  badge: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeDanger: {
    backgroundColor: "#FFF3D8",
    color: colors.warning
  },
  badgeCritical: {
    backgroundColor: "#FCEEEE",
    color: colors.danger
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tag: {
    backgroundColor: "#F1F5FA",
    borderRadius: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tagDanger: {
    backgroundColor: "#FCEEEE",
    color: colors.danger
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  },
  message: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  actionHint: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  actionChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  actionChipNeutral: {
    backgroundColor: "#F1F5FA",
    borderColor: colors.line
  },
  actionChipSuccess: {
    backgroundColor: "#F0F6FF",
    borderColor: "#C9DCF4"
  },
  actionChipDanger: {
    backgroundColor: "#FCEEEE",
    borderColor: "#F3C8C5"
  },
  actionChipDisabled: {
    opacity: 0.55
  },
  actionChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  actionChipTextSuccess: {
    color: colors.success
  },
  actionChipTextDanger: {
    color: colors.danger
  }
});



