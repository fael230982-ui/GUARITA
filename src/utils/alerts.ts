import { AccessLog, OperationalAlert } from "../types";

export function normalizeAccessLogToOperationalAlert(log: AccessLog): OperationalAlert {
  const denied = log.result === "DENIED";

  return {
    alertId: log.alertId ?? `access-log-${log.id}`,
    alertType: denied ? "ACCESS_DENIED" : "ACCESS_EVENT",
    alertSeverity: denied ? "HIGH" : "LOW",
    alertStatus: denied ? "NEW" : "RESOLVED",
    occurredAt: log.timestamp,
    entityType: "ACCESS_LOG",
    entityId: log.id,
    title: denied ? "Acesso negado" : "Evento de acesso",
    description: log.message ?? null,
    personId: log.personId ?? null,
    personName: log.personName ?? log.userName ?? null,
    unitId: log.unitId ?? null,
    unitLabel: log.unitLabel ?? null,
    cameraId: log.cameraId ?? null,
    liveUrl: log.liveUrl ?? null,
    hlsUrl: log.hlsUrl ?? null,
    webRtcUrl: log.webRtcUrl ?? null,
    imageStreamUrl: log.imageStreamUrl ?? null,
    mjpegUrl: log.mjpegUrl ?? null,
    snapshotUrl: log.snapshotUrl ?? null,
    thumbnailUrl: log.thumbnailUrl ?? null,
    message: log.message ?? null,
    payload: {
      classification: log.classification,
      classificationLabel: log.classificationLabel,
      direction: log.direction,
      result: log.result,
      doorName: log.doorName ?? null,
      deviceName: log.deviceName ?? null,
      location: log.location ?? null
    }
  };
}
