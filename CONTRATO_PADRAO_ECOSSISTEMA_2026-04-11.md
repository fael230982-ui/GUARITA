# Contrato Padrao Do Ecossistema

Data de referencia: `2026-04-11`

Escopo:

- `Guarita`
- `Portaria Web`
- `App Morador`
- `Backend`

## Objetivo

Este documento define:

- o que precisa ser padrao oficial do ecossistema;
- o que cada produto pode adaptar localmente;
- como divergencias devem ser tratadas;
- quem vence quando houver conflito entre fronts, backend e produto.

## Regra Central

Nenhum modulo deve inventar regra propria de negocio para um dominio compartilhado.

Quando um fluxo existir nos tres produtos, o que precisa ser comum deve ser comum.

O que pode variar entre os produtos e:

- densidade da interface;
- ordem de exibicao;
- nivel de detalhe;
- linguagem por perfil;
- capacidade operacional de cada canal.

O que nao pode variar entre os produtos e:

- significado de status;
- identificadores;
- semantica dos campos;
- permissoes por acao;
- regra de auditoria;
- prioridade de midia;
- eventos de integracao;
- regra de seguranca.

## 1. Itens Que Devem Virar Padrao Oficial

### 1.1 Identificadores canonicos

Os seguintes identificadores devem ter o mesmo nome e significado em todo o ecossistema:

- `condominiumId`
- `unitId`
- `personId`
- `userId`
- `cameraId`
- `deliveryId`
- `alertId`
- `messageId`
- `notificationId`
- `visitId` ou `visitForecastId`

Regra:

- se um produto receber alias legado, ele pode normalizar internamente;
- mas o contrato oficial publicado deve ter um nome canonico por conceito.

### 1.2 Status de encomenda

Precisa existir uma tabela oficial unica para encomendas.

Padrao recomendado:

- `RECEIVED`
- `NOTIFIED`
- `READY_FOR_WITHDRAWAL`
- `WITHDRAWN`
- `CANCELLED` se o backend realmente suportar esse estado

Regra:

- nenhum front deve criar status visual com semantica diferente do contrato;
- labels humanas podem variar, mas o status tecnico deve ser unico.

### 1.3 Campos de retirada de encomenda

Precisa existir uma nomenclatura unica para retirada segura.

Padrao recomendado:

- `withdrawalCode`
- `withdrawalQrCodeUrl`
- `withdrawalValidatedAt`
- `withdrawalValidationMethod`

Regra:

- eliminar duplicidade como `pickupCode` x `withdrawalCode`;
- eliminar ambiguidade como `qrCodeUrl` x nome final do QR de retirada.

### 1.4 Status facial

Precisa existir um `faceStatus` oficial do ecossistema.

Padrao recomendado:

- `NOT_REGISTERED`
- `PENDING_PROCESSING`
- `READY`
- `FAILED`
- `BLOCKED`

Regra:

- cada front pode traduzir isso para linguagem humana;
- nenhum front deve inventar estado paralelo fora dessa tabela.

### 1.5 Tipos e status de alerta

Precisa existir tabela oficial unica para:

- `alertType`
- `alertSeverity`
- `alertStatus`

Padrao minimo:

