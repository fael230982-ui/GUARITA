# Homologacao Cruzada Do Guarita No Ecossistema

Data de referencia: `2026-04-12`

Base usada:

- `CONTRATO_PADRAO_ECOSSISTEMA_2026-04-11.md`
- `APP_MORADOR_CHECKLIST_HOMOLOGACAO_CRUZADA_ECOSSISTEMA_2026-04-12.md`
- `API v4.4`

## Saida Da Rodada

- `status`: ok com compatibilidade temporaria
- `motivo`: o `Guarita` aderiu bem a `V4.4`, mas ainda depende de fechamento oficial do `backend` em permissoes, alertas, cameras, stream e nomes canonicos de alguns campos.

## 1. Sessao E Escopo

- `ok`: o app ja consome `scopeType`, `condominiumIds`, `unitIds`, `selectedUnitId`, `selectedUnitName` e `requiresUnitSelection`.
- `pendente`: falta o fluxo oficial do backend para selecao de unidade quando o usuario opera com mais de uma.

## 2. Permissoes

- `ok parcial`: o app ja consome `permissions-matrix` e a combina com permissoes da sessao.
- `pendente`: a `permissions-matrix` ainda nao e fonte primaria fechada de forma oficial em todo o ecossistema.

## 3. Encomendas

- `ok parcial`: o front ja convive com `pickupCode` e `withdrawalCode`, alem de `qrCodeUrl` e `withdrawalQrCodeUrl`.
- `ok`: retirada por codigo, confirmacao manual e QR ja funcionam.
- `pendente`: backend precisa manter shape estavel de auditoria e nomes canonicos finais.

## 4. Facial

- `ok parcial`: `faceStatus` ja e lido no front com suporte aos estados canonicos da `V4.4`.
- `pendente`: backend precisa estabilizar em quais rotas esse campo vira oficial e como coexistem campos legados.

## 5. Alertas

- `ok parcial`: o `Guarita` ja trata acesso negado como `alerta operacional`, com triagem local por operador.
- `pendente`: `alertType`, `alertSeverity`, `alertStatus`, `alertId`, `snapshotUrl` e persistencia oficial de triagem ainda dependem do backend.

## 6. Cameras

- `ok parcial`: a prioridade de midia canonica ja esta preparada no front.
- `pendente`: backend precisa estabilizar `cameraId` e as URLs reais de midia utilizadas pelo app.

## 7. Tempo Real

- `ok parcial`: o app ja consome `events/stream` com compatibilidade para `eventType`/`occurredAt` e legado `type`/`timestamp`.
- `pendente`: falta fechamento oficial dos tipos de evento, confirmacao e monitoramento do stream em todo o ecossistema.

## 8. Operacao E Busca

- `ok`: `operation/search` e `operation/units` ja estao integrados no `Guarita`.
- `pendente`: backend precisa manter schemas estaveis entre ambientes.

## 9. Documentacao Compartilhada

- `ok`: o `Guarita` ja publica pendencias e divergencias com prefixo proprio em `DES-RAFIELS`.
- `ok`: esta rodada tambem gera changelog e homologacao do modulo.

## Pendencias Para Backend

- promover `permissions-matrix` a fonte primaria oficial de permissao por acao;
- fechar contrato de escopo com selecao de unidade;
- estabilizar `visitForecastId` como identificador canonico;
- fechar `alertType`, `alertSeverity`, `alertStatus`, `alertId`, `cameraId` e `snapshotUrl`;
- estabilizar URLs de midia de camera e sua prioridade oficial;
- fechar contrato final de `withdrawalCode` e `withdrawalQrCodeUrl`;
- manter `faceStatus` oficial e estavel em rotas relevantes;
- confirmar campos oficiais do `events/stream` e do fluxo de confirmacao, quando aplicavel.
