# Solicitar Ao Backend Para Fechar Melhor O App Guarita

Data de referencia: `2026-04-11`

Contexto:

- o app `Guarita` ja foi alinhado no front com a linha `V4.3`
- OCR, busca operacional de unidade, foto de encomenda, facial e stream ja entraram no app
- o que falta agora e menos "ter endpoint" e mais "fechar contrato, tipagem, permissao e conciliacao"

## Prioridade Alta

### 1. Tipar oficialmente `GET /api/v1/operation/search`

Hoje o front ja usa esse endpoint, mas o contrato ainda esta generico demais em partes do schema.

O backend precisa documentar de forma estavel os itens retornados em:

- `people`
- `deliveries`
- `accessLogs`

Minimo esperado para `people`:

```json
{
  "id": "uuid",
  "name": "Nome",
  "document": "CPF opcional",
  "documentType": "CPF",
  "category": "RESIDENT",
  "categoryLabel": "Morador",
  "status": "ACTIVE",
  "statusLabel": "Ativo",
  "unitId": "uuid",
  "unitName": "Apto 101",
  "unitIds": ["uuid"],
  "unitNames": ["Apto 101"],
  "phone": "5511999999999",
  "email": "pessoa@dominio.com",
  "photoUrl": "https://...",
  "hasFacialCredential": true
}
```

Impacto:

- reduz acoplamento fraco no front
- melhora alinhamento entre `Guarita`, `Portaria Web` e `App Morador`

### 2. Fechar matriz oficial de permissao por acao

O app hoje ja adapta parte da interface por `role` e `permissions`, mas o backend ainda precisa fechar oficialmente quem pode:

- cadastrar morador
- cadastrar visitante
- cadastrar prestador
- cadastrar entregador
- cadastrar locatario
- cadastrar face
- validar retirada
- atualizar visita prevista
- operar apenas em modo consulta

Ideal:

- lista fechada de `permissions`
- regra oficial por papel
- mesma semantica nos tres modulos

### 3. Enriquecer `PublicDeliveryResponse`

Para o fluxo operacional da guarita, faltam campos que evitam heuristica no front.

Pedir no retorno de entrega:

```json
{
  "recipientUnitId": "uuid",
  "recipientUnitName": "Apto 101",
  "receivedByUserId": "uuid",
  "receivedByName": "Operador",
  "packagePhotoUrl": "https://...",
  "labelPhotoUrl": "https://..."
}
```

Impacto:

- melhora historico
- melhora conciliacao entre item local e item remoto
- melhora alinhamento com `Portaria Web` e `App Morador`

### 4. Confirmar oficialmente os tipos do `events/stream`

O app ja usa `GET /api/v1/events/stream`, mas hoje ainda depende de inferencia leve no cliente para saber quando recarregar `movimento` e `historico`.

O backend precisa documentar:

- nomes oficiais de `type`
- payload esperado por tipo
- quais eventos sao de `deliveries`
- quais eventos sao de `visit-forecasts`
- quais eventos sao de `access-logs`
- se existe heartbeat oficial
- se existe evento de reconexao/confirmacao

Ideal:

```json
{
  "type": "delivery:created",
  "payload": {
    "deliveryId": "uuid"
  },
  "timestamp": "2026-04-11T20:00:00Z"
}
```

## Prioridade Media

### 5. Padronizar estado facial no backend

Hoje o front le sinais como:

- `hasFacialCredential`
- `faceListId`
- `faceListItemId`

Mas ainda falta um estado unico e compartilhado do ecossistema.

Sugestao:

```json
{
  "faceStatus": "NO_PHOTO | PHOTO_ONLY | FACE_PENDING_SYNC | FACE_SYNCED | FACE_ERROR",
  "faceUpdatedAt": "2026-04-11T20:00:00Z",
  "faceErrorMessage": "texto opcional"
}
```

Impacto:

- reduz interpretacao diferente entre `Guarita`, `Portaria Web` e `App Morador`

### 6. Melhorar conciliacao entre fila offline e item remoto

Hoje o app ja consegue operar offline, mas o backend poderia facilitar muito a conciliacao com campos mais deterministas.

Seria util ter no retorno de entrega:

- `createdAt` confiavel
- `receivedAt` confiavel
- `trackingCode`
- `recipientUnitId`
- `recipientUnitName`
- `deliveryCompany`

E, se possivel, um identificador de conciliacao do cliente:

```json
{
  "clientRequestId": "string-opcional"
}
```

Isso reduziria duplicidade visual apos sincronizacao.

### 7. Confirmar contrato oficial do fluxo facial

O front ja prioriza:

```text
POST /api/v1/facial/register
```

e usa:

```text
POST /api/v1/facial/register-async
```

como fallback legado.

O backend precisa confirmar:

- qual endpoint e o oficial
- se o async vai continuar existindo
- se ha retorno padronizado de qualidade
- se ha erro especifico para rosto nao detectado
- se ha sincronizacao automatica com equipamento

### 8. Confirmar se `consentAccepted` e `source` entram oficialmente no facial

Se o negocio exigir rastreabilidade melhor, o ideal e o backend aceitar algo como:

```json
{
  "personId": "uuid",
  "photoUrl": "https://...",
  "consentAccepted": true,
  "source": "GUARD_APP"
}
```

## Prioridade Desejavel

### 9. Filtros por periodo nos endpoints operacionais

Muito util para reduzir carga e melhorar consistencia:

```text
GET /api/v1/deliveries?from=2026-04-11&to=2026-04-11
GET /api/v1/visit-forecasts?from=2026-04-11&to=2026-04-11
GET /api/v1/access-logs?from=2026-04-11&to=2026-04-11
```

### 10. Documentar melhor `GET /api/v1/deliveries/withdrawal-qr/{code}`

O endpoint existe, mas vale fechar schema e uso esperado para:

- localizar entrega por QR
- exibir dados antes da validacao final
- manter a mesma semantica no `Guarita` e no `Portaria Web`

### 11. Contrato unificado de status do ecossistema

Backend ainda precisa consolidar oficialmente:

- status de encomenda
- status de alerta
- status facial
- status de acesso
- status de notificacao

Sem isso, cada front continua fazendo parte da leitura por convencao.

## Resumo Executivo

Se eu tivesse que pedir so o essencial agora para o backend, pediria:

1. schema tipado de `operation/search`
2. matriz oficial de permissao por acao
3. `PublicDeliveryResponse` mais rico
4. tipos oficiais do `events/stream`
5. estado facial unificado

Esses cinco pontos dariam o maior ganho de estabilidade e padronizacao para o `Guarita` sem exigir nova grande rodada de UI.
