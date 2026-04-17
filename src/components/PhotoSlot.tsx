import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import { PhotoAsset } from "../types";
import { Button } from "./Button";

type Props = {
  title: string;
  photo?: PhotoAsset;
  onTakePhoto: () => void;
  helperText?: string;
  buttonLabel?: string;
  disabled?: boolean;
  onClearPhoto?: () => void;
};

export function PhotoSlot({ title, photo, onTakePhoto, helperText, buttonLabel, disabled, onClearPhoto }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        {photo ? <Image source={{ uri: photo.uri }} style={styles.image} /> : <Text style={styles.empty}>Sem foto</Text>}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.fileName} numberOfLines={1}>
          {photo ? photo.fileName || "Foto registrada" : helperText ?? "Use a câmera do celular"}
        </Text>
        {photo?.capturedAt ? <Text style={styles.captureTime}>Registrada as {formatTime(photo.capturedAt)}</Text> : null}
        <Button variant="secondary" disabled={disabled} onPress={onTakePhoto}>
          {buttonLabel ?? "Tirar foto"}
        </Button>
        {photo && onClearPhoto ? (
          <Pressable onPress={onClearPhoto} style={styles.clearAction}>
            <Text style={styles.clearActionText}>Remover foto</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  preview: {
    alignItems: "center",
    backgroundColor: "#EDF3FB",
    borderRadius: 8,
    height: 92,
    justifyContent: "center",
    overflow: "hidden",
    width: 92
  },
  image: {
    height: "100%",
    width: "100%"
  },
  empty: {
    color: colors.muted,
    fontSize: 13
  },
  meta: {
    flex: 1,
    gap: 8
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  fileName: {
    color: colors.muted,
    fontSize: 13
  },
  captureTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  clearAction: {
    alignSelf: "flex-start"
  },
  clearActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  }
});

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
