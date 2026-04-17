# Pendencias Backend Ecossistema 2026-04-12

Documento de saida do `Guarita` para alinhamento oficial com `Backend`, `Portaria Web` e `App Morador`.

## Objetivo

Consolidar os pontos que ainda dependem de fechamento do `Backend` para reduzir fallback local, ambiguidade de contrato e divergencia entre modulos.

## Pendencias prioritarias

1. Permissoes por acao
- Promover `GET /api/v1/auth/permissions-matrix` a fonte primaria oficial de permissao por acao.
- Fechar formato canonico unico de permissao por acao, sem mistura permanente entre estilos como:
  - `people.view`
  - `alerts.view`
  - `deliveries:create`
- Fechar o contrato de quais permissoes habilitam:
  - `deliveries:create`
  - `deliveries:withdrawal`
  - `faces:write`
  - `people:create`
  - `people:create-resident`
  - `visit-forecasts:write`
  - `alerts:read`
  - `cameras:read`
- Confirmar se o payload de `login` e `auth/me` sempre traz `permissions` suficientes ou se a matriz deve ser obrigatoria para o front.

2. Escopo de sessao V4.4
- Confirmar contrato oficial de `scopeType`, `condominiumIds`, `unitIds`, `selectedUnitId`, `selectedUnitName` e `requiresUnitSelection`.
- Confirmar quando `requiresUnitSelection=true`, se `selectedUnitId` deve vir obrigatoriamente no `login`, no `auth/me` ou por outro fluxo.
- Definir o fluxo backend para selecionar unidade quando o usuario tiver escopo de unidade e varias unidades.

3. Operation Search
- Manter shape estavel de `GET /api/v1/operation/search` para os blocos `people`, `deliveries` e `accessLogs`.
- Confirmar se os mesmos schemas documentados em `V4.4` sao garantidos em todos os ambientes.

4. Alertas operacionais
- Fechar contrato oficial de:
  - `alertType`
  - `alertSeverity`
  - `alertStatus`
- Confirmar se alerta operacional sera derivado de acesso negado no backend ou se havera entidade/endpoint proprio.
- Definir se a triagem de alerta sera persistida no backend ou permanecer local como contingencia.

5. Cameras e evidencia
- Fechar contrato oficial de:
  - `cameraId`
  - `snapshotUrl`
  - `liveUrl`
  - `hlsUrl`
  - `webRtcUrl`
  - `imageStreamUrl`
  - `mjpegUrl`
  - `thumbnailUrl`
- Confirmar a ordem oficial de prioridade de midia para todos os modulos.
- Confirmar se `cameraId` e `snapshotUrl` chegam em `access-logs`, `events/stream` e futuros alertas do mesmo jeito.

6. Eventos em tempo real
- Confirmar o conjunto oficial de `eventType` publicado no stream.
- Confirmar os campos minimos obrigatorios por evento, especialmente:
  - `eventType`
  - `occurredAt`
  - `entityType`
  - `entityId`
  - `unitId`
  - `cameraId`
- Confirmar se `POST /api/v1/events/stream/confirm` sera obrigatorio, opcional ou descontinuado, e publicar request/response estaveis para homologacao cruzada.
- Confirmar semantica oficial de `connectionId`, `deviceId`, `deviceName`, `currentPath` e `metadata` quando houver confirmacao do stream.
- Confirmar se `type` e `timestamp` ainda serao mantidos como legado ou se podem ser aposentados.

7. Metricas e devices operacionais
- Tipar de forma estavel respostas ainda genericas da linha operacional, especialmente `GET /api/v1/ops/metrics`.
- Garantir contrato consistente para heartbeat e monitoramento de devices operacionais entre ambientes quando essa trilha fizer parte da operacao oficial do ecossistema.

8. Visitas previstas
- Confirmar `visitForecastId` como identificador canonico oficial.
- Garantir consistencia entre `id` e `visitForecastId` em `visit-forecasts` e operacoes relacionadas.

9. Encomendas
- Confirmar os campos de auditoria ricos no contrato de entrega:
  - `performedAt`
  - `clientType`
  - `deviceName`
  - `evidenceUrl`
- Confirmar publicacao consistente de `recipientUnitName`.
- Confirmar consolidacao entre nomenclatura vigente e alvo:
  - `pickupCode` x `withdrawalCode`
  - `qrCodeUrl` x `withdrawalQrCodeUrl`

10. Facial
- Confirmar `faceStatus` como campo oficial compartilhado entre os modulos.
- Validar como os estados canonicos da `V4.4` devem ser usados no ecossistema:
  - `NO_PHOTO`
  - `PHOTO_ONLY`
  - `FACE_PENDING_SYNC`
  - `FACE_SYNCED`
  - `FACE_ERROR`

## Observacao

O `Guarita` ja possui compatibilidade local para quase todos os itens acima, mas ainda usa fallback e leitura defensiva em varios pontos porque o contrato backend/ecossistema ainda nao esta totalmente fechado.
