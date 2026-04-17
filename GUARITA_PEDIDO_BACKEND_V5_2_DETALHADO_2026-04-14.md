# Pedido Backend V5.2 Detalhado Do Guarita

Data: `2026-04-14`

## 1. OCR de encomendas

Pedido:
- manter consistentes:
  - `recipientPersonId`
  - `recipientUnitId`
  - `recipientName`
  - `unitName`
  - `unitHint`
  - `unitSuggestions`
  - `residentSuggestions`
  - `confidence`
  - `deliveryCompany`
  - `trackingCode`

Contexto:
- o `Guarita` ja usa essas pistas para sugerir unidade e destinatario;
- o ponto em aberto agora e calibracao de qualidade, nao contrato base.

## 2. OCR documental de pessoas

Pedido:
- manter consistentes:
  - `prefill`
  - `nameCandidates`
  - `documentCandidates`
  - `photoUrl`
  - `confidence`

Contexto:
- o cadastro de pessoa no `Guarita` ja absorveu esse OCR como fluxo real;
- o ponto restante e qualidade operacional da sugestao.

## 3. Resident profile

Pedido:
- confirmar se `resident/profile` deve ser consumido pelo `Guarita`;
- esclarecer em quais fluxos ele substitui consultas atuais.

## 4. Feature flags publicas

Pedido:
- manter `GET /api/v1/condominiums/{id}` e `GET /api/v1/master/clients/{client_id}` como fontes oficiais para:
  - `enabledModules`
  - `residentManagementSettings`
  - `slimMode`

Contexto:
- isso destrava a obediencia real do front a configuracao por cliente.

## 5. Capabilities

Pedido:
- manter `sync-capabilities` como referencia tecnica;
- manter `stream-capabilities` como contrato normativo do cliente que consome stream.

Contexto:
- o `Guarita` ja le esses endpoints e esta alinhado com a orientacao final do backend.
