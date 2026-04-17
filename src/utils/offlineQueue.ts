import { apiClient } from "../api/client";
import { OfflineOperation, QueueState } from "../types";
import { loadOfflineQueue, saveOfflineQueue } from "./storage";

type QueueListener = (state: QueueState) => void;

const listeners = new Set<QueueListener>();

let state: QueueState = {
  pendingCount: 0,
  pendingByType: {
    deliveries: 0,
    people: 0,
    faces: 0,
    forecasts: 0,
    accesses: 0
  },
  syncing: false
};

export function subscribeQueueState(listener: QueueListener) {
  listeners.add(listener);
  listener(state);

  return () => {
    listeners.delete(listener);
  };
}

export function getQueueState() {
  return state;
}

export async function hydrateQueueState() {
  const queue = await loadOfflineQueue();
  updateState(queueSnapshot(queue));
  return queue;
}

export async function enqueueOfflineOperation(operation: OfflineOperation) {
  const queue = collapseQueue(await loadOfflineQueue(), operation);
  await saveOfflineQueue(queue);
  updateState({ ...queueSnapshot(queue), lastError: undefined });
}

export async function flushOfflineQueue() {
  if (state.syncing) {
    return { processed: 0, remaining: state.pendingCount };
  }

  let queue = await loadOfflineQueue();
  if (!queue.length) {
    updateState({ ...queueSnapshot(queue), syncing: false });
    return { processed: 0, remaining: 0 };
  }

  updateState({ ...queueSnapshot(queue), syncing: true, lastError: undefined });

  let processed = 0;
  let lastError: string | undefined;

  while (queue.length) {
    const current = queue[0];
    if (!current) {
      break;
    }

    try {
      await executeOperation(current);
      queue = queue.slice(1);
      processed += 1;
      await saveOfflineQueue(queue);
      updateState({
        ...queueSnapshot(queue),
        syncing: true,
        lastSyncAt: new Date().toISOString(),
        lastError: undefined
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha ao sincronizar dados pendentes.";
      if (shouldStopSync(lastError)) {
        break;
      }

      queue = queue.slice(1);
      await saveOfflineQueue(queue);
      updateState({
        ...queueSnapshot(queue),
        syncing: true,
        lastError
      });
    }
  }

  updateState({
    ...queueSnapshot(queue),
    syncing: false,
    lastSyncAt: processed ? new Date().toISOString() : state.lastSyncAt,
    lastError: queue.length ? lastError : undefined
  });

  return { processed, remaining: queue.length, lastError };
}

async function executeOperation(operation: OfflineOperation) {
  switch (operation.type) {
    case "createDelivery": {
      const clientRequestId = operation.payload.draft.clientRequestId?.trim();
      if (clientRequestId) {
        try {
          const reconciliation = await apiClient.reconcileSyncRequest(clientRequestId);
          if (
            reconciliation.found &&
            reconciliation.isApplied &&
            reconciliation.aggregateType?.toLowerCase() === "delivery"
          ) {
            return;
          }
        } catch {
          // If reconcile is unavailable or inconclusive, proceed with the normal create attempt.
        }
      }
      await apiClient.createDelivery(operation.payload.draft, operation.payload.receivedBy);
      return;
    }
    case "createPerson":
      await apiClient.createPerson(operation.payload.draft);
      return;
    case "sendFace":
      await apiClient.sendFace(operation.payload.personId, operation.payload.facePhoto);
      return;
    case "updateVisitForecastStatus":
      await apiClient.updateVisitForecastStatus(operation.payload.id, operation.payload.status);
      return;
    case "registerPresenceAccess": {
      await apiClient.updatePersonStatus(
        operation.payload.personId,
        operation.payload.action === "ENTRY" ? "ACTIVE" : "INACTIVE"
      );
      await apiClient.createOperationalAccessReport({
        action: operation.payload.action,
        personId: operation.payload.personId,
        personName: operation.payload.personName,
        unitId: operation.payload.unitId ?? null,
        unitName: operation.payload.unitName ?? null,
        category: operation.payload.category ?? null
      });
      return;
    }
  }
}

function shouldStopSync(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("token")
  );
}

function updateState(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

function queueSnapshot(queue: OfflineOperation[]): Pick<QueueState, "pendingCount" | "pendingByType"> {
  return {
    pendingCount: queue.length,
    pendingByType: {
      deliveries: queue.filter((item) => item.type === "createDelivery").length,
      people: queue.filter((item) => item.type === "createPerson").length,
      faces: queue.filter((item) => item.type === "sendFace").length,
      forecasts: queue.filter((item) => item.type === "updateVisitForecastStatus").length,
      accesses: queue.filter((item) => item.type === "registerPresenceAccess").length
    }
  };
}

function collapseQueue(queue: OfflineOperation[], incoming: OfflineOperation) {
  if (incoming.type === "updateVisitForecastStatus") {
    const incomingKey = incoming.payload.visitForecastId ?? incoming.payload.id;
    const remaining = queue.filter(
      (item) =>
        item.type !== "updateVisitForecastStatus" ||
        (item.payload.visitForecastId ?? item.payload.id) !== incomingKey
    );
    return [...remaining, incoming];
  }

  if (incoming.type === "sendFace") {
    const remaining = queue.filter(
      (item) => item.type !== "sendFace" || item.payload.personId !== incoming.payload.personId
    );
    return [...remaining, incoming];
  }

  if (incoming.type === "registerPresenceAccess") {
    const remaining = queue.filter(
      (item) =>
        item.type !== "registerPresenceAccess" ||
        item.payload.personId !== incoming.payload.personId
    );
    return [...remaining, incoming];
  }

  return [...queue, incoming];
}
