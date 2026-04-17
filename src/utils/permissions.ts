import { AuthSession, PermissionMatrixItem } from "../types";

const GUARD_CLIENT_ALIASES = ["GUARD_APP", "PORTARIA_APP", "GUARITA"];
const OPERATIONAL_ROLES = ["MASTER", "ADMIN", "OPERACIONAL", "OPERADOR", "PORTARIA"];
let permissionsMatrix: PermissionMatrixItem[] = [];

type GuardAction =
  | "deliveries:create"
  | "deliveries:withdrawal"
  | "faces:write"
  | "people:create"
  | "people:create-resident"
  | "visit-forecasts:write"
  | "alerts:read"
  | "cameras:read";

const ACTION_ALIASES: Record<GuardAction, string[]> = {
  "deliveries:create": ["deliveries_create", "deliveries:create", "deliveries:write", "portaria:deliveries"],
  "deliveries:withdrawal": ["deliveries_withdrawal", "deliveries:withdrawal", "deliveries:validate-withdrawal", "portaria:withdrawals"],
  "faces:write": ["facial_register", "facial:register", "faces:write", "portaria:faces"],
  "people:create": ["people_create", "people:create", "people:write", "portaria:people"],
  "people:create-resident": ["people:create-resident", "people:create:resident", "residents:create"],
  "visit-forecasts:write": ["visit_forecasts_write", "visit-forecasts:write", "visit-forecasts:update", "portaria:visit-forecasts"],
  "alerts:read": ["alerts_read", "alerts:read", "alerts:view", "portaria:alerts"],
  "cameras:read": ["cameras_read", "cameras:read", "cameras:view", "portaria:cameras"]
};

const EFFECTIVE_ACCESS_ALIASES: Record<GuardAction, string[]> = {
  "deliveries:create": ["manage_deliveries", "view_deliveries"],
  "deliveries:withdrawal": ["manage_deliveries", "view_deliveries"],
  "faces:write": ["manage_facial", "manage_people"],
  "people:create": ["manage_people", "manage_unit_people"],
  "people:create-resident": ["manage_resident_users", "manage_people"],
  "visit-forecasts:write": ["manage_visit_forecasts", "manage_operation"],
  "alerts:read": ["view_alerts", "manage_alerts"],
  "cameras:read": ["view_cameras", "manage_cameras"]
};

export function setPermissionsMatrix(items: PermissionMatrixItem[]) {
  permissionsMatrix = items;
}

export function canAccessGuardApp(session: AuthSession) {
  if (!hasClientAccess(session)) {
    return false;
  }

  return hasAnyGuardAccess(session) || hasRole(session, OPERATIONAL_ROLES);
}

export function canManageDeliveries(session: AuthSession) {
  return canPerformGuardAction(session, "deliveries:create");
}

export function canValidateWithdrawals(session: AuthSession) {
  return canPerformGuardAction(session, "deliveries:withdrawal");
}

export function canManageFaces(session: AuthSession) {
  return canPerformGuardAction(session, "faces:write");
}

export function canCreatePeople(session: AuthSession) {
  return canPerformGuardAction(session, "people:create");
}

export function canCreateResident(session: AuthSession) {
  return canPerformGuardAction(session, "people:create-resident", ["MASTER", "ADMIN"]);
}

export function canManageForecasts(session: AuthSession) {
  return canPerformGuardAction(session, "visit-forecasts:write");
}

export function canViewAlerts(session: AuthSession) {
  return canPerformGuardAction(session, "alerts:read");
}

export function canViewCameras(session: AuthSession) {
  return canPerformGuardAction(session, "cameras:read");
}

export function isReadOnlyRole(session: AuthSession) {
  return !canManageDeliveries(session) && !canManageFaces(session) && !canManageForecasts(session);
}

