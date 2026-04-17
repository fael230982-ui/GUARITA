import { CameraMediaSource } from "../types";

const CAMERA_MEDIA_PRIORITY: Array<keyof CameraMediaSource> = [
  "liveUrl",
  "hlsUrl",
  "webRtcUrl",
  "imageStreamUrl",
  "mjpegUrl",
  "snapshotUrl",
  "thumbnailUrl"
];

export function getPreferredCameraMedia(
  source: CameraMediaSource
): { field: keyof CameraMediaSource; url: string } | undefined {
  for (const field of CAMERA_MEDIA_PRIORITY) {
    const value = source[field];
    if (typeof value === "string" && value.trim()) {
      return { field, url: value };
    }
  }

  return undefined;
}

export function hasAnyCameraMedia(source: CameraMediaSource) {
  return Boolean(getPreferredCameraMedia(source));
}

export function cameraMediaFieldText(field: keyof CameraMediaSource) {
  const labels: Record<keyof CameraMediaSource, string> = {
    liveUrl: "Live",
    hlsUrl: "HLS",
    webRtcUrl: "WebRTC",
    imageStreamUrl: "Image stream",
    mjpegUrl: "MJPEG",
    snapshotUrl: "Snapshot",
    thumbnailUrl: "Thumbnail"
  };

  return labels[field];
}
