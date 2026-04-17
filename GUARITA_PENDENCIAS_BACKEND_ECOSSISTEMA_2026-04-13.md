# Pendencias Backend Ecossistema 2026-04-13

Documento de saida do `Guarita` apos os fechamentos formais informados pelo `Backend` e a leitura da `API Sapinho V5.2.txt`.

## Fechamentos que o Guarita ja passou a tratar como oficiais

- `eventType` e `occurredAt` como campos canonicos do stream.
- `entityType` e `entityId` como obrigatorios no stream.
- `permissions-matrix` como fonte primaria oficial, em `snake_case`.
- `effectiveAccess` como complemento oficial de permissao efetiva.
- `clientRequestId` como identificador canonico de sincronizacao.
- `syncStatus` canonico, com `retryable`, `isFinal` e `isApplied`.
- `GET /api/v1/people/unit-residents` como caminho canonico de moradores por unidade, sem `locatarios`.
- workflow operacional de alertas como referencia oficial do ecossistema.
- `GET /api/v1/alerts` como listagem oficial de alertas operacionais.
- `PATCH /api/v1/alerts/{id}/workflow` como caminho oficial de atualizacao do workflow.
- `GET /api/v1/auth/sync-capabilities` como referencia tecnica de integracao.
- `GET /api/v1/auth/stream-capabilities` como contrato normativo do consumo de stream.
- `POST /api/v1/people/document-ocr` como OCR documental oficial do ecossistema.
- `birthDate` como campo publico suportado no cadastro e retorno de pessoa.
- `POST /api/v1/deliveries` como fluxo homologado com sucesso em uso real no `Guarita`.

## Pendencias reais que ainda sobraram para o Backend

### 1. OCR de encomendas com consistencia operacional de sugestao

O backend fechou `POST /api/v1/deliveries/ocr` e `POST /api/v1/deliveries/ocr-multipart` como fonte canonica das sugestoes, com:

- `recipientUnitId`
- `recipientPersonId`
- `unitName`
- `recipientName`
- `unitSuggestions`
- `residentSuggestions`
- `confidence`

Pedido:
- manter a entrega desses campos estavel em ambiente real;
- manter `confidence`, `unitSuggestions` e `residentSuggestions` com ordenacao consistente;
- evitar casos em que a leitura reconhece texto, mas o payload util vem fraco demais para o front decidir entre auto-preenchimento e confirmacao humana.

Impacto:
- isso define o quanto o `Guarita` pode automatizar sem aumentar risco operacional.

### 2. OCR documental de pessoas com criterio operacional mais forte

O `Guarita` ja absorveu `POST /api/v1/people/document-ocr` e passou a sugerir nome, documento, tipo e data de nascimento no cadastro. O contrato esta bom, mas a utilidade operacional cresce bastante se o backend mantiver consistencia alta em ambiente real.

Pedido:
- manter estavel no OCR documental, sempre que a informacao existir:
  - `prefill`
  - `nameCandidates`
  - `documentCandidates`
  - `photoUrl`
  - `confidence`
- evitar resposta estruturalmente valida, mas sem sugestao alguma, quando o texto lido trouxer candidatos claros.

Impacto:
- reduz digitacao manual no cadastro de pessoa e melhora o fluxo de portaria em celular.

### 3. Uso operacional de resident/profile

O backend fechou `GET /api/v1/resident/profile` como fonte canonica do perfil do morador, com `profileSource=CANONICAL_RESIDENT_PROFILE`.

Pedido:
- confirmar se o `Guarita` deve consumir esse endpoint no fluxo operacional;
- esclarecer em quais telas isso substitui consultas atuais de pessoa ou unidade;
- confirmar o payload minimo que o mobile pode considerar estavel.

Impacto:
- evita manter leitura paralela entre `people`, `unit-residents` e dados de perfil do morador.

### 4. Configuracoes publicas para whitelabel e modularizacao

O `Guarita` ja passou a consumir `GET /api/v1/condominiums/{id}` para aplicar `enabledModules`, `residentManagementSettings`, `slimMode` e `deliveryRenotification` na sessao operacional.

Pedido:
- manter `GET /api/v1/condominiums/{id}` e `GET /api/v1/master/clients/{client_id}` como fontes canonicas dessas configuracoes;
- manter essas configuracoes como fonte primaria de modularizacao por cliente ou condominio;
- esclarecer a relacao entre:
  - `enabledModules`
  - `permissions-matrix`
  - `effectiveAccess`

Impacto:
- isso fecha melhor a modularizacao e o caminho de whitelabel.

### 5. Clarificar o papel operacional das capabilities novas

O backend fechou:

- `GET /api/v1/auth/sync-capabilities` como contrato tecnico ou interno;
- `GET /api/v1/auth/stream-capabilities` como contrato normativo para consumidores do stream operacional.

O `Guarita` ja consome ambos, orienta o parser do stream por `stream-capabilities` e mantem cache local de contingencia.

Pedido:
- manter `stream-capabilities` como contrato normativo estavel;
- manter `sync-capabilities` com a governanca atual documentada;
- evitar mudanca abrupta de nomenclatura ou semantica desses campos sem nova rodada de homologacao.

Impacto:
- isso define ate que ponto o front pode simplificar parser defensivo e mensagens operacionais.

## Observacao

Os itens abaixo nao devem mais ser tratados como pendencia no `Guarita`:

- arbitragem de `stream` canonico;
- arbitragem de `permissions-matrix`;
- duvida sobre `unit-residents` incluir `locatarios`;
- duvida sobre `clientRequestId` como referencia de sync;
- duvida sobre workflow operacional de alertas;
- estabilidade do `POST /api/v1/deliveries`, homologada com sucesso em uso real no `Guarita` apos o fechamento informado pelo backend;
- OCR documental de pessoas como `pendencia real de contrato`; o ajuste restante no `Guarita` era de leitura do contrato canonico (`prefill`, `nameCandidates`, `documentCandidates`, `photoUrl`, `confidence`), portanto tratava-se de `desalinhamento de contrato` no front, e nao de pendencia do backend.
