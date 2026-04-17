# Changelog Do Guarita No Ecossistema

Data de criacao: `2026-04-12`

## Objetivo

Registrar mudancas curtas do `Guarita` que impactam contrato, integracao, operacao ou governanca compartilhada com:

- `Backend`
- `Portaria Web`
- `App Morador`

## Entradas

### 2026-04-14 | Guarita | Contratos normativos de stream e configuracao canonica de condominio | api

- `mudanca`: o `Guarita` passou a consumir `GET /api/v1/condominiums/{id}` para aplicar `enabledModules`, `residentManagementSettings`, `slimMode` e `deliveryRenotification`, e passou a orientar o parser do stream por `GET /api/v1/auth/stream-capabilities`.
- `impacta contrato`: sim, porque move o app de preparacao para obediencia pratica aos contratos normativos fechados no backend.
- `quem precisa agir`: `Guarita` ja absorveu; `Portaria Web` e `App Morador` devem seguir a mesma leitura canonica para configuracao publica e stream.
- `documento base`: `src/api/client.ts`, `src/utils/operationEvents.ts`, `App.tsx`, `README.md`

### 2026-04-14 | Guarita | OCR documental alinhado ao contrato canonico | frontend

- `mudanca`: o `Guarita` deixou de priorizar apenas campos `suggested*` no OCR documental e passou a ler `prefill`, `nameCandidates`, `documentCandidates`, `photoUrl` e `confidence` como base principal, mantendo compatibilidade com campos anteriores.
- `impacta contrato`: sim, porque corrige um desalinhamento do front em relacao ao contrato oficial do backend.
- `quem precisa agir`: `Guarita` ja absorveu; os demais fronts devem validar se ainda esperam nomes de campo antigos no OCR documental.
- `documento base`: `src/api/client.ts`, `src/screens/FaceScreen.tsx`, `src/types.ts`

### 2026-04-14 | Guarita | OCR de encomendas calibrado por confidence e sugestoes oficiais | frontend

- `mudanca`: o `Guarita` passou a usar `confidence`, `unitSuggestions` e `residentSuggestions` do OCR de encomendas para decidir melhor entre auto-preenchimento e confirmação humana, reduzindo auto-seleção agressiva quando o retorno vem fraco.
- `impacta contrato`: nao reabre contrato; trata-se de melhoria de heuristica com base em contrato ja fechado no backend.
- `quem precisa agir`: `Guarita` ja absorveu; os demais fronts podem seguir a mesma linha de UX para OCR de encomendas.
- `documento base`: `src/api/client.ts`, `src/screens/DeliveryScreen.tsx`, `src/types.ts`

### 2026-04-14 | Guarita | API v5.2 | api

- `mudanca`: o `Guarita` absorveu o OCR documental de pessoas com `POST /api/v1/people/document-ocr`, passou a aceitar `birthDate` no cadastro de pessoa e enriqueceu a leitura das capacidades oficiais de `sync` e `stream`.
- `impacta contrato`: sim, porque transforma a `V5.2` em ganho operacional real no cadastro de pessoas e reduz interpretacao local sobre os contratos de capacidade.
- `quem precisa agir`: `Guarita` ja absorveu a mudanca; `Backend`, `Portaria Web` e `App Morador` devem considerar `document-ocr`, `birthDate`, `supportedSyncStatuses`, `retryableSyncStatuses` e `finalSyncStatuses` como parte da base oficial publicada.
- `documento base`: `API Sapinho V5.2.txt`, `src/api/client.ts`, `src/screens/FaceScreen.tsx`, `src/types.ts`, `README.md`

### 2026-04-14 | Guarita | API v5.1 | api

- `mudanca`: o `Guarita` passou a usar `GET /api/v1/alerts` como fonte principal da tela de `Alertas`, enviar workflow oficial por `PATCH /api/v1/alerts/{id}/workflow` e preparar cliente para `sync-capabilities` e `stream-capabilities`.
- `impacta contrato`: sim, porque reduz dependencia de parser defensivo e alinha a interface com os contratos que o backend ja declarou como oficiais.
- `quem precisa agir`: `Guarita` ja absorveu a mudanca; `Backend`, `Portaria Web` e `App Morador` devem considerar `alerts`, `workflow`, `clientRequestId`, `permissions-matrix` e `eventType/occurredAt` como base fechada.
- `documento base`: `API Sapinho V5.1.txt`, `src/api/client.ts`, `src/screens/AlertsScreen.tsx`, `src/utils/operationEvents.ts`, `GUARITA_PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-13.md`

### 2026-04-13 | Guarita | Backend fechado + API v4.8 | api

