# Aderencia Do Guarita Ao Ecossistema

Data: `2026-04-14`

## Objetivo

Registrar, de forma curta, o que o `Guarita` ja trata como aderente ao ecossistema compartilhado entre:

- `Backend`
- `Portaria Web`
- `App Morador`
- `Guarita`

## Contratos ja aderidos

- `eventType` como campo canonico do stream.
- `occurredAt` como campo canonico de tempo no stream.
- `entityType` e `entityId` como obrigatorios no stream.
- `permissions-matrix` como fonte primaria oficial.
- `effectiveAccess` como complemento oficial.
- `clientRequestId` como identificador canonico de sincronizacao.
- `syncStatus` com:
  - `retryable`
  - `isFinal`
  - `isApplied`
- `people/unit-residents` como caminho canonico de moradores por unidade, sem `locatarios`.
- workflow operacional de alertas com:
  - `NEW`
  - `ON_HOLD`
  - `RESOLVED`
- `renotify` de encomendas.
- `stream-capabilities` como contrato normativo do consumo de stream.
- configuracao canonica de condominio via:
  - `GET /api/v1/condominiums/{id}`
  - `enabledModules`
  - `residentManagementSettings`
  - `slimMode`
  - `deliveryRenotification`
- OCR de encomendas com sugestao de unidade e morador.
- OCR de encomendas usando tambem:
  - `confidence`
  - `unitSuggestions`
  - `residentSuggestions`
- OCR documental de pessoas usando leitura canonica de:
  - `prefill`
  - `nameCandidates`
  - `documentCandidates`
  - `photoUrl`
  - `confidence`

## Fluxos aderidos

- `Encomendas`
  - recebimento;
  - consulta;
  - entrega;
  - reenvio de notificacao;
  - reconciliacao offline.
- `Pessoas`
  - busca;
  - cadastro;
  - cadastro facial;
  - resumo de acessos.
- `Acessos`
  - previsoes;
  - ultimos acessos;
  - busca operacional.
- `Alertas`
  - leitura oficial;
  - workflow oficial.

## Pontos em aderencia parcial

- `OCR de encomendas`:
  - ajuda bastante;
  - ainda depende da calibracao final do limiar de UX por `confidence`.
- `capabilities`:
  - o app ja le e aplica no stream;
  - ainda falta expandir esse uso normativo para todos os pontos secundarios do front.
- `resident/profile`:
  - reconhecido como referencia importante;
  - ainda sem uso forte no fluxo do `Guarita`.

## Classificacao atual dos pontos abertos

- `bug`:
  - nenhum bug aberto de alto impacto no fluxo principal de `Encomendas` apos a homologacao real do `POST /api/v1/deliveries`.
- `melhoria`:
  - continuar refinando o limiar de UX do OCR de encomendas com base em `confidence`, `unitSuggestions` e `residentSuggestions` em testes reais de etiqueta.
- `desalinhamento de contrato`:
  - nenhum desalinhamento relevante aberto no momento para `stream`, `permissions-matrix`, `unit-residents` ou OCR documental de pessoas.
- `pendencia real de contrato`:
  - nenhuma pendencia forte de contrato para o `Guarita` nos pontos principais ja arbitrados pelo backend.

## Conclusao

O `Guarita` ja esta majoritariamente aderente ao ecossistema nos contratos que importam para o uso operacional.

O que resta esta concentrado em:

- consolidacao de alguns fluxos auxiliares;
- refinamento de UX no app.
