import { apiClient } from "../api/client";
import { StreamCapabilities } from "../types";

export type OperationEvent = {
  eventId?: string;
  eventType: string;
  occurredAt: string;
  condominiumId?: string;
  entityType?: string;
  entityId?: string;
  unitId?: string;
  cameraId?: string;
  snapshotUrl?: string;
  liveUrl?: string;
  replayUrl?: string;
  replayAvailable?: boolean;
  eventTime?: string;
  secondsBefore?: number;
  secondsAfter?: number;
  title?: string;
  body?: string;
  payload: Record<string, unknown>;
  type?: string;
  timestamp?: string;
};

export type OperationEventsStatus = {
  state: "idle" | "connecting" | "connected" | "reconnecting" | "unsupported";
  lastEventAt?: string;
  lastError?: string;
};

type Listener = (event: OperationEvent) => void;
type StatusListener = (status: OperationEventsStatus) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();

let status: OperationEventsStatus = { state: "idle" };

let currentToken: string | undefined;
let currentController: AbortController | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let connectVersion = 0;
let currentCapabilities: StreamCapabilities | undefined;

export function subscribeOperationEvents(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeOperationEventsStatus(listener: StatusListener) {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
}

export function setOperationEventsCapabilities(capabilities?: StreamCapabilities) {
  currentCapabilities = capabilities;
}

export function startOperationEvents(token: string) {
  if (currentToken === token && currentController) {
    return;
  }

  stopOperationEvents();
  currentToken = token;
  connectVersion += 1;
  updateStatus({ state: "connecting", lastError: undefined });
  void connectLoop(connectVersion, token);
}

export function stopOperationEvents() {
  currentToken = undefined;
  currentController?.abort();
  currentController = undefined;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  updateStatus({ state: "idle", lastError: undefined });
}

async function connectLoop(version: number, token: string) {
  const controller = new AbortController();
  currentController = controller;

  try {
    const response = await fetch(`${apiClient.getBaseUrl()}/events/stream`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Falha no stream operacional (${response.status}).`);
    }

    const stream = response.body as ReadableStream<Uint8Array> | null;
    if (!stream || typeof stream.getReader !== "function") {
      updateStatus({ state: "unsupported", lastError: "Stream não suportado neste runtime." });
      return;
    }

    updateStatus({ state: "connected", lastError: undefined });
    await readEventStream(stream, controller.signal);
  } catch (error) {
    if (controller.signal.aborted || version !== connectVersion || currentToken !== token) {
      return;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const unsupported =
      message.includes("not implemented") ||
      message.includes("not supported") ||
      message.includes("body stream");

    if (unsupported) {
      updateStatus({ state: "unsupported", lastError: "Stream não suportado neste runtime." });
      return;
    }

    updateStatus({
      state: "reconnecting",
      lastError: error instanceof Error ? error.message : "Falha ao conectar stream operacional."
    });
  } finally {
    if (currentController === controller) {
      currentController = undefined;
    }
  }

  if (version !== connectVersion || currentToken !== token) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void connectLoop(version, token);
  }, 5000);
}

async function readEventStream(stream: ReadableStream<Uint8Array>, signal: AbortSignal) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const parsed = parseSseChunk(chunk);
        if (parsed) {
          emit(parsed);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseChunk(chunk: string) {
  const data = chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!data) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(data) as Partial<OperationEvent> & Record<string, unknown>;
    const eventType = resolveCanonicalStreamString(parsed, "eventType", ["type"]);
    const occurredAt = resolveCanonicalStreamString(parsed, "occurredAt", ["timestamp", "eventTime"]);
    const entityType = resolveCanonicalStreamString(parsed, "entityType");
    const entityId = resolveCanonicalStreamString(parsed, "entityId");

    if (!eventType || !occurredAt || !entityType || !entityId) {
      return undefined;
    }

    return {
      eventId: parsed.eventId,
      eventType,
      occurredAt,
      condominiumId: typeof parsed.condominiumId === "string" ? parsed.condominiumId : undefined,
      entityType,
      entityId,
      unitId: typeof parsed.unitId === "string" ? parsed.unitId : undefined,
      cameraId: typeof parsed.cameraId === "string" ? parsed.cameraId : undefined,
      snapshotUrl: typeof parsed.snapshotUrl === "string" ? parsed.snapshotUrl : undefined,
      liveUrl: typeof parsed.liveUrl === "string" ? parsed.liveUrl : undefined,
      replayUrl: typeof parsed.replayUrl === "string" ? parsed.replayUrl : undefined,
      replayAvailable: typeof parsed.replayAvailable === "boolean" ? parsed.replayAvailable : undefined,
      eventTime: typeof parsed.eventTime === "string" ? parsed.eventTime : undefined,
      secondsBefore: typeof parsed.secondsBefore === "number" ? parsed.secondsBefore : undefined,
      secondsAfter: typeof parsed.secondsAfter === "number" ? parsed.secondsAfter : undefined,
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      body: typeof parsed.body === "string" ? parsed.body : undefined,
      payload: parsed.payload && typeof parsed.payload === "object" ? (parsed.payload as Record<string, unknown>) : {},
      type: typeof parsed.type === "string" ? parsed.type : undefined,
      timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : undefined
    };
  } catch {
    return undefined;
  }
}

function resolveCanonicalStreamString(
  parsed: Partial<OperationEvent> & Record<string, unknown>,
  canonicalField: string,
  legacyFallbacks: string[] = []
) {
  const canonicalValue = parsed[canonicalField];
  if (typeof canonicalValue === "string" && canonicalValue.trim()) {
    return canonicalValue;
  }

  const fieldRules = currentCapabilities?.fieldRules ?? {};
  const capabilityAliases = Object.entries(fieldRules)
    .filter(([field, rule]) => field !== canonicalField && rule.aliasFor === canonicalField)
    .map(([field]) => field);
  const legacyAliases = Object.entries(fieldRules)
    .filter(
      ([field, rule]) =>
        field !== canonicalField &&
        rule.requirement === "LEGACY_TEMPORARY" &&
        legacyFallbacks.includes(field)
    )
    .map(([field]) => field);

  const aliases = Array.from(new Set([...capabilityAliases, ...legacyAliases, ...legacyFallbacks]));
  for (const alias of aliases) {
    const value = parsed[alias];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function emit(event: OperationEvent) {
  updateStatus({
    state: "connected",
    lastEventAt: event.occurredAt,
    lastError: undefined
  });
  listeners.forEach((listener) => listener(event));
}

function updateStatus(next: Partial<OperationEventsStatus>) {
  status = { ...status, ...next };
  statusListeners.forEach((listener) => listener(status));
}

export function isMovementOperationEvent(event: OperationEvent) {
  const type = event.eventType.toLowerCase();
  return !type.includes("delivery") && type !== "operation:connected";
}

export function isDeliveryOperationEvent(event: OperationEvent) {
  const type = event.eventType.toLowerCase();
  return (type.includes("delivery") || type.includes("withdraw")) && type !== "operation:connected";
}

export function isAlertOperationEvent(event: OperationEvent) {
  const type = event.eventType.toLowerCase();
  return (
    (type.includes("alert") ||
      type.includes("access") ||
      type.includes("denied") ||
      type.includes("camera")) &&
    type !== "operation:connected"
  );
}

export function isCameraOperationEvent(event: OperationEvent) {
  const type = event.eventType.toLowerCase();
  return (
    (type.includes("camera") ||
      type.includes("access") ||
      type.includes("movement") ||
      type.includes("entry") ||
      type.includes("exit") ||
      type.includes("denied") ||
      type.includes("allowed")) &&
    type !== "operation:connected"
  );
}