- `mudanca`: o `Guarita` passou a tratar como oficiais `eventType`, `occurredAt`, `permissions-matrix`, `effectiveAccess`, `clientRequestId`, `syncStatus` canonico e `people/unit-residents` sem `locatarios`.
- `impacta contrato`: sim, porque reduz fallback antigo e muda a leitura do front para os contratos agora arbitrados pelo backend.
- `quem precisa agir`: `Guarita` e demais fronts devem limpar documentacao e parser defensivo excedente; o fluxo de `deliveries` ja foi homologado em uso real e o workflow de alertas ja tem contrato oficial no backend.
- `documento base`: `API Sapinho V4.8.txt`, `src/utils/operationEvents.ts`, `src/utils/permissions.ts`, `src/screens/DeliveryScreen.tsx`, `GUARITA_PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-13.md`

### 2026-04-13 | Guarita | API v4.7 | api

- `mudanca`: o `Guarita` passou a enviar `clientRequestId` no `POST /api/v1/deliveries`, alinhando de vez criacao de encomenda, fila offline e reconciliacao documentada na `V4.7`.
- `impacta contrato`: sim, porque fortalece a semantica oficial de idempotencia e reconciliacao do ecossistema.
- `quem precisa agir`: `Backend`, `Portaria Web` e `App Morador` devem homologar a `V4.7`, principalmente em `clientRequestId`, `renotify` e configuracoes publicas mais ricas.
- `documento base`: `API Sapinho V4.7.txt`, `src/api/client.ts`, `src/utils/offlineQueue.ts`, `src/screens/HistoryScreen.tsx`

### 2026-04-13 | Guarita | API v4.6 | api

- `mudanca`: o `Guarita` passou a usar `GET /api/v1/people/unit-residents` como caminho principal para destinatarios de `Encomendas` e preparou a reconciliacao local com `GET /api/v1/internal/sync/reconcile/{client_request_id}`.
- `impacta contrato`: sim, porque reduz fallback local antigo e consolida a pauta de `clientRequestId` no ecossistema.
- `quem precisa agir`: `Backend`, `Portaria Web` e `App Morador` devem homologar a `V4.6`, principalmente em `moradores por unidade`, `stream` mais rico e reconciliacao.
- `documento base`: `API Sapinho V4.6.txt`, `src/api/client.ts`, `src/screens/DeliveryScreen.tsx`, `src/screens/HistoryScreen.tsx`

### 2026-04-12 | Guarita | Plano de modo offline operacional | frontend

- `mudanca`: o `Guarita` consolidou a leitura atual de offline parcial, com fila local, cache e sincronizacao posterior, e formalizou um plano de evolucao para modo offline operacional.
- `impacta contrato`: sim, porque depende de definicoes oficiais de cache, reconciliacao e conflito no `backend`.
- `quem precisa agir`: `Backend` e `Guarita`, com possivel reaproveitamento por `Portaria Web` e `App Morador`.
- `documento base`: `GUARITA_MODO_OFFLINE_PLANO_2026-04-12.md`

### 2026-04-12 | Guarita | Minimização operacional e LGPD no mobile | governanca

- `mudanca`: o `Guarita` reduziu exposição de `documento`, `telefone`, `e-mail`, `codigo de retirada` e detalhes excessivos em telas operacionais, priorizando `nome`, `unidade`, `tipo` e `status`.
- `impacta contrato`: sim, porque reforca a necessidade de regra canonica de mascaramento e exibicao por perfil.
- `quem precisa agir`: `Backend`, `Portaria Web` e `App Morador` devem manter a mesma linha de minimizacao e governanca de dado.
- `documento base`: `GUARITA_LGPD_AUDITORIA_INICIAL_2026-04-12.md`, `GUARITA_LGPD_PENDENCIAS_EXTERNAS_2026-04-12.md`

### 2026-04-12 | Guarita | API v4.4 | api

- `mudanca`: o `Guarita` passou a consumir `GET /api/v1/auth/me` para enriquecer sessao e `GET /api/v1/auth/permissions-matrix` com cache local para orientar permissao por acao.
- `impacta contrato`: sim.
- `quem precisa agir`: `Backend`, `Portaria Web` e `App Morador` devem manter a mesma leitura de escopo e permissao efetiva.
- `documento base`: `README.md`, `PENDENCIAS.md`, `PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-12.md`

### 2026-04-12 | Guarita | Alertas e cameras operacionais | frontend

