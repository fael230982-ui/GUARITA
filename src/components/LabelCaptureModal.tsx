import { useEffect, useRef, useState } from "react";
import { Animated, Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { PhotoAsset } from "../types";
import { colors } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (photo: PhotoAsset) => void;
  onManualEntry?: () => void;
};

export function LabelCaptureModal({ visible, onClose, onConfirm, onManualEntry }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<PhotoAsset | undefined>();
  const [viewportLayout, setViewportLayout] = useState<{ width: number; height: number } | undefined>();
  const [frameLayout, setFrameLayout] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  useEffect(() => {
    if (visible && !preview) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true
          })
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [preview, pulse, visible]);

  useEffect(() => {
    if (!visible) {
      setPreview(undefined);
      setCapturing(false);
      setCameraReady(false);
      setViewportLayout(undefined);
      setFrameLayout(undefined);
    }
  }, [visible]);

  function handleViewportLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setViewportLayout({ width, height });
  }

  function handleFrameLayout(event: LayoutChangeEvent) {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrameLayout({ x, y, width, height });
  }

  async function cropToFrame(photo: {
    uri: string;
    width?: number;
    height?: number;
    base64?: string | null;
  }) {
    if (!viewportLayout || !frameLayout || !photo.width || !photo.height) {
      return photo;
    }

    const photoAspect = photo.width / photo.height;
    const viewportAspect = viewportLayout.width / viewportLayout.height;

    let renderedWidth = viewportLayout.width;
    let renderedHeight = viewportLayout.height;
    let offsetX = 0;
    let offsetY = 0;

    if (photoAspect > viewportAspect) {
      renderedHeight = viewportLayout.height;
      renderedWidth = renderedHeight * photoAspect;
      offsetX = (renderedWidth - viewportLayout.width) / 2;
    } else {
      renderedWidth = viewportLayout.width;
      renderedHeight = renderedWidth / photoAspect;
      offsetY = (renderedHeight - viewportLayout.height) / 2;
    }

    const scaleX = photo.width / renderedWidth;
    const scaleY = photo.height / renderedHeight;

    const baseOriginX = Math.round((frameLayout.x + offsetX) * scaleX);
    const baseOriginY = Math.round((frameLayout.y + offsetY) * scaleY);
    const baseWidth = Math.round(frameLayout.width * scaleX);
    const baseHeight = Math.round(frameLayout.height * scaleY);
    const paddingX = Math.round(baseWidth * 0.12);
    const paddingY = Math.round(baseHeight * 0.16);

    const originX = Math.max(baseOriginX - paddingX, 0);
    const originY = Math.max(baseOriginY - paddingY, 0);
    const cropWidth = Math.min(baseWidth + paddingX * 2, photo.width - originX);
    const cropHeight = Math.min(baseHeight + paddingY * 2, photo.height - originY);

    const cropped = await manipulateAsync(
      photo.uri,
      [{ crop: { originX, originY, width: Math.max(cropWidth, 1), height: Math.max(cropHeight, 1) } }],
      { compress: 0.78, format: SaveFormat.JPEG, base64: true }
    );

    return cropped;
  }

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady || capturing) {
      return;
    }

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.72
      });
      const cropped = await cropToFrame(photo);

      setPreview({
        uri: cropped.uri,
        fileName: `etiqueta-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        base64: cropped.base64 ?? undefined,
        capturedAt: new Date().toISOString()
      });
    } finally {
      setCapturing(false);
    }
  }

  function handleConfirm() {
    if (!preview) {
      return;
    }

    onConfirm(preview);
    onClose();
  }

  const frameScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });

  const frameOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1]
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fotografar etiqueta</Text>
            <Text style={styles.subtitle}>Alinhe a etiqueta e toque no botão azul.</Text>
          </View>
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? "A câmera está bloqueada no aparelho para este app."
                : "Permita a câmera para fotografar a etiqueta da encomenda."}
            </Text>
            <Text style={styles.permissionHint}>Sem a câmera liberada, o porteiro pode seguir no modo manual.</Text>
            <View style={styles.permissionActions}>
              {permission?.canAskAgain !== false ? (
                <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>Permitir câmera</Text>
                </Pressable>
              ) : null}
              {onManualEntry ? (
                <Pressable onPress={onManualEntry} style={[styles.permissionButton, styles.permissionSecondaryButton]}>
                  <Text style={[styles.permissionButtonText, styles.permissionSecondaryButtonText]}>Digitar manualmente</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : preview ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>A foto ficou boa?</Text>
              <Text style={styles.previewText}>Se a etiqueta estiver inteira e legivel, confirme para rodar o OCR.</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => setPreview(undefined)} style={[styles.actionButton, styles.secondaryAction]}>
                <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Corrigir</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={[styles.actionButton, styles.primaryAction]}>
                <Text style={styles.actionButtonText}>Confirmar e ler OCR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <View style={styles.cameraViewport} onLayout={handleViewportLayout}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
              <View style={styles.overlay}>
                <View style={styles.topInstruction}>
                  <Text style={styles.overlayTitle}>Etiqueta inteira na moldura</Text>
                  <Text style={styles.overlayText}>Não corte código, nome ou unidade.</Text>
                </View>
                <Animated.View onLayout={handleFrameLayout} style={[styles.frame, { opacity: frameOpacity, transform: [{ scale: frameScale }] }]}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </Animated.View>
                <View style={styles.bottomInstruction}>
                  <Text style={styles.bottomText}>Aproxime ate preencher a area branca.</Text>
                </View>
              </View>
            </View>
            <View style={styles.captureBar}>
              <Pressable onPress={onClose} style={[styles.actionButton, styles.secondaryAction, styles.bottomActionButton]}>
                <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Voltar</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCapture()}
                disabled={!cameraReady || capturing}
                style={[styles.captureButton, (!cameraReady || capturing) && styles.captureButtonDisabled]}
              >
                <View style={styles.captureCore} />
              </Pressable>
              {onManualEntry ? (
                <Pressable onPress={onManualEntry} style={[styles.actionButton, styles.secondaryAction, styles.bottomActionButton]}>
                  <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Digitar manualmente</Text>
                </Pressable>
              ) : (
                <View style={styles.captureSpacer} />
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#091019",
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  subtitle: {
    color: "#D4E2F6",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  close: {
    color: "#D4E2F6",
    fontSize: 14,
    fontWeight: "800"
  },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  permissionText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center"
  },
  permissionHint: {
    color: "#D4E2F6",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    textAlign: "center"
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 16,
    paddingVertical: 12
  },
  permissionActions: {
    gap: 10,
    marginTop: 6
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  permissionSecondaryButton: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderWidth: 1
  },
  permissionSecondaryButtonText: {
    color: colors.primaryDark
  },
  cameraWrap: {
    flex: 1
  },
  cameraViewport: {
    flex: 1
  },
  camera: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 150,
    paddingTop: 18
  },
  topInstruction: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7E2F0",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 18,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  overlayTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  overlayText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center"
  },
  frame: {
    borderColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    height: 180,
    justifyContent: "space-between",
    width: "84%"
  },
  corner: {
    borderColor: "#FFFFFF",
    height: 26,
    position: "absolute",
    width: 26
  },
  cornerTopLeft: {
    borderLeftWidth: 4,
    borderTopWidth: 4,
    left: -2,
    top: -2
  },
  cornerTopRight: {
    borderRightWidth: 4,
    borderTopWidth: 4,
    right: -2,
    top: -2
  },
  cornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: -2,
    left: -2
  },
  cornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: -2,
    right: -2
  },
  bottomInstruction: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7E2F0",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  bottomText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  captureBar: {
    alignItems: "center",
    backgroundColor: "rgba(9,16,25,0.88)",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  bottomActionButton: {
    flex: 0,
    minHeight: 44,
    minWidth: 116
  },
  captureButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 40,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  captureButtonDisabled: {
    opacity: 0.55
  },
  captureCore: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    width: 56
  },
  captureSpacer: {
    width: 96
  },
  previewWrap: {
    flex: 1,
    padding: 16
  },
  previewImage: {
    backgroundColor: "#102032",
    borderRadius: 16,
    flex: 1
  },
  previewCard: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 14,
    padding: 14
  },
  previewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  previewText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14
  },
  primaryAction: {
    backgroundColor: colors.primary
  },
  secondaryAction: {
    backgroundColor: "#F4F7FB",
    borderColor: colors.line,
    borderWidth: 1
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  secondaryActionText: {
    color: colors.primaryDark
  }
});

