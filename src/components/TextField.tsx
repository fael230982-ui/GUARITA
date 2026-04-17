import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme";

type Props = TextInputProps & {
  label: string;
  canToggleSecureText?: boolean;
  helperText?: string;
  errorText?: string;
  required?: boolean;
};

export function TextField({ label, style, secureTextEntry, canToggleSecureText, helperText, errorText, required, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const shouldShowToggle = Boolean(canToggleSecureText && secureTextEntry);
  const autoCapitalize = props.autoCapitalize ?? "sentences";
  const resolvedHelperText = errorText ? undefined : helperText ?? (required ? "* Campo obrigatório" : undefined);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor="#7C8985"
          style={[styles.input, shouldShowToggle && styles.inputWithToggle, style]}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry && !visible}
          {...props}
        />
        {shouldShowToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setVisible((current) => !current)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
          >
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : resolvedHelperText ? <Text style={styles.helperText}>{resolvedHelperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  inputWrap: {
    justifyContent: "center"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputWithToggle: {
    paddingRight: 54
  },
  toggle: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10,
    position: "absolute",
    right: 5
  },
  togglePressed: {
    opacity: 0.72
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "justify"
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "justify"
  }
});

