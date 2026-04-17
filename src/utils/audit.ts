import { AuthSession, OfflineAuditContext } from "../types";

export const GUARD_CLIENT_TYPE = "GUARD_APP";
export const GUARD_DEVICE_NAME = "guarita-mobile";

export function buildOfflineAuditContext({
  session,
  unitId,
  evidenceUrl
}: {
  session: AuthSession;
  unitId?: string | null;
  evidenceUrl?: string | null;
}): OfflineAuditContext {
  return {
    performedAt: new Date().toISOString(),
    performedByUserId: session.operatorId,
    performedByUserName: session.operatorName,
    clientType: GUARD_CLIENT_TYPE,
    deviceName: GUARD_DEVICE_NAME,
    unitId: unitId ?? null,
    evidenceUrl: evidenceUrl ?? null
  };
}