function canPerformGuardAction(session: AuthSession, action: GuardAction, fallbackRoles = OPERATIONAL_ROLES) {
  if (!hasClientAccess(session)) {
    return false;
  }

  if (isWriteActionBlockedByScope(session, action)) {
    return false;
  }

  if (hasEffectiveAccess(session, action)) {
    return true;
  }

  if (hasStructuredPermission(session, action)) {
    return true;
  }

  return hasPermissionAlias(session, ACTION_ALIASES[action]) || hasRole(session, fallbackRoles);
}

function hasStructuredPermission(session: AuthSession, action: GuardAction) {
  if (
    !session.allowedProfiles?.length &&
    !session.allowedClients?.length &&
    !session.scope &&
    !session.scopeType &&
    !session.condominiumIds?.length &&
    !session.unitIds?.length &&
    !session.streetIds?.length
  ) {
    return false;
  }

  const profileAllowed = !session.allowedProfiles?.length || session.allowedProfiles.some((item) => item.toUpperCase() === session.role.toUpperCase());
  const clientAllowed = !session.allowedClients?.length || session.allowedClients.some((item) => GUARD_CLIENT_ALIASES.includes(item.toUpperCase()));
  const scopeAllowed = hasStructuredScope(session);

  if (!profileAllowed || !clientAllowed || !scopeAllowed) {
    return false;
  }

  return ACTION_ALIASES[action].some((alias) => hasPermissionAlias(session, [alias]));
}

function hasClientAccess(session: AuthSession) {
  if (!session.allowedClients?.length) {
    return true;
  }

  const normalized = session.allowedClients.map((item) => item.toUpperCase());
  return normalized.some((item) => GUARD_CLIENT_ALIASES.includes(item));
}

function hasEffectiveAccess(session: AuthSession, action: GuardAction) {
  const entries = session.effectiveAccess ?? {};
  const normalizedEntries = Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [key.toLowerCase(), Boolean(value)])
  );

  return EFFECTIVE_ACCESS_ALIASES[action].some((alias) => normalizedEntries[alias.toLowerCase()] === true);
}

function hasRole(session: AuthSession, roles: string[]) {
  return roles.includes(session.role.toUpperCase());
}

function hasPermissionAlias(session: AuthSession, permissions: string[]) {
  const normalized = getEffectivePermissions(session).map((item) => item.toLowerCase());
  return permissions.some((item) => normalized.includes(item.toLowerCase()));
}

function hasAnyGuardAccess(session: AuthSession) {
  const actions: GuardAction[] = [
    "deliveries:create",
    "deliveries:withdrawal",
    "faces:write",
    "people:create",
    "people:create-resident",
    "visit-forecasts:write",
    "alerts:read",
    "cameras:read"
  ];

  return actions.some((action) => hasPermissionAlias(session, ACTION_ALIASES[action]));
}

function isWriteActionBlockedByScope(session: AuthSession, action: GuardAction) {
  const writeActions: GuardAction[] = [
    "deliveries:create",
    "deliveries:withdrawal",
    "faces:write",
    "people:create",
    "people:create-resident",
    "visit-forecasts:write"
  ];

  return writeActions.includes(action) && Boolean(session.requiresUnitSelection && !session.selectedUnitId);
}

function getEffectivePermissions(session: AuthSession) {
  const directPermissions = session.permissions ?? [];
  const matrixPermissions = permissionsMatrix.find((item) => item.role.toUpperCase() === session.role.toUpperCase())?.permissions ?? [];
  return Array.from(new Set([...directPermissions, ...matrixPermissions]));
}

function hasStructuredScope(session: AuthSession) {
  if (session.scope && session.scope.trim().length > 0) {
    return true;
  }

  if (!session.scopeType || session.scopeType === "UNSCOPED") {
    return true;
  }

  if (session.scopeType === "CONDOMINIUM") {
    return Boolean(session.condominiumId || session.condominiumIds?.length);
  }

  if (session.scopeType === "UNIT") {
    if (session.requiresUnitSelection) {
      return Boolean(session.selectedUnitId);
    }

    return Boolean(session.selectedUnitId || session.unitId || session.unitIds?.length);
  }

  if (session.scopeType === "STREET") {
    return Boolean(session.streetIds?.length);
  }

  return true;
}
