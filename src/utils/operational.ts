import { AccessLog } from "../types";
import { hasAnyCameraMedia } from "./cameraMedia";

export function isTodayIso(value?: string | null) {
  if (!value) return false;
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function getAccessLogCameraKey(log: AccessLog) {
  if (log.cameraId) {
    return log.cameraId;
  }

  if (hasAnyCameraMedia(log)) {
    return `camera-${log.id}`;
  }

  return undefined;
}

export function countTodayDeniedAccessLogs(logs: AccessLog[]) {
  return logs.filter((item) => isTodayIso(item.timestamp) && item.result === "DENIED").length;
}

export function countTodayReferencedCameras(logs: AccessLog[]) {
  return new Set(
    logs
      .filter((item) => isTodayIso(item.timestamp))
      .map(getAccessLogCameraKey)
      .filter((item): item is string => Boolean(item))
  ).size;
}
