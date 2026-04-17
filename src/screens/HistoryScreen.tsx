import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { apiClient } from "../api/client";
import { Button } from "../components/Button";
import { QrScannerModal } from "../components/QrScannerModal";
import { TextField } from "../components/TextField";
import { colors } from "../theme";
import { AuthSession, Delivery } from "../types";
import {
  canShowDeliveryRenotify,
  displayDeliveryUnit,
  hasDeliveryLegacyWithdrawalCodeConflict,
  getDeliveryPrimaryWithdrawalCode,
  getDeliveryWithdrawalQrCodeUrl,
  hasDeliveryWithdrawalData,
  isDeliveryAwaitingWithdrawal,
  sanitizeDocumentInput,
  statusText,
  withdrawalMethodText
} from "../utils/display";
import { subscribeQueueState } from "../utils/offlineQueue";
import { isDeliveryOperationEvent, subscribeOperationEvents } from "../utils/operationEvents";
import { canValidateWithdrawals, isReadOnlyRole } from "../utils/permissions";
import { isUnitSelectionPending } from "../utils/sessionScope";
import { loadDeliveriesCache, loadHistoryViewState, saveDeliveriesCache, saveHistoryViewState } from "../utils/storage";

type Props = {
  session: AuthSession;
  deliveries: Delivery[];
  onLocalDeliveriesChange: (deliveries: Delivery[]) => void;
};

