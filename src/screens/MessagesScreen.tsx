import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { apiClient } from "../api/client";
import { colors } from "../theme";
import { AuthSession, OperationMessage, UnitResidentOption, WhatsAppConnection } from "../types";

type Props = {
  session: AuthSession;
  isActive: boolean;
};

export function MessagesScreen({ session, isActive }: Props) {
  const unitOptions = useMemo(() => buildUnitOptions(session), [session]);
  const [selectedUnitId, setSelectedUnitId] = useState(session.selectedUnitId ?? session.unitId ?? unitOptions[0]?.id ?? "");
  const activeUnit = useMemo(
    () => unitOptions.find((item) => item.id === selectedUnitId),
    [selectedUnitId, unitOptions]
  );
  const unitId = selectedUnitId || undefined;
  const unitName = activeUnit?.name ?? session.selectedUnitName ?? undefined;
  const [messages, setMessages] = useState<OperationMessage[]>([]);
  const [connection, setConnection] = useState<WhatsAppConnection | undefined>();
  const [residents, setResidents] = useState<UnitResidentOption[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const selectedResident = useMemo(
    () => residents.find((item) => item.id === selectedResidentId),
    [residents, selectedResidentId]
  );
  const sortedMessages = useMemo(
    () => [...messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [messages]
  );
  const unreadIncoming = useMemo(
    () => messages.filter((item) => item.direction === "RESIDENT_TO_PORTARIA" && !item.readAt).length,
    [messages]
  );
  const whatsappReady = isConnectionOpen(connection);

  async function load(showLoading = true) {
    if (!unitId) {
      setMessages([]);
      setResidents([]);
      setConnection(undefined);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const [messagesResult, residentsResult, connectionResult] = await Promise.all([
        apiClient.listMessages(unitId, { limit: 80 }),
        apiClient.listUnitResidents(unitId, unitId),
        apiClient.getWhatsAppConnection(unitId)
      ]);

      setMessages(messagesResult);
      setResidents(residentsResult);
      setConnection(connectionResult);
      setError(undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as mensagens.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function handleConnectWhatsApp() {
    if (!unitId) {
      Alert.alert("Mensagens", "A sessão precisa ter uma unidade selecionada para conectar o WhatsApp.");
      return;
    }

    try {
      setConnecting(true);
      const nextConnection = await apiClient.connectWhatsApp(unitId);
      setConnection(nextConnection);
      setError(undefined);
      if (!nextConnection.qrCodeImageDataUrl && !nextConnection.qrCodeText) {
        Alert.alert("WhatsApp", "Instância criada. Aguarde alguns segundos até o QR aparecer.");
      }
    } catch (connectError) {
      Alert.alert("WhatsApp", connectError instanceof Error ? connectError.message : "Não foi possível iniciar a conexão.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSend() {
    if (!unitId) {
      Alert.alert("Mensagens", "A sessão precisa ter uma unidade selecionada para enviar mensagens.");
      return;
    }

    const trimmedBody = body.trim();
    const trimmedPhone = recipientPhone.trim();
    if (!trimmedBody) {
      Alert.alert("Mensagens", "Digite a mensagem antes de enviar.");
      return;
    }

    if (!selectedResident?.id && !trimmedPhone) {
      Alert.alert("Mensagens", "Selecione um morador da unidade ou informe um telefone manual.");
      return;
    }

    try {
      setSending(true);
      const created = await apiClient.createMessage({
        unitId,
        body: trimmedBody,
        recipientPersonId: selectedResident?.id ?? null,
        recipientPhone: selectedResident?.id ? null : trimmedPhone || null,
        origin: "WHATSAPP",
        direction: "PORTARIA_TO_RESIDENT"
      });

      setMessages((current) => [...current, created]);
      setBody("");
      setError(undefined);
    } catch (sendError) {
      Alert.alert("Mensagens", sendError instanceof Error ? sendError.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleMarkRead(item: OperationMessage) {
    if (item.direction !== "RESIDENT_TO_PORTARIA" || item.readAt) {
      return;
    }

    try {
      const updated = await apiClient.markMessageRead(item.id);
      setMessages((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch {
      // Keep the message visible even when read sync fails.
    }
  }

  useEffect(() => {
    if (selectedUnitId && unitOptions.some((item) => item.id === selectedUnitId)) {
      return;
    }

    setSelectedUnitId(session.selectedUnitId ?? session.unitId ?? unitOptions[0]?.id ?? "");
  }, [selectedUnitId, session.selectedUnitId, session.unitId, unitOptions]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void load();
  }, [isActive, unitId]);

  useEffect(() => {
    if (!isActive || !unitId) {
      return;
    }

    if (whatsappReady) {
      return;
    }

    const timer = setInterval(() => {
      void load(false);
    }, 5000);

    return () => clearInterval(timer);
  }, [connection?.state, connection?.enabled, isActive, unitId, whatsappReady]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={24}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Mensagens da unidade</Text>
          <Text style={styles.subtitle}>
            {unitId
              ? `Converse com o morador sem sair do app.${unitName ? ` Unidade: ${unitName}.` : ""}`
              : "Esta sessão ainda não tem unidade selecionada para operar mensagens."}
          </Text>
        </View>

        {unitOptions.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Unidade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientRow}>
              {unitOptions.map((unit) => {
                const active = unit.id === selectedUnitId;
                return (
                  <Pressable
                    key={unit.id}
                    onPress={() => {
                      setSelectedUnitId(unit.id);
                      setSelectedResidentId("");
                      setRecipientPhone("");
                    }}
                    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{unit.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {!unitId ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Unidade obrigatória</Text>
            <Text style={styles.warningText}>
              O backend de mensagens exige `unitId`. Se a sessão estiver em modo consulta sem unidade selecionada, este módulo fica indisponível.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Falha ao carregar</Text>
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>WhatsApp da unidade</Text>
            <Text style={[styles.statusBadge, whatsappReady ? styles.statusOpen : styles.statusPending]}>
              {connection?.enabled ? formatConnectionState(connection?.state) : "Não conectado"}
            </Text>
          </View>
          <Text style={styles.meta}>
            {connection?.instance ? `Instância: ${connection.instance}` : "Nenhuma instância vinculada ainda."}
          </Text>
          {connection?.pairingCode ? <Text style={styles.meta}>Código: {connection.pairingCode}</Text> : null}
          {connection?.qrCodeImageDataUrl ? (
            <View style={styles.qrWrap}>
              <Image source={{ uri: connection.qrCodeImageDataUrl }} style={styles.qrImage} resizeMode="contain" />
              <Text style={styles.qrHint}>Escaneie este QR no WhatsApp para vincular a unidade.</Text>
            </View>
          ) : connection?.qrCodeText ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeTitle}>QR em texto</Text>
              <Text style={styles.codeValue}>{connection.qrCodeText}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => void handleConnectWhatsApp()}
            disabled={!unitId || connecting}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!unitId || connecting) && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>{connecting ? "Conectando..." : "Gerar ou reconectar QR"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nova mensagem</Text>
          <Text style={styles.meta}>Selecione um morador da unidade ou informe um telefone manual para envio via WhatsApp.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientRow}>
            {residents.map((resident) => {
              const active = resident.id === selectedResidentId;
              return (
                <Pressable
                  key={resident.id}
                  onPress={() => {
                    setSelectedResidentId(active ? "" : resident.id);
                    setRecipientPhone("");
                  }}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{resident.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextInput
            value={recipientPhone}
            onChangeText={(value) => {
              setRecipientPhone(value);
              if (value.trim()) {
                setSelectedResidentId("");
              }
            }}
            placeholder="Ou informe o telefone com DDD"
            placeholderTextColor="#6F7C8E"
            keyboardType="phone-pad"
            style={styles.input}
          />
          {selectedResident ? <Text style={styles.selectedHint}>Destinatário: {selectedResident.name}</Text> : null}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Digite a mensagem"
            placeholderTextColor="#6F7C8E"
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textarea]}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!unitId || sending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!unitId || sending) && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>{sending ? "Enviando..." : "Enviar via WhatsApp"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Histórico</Text>
            <Text style={styles.metaStrong}>{unreadIncoming ? `${unreadIncoming} não lida${unreadIncoming === 1 ? "" : "s"}` : "Tudo lido"}</Text>
          </View>
          {sortedMessages.length ? (
            <View style={styles.messageList}>
              {sortedMessages.map((item) => {
                const incoming = item.direction === "RESIDENT_TO_PORTARIA";
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => void handleMarkRead(item)}
                    style={({ pressed }) => [
                      styles.messageBubble,
                      incoming ? styles.messageIncoming : styles.messageOutgoing,
                      pressed && styles.pressed
                    ]}
                  >
                    <Text style={styles.messageMeta}>
                      {incoming ? item.recipientPersonName || "Morador" : item.senderUserName || session.operatorName} • {formatOrigin(item.origin)} • {formatDateTime(item.createdAt)}
                    </Text>
                    <Text style={styles.messageBody}>{item.body}</Text>
                    <Text style={styles.messageFooter}>
                      {item.status}{incoming && !item.readAt ? " • toque para marcar como lida" : item.readAt ? ` • lida às ${formatTime(item.readAt)}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sem mensagens</Text>
              <Text style={styles.emptyText}>Quando a unidade começar a conversar com a portaria, o histórico aparecerá aqui.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isConnectionOpen(connection?: WhatsAppConnection) {
  const state = (connection?.state ?? "").trim().toLowerCase();
  return connection?.enabled && (state === "open" || state === "connected" || state === "ready");
}

function buildUnitOptions(session: AuthSession) {
  const seen = new Set<string>();
  const options: Array<{ id: string; name: string }> = [];

  function addUnit(id?: string | null, name?: string | null) {
    const value = id?.trim();
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    options.push({ id: value, name: name?.trim() || value });
  }

  addUnit(session.selectedUnitId, session.selectedUnitName);
  addUnit(session.unitId, session.unitName);
  (session.unitIds ?? []).forEach((id, index) => addUnit(id, session.unitNames?.[index]));

  return options;
}

function formatConnectionState(value?: string | null) {
  const state = (value ?? "").trim().toLowerCase();
  if (!state) return "Aguardando";
  if (state === "open" || state === "connected" || state === "ready") return "Conectado";
  if (state === "connecting" || state === "pairing") return "Conectando";
  if (state === "close" || state === "closed") return "Fechado";
  return value ?? "Aguardando";
}

function formatOrigin(origin: string) {
  if (origin === "WHATSAPP") return "WhatsApp";
  if (origin === "APP") return "App";
  return "Portaria";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 16,
    paddingBottom: 140
  },
  headerCard: {
    gap: 6
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  warningCard: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F0D39A",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  metaStrong: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  statusBadge: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusOpen: {
    backgroundColor: "#E8F6ED",
    color: colors.success
  },
  statusPending: {
    backgroundColor: "#FFF3D8",
    color: colors.warning
  },
  qrWrap: {
    alignItems: "center",
    backgroundColor: "#F7FAFE",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  qrImage: {
    height: 220,
    width: 220
  },
  qrHint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  codeBox: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  codeTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  codeValue: {
    color: colors.text,
    fontSize: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  recipientRow: {
    gap: 8,
    paddingVertical: 2
  },
  chip: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    backgroundColor: "#E8F1FB",
    borderColor: "#C9DCF4"
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  chipTextActive: {
    color: colors.primaryDark
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  textarea: {
    minHeight: 112
  },
  selectedHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  messageList: {
    gap: 10
  },
  messageBubble: {
    borderRadius: 10,
    gap: 6,
    padding: 12
  },
  messageIncoming: {
    alignSelf: "flex-start",
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderWidth: 1,
    maxWidth: "92%"
  },
  messageOutgoing: {
    alignSelf: "flex-end",
    backgroundColor: "#E8F1FB",
    borderColor: "#C9DCF4",
    borderWidth: 1,
    maxWidth: "92%"
  },
  messageMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  messageFooter: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700"
  },
  emptyCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.8
  },
  disabled: {
    opacity: 0.55
  }
});
