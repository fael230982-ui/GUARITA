import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { colors } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
};

export function QrScannerModal({ visible, onClose, onCode }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLocked(false);
    }
  }, [visible]);

  function handleCode(data: string) {
    if (locked) return;
    const normalized = data.trim();
    if (!normalized) return;
    setLocked(true);
    onCode(normalized);
    onClose();
    setTimeout(() => setLocked(false), 1200);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Ler QR code</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Fechar</Text>
          </Pressable>
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? "A câmera está bloqueada no aparelho para este app."
                : "Permita o uso da câmera para ler o QR code da retirada."}
            </Text>
            <Text style={styles.permissionHint}>Sem a câmera liberada, a retirada continua podendo ser validada pelo código digitado.</Text>
            {permission?.canAskAgain !== false ? (
              <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Permitir câmera</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => handleCode(data)}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.overlayText}>Aponte para o QR code da retirada</Text>
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>Mantenha o código dentro da moldura e com boa iluminação.</Text>
              </View>
              <Text style={styles.tipSubtle}>Se a leitura falhar, valide a retirada pelo código digitado.</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#0B1110",
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900"
  },
  close: {
    color: "#D6E4F6",
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
    color: "#D6E4F6",
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
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  cameraWrap: {
    flex: 1
  },
  camera: {
    flex: 1
  },
  overlay: {
    alignItems: "center",
    bottom: 36,
    left: 16,
    position: "absolute",
    right: 16
  },
  scanFrame: {
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    height: 220,
    width: 220
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 16
  },
  tipCard: {
    backgroundColor: "rgba(11,17,16,0.72)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tipText: {
    color: "#D6E4F6",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  tipSubtle: {
    color: "#A9BDD8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center"
  }
});
