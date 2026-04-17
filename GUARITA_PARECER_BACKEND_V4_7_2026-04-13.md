# Parecer Backend V4.7 Do Guarita

Data: `2026-04-13`

## Objetivo

Registrar o que a `API Sapinho V4.7` mudou de forma material para o `Guarita` e quais respostas formais o `Backend` ainda precisa dar para consolidar sincronizacao, reconciliacao e configuracao de modulo no ecossistema.

## O que a V4.7 destravou de forma real

### 1. clientRequestId em criacao de encomenda

Na `V4.7`, `PublicDeliveryCreateRequest` documenta `clientRequestId`.

Isso permitiu ao `Guarita`:
- enviar `clientRequestId` oficialmente no `POST /api/v1/deliveries`;
- alinhar criacao online com fila offline;
- reduzir a distancia entre cadastro local, reconcile e remocao segura de pendencia;
- sair do estado de “preparado para usar” e entrar no estado de “ja usando no contrato”.

Impacto:
- este e o principal ganho real da `V4.7` para o `Guarita`.

### 2. reforco do ecossistema de reconciliacao

A `V4.7` continua sustentando a linha de `reconcile` por `clientRequestId`.

No `Guarita`, isso ja esta conectado a:
- fila offline;
- historico;
- criacao de encomenda;
- tentativa de evitar duplicidade quando a conexao volta.

### 3. configuracoes publicas mais ricas

A `V4.7` documenta configuracoes como:
- `deliveryRenotification`
- `residentManagementSettings`
- `enabledModules`
- `visitForecastSettings`
- `slimMode`

Isso nao entrou em consumo direto no `Guarita` ainda, mas e relevante para:
- configuracao operacional por cliente;
- evolucao do whitelabel;
- alinhamento entre `Guarita`, `Portaria Web` e `App Morador`.

## O que o Backend ainda precisa fechar

### 1. Semantica oficial de clientRequestId

O backend precisa responder formalmente:

- `clientRequestId` sera opcional, recomendado ou obrigatorio?
- toda entrega criada com esse campo sempre o recebera de volta na resposta?
- o mesmo campo sera adotado tambem em outros agregados, como:
  - `people`
  - `face`
  - `visit-forecasts`
- qual e a politica oficial de idempotencia quando o mesmo `clientRequestId` for reenviado?

Por que isso importa:
- o `Guarita` ja usa esse campo de verdade;
- sem semantica oficial, os modulos podem interpretar diferente o que significa “ja sincronizado”.

### 2. Semantica oficial do reconcile

O backend ainda precisa arbitrar:

- quando `found=true` ja autoriza tratar o item local como resolvido;
- quais valores de `aggregateType` sao validos;
- quais valores de `syncStatus` sao canonicos;
- quando `retryable=true` significa nova tentativa automatica versus pendencia manual;
- se o reconcile ja pode ser considerado estavel para todos os modulos.

### 3. residentManagementSettings, enabledModules e slimMode

Esses campos aparecem na `V4.7`, mas ainda faltam respostas:

- onde exatamente eles serao expostos para os apps operacionais;
- se o front deve obedecer isso como fonte primaria de feature flags;
- se `enabledModules` sera o caminho oficial para habilitar ou ocultar modulos;
- se `slimMode` tera impacto direto na interface operacional;
- como isso conversa com `permissions-matrix` e escopo de sessao.

Por que isso importa:
- isso pode acelerar o caminho de `whitelabel` e configuracao por cliente;
- mas precisa de arbitragem oficial para nao virar regra local diferente em cada modulo.

### 4. Renotify e configuracao de repeticao

A `V4.7` deixa mais claro `PublicDeliveryRenotificationSettings`, com campos como:
- `intervalMinutes`
- `maxRepeats`

O backend precisa responder:
- essas regras ja estao valendo em producao?
- o front deve exibir limite ou apenas respeitar erro/status do backend?
- o `Guarita` deve esconder `reenviar notificacao` em algum contexto por regra de configuracao?

### 5. Stream e alertas

A `V4.7` continua reforcando os campos ricos do stream e tambem a linha de alerta com:
- `notificationEligible`
- `alertType`
- `alertSeverity`
- `alertStatus`

O backend ainda precisa arbitrar:
- quais campos do stream sao obrigatorios;
- se `type/timestamp` seguem como legado;
- qual e o contrato oficial dos alertas operacionais no ecossistema.

## Pedido objetivo ao Backend

Responder formalmente, de preferencia na `DES-RAFIELS`, estes pontos:

1. `clientRequestId` ja e o identificador oficial de idempotencia para entregas?
2. qual e a semantica oficial do `reconcile`?
3. `enabledModules`, `residentManagementSettings` e `slimMode` devem ser obedecidos pelo front? Em qual endpoint?
4. `deliveryRenotification.intervalMinutes` e `maxRepeats` ja devem orientar a UI?
5. qual e a arbitragem final de `stream` e `alertas` na `V4.7`?

## Fechamento

A `V4.7` nao mudou tanto a superficie de rotas do `Guarita`, mas mudou um ponto estrutural importante: `clientRequestId` deixou de ser preparacao local e virou contrato documentado de criacao de entrega. Isso faz a conversa com o `Backend` ficar mais objetiva e mais tecnica a partir de agora.