export function HistoryScreen({ session, deliveries: localDeliveries, onLocalDeliveriesChange }: Props) {
  const [remoteDeliveries, setRemoteDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [withdrawalCodes, setWithdrawalCodes] = useState<Record<string, string>>({});
  const [validatingId, setValidatingId] = useState<string | undefined>();
  const [renotifyingId, setRenotifyingId] = useState<string | undefined>();
  const [scannerDeliveryId, setScannerDeliveryId] = useState<string | undefined>();
  const [lastLoadedAt, setLastLoadedAt] = useState<string | undefined>();
  const [filter, setFilter] = useState<"all" | "pending" | "withdrawn" | "sync" | "attention">("pending");
  const [query, setQuery] = useState("");
  const [viewHydrated, setViewHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "cache">("live");
  const [restoredView, setRestoredView] = useState(false);
  const [queueLastError, setQueueLastError] = useState<string | undefined>();

  const deliveries = useMemo(() => {
    const merged = [...localDeliveries, ...remoteDeliveries];
    const unique: Delivery[] = [];
    merged.forEach((item) => {
      const currentIndex = unique.findIndex((current) => deliveriesRepresentSameRecord(current, item));
      if (currentIndex === -1) {
        unique.push(item);
        return;
      }

      const current = unique[currentIndex];
      if (current) {
        unique[currentIndex] = pickPreferredDelivery(current, item);
      }
    });

    return unique.sort((a, b) => getTime(b) - getTime(a));
  }, [localDeliveries, remoteDeliveries]);
  const pendingWithdrawal = useMemo(
    () => deliveries.filter((item) => isDeliveryAwaitingWithdrawal(item) && !item.syncPending),
    [deliveries]
  );
  const withdrawnDeliveries = useMemo(
    () => deliveries.filter((item) => !item.syncPending && !isDeliveryAwaitingWithdrawal(item)),
    [deliveries]
  );
  const pendingSync = useMemo(() => deliveries.filter((item) => item.syncPending), [deliveries]);
  const awaitingSystemData = useMemo(
    () => deliveries.filter((item) => !item.syncPending && isDeliveryAwaitingWithdrawal(item) && !hasDeliveryWithdrawalData(item)),
    [deliveries]
  );
  const failedAttempts = useMemo(() => deliveries.filter((item) => Boolean(item.withdrawalFailureReason)), [deliveries]);
  const attentionItems = useMemo(
    () => deliveries.filter((item) => Boolean(item.withdrawalFailureReason) || (!item.syncPending && isDeliveryAwaitingWithdrawal(item) && !hasDeliveryWithdrawalData(item))),
    [deliveries]
  );
  const allowWithdrawalActions = canValidateWithdrawals(session);
  const remoteSystemCount = useMemo(() => remoteDeliveries.length, [remoteDeliveries]);
  const localPendingCount = useMemo(() => localDeliveries.filter((item) => item.syncPending).length, [localDeliveries]);
  const canUseHistorySearch = Boolean(query.trim().length >= 2);
  const handoffSummary = useMemo(
    () => buildDeliveryTurnSummary({
      pendingWithdrawalCount: pendingWithdrawal.length,
      withdrawnCount: withdrawnDeliveries.length,
      pendingSyncCount: pendingSync.length,
      awaitingSystemCount: awaitingSystemData.length,
      failedAttemptCount: failedAttempts.length,
      hasQueueError: Boolean(queueLastError)
    }),
    [awaitingSystemData.length, failedAttempts.length, pendingSync.length, pendingWithdrawal.length, queueLastError, withdrawnDeliveries.length]
  );
  const filteredDeliveries = useMemo(() => {
    const base =
      filter === "pending"
        ? pendingWithdrawal
        : filter === "withdrawn"
          ? withdrawnDeliveries
          : filter === "sync"
            ? pendingSync
            : filter === "attention"
              ? attentionItems
            : deliveries;

    const text = query.trim().toLowerCase();
    if (!text || text.length < 2) return base;

    return base.filter((item) =>
      [
        item.deliveryCompany,
        item.trackingCode,
        getDeliveryPrimaryWithdrawalCode(item),
        item.withdrawalCode,
        item.withdrawnByName,
        item.withdrawalValidatedByUserName,
        item.withdrawalFailureReason,
        displayDeliveryUnit(item)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [attentionItems, deliveries, filter, pendingSync, pendingWithdrawal, query, withdrawnDeliveries]);

  async function load(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const result = await apiClient.listDeliveries();
      setRemoteDeliveries(result);
      setLastLoadedAt(new Date().toISOString());
      setDataSource("live");
      await saveDeliveriesCache(result);
      void reconcileLocalDeliveries(result);
    } catch (error) {
      const cached = await loadDeliveriesCache();
      if (cached) {
        setRemoteDeliveries(cached.data);
        setDataSource("cache");
        setLastLoadedAt(cached.savedAt);
      } else {
        Alert.alert("Encomendas", error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function validateWithdrawal(item: Delivery, manualConfirmation?: boolean) {
    try {
      setValidatingId(item.id);
      const response = await apiClient.validateDeliveryWithdrawal(item.id, withdrawalCodes[item.id], manualConfirmation);
      if (!response.valid) {
        Alert.alert("Retirada", response.message ?? "Código inválido.");
        return;
      }

      setRemoteDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === item.id
            ? {
                ...delivery,
                status: response.status ?? "WITHDRAWN",
                withdrawnAt: response.withdrawnAt ?? delivery.withdrawnAt ?? new Date().toISOString(),
                withdrawnBy: response.withdrawnBy ?? delivery.withdrawnBy,
                withdrawnByName: response.withdrawnByName ?? delivery.withdrawnByName,
                withdrawalValidatedAt: response.withdrawalValidatedAt ?? delivery.withdrawalValidatedAt ?? new Date().toISOString(),
                withdrawalValidatedByUserId: response.withdrawalValidatedByUserId ?? delivery.withdrawalValidatedByUserId,
                withdrawalValidatedByUserName: response.withdrawalValidatedByUserName ?? delivery.withdrawalValidatedByUserName,
                withdrawalValidationMethod: response.withdrawalValidationMethod ?? delivery.withdrawalValidationMethod,
                withdrawalFailureReason: response.withdrawalFailureReason ?? null,
                createdAt: delivery.createdAt,
                receivedAt: delivery.receivedAt
              }
            : delivery
        )
      );
      setWithdrawalCodes((current) => ({ ...current, [item.id]: "" }));
      Alert.alert("Retirada confirmada", response.message ?? "Encomenda liberada com sucesso.");
    } catch (error) {
      Alert.alert("Retirada", error instanceof Error ? error.message : "Não foi possível validar a retirada.");
    } finally {
      setValidatingId(undefined);
    }
  }

  async function renotify(item: Delivery) {
    try {
      setRenotifyingId(item.id);
      const response = await apiClient.renotifyDelivery(item.id);
      setRemoteDeliveries((current) =>
        current.map((delivery) =>
          delivery.id === item.id
            ? {
                ...delivery,
                notificationSentAt: response.notificationSentAt ?? delivery.notificationSentAt
              }
            : delivery
        )
      );
      Alert.alert("Notificação reenviada", `${response.notifiedUsersCount} morador${response.notifiedUsersCount === 1 ? "" : "es"} notificado${response.notifiedUsersCount === 1 ? "" : "s"}.`);
    } catch (error) {
      Alert.alert("Notificação", error instanceof Error ? error.message : "Não foi possível reenviar a notificação.");
    } finally {
      setRenotifyingId(undefined);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    async function hydrateViewState() {
      const saved = await loadHistoryViewState();
      if (saved?.operatorId && saved.operatorId !== session.operatorId) {
        setViewHydrated(true);
        return;
      }
      if (saved && !isOlderThanHours(saved.updatedAt, 12)) {
        if (saved.filter === "all" || saved.filter === "pending" || saved.filter === "withdrawn" || saved.filter === "sync" || saved.filter === "attention") {
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
  }, []);

  useEffect(() => {
    if (!viewHydrated) {
      return;
    }

    void saveHistoryViewState({ filter, query, operatorId: session.operatorId });
  }, [filter, query, session.operatorId, viewHydrated]);

  useEffect(() => {
    let previousPending = 0;

    return subscribeQueueState((state) => {
      setQueueLastError(state.lastError);
      if (!state.syncing && previousPending > 0 && state.pendingCount < previousPending) {
        void load();
      }
      previousPending = state.pendingCount;
    });
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeOperationEvents((event) => {
      if (!isDeliveryOperationEvent(event)) {
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

  async function reconcileLocalDeliveries(remote: Delivery[]) {
    const unresolved = localDeliveries.filter((item) => item.syncPending && !findMatchingRemoteDelivery(item, remote));
    if (unresolved.length !== localDeliveries.length) {
      onLocalDeliveriesChange(unresolved);
    }

    const candidates = unresolved.filter((item) => item.clientRequestId?.trim());
    if (!candidates.length) {
      return;
    }

    const reconciledIds = new Set<string>();
    await Promise.all(
      candidates.map(async (item) => {
        const clientRequestId = item.clientRequestId?.trim();
        if (!clientRequestId) {
          return;
        }

        try {
          const reconciliation = await apiClient.reconcileSyncRequest(clientRequestId);
          if (
            reconciliation.found &&
            reconciliation.isApplied &&
            reconciliation.aggregateType?.toLowerCase() === "delivery"
          ) {
            reconciledIds.add(clientRequestId);
          }
        } catch {
          // Keep local item until a later sync attempt or explicit backend response.
        }
      })
    );

    if (!reconciledIds.size) {
      return;
    }

    onLocalDeliveriesChange(
      unresolved.filter((item) => !item.clientRequestId?.trim() || !reconciledIds.has(item.clientRequestId.trim()))
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={24} style={styles.screen}>
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Histórico de encomendas</Text>
          <Text style={styles.subtitle}>{deliveries.length} encomenda{deliveries.length === 1 ? "" : "s"}</Text>
          {(remoteSystemCount || localPendingCount) ? (
            <Text style={styles.subtitleDetail}>
              {remoteSystemCount} no sistema{localPendingCount ? ` + ${localPendingCount} local${localPendingCount === 1 ? "" : "is"} pendente${localPendingCount === 1 ? "" : "s"}` : ""}
            </Text>
          ) : null}
          {lastLoadedAt ? <Text style={styles.updatedAt}>Atualizado as {formatTime(lastLoadedAt)}</Text> : null}
          <Text style={styles.updatedAt}>{dataSource === "live" ? "Origem: sistema" : "Origem: cache do aparelho"}</Text>
        </View>
        <Pressable onPress={() => { void load(); }} disabled={loading} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
          <Text style={styles.refreshText}>{loading ? "..." : "Atualizar"}</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingTitle}>Atualizando histórico</Text>
          <Text style={styles.loadingText}>Conferindo encomendas e retiradas.</Text>
        </View>
      ) : null}
      {lastLoadedAt && isStale(lastLoadedAt) ? (
        <View style={styles.operationalCard}>
          <Text style={styles.operationalTitle}>Dados podem estar antigos</Text>
          <Text style={styles.operationalText}>A última atualização já passou de alguns minutos. Atualize quando a conexão estiver disponível.</Text>
        </View>
      ) : null}
      {dataSource === "cache" ? (
        <View style={styles.operationalCard}>
          <Text style={styles.operationalTitle}>Dados do aparelho</Text>
          <Text style={styles.operationalText}>O histórico exibido agora veio do cache local salvo anteriormente. Atualize quando a conexão responder para sincronizar com o sistema.</Text>
        </View>
      ) : null}
      {pendingSync.length && dataSource === "cache" ? (
        <View style={styles.operationalCard}>
          <Text style={styles.operationalTitle}>Conferência recomendada</Text>
          <Text style={styles.operationalText}>Existem itens locais pendentes e a tela está usando cache do aparelho. Antes de validar a retirada, atualize assim que a conexão voltar.</Text>
        </View>
      ) : null}
      {isReadOnlyRole(session) ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Perfil em modo consulta</Text>
          <Text style={styles.readOnlyText}>Este acesso pode acompanhar as encomendas, mas não confirmar retirada.</Text>
        </View>
      ) : null}
      {isUnitSelectionPending(session) ? (
        <View style={styles.readOnlyCard}>
          <Text style={styles.readOnlyTitle}>Unidade obrigatória na sessão</Text>
          <Text style={styles.readOnlyText}>A API V4.4 informou que este acesso depende de unidade selecionada. Enquanto isso não vier na sessão, a retirada fica somente em consulta.</Text>
        </View>
      ) : null}
      <View style={styles.operationalCard}>
        <Text style={styles.operationalTitle}>Prioridade do momento</Text>
        <Text style={styles.operationalText}>
          {queueLastError && pendingSync.length
            ? `${pendingSync.length} encomenda${pendingSync.length === 1 ? "" : "s"} com falha recente de sincronização.`
            : pendingSync.length
            ? `${pendingSync.length} encomenda${pendingSync.length === 1 ? "" : "s"} aguardando sincronização com o sistema.`
            : failedAttempts.length
              ? `${failedAttempts.length} tentativa${failedAttempts.length === 1 ? "" : "s"} de retirada com falha registrada hoje.`
              : awaitingSystemData.length
                ? `${awaitingSystemData.length} encomenda${awaitingSystemData.length === 1 ? "" : "s"} ainda sem código ou QR de retirada.`
            : pendingWithdrawal.length
              ? `${pendingWithdrawal.length} encomenda${pendingWithdrawal.length === 1 ? "" : "s"} pronta${pendingWithdrawal.length === 1 ? "" : "s"} para retirada.`
              : "Nenhuma pendência crítica no histórico."}
        </Text>
      </View>
      <View style={styles.operationalCard}>
        <Text style={styles.operationalTitle}>Checklist rápido</Text>
        {queueLastError && pendingSync.length ? <Text style={styles.operationalText}>- Repetir sincronização das encomendas locais quando a conexão estabilizar.</Text> : null}
        {pendingSync.length ? <Text style={styles.operationalText}>- Acompanhar sincronização das encomendas locais.</Text> : null}
        {failedAttempts.length ? <Text style={styles.operationalText}>- Revisar tentativas de retirada com falha.</Text> : null}
        {awaitingSystemData.length ? <Text style={styles.operationalText}>- Conferir entregas sem código ou QR liberado.</Text> : null}
        {pendingWithdrawal.length && !pendingSync.length ? <Text style={styles.operationalText}>- Validar retiradas prontas por código, QR ou confirmação manual.</Text> : null}
        {!pendingSync.length && !failedAttempts.length && !awaitingSystemData.length && !pendingWithdrawal.length ? (
          <Text style={styles.operationalText}>- Nenhuma ação pendente crítica no histórico.</Text>
        ) : null}
      </View>
      <View style={styles.operationalCard}>
        <Text style={styles.operationalTitle}>Resumo para troca de turno</Text>
        {handoffSummary.map((line) => (
          <Text key={line} style={styles.operationalText}>- {line}</Text>
        ))}
      </View>
      <View style={styles.stats}>
        <SummaryCard label="Aguardando retirada" value={pendingWithdrawal.length} tone="warning" />
        <SummaryCard label="Retiradas" value={withdrawnDeliveries.length} tone="success" />
        <SummaryCard label="Pendentes de envio" value={pendingSync.length} tone="default" />
        <SummaryCard label="Sem dados de retirada" value={awaitingSystemData.length} tone="default" />
      </View>
      <View style={styles.filters}>
        <FilterChip label={`Pendentes (${pendingWithdrawal.length})`} active={filter === "pending"} onPress={() => { setRestoredView(false); setFilter("pending"); }} />
        <FilterChip label={`Retiradas (${withdrawnDeliveries.length})`} active={filter === "withdrawn"} onPress={() => { setRestoredView(false); setFilter("withdrawn"); }} />
        <FilterChip label={`Tudo (${deliveries.length})`} active={filter === "all"} onPress={() => { setRestoredView(false); setFilter("all"); }} />
        <FilterChip label={`Sincronização (${pendingSync.length})`} active={filter === "sync"} onPress={() => { setRestoredView(false); setFilter("sync"); }} />
        <FilterChip label={`Atenção (${attentionItems.length})`} active={filter === "attention"} onPress={() => { setRestoredView(false); setFilter("attention"); }} />
      </View>
      {filter !== "all" ? (
        <Text style={styles.filterHint}>
          Exibindo {filter === "pending" ? "encomendas prontas para retirada" : filter === "withdrawn" ? "encomendas já retiradas" : filter === "sync" ? "itens aguardando sincronização" : "itens com falha ou sem dados de retirada"}.
        </Text>
      ) : null}
      {(filter !== "all" || query.trim()) ? (
        <Pressable
          onPress={() => {
            setFilter("all");
            setQuery("");
          }}
          style={styles.resetFilters}
        >
          <Text style={styles.resetFiltersText}>Limpar filtros e busca</Text>
        </Pressable>
      ) : null}
      <View style={styles.searchBox}>
        <TextField
          label="Buscar no histórico"
          value={query}
          onChangeText={(value) => {
            setRestoredView(false);
            setQuery(value);
          }}
          placeholder="Transportadora, rastreio, unidade ou código"
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      {restoredView && (filter !== "all" || query.trim()) ? (
        <View style={styles.searchHintRow}>
          <Text style={styles.searchResultHint}>Filtro ou busca restaurados automaticamente do último uso nesta tela.</Text>
          <View style={styles.searchActions}>
            <Pressable onPress={() => setRestoredView(false)} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>Ocultar</Text>
            </Pressable>
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
        </View>
      ) : null}
      {query.trim() && !canUseHistorySearch ? (
        <Text style={styles.filterHint}>Digite pelo menos 2 caracteres para filtrar o histórico.</Text>
      ) : null}
      {query.trim() ? (
        <View style={styles.searchHintRow}>
          <Text style={styles.searchResultHint}>
            {canUseHistorySearch
              ? `${filteredDeliveries.length} resultado${filteredDeliveries.length === 1 ? "" : "s"} para "${query.trim()}".`
              : "Continue digitando para filtrar o histórico."}
          </Text>
          <Pressable onPress={() => setQuery("")} style={styles.clearSearch}>
            <Text style={styles.clearSearchText}>Limpar busca</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={filteredDeliveries.length ? styles.list : styles.emptyWrap}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{query.trim() ? "Nenhuma encomenda encontrada." : "Nenhuma encomenda neste filtro."}</Text>
            <Text style={styles.emptyText}>
              {query.trim()
                ? "Tente outro termo de busca ou ajuste o filtro acima."
                : "Troque o filtro acima ou atualize a tela para consultar outras encomendas."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemHead}>
              <Text style={styles.company}>{item.deliveryCompany || "Transportadora"}</Text>
              <Text style={[styles.badge, item.syncPending && styles.badgePending]}>
                {item.syncPending ? "Pendente de envio" : statusText(item.status) || "Recebida"}
              </Text>
            </View>
            <View style={styles.tagRow}>
              <Text style={[styles.tag, item.syncPending ? styles.tagWarning : styles.tagNeutral]}>
                {item.syncPending ? "Local" : "Sistema"}
              </Text>
              {item.syncPending && queueLastError ? <Text style={[styles.tag, styles.tagWarning]}>Falha ao enviar</Text> : null}
              <Text style={[styles.tag, !isDeliveryAwaitingWithdrawal(item) ? styles.tagNeutral : styles.tagReady]}>
                {!isDeliveryAwaitingWithdrawal(item) ? "Finalizada" : item.syncPending ? "Aguardando sistema" : "Pronta para retirada"}
              </Text>
              {deliveryPriorityLabel(item) ? <Text style={[styles.tag, styles.tagWarning]}>{deliveryPriorityLabel(item)}</Text> : null}
              {!item.syncPending && isDeliveryAwaitingWithdrawal(item) && !hasDeliveryWithdrawalData(item) ? (
                <Text style={[styles.tag, styles.tagWarning]}>Sem código</Text>
              ) : null}
              {getDeliveryWithdrawalQrCodeUrl(item) ? <Text style={styles.tag}>QR disponível</Text> : null}
              {!isDeliveryAwaitingWithdrawal(item) ? <Text style={[styles.tag, styles.tagNeutral]}>Acompanhamento</Text> : null}
            </View>
            <Text style={styles.meta}>Unidade: {displayDeliveryUnit(item)}</Text>
            <Text style={styles.meta}>Recebida às {formatDateTime(item.receivedAt ?? item.createdAt ?? new Date().toISOString())}</Text>
            <Text style={styles.pickup}>
              {!isDeliveryAwaitingWithdrawal(item)
                ? "Retirada concluída"
                : hasDeliveryWithdrawalData(item)
                ? "Retirada pronta"
                : "Aguardando dados de retirada"}
            </Text>
            {item.receivedBy ? <Text style={styles.meta}>Recebida por operador vinculado ao sistema</Text> : null}
            {hasDeliveryWithdrawalData(item) ? (
              <View style={styles.withdrawalDataCard}>
                <Text style={styles.withdrawalDataTitle}>Retirada</Text>
                {getDeliveryPrimaryWithdrawalCode(item) ? <Text style={styles.withdrawalDataText}>Código protegido no app do operador.</Text> : null}
                {hasDeliveryLegacyWithdrawalCodeConflict(item) ? (
                  <Text style={styles.withdrawalDataText}>Código legado detectado e mantido para compatibilidade.</Text>
                ) : null}
                {getDeliveryWithdrawalQrCodeUrl(item) ? <Text style={styles.withdrawalDataText}>QR code liberado para leitura</Text> : null}
              </View>
            ) : null}
            {item.withdrawalCode ? <Text style={styles.meta}>Código interno protegido</Text> : null}
            <Text style={styles.notify}>
              {item.syncPending && queueLastError
                ? "Falha na última tentativa de sincronização"
                : item.syncPending
                ? "Aguardando sincronização com o sistema"
                : item.notificationStatus
                  ? statusText(item.notificationStatus)
                  : "Notificação em andamento"}
            </Text>
            {item.syncPending && queueLastError ? <Text style={styles.failureText}>Motivo local: {queueLastError}</Text> : null}
            {item.syncPending ? <Text style={styles.meta}>Registro local salvo as {formatDateTime(item.createdAt ?? new Date().toISOString())}</Text> : null}
            {item.syncPending && item.clientType ? <Text style={styles.meta}>Origem local registrada</Text> : null}
            {item.syncPending && item.deviceName ? <Text style={styles.meta}>Dispositivo local registrado</Text> : null}
            {item.syncPending && item.evidenceUrl ? <Text style={styles.meta}>Evidência local registrada</Text> : null}
            {item.notificationSentAt ? (
              <Text style={styles.meta}>Notificação enviada às {formatDateTime(item.notificationSentAt)}</Text>
            ) : null}
            {canShowDeliveryRenotify(item, session) ? (
                <View style={styles.renotifyRow}>
                  <Button
                    compact
                    variant="secondary"
                    loading={renotifyingId === item.id}
                    onPress={() => renotify(item)}
                  >
                    Reenviar notificação
                  </Button>
                </View>
            ) : null}
            <Text style={[styles.actionHint, isDeliveryAwaitingWithdrawal(item) && !item.syncPending && styles.actionHintStrong]}>{deliveryActionText(item)}</Text>
            {item.withdrawalValidatedAt ? (
              <Text style={styles.meta}>Validada às {formatDateTime(item.withdrawalValidatedAt)}</Text>
            ) : null}
            {item.withdrawalValidatedByUserName ? (
              <Text style={styles.meta}>Validada por {item.withdrawalValidatedByUserName}</Text>
            ) : null}
            {item.withdrawnAt ? (
              <Text style={styles.meta}>Retirada às {formatDateTime(item.withdrawnAt)}</Text>
            ) : null}
            {item.withdrawnByName ? (
              <Text style={styles.meta}>Retirada por {item.withdrawnByName}</Text>
            ) : null}
            {item.withdrawalValidationMethod ? (
              <Text style={styles.meta}>Método de validação: {withdrawalMethodText(item.withdrawalValidationMethod)}</Text>
            ) : null}
            {item.withdrawalFailureReason ? <Text style={styles.failureText}>Falha anterior: {item.withdrawalFailureReason}</Text> : null}
            {item.photoUrl ? <Text style={styles.meta}>Foto do volume registrada no sistema</Text> : null}
            {isDeliveryAwaitingWithdrawal(item) && !item.syncPending && allowWithdrawalActions ? (
              <View style={styles.withdrawalBox}>
                <Text style={styles.withdrawalHelp}>
                  {getDeliveryWithdrawalQrCodeUrl(item)
                    ? "Use o QR do morador ou confirme manualmente."
                    : "Use o código do morador ou confirme manualmente."}
                </Text>
                {getDeliveryPrimaryWithdrawalCode(item) ? <Text style={styles.withdrawalHint}>Código protegido no app do operador.</Text> : null}
                <TextField
                  label="Código informado na retirada"
                  value={withdrawalCodes[item.id] ?? ""}
                  onChangeText={(value) => setWithdrawalCodes((current) => ({ ...current, [item.id]: sanitizeDocumentInput(value).slice(0, 32) }))}
                  placeholder="Digite o código"
                  autoCapitalize="characters"
                  maxLength={32}
                  helperText="Use quando o morador informar o código recebido."
                />
                {withdrawalCodes[item.id]?.trim() ? (
                  <Pressable onPress={() => setWithdrawalCodes((current) => ({ ...current, [item.id]: "" }))} style={styles.clearSearch}>
                    <Text style={styles.clearSearchText}>Limpar código informado</Text>
                  </Pressable>
                ) : null}
                <View style={styles.withdrawalActions}>
                  <Button
                    compact
                    style={styles.withdrawalButton}
                    disabled={!withdrawalCodes[item.id]?.trim()}
                    loading={validatingId === item.id}
                    onPress={() => validateWithdrawal(item)}
                  >
                    Validar código
                  </Button>
                  <Button
                    compact
                    style={styles.withdrawalButton}
                    variant="secondary"
                    loading={validatingId === item.id}
                    onPress={() => validateWithdrawal(item, true)}
                  >
                    Confirmar manualmente
                  </Button>
                  <Button
                    compact
                    style={styles.withdrawalButton}
                    variant="secondary"
                    disabled={!getDeliveryWithdrawalQrCodeUrl(item)}
                    onPress={() => setScannerDeliveryId(item.id)}
                  >
                    Ler QR
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        )}
      />
      <QrScannerModal
        visible={Boolean(scannerDeliveryId)}
        onClose={() => setScannerDeliveryId(undefined)}
        onCode={(code) => {
          if (!scannerDeliveryId) return;
          setWithdrawalCodes((current) => ({ ...current, [scannerDeliveryId]: code }));
          setScannerDeliveryId(undefined);
        }}
      />
    </View>
    </KeyboardAvoidingView>
  );
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
  tone: "warning" | "success" | "default";
}) {
  const toneStyle =
    tone === "warning"
      ? styles.summaryWarning
      : tone === "success"
        ? styles.summarySuccess
        : undefined;

  return (
    <View style={[styles.summaryCard, toneStyle]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function getTime(item: Delivery) {
  return new Date(item.receivedAt ?? item.createdAt ?? 0).getTime();
}

function deliveryKey(item: Delivery) {
  if (item.id && !item.id.startsWith("queued-delivery-")) {
    return item.id;
  }

  if (item.clientRequestId?.trim()) {
    return item.clientRequestId.trim();
  }

  const date = (item.receivedAt ?? item.createdAt ?? "").slice(0, 16);
  return [item.deliveryCompany, item.trackingCode, item.recipientUnitId, date].join("|");
}

function findMatchingRemoteDelivery(local: Delivery, remote: Delivery[]) {
  return remote.some((item) => deliveriesRepresentSameRecord(local, item));
}

function deliveriesRepresentSameRecord(left: Delivery, right: Delivery) {
  if (left.id && right.id && !isQueuedDelivery(left.id) && !isQueuedDelivery(right.id) && left.id === right.id) {
    return true;
  }

  const leftClientRequestId = normalizeDeliveryValue(left.clientRequestId);
  const rightClientRequestId = normalizeDeliveryValue(right.clientRequestId);
  if (leftClientRequestId && rightClientRequestId && leftClientRequestId === rightClientRequestId) {
    return true;
  }

  const leftPrimaryCode = normalizeDeliveryValue(getDeliveryPrimaryWithdrawalCode(left));
  const rightPrimaryCode = normalizeDeliveryValue(getDeliveryPrimaryWithdrawalCode(right));
  if (leftPrimaryCode && rightPrimaryCode && leftPrimaryCode === rightPrimaryCode && left.recipientUnitId === right.recipientUnitId) {
    return true;
  }

  const leftTracking = normalizeDeliveryValue(left.trackingCode);
  const rightTracking = normalizeDeliveryValue(right.trackingCode);
  const leftCompany = normalizeDeliveryValue(left.deliveryCompany);
  const rightCompany = normalizeDeliveryValue(right.deliveryCompany);
  const sameTracking = Boolean(leftTracking && rightTracking && leftTracking === rightTracking);
  const sameCompany = Boolean(leftCompany && rightCompany && leftCompany === rightCompany);
  const sameUnit = left.recipientUnitId === right.recipientUnitId;
  const closeInTime = Math.abs(getTime(left) - getTime(right)) <= 12 * 60 * 60 * 1000;

  if (sameUnit && sameTracking && closeInTime && (sameCompany || !leftCompany || !rightCompany)) {
    return true;
  }

  if (sameUnit && sameCompany && closeInTime && (!leftTracking || !rightTracking)) {
    return true;
  }

  return deliveryKey(left) === deliveryKey(right);
}

function pickPreferredDelivery(current: Delivery, candidate: Delivery) {
  if (current.syncPending && !candidate.syncPending) {
    return candidate;
  }

  if (!current.syncPending && candidate.syncPending) {
    return current;
  }

  if ((candidate.withdrawnAt ?? "").length > (current.withdrawnAt ?? "").length) {
    return candidate;
  }

  if (hasDeliveryWithdrawalData(candidate) && !hasDeliveryWithdrawalData(current)) {
    return candidate;
  }

  if ((candidate.notificationSentAt ?? "").length > (current.notificationSentAt ?? "").length) {
    return candidate;
  }

  return getTime(candidate) >= getTime(current) ? candidate : current;
}

function isQueuedDelivery(value?: string | null) {
  return Boolean(value?.startsWith("queued-delivery-"));
}

function normalizeDeliveryValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isStale(value: string) {
  return Date.now() - new Date(value).getTime() > 5 * 60 * 1000;
}

function isOlderThanHours(value: string | undefined, hours: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() > hours * 60 * 60 * 1000;
}

function deliveryActionText(item: Delivery) {
  if (item.syncPending) {
    return "Aguarde a sincronização antes da retirada.";
  }

  if (!isDeliveryAwaitingWithdrawal(item)) {
    return "Entrega finalizada.";
  }

  if (!hasDeliveryWithdrawalData(item)) {
    return "Aguardando dados de retirada.";
  }

  return "Valide por código, QR ou confirmação manual.";
}

function deliveryPriorityLabel(item: Delivery) {
  if (item.syncPending) {
    return "Sincronizar";
  }

  if (item.withdrawalFailureReason) {
    return "Revisar falha";
  }

  if (isDeliveryAwaitingWithdrawal(item) && !hasDeliveryWithdrawalData(item)) {
    return "Aguardar sistema";
  }

  return "";
}

function buildDeliveryTurnSummary({
  pendingWithdrawalCount,
  withdrawnCount,
  pendingSyncCount,
  awaitingSystemCount,
  failedAttemptCount,
  hasQueueError
}: {
  pendingWithdrawalCount: number;
  withdrawnCount: number;
  pendingSyncCount: number;
  awaitingSystemCount: number;
  failedAttemptCount: number;
  hasQueueError: boolean;
}) {
  const lines = [];

  if (pendingWithdrawalCount) {
    lines.push(`${pendingWithdrawalCount} encomenda${pendingWithdrawalCount === 1 ? "" : "s"} seguem prontas para retirada.`);
  }

  if (pendingSyncCount) {
    lines.push(`${pendingSyncCount} encomenda${pendingSyncCount === 1 ? "" : "s"} ainda dependem de sincronização com o sistema.`);
  }

  if (hasQueueError && pendingSyncCount) {
    lines.push("Houve falha recente na fila offline. Repetir sincronização assim que a conexão estabilizar.");
  }

  if (awaitingSystemCount) {
    lines.push(`${awaitingSystemCount} encomenda${awaitingSystemCount === 1 ? "" : "s"} ainda sem código ou QR liberado.`);
  }

  if (failedAttemptCount) {
    lines.push(`${failedAttemptCount} tentativa${failedAttemptCount === 1 ? "" : "s"} de retirada precisam de revisao.`);
  }

  if (withdrawnCount) {
    lines.push(
      withdrawnCount === 1
        ? "1 retirada já foi concluída hoje."
        : `${withdrawnCount} retiradas já foram concluídas hoje.`
    );
  }

  if (!lines.length) {
    lines.push("Sem ocorrencias relevantes para repasse neste momento.");
  }

  return lines;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16
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
  subtitleDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  updatedAt: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  searchBox: {
    marginBottom: 14
  },
  resetFilters: {
    alignSelf: "flex-start",
    marginBottom: 12
  },
  resetFiltersText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  filterHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10
  },
  searchHintRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  searchActions: {
    flexDirection: "row",
    gap: 10
  },
  searchResultHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    flex: 1
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
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  filterChipTextActive: {
    color: colors.primaryDark
  },
  loadingCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 14,
    padding: 12
  },
  loadingTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  readOnlyCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 14,
    padding: 12
  },
  readOnlyTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  readOnlyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
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
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    justifyContent: "center",
    padding: 10
  },
  summaryWarning: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F0D39A"
  },
  summarySuccess: {
    backgroundColor: "#F0F6FF",
    borderColor: "#C9DCF4"
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 28,
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
  list: {
    gap: 12,
    paddingBottom: 24
  },
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  itemHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tag: {
    backgroundColor: "#E8F1FB",
    borderRadius: 8,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tagReady: {
    backgroundColor: "#F0F6FF",
    color: colors.success
  },
  tagNeutral: {
    backgroundColor: "#F1F5FA",
    color: colors.muted
  },
  tagWarning: {
    backgroundColor: "#FFF3D8",
    color: colors.warning
  },
  company: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800"
  },
  badge: {
    backgroundColor: "#E8F1FB",
    borderRadius: 8,
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgePending: {
    backgroundColor: "#FFF3D8",
    color: colors.warning
  },
  meta: {
    color: colors.muted,
    fontSize: 14
  },
  pickup: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  notify: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700"
  },
  renotifyRow: {
    alignItems: "flex-start",
    marginTop: 2
  },
  actionHint: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  actionHintStrong: {
    color: colors.primaryDark
  },
  failureText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700"
  },
  withdrawalDataCard: {
    backgroundColor: "#F0F6FF",
    borderColor: "#C9DCF4",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  withdrawalDataTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  withdrawalDataText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18
  },
  withdrawalBox: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
    padding: 10
  },
  withdrawalHelp: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  withdrawalHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  withdrawalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  withdrawalButton: {
    flexGrow: 1,
    minWidth: 140
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center"
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
  }
});

