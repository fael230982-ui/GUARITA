import { AuthSession } from "../types";

export function isUnitSelectionPending(session: AuthSession) {
  return Boolean(session.requiresUnitSelection && !session.selectedUnitId);
}

export function sessionScopeLabel(session: AuthSession) {
  if (session.selectedUnitName) {
    return `Escopo: ${session.selectedUnitName}`;
  }

  if (session.scopeType === "UNIT" && session.selectedUnitId) {
    return "Escopo: unidade selecionada";
  }

  if (session.scopeType === "UNIT" && session.requiresUnitSelection) {
    return "Escopo: unidade obrigatoria";
  }

  if (session.scopeType === "CONDOMINIUM" && session.condominiumIds?.length) {
    return `Escopo: ${session.condominiumIds.length} condominio(s)`;
  }

  if (session.scopeType === "STREET" && session.streetIds?.length) {
    return `Escopo: ${session.streetIds.length} rua(s)`;
  }

  return "";
}