- tipos como `UNKNOWN_PERSON`, `ACCESS_DENIED`, `CAMERA_OFFLINE`, `PANIC`
- severidade como `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- status como `OPEN`, `UNDER_REVIEW`, `RESOLVED`

### 1.6 Contrato de camera e prioridade de midia

Precisa existir ordem oficial de uso de midia.

Padrao recomendado:

1. `liveUrl`
2. `hlsUrl`
3. `webRtcUrl`
4. `imageStreamUrl`
5. `mjpegUrl`
6. `snapshotUrl`
7. `thumbnailUrl`

Regra:

- `rtspUrl` pode existir como dado tecnico de backend, mas nao deve ser tratado como contrato de frontend;
- todos os fronts devem respeitar a mesma hierarquia de fallback.

### 1.7 Mensagens, notificacoes e alertas

Esses tres conceitos devem ser separados oficialmente.

Padrao:

- `message`: conversa entre pessoas/operacao
- `notification`: evento de inbox/push
- `alert`: evento operacional ou de seguranca

Regra:

- payload e semantica de cada um devem ser independentes;
- nenhum front deve misturar os tres no mesmo tipo logico.

### 1.8 Permissoes por app e por acao

Precisa existir matriz oficial do backend.

Cada acao deve declarar:

- perfil autorizado;
- app autorizado;
- modo de acesso;
- escopo do dado.

Padrao recomendado:

- `allowedProfiles`
- `allowedClients`
- `scope`

Exemplo conceitual:

- `allowedClients = RESIDENT_APP | GUARD_APP | PORTARIA_WEB`

### 1.9 Auditoria

Todo evento operacional relevante deve ter trilha padrao.

Campos minimos:

- `performedByUserId`
- `performedByUserName`
- `performedAt`
- `clientType`
- `deviceName`
- `condominiumId`
- `unitId` quando aplicavel
- `evidenceUrl` quando aplicavel

### 1.10 Tempo real e stream de eventos

Precisa existir tipagem oficial do stream.

Cada evento deve ter no minimo:

- `eventId`
- `eventType`
- `occurredAt`
- `entityType`
- `entityId`
- `unitId` quando aplicavel
- `cameraId` quando aplicavel
- `payload`

## 2. O Que Pode Variar Entre Os Produtos

Esses pontos podem divergir sem quebrar o ecossistema:

- layout;
- componentes visuais;
- nivel de detalhe;
- densidade operacional;
- ordem de cards e filtros;
- tom do texto para o usuario final;
- uso ou nao de dashboards analiticos;
- fluxo resumido ou expandido para a mesma regra de negocio.

## 3. O Que Nao Pode Divergir

Esses pontos nao podem divergir:

- nome tecnico e significado do status;
- nome canonico de campo compartilhado;
- regra de retirada segura;
- regra de permissao;
- interpretacao de alerta;
- ordem de prioridade de midia;
- regra de auditoria;
- ownership do fluxo;
- semantica de evento realtime.

## 4. Regra De Ownership Por Produto

Para evitar duplicacao de produto, cada dominio deve ter referencia primaria.

### Portaria Web

Referencia principal para:

- operacao ampla;
- alertas;
- cameras;
- auditoria;
- monitoramento transversal;
- master e configuracao;
- visao administrativa.

### Guarita

Referencia principal para:

- operacao movel;
- captura rapida;
- evidencias de campo;
- OCR operacional;
- contingencia local;
- cadastro assistido em mobilidade.

### App Morador

Referencia principal para:

- relacionamento com residente;
- autosservico;
- visualizacao da propria unidade;
- mensagens com a portaria;
- notificacoes do residente;
- retirada e consulta no escopo da unidade.

Regra:

- se um fluxo pertence claramente a um desses papeis, os outros produtos podem consumir ou refletir o resultado, mas nao redefinir a regra central.

## 5. Como Resolver Divergencias

### Regra 1. Primeiro distinguir o tipo de divergencia

Toda divergencia deve ser classificada em uma destas categorias:

- `semantica`
- `contrato`
- `ux`
- `escopo`
- `permissao`
- `backend`

### Regra 2. Quem decide cada tipo

Quando a divergencia for de:

- `semantica`: decide o documento mestre do ecossistema com validacao conjunta
- `contrato`: decide o `backend` como contrato oficial, ouvindo os tres fronts
- `ux`: decide o produto dono do canal, desde que nao quebre o contrato comum
- `escopo`: decide a matriz de ownership do ecossistema
- `permissao`: decide o `backend` com validacao de negocio
- `backend`: decide o contrato tecnico oficial publicado

### Regra 3. Ordem de precedencia

Se houver conflito, a ordem de prevalencia deve ser:

1. contrato oficial do `backend`
2. contrato padrao do ecossistema
3. ownership funcional do produto dono do fluxo
4. implementacao atual de cada front

Ou seja:

- implementacao existente nao vence contrato oficial;
- conveniencia local de um front nao vence regra compartilhada.

### Regra 4. Formato obrigatorio para registrar divergencia

Toda divergencia deve ser registrada com este formato:

- `dominio`
- `campo ou regra`
- `estado atual em cada produto`
- `risco causado`
- `proposta canonica`
- `quem depende da mudanca`
- `origem da decisao`
- `data da decisao`

### Regra 5. Critério para desempate

Se dois produtos propuserem solucoes diferentes, vence a opcao que:

1. preserva um contrato unico;
2. reduz duplicidade de semantica;
3. evita criar alias permanentes;
4. respeita ownership do fluxo;
5. reduz risco de auditoria e seguranca;
6. exige menos adaptacao futura no ecossistema inteiro.

## 6. Processo Padrao De Fechamento De Divergencia

Fluxo recomendado:

1. identificar a divergencia;
2. classificar o tipo;
3. registrar exemplo real dos tres produtos;
4. propor nome e semantica canonicos;
5. validar impacto em `Guarita`, `Portaria Web`, `App Morador` e `backend`;
6. publicar decisao no documento mestre;
7. atualizar backlog tecnico dos modulos afetados;
8. remover aliases legados quando a migracao terminar.

## 7. Regras Especificas Para Divergencias Comuns

### 7.1 Divergencia de nome de campo

Exemplo:

- `pickupCode` x `withdrawalCode`

Regra:

- escolher um nome canonico;
- manter alias temporario apenas para compatibilidade;
- definir prazo de remocao do legado.

### 7.2 Divergencia de status

Exemplo:

- um front usa `RECEIVED`, outro usa label equivalente com semantica diferente

Regra:

- o status tecnico precisa ser unico;
- labels humanas podem variar, desde que apontem para o mesmo estado tecnico.

### 7.3 Divergencia de fluxo

Exemplo:

- um app quer operar algo que deveria ser so consulta

Regra:

- vence a matriz de ownership;
- o canal fora do ownership pode refletir, consultar ou iniciar pedido, mas nao redefinir a operacao principal.

### 7.4 Divergencia de permissao

Exemplo:

- um front libera acao que outro bloqueia

Regra:

- a permissao oficial deve vir do backend;
- o front so adapta a interface a partir da mesma regra oficial.

## 8. Documento Mestre E Governanca

Deve existir um documento mestre unico do ecossistema contendo:

- tabela oficial de status;
- tabela oficial de campos canonicos;
- matriz oficial de permissao;
- ownership por produto;
- regras de auditoria;
- regras de divergencia;
- changelog de decisoes.

Toda decisao nova deve atualizar esse documento antes de virar regra definitiva nos fronts.

## 9. Conclusao

Sim, e necessario formalizar um contrato desse tipo.

Sem esse contrato:

- cada frente tende a acertar localmente e divergir globalmente;
- o backend passa a sustentar alias e excecoes demais;
- a semantica do ecossistema fica fraca;
- e a manutencao futura fica mais cara.

Com esse contrato:

- fica claro o que e padrao;
- fica claro o que pode variar;
- e fica claro como resolver divergencia sem discussao circular entre `Guarita`, `Portaria Web`, `App Morador` e `backend`.
