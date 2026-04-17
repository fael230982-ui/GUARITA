# Retorno Do Guarita Ao Backend Pos Fechamento

Data: `2026-04-14`

## Objetivo

Registrar, do ponto de vista do `Guarita`, o que ja foi absorvido no front apos os fechamentos mais recentes do backend, o que ainda esta pendente no nosso lado e quais pontos merecem homologacao conjunta.

## O que o Guarita ja absorveu

### 1. Stream operacional

O `Guarita` ja trata como canônicos:

- `eventType`
- `occurredAt`
- `entityType`
- `entityId`

O app tambem ja le e interpreta:

- `snapshotUrl`
- `liveUrl`
- `replayUrl`
- `replayAvailable`
- `secondsBefore`
- `secondsAfter`
- `title`
- `body`

Compatibilidade legada continua apenas como contingencia:

- `type`
- `timestamp`
- `eventTime`

### 2. Permissions matrix

O `Guarita` ja usa:

- `permissions-matrix` como fonte primaria;
- `effectiveAccess` como complemento.

O app ja trabalha com a leitura canonica em `snake_case`.

### 3. Sync e reconciliacao

O `Guarita` ja usa:

- `clientRequestId` como referencia canonica;
- `syncStatus`;
- `retryable`;
- `isFinal`;
- `isApplied`.

O fluxo offline e a reconciliacao local ja foram alinhados com essa semantica.

### 4. Moradores por unidade

O `Guarita` ja usa `GET /api/v1/people/unit-residents` como caminho canonico para destinatarios de encomenda.

O front ja considera como regra oficial:

- sem `locatarios`;
- payload enxuto;
- foco em morador real da unidade.

### 5. Alertas operacionais

O `Guarita` ja consome:

- `GET /api/v1/alerts`
- `PATCH /api/v1/alerts/{id}/workflow`

O workflow operacional ja esta alinhado com:

- `NEW`
- `ON_HOLD`
- `RESOLVED`

### 6. OCR de encomendas

O `Guarita` ja usa o OCR de encomendas como fonte principal de sugestao no fluxo de recebimento.

O front ja trabalha com:

- `recipientUnitId`
- `recipientPersonId`
- `unitName`
- `recipientName`
- `confidence`

O comportamento atual ja permite:

- sugerir unidade;
- sugerir destinatario;
- confirmar manualmente antes de salvar.

### 7. OCR documental de pessoas

O `Guarita` ja absorveu:

- `POST /api/v1/people/document-ocr`

O front ja usa para sugerir:

- nome;
- documento;
- tipo do documento;
- data de nascimento.

### 8. birthDate

O `Guarita` ja trata `birthDate` como campo suportado no cadastro de pessoa.

### 9. resident/profile

O `Guarita` ja reconhece `resident/profile` como fonte canonica do perfil do morador no ecossistema, mas ainda nao fez a migracao completa de uso para esse endpoint como fonte principal da experiencia.

## O que ainda falta do lado do Guarita

### 1. resident/profile como fonte principal

Ainda falta trocar a leitura atual complementar por uso principal de `resident/profile` no que fizer sentido para a experiencia do app.

### 2. OCR de encomendas com limiar de UX

O backend ja fecha:

- sugestoes;
- score;
- confidence;
- ordenacao.

O que ainda falta no `Guarita` e decidir e consolidar:

- quando autopreencher automaticamente;
- quando apenas sugerir;
- quando exigir confirmacao humana obrigatoria.

### 3. enabledModules, residentManagementSettings e slimMode

O `Guarita` ainda nao esta consumindo esses campos pelos endpoints canonicos de cliente/condominio.

Essa integracao ainda precisa ser feita no front.

### 4. stream-capabilities como contrato obrigatorio

O `Guarita` ja le `stream-capabilities`, mas ainda nao trata esse endpoint como contrato normativo obrigatorio de consumo do stream operacional.

Essa mudanca ainda precisa ser fechada no front.

## Pontos para homologacao conjunta

### 1. Cadastro de encomenda

O backend informou que o `POST /api/v1/deliveries` foi estabilizado.

Do lado do `Guarita`, ainda vale homologar em uso real:

- resposta `201` consistente;
- fim da falsa percepcao de falha;
- ausencia de logout ou erro visual apos persistencia.

### 2. OCR de encomendas

Vale homologar em uso real:

- unidade sugerida;
- destinatario sugerido;
- leitura com etiqueta boa;
- comportamento com confidence alta, media e baixa.

### 3. OCR documental

Vale homologar:

- nome;
- documento;
- tipo;
- data de nascimento.

### 4. Stream operacional

Vale homologar no app:

- leitura dos campos canonicos;
- resposta a `stream-capabilities`;
- degradacao controlada quando o stream oscilar.

## Conclusao

Do ponto de vista do `Guarita`, o backend ja destravou a maior parte dos contratos centrais.

O que resta agora esta muito mais concentrado no front:

- consolidar `resident/profile` como fonte principal;
- consumir configuracoes canonicas de cliente/condominio;
- tratar `stream-capabilities` como contrato obrigatorio;
- fechar a UX final do OCR de encomendas com base em `confidence`.
