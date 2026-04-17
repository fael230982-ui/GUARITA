# Parecer Backend V4.6 Do Guarita

Data: `2026-04-13`

## Objetivo

Consolidar, de forma objetiva e detalhada, o que a `API Sapinho V4.6` ja permitiu absorver no `Guarita` e quais pontos ainda precisam de arbitragem formal do `Backend` para reduzir fallback local, evitar divergencia entre modulos e estabilizar a operacao de `porteiro` e `zelador`.

## O que o Guarita ja absorveu da V4.6

- `GET /api/v1/people/unit-residents` passou a ser o caminho principal para carregar destinatarios por unidade em `Encomendas`.
- o `Guarita` complementa localmente com `locatarios` quando necessario, para nao perder destinatarios validos no fluxo operacional.
- `GET /api/v1/internal/sync/reconcile/{client_request_id}` ja foi integrado para reconciliar encomendas locais antes de trata-las como ainda pendentes.
- a fila offline de encomendas agora consulta `reconcile` antes de reenviar uma criacao, reduzindo risco de duplicidade apos retomada de conexao.
- o parser do `stream` foi ampliado para aceitar os campos mais ricos documentados na `V4.6`, como `title`, `body`, `snapshotUrl`, `liveUrl`, `replayUrl`, `replayAvailable` e `eventTime`.

## Pontos que o Backend ainda precisa fechar

### 1. Moradores por unidade

- confirmar formalmente se `GET /api/v1/people/unit-residents` e o endpoint canonico para o ecossistema quando o assunto for listar destinatarios de uma unidade.
- confirmar se o retorno intencionalmente sera enxuto (`id`, `name`, `unitId`, `unitName`) ou se havera versoes por perfil com campos adicionais.
- confirmar se `locatarios` entram ou nao nesse endpoint.
- se `locatarios` nao entrarem, publicar isso explicitamente na documentacao para o front saber que precisa complementar por outro caminho.
- se `locatarios` devem entrar, alinhar isso no backend para evitar regra divergente entre `Guarita`, `Portaria Web` e `App Morador`.

Por que isso importa:
- `Encomendas` precisa listar rapidamente os destinatarios certos depois que a unidade e selecionada.
- qualquer ambiguidade aqui vira retrabalho operacional para o porteiro.

### 2. Reconcile por clientRequestId

- confirmar que `clientRequestId` sera o identificador oficial de reconciliacao e idempotencia para criacoes offline.
- confirmar quando `found=true` no `reconcile` ja autoriza o front a remover o item local da fila.
- confirmar os valores esperados de `aggregateType`.
- confirmar os valores esperados de `syncStatus`.
- confirmar quando `retryable=true` deve ser tratado como nova tentativa automatica ou apenas alerta operacional.
- confirmar se o `reconcile` sera usado so para `deliveries` ou tambem para `people`, `face` e outros agregados no futuro.

Por que isso importa:
- sem semantica clara, o app fica entre dois riscos ruins:
- remover cedo demais um item ainda nao refletido no backend;
- ou reenviar algo que ja foi absorvido e gerar duplicidade.

### 3. Criacao de encomenda e clientRequestId

- a `PublicDeliveryResponse` ja documenta `clientRequestId`, mas a `PublicDeliveryCreateRequest` ainda nao deixa isso explicito.
- o backend precisa confirmar se o `POST /api/v1/deliveries` passara a aceitar `clientRequestId` no corpo da requisicao.
- se a resposta ja refletir `clientRequestId`, confirmar se ele sempre sera ecoado quando a criacao vier desse fluxo.

Por que isso importa:
- hoje o `Guarita` ja usa `clientRequestId` localmente para reconciliacao, mas ainda nao pode depender do envio oficial desse campo no `createDelivery`.

### 4. OCR de etiqueta

- o `Guarita` ja usa `POST /api/v1/deliveries/ocr` com a chave multipart correta (`photo`) e ja aproveita `recipientPersonId`, `recipientUnitId`, `unitName`, `recipientName`, `deliveryCompany` e `trackingCode` quando vierem.
- o backend precisa melhorar consistencia e preenchimento desses campos no OCR real.
- confirmar o papel de `confidence` e qual limiar pode ser considerado seguro para automacao conservadora.
- confirmar se `recipientUnitId` e `recipientPersonId` serao devolvidos apenas quando houver alta confianca ou tambem em matches probabilisticos.
- se o OCR nao fechar o destinatario com seguranca, vale devolver pelo menos uma pista mais forte de nome ou unidade para o app sugerir melhor.

