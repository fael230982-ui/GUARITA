import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { PhotoAsset } from "../types";

type TakePhotoOptions = {
  maxDimension?: number;
  compress?: number;
};

const DEFAULT_MAX_DIMENSION = 960;
const DEFAULT_OUTPUT_QUALITY = 0.42;

export async function takePhoto(prefix: string, options: TakePhotoOptions = {}): Promise<PhotoAsset | undefined> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissao de camera negada.");
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.72,
    base64: true
  });

  if (result.canceled) {
    return undefined;
  }

  const asset = result.assets[0];
  if (!asset) {
    return undefined;
  }

  const resized = await manipulateAsync(
    asset.uri,
    [{ resize: computeResize(asset.width, asset.height, options.maxDimension ?? DEFAULT_MAX_DIMENSION) }],
    {
      compress: options.compress ?? DEFAULT_OUTPUT_QUALITY,
      format: SaveFormat.JPEG,
      base64: true
    }
  );

  const fallbackName = `${prefix}-${Date.now()}.jpg`;

  return {
    uri: resized.uri,
    fileName: asset.fileName ?? fallbackName,
    mimeType: "image/jpeg",
    base64: resized.base64 ?? undefined,
    capturedAt: new Date().toISOString()
  };
}

function computeResize(width?: number, height?: number, maxDimension = DEFAULT_MAX_DIMENSION) {
  if (!width || !height) {
    return { width: maxDimension };
  }

  if (width >= height) {
    return width > maxDimension ? { width: maxDimension } : { width };
  }

  return height > maxDimension ? { height: maxDimension } : { height };
}