- `mudanca`: o `Guarita` consolidou abas proprias de `Alertas` e `Cameras`, com navegacao cruzada, triagem local por operador e prioridade canonica de midia no front.
- `impacta contrato`: sim, porque depende de fechamento de `alertId`, `cameraId`, `snapshotUrl` e URLs de midia.
- `quem precisa agir`: `Backend` deve fechar contrato; `Portaria Web` e `App Morador` devem manter leitura semantica alinhada quando consumirem os mesmos eventos.
- `documento base`: `README.md`, `PENDENCIAS.md`, `DIVERGENCIAS_ECOSSISTEMA_2026-04-12.md`

### 2026-04-12 | Guarita | Movimento separado da triagem detalhada | compatibilidade

- `mudanca`: o `Movimento` passou a atuar mais como painel de turno, enquanto a tratativa detalhada de alerta fica concentrada na central de `Alertas`.
- `impacta contrato`: nao diretamente, mas reduz divergencia operacional dentro do front.
- `quem precisa agir`: `Guarita`.
- `documento base`: `README.md`, `PENDENCIAS.md`

### 2026-04-12 | Guarita | Conciliacao offline de encomendas | homologacao

- `mudanca`: a conciliacao entre item local e item remoto passou a usar correspondencia mais forte por `id`, codigo principal, rastreio, unidade e proximidade temporal.
- `impacta contrato`: sim, porque depende de estabilidade real dos campos devolvidos pelo `backend`.
- `quem precisa agir`: `Backend` deve manter shape estavel de entregas; `Guarita` segue homologando.
- `documento base`: `README.md`, `PENDENCIAS.md`, `PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-12.md`

## Regra De Manutencao

- entradas novas ficam acima das antigas quando isso facilitar a leitura;
- cada entrada deve continuar curta;
- detalhes tecnicos mais longos ficam nos documentos base do projeto.
 
### 2026-04-13 | Guarita | API v4.5 | api

- `mudanca`: o `Guarita` passou a aceitar os novos status de visita da `V4.5` (`PENDING_ARRIVAL`, `EXPIRED`), ajustou a leitura operacional de `Acessos` e preparou suporte cliente para `POST /api/v1/deliveries/{id}/renotify`.
- `impacta contrato`: sim, porque muda a semantica de `visit-forecasts` e reforca `visitForecastId` como identificador canonico.
- `quem precisa agir`: `Backend`, `Portaria Web` e `App Morador` devem homologar a nova semantica de status e o uso de `renotify`.
- `documento base`: `API Sapinho V4.5.txt`, `PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-12.md`

### 2026-04-13 | Guarita | Encomendas mais operacionais e consistentes | frontend

- `mudanca`: o `Guarita` consolidou o carregamento de moradores por unidade em um caminho unico, reduziu texto duplicado em `Encomendas`, reforcou o fluxo de `OCR -> unidade -> destinatario` e normalizou `Historico` para usar a regra canonica de `aguardando retirada`.
- `impacta contrato`: parcialmente, porque o front ficou mais estavel, mas ainda se beneficia de um endpoint backend proprio de moradores por unidade.
- `quem precisa agir`: `Guarita` segue refinando a UX; `Backend` continua responsavel por publicar um caminho oficial e leve para moradores por unidade.
- `documento base`: `src/screens/DeliveryScreen.tsx`, `src/screens/HistoryScreen.tsx`, `GUARITA_PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-13.md`

### 2026-04-13 | Guarita | Limpeza operacional de Pessoas e Acessos | frontend

- `mudanca`: o `Guarita` corrigiu textos quebrados, enxugou `Pessoas` e `Acessos`, removeu informacao repetida e deixou os blocos de consulta mais curtos para uso de porteiro e zelador.
- `impacta contrato`: nao diretamente.
- `quem precisa agir`: `Guarita`.
- `documento base`: `src/screens/FaceScreen.tsx`, `src/screens/MovementScreen.tsx`

### 2026-04-13 | Guarita | Preparacao local para reconciliacao de encomendas | compatibilidade

- `mudanca`: o `Guarita` alinhou o atalho de `Acessos -> Encomendas` para busca por unidade, preparou o dominio de `deliveries` para absorver `clientRequestId` sem quebra e reforcou a conciliacao local/remota quando esse campo passar a vir do backend.
- `impacta contrato`: sim, porque converge com a pauta de `clientRequestId`, idempotencia e reconciliacao oficial.
- `quem precisa agir`: `Backend` deve fechar a semantica oficial; `Guarita` ja ficou preparado para absorver isso.
- `documento base`: `src/screens/MovementScreen.tsx`, `src/screens/DeliveryScreen.tsx`, `src/screens/HistoryScreen.tsx`, `GUARITA_PENDENCIAS_BACKEND_ECOSSISTEMA_2026-04-13.md`