Por que isso importa:
- hoje o porteiro so ganha produtividade real se a leitura da etiqueta aproximar o fluxo de `ler -> conferir -> salvar`.
- se o OCR so preencher texto solto, ele vira custo extra e nao facilitador.

### 5. Stream canonico

- confirmar quais campos do `text/event-stream` passam a ser obrigatorios na pratica:
- `eventId`
- `eventType`
- `occurredAt`
- `entityType`
- `entityId`
- `unitId`
- `cameraId`
- `title`
- `body`
- `snapshotUrl`
- `liveUrl`
- `replayUrl`
- `eventTime`
- confirmar se `type` e `timestamp` seguirao como legado temporario ou se ja podem ser aposentados.
- confirmar o catalogo oficial de `eventType`.
- confirmar se os eventos de entrega, retirada, acesso e camera seguirão um contrato estavel entre ambientes.

Por que isso importa:
- o `Guarita` ja trata stream como acelerador operacional.
- sem canon final, os modulos continuam presos a parser defensivo e compatibilidade temporaria.

### 6. Renotify de encomenda

- confirmar quem exatamente e notificado por `POST /api/v1/deliveries/{id}/renotify`.
- confirmar se sempre atualiza `notificationSentAt`.
- confirmar quais status de encomenda permitem `renotify`.
- confirmar se havera limite de repeticao ou bloqueio por antifraude.
- confirmar se existe diferenca entre reenvio para todos os moradores da unidade e reenvio apenas para o destinatario vinculado.

Por que isso importa:
- o `Guarita` ja expos `Reenviar notificacao` no fluxo operacional.
- sem semantica fechada, o operador pode usar uma acao cujo efeito real ainda esta ambíguo.

### 7. Visitas previstas V4.5/V4.6

- confirmar oficialmente a semantica final de:
- `PENDING_ARRIVAL`
- `ARRIVED`
- `EXPIRED`
- `CANCELLED`
- confirmar se `EXPIRED` substitui definitivamente a leitura operacional antiga que antes caia em `COMPLETED` ou `NO_SHOW`.
- confirmar o papel de `releaseMode` na UI e na operacao.
- confirmar `visitForecastId` como identificador canonico obrigatorio em todas as respostas e operacoes.
- confirmar se `residentNotifiedAt` deve ser tratado como campo estavel para os modulos.

Por que isso importa:
- `Acessos` ja foi ajustado para a `V4.5`, mas o ecossistema ainda precisa de arbitragem final para nao ter leitura diferente entre modulos.

### 8. Permissoes e escopo

- confirmar se `GET /api/v1/auth/permissions-matrix` ja pode ser tratado como fonte primaria oficial de permissao por acao.
- confirmar o formato canonico final das permissoes.
- confirmar o contrato definitivo de escopo em sessao:
- `scopeType`
- `condominiumIds`
- `unitIds`
- `selectedUnitId`
- `selectedUnitName`
- `requiresUnitSelection`
- confirmar como o backend pretende resolver selecao de unidade quando o usuario tem varias unidades possiveis.

Por que isso importa:
- o `Guarita` ja consome `auth/me` e `permissions-matrix`, mas ainda convive com fallback por papel enquanto a arbitragem oficial nao fecha.

## Pedido objetivo ao Backend

Responder formalmente, de preferencia na pasta compartilhada `DES-RAFIELS`, estes pontos:

1. `people/unit-residents` sera o caminho canonico oficial? Inclui ou nao `locatarios`?
2. `clientRequestId` entra oficialmente no `POST /deliveries`? Quando ele volta garantidamente na resposta?
3. Como interpretar `reconcile`: `found`, `aggregateType`, `syncStatus`, `retryable`?
4. Quais campos do OCR sao realmente confiaveis para automacao conservadora?
5. Quais campos do stream sao obrigatorios e quais ainda sao legado?
6. Qual a semantica oficial de `renotify`?
7. Qual a leitura oficial de `EXPIRED`, `releaseMode` e `visitForecastId` em visitas?
8. `permissions-matrix` ja e a referencia principal oficial de permissao por acao?

## Fechamento

O `Guarita` conseguiu absorver bem a `V4.6` e reduziu alguns fallbacks antigos, principalmente em `moradores por unidade` e `offline/reconcile`. O que resta agora e menos falta de implementacao local e mais necessidade de arbitragem formal do `Backend` para que o ecossistema inteiro opere com o mesmo contrato.
