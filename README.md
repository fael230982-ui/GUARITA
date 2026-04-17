# Guarita

Aplicativo Expo para operacao de portaria, separado do app morador e preparado para fluxos de pessoas, encomendas, movimento e acesso operacional.

Versao atual: `v1.0.0`

## Estado atual

- Base funcional publicada no GitHub com historico inicial versionado.
- Integracao principal alinhada ao contrato usado pelo projeto, com adaptacoes operacionais ja aplicadas sobre a linha da `API V5.3`.
- Fluxos com suporte local de contingencia, incluindo cache e fila offline para partes criticas da operacao.
- Historico de versoes documentado em `CHANGELOG.md`.
- Padrao de contribuicao descrito em `CONTRIBUTING.md`.
- Guia para replicacao do padrao nos outros modulos em `PADRAO_REPOSITORIO_MODULOS.md`.

## Execucao rapida

Configure a URL base em `.env`:

```text
EXPO_PUBLIC_API_URL=https://sapinhoprod.v8seguranca.com.br/api/v1
```

Instale e rode:

```bash
npm install
npm run start
```

Depois abra pelo Expo Go no celular.

## Autoria

- Desenvolvimento e projeto principal: Rafael da Silva Bezeera
- Cargo: Desenvolvedor e Projetista
- E-mail: fael230982@gmail.com
- Creditos complementares em `AUTHORS.md`

## Base de whitelabel

- branding central em `src/branding/config.ts`
- perfis de marca em `src/branding/profiles.ts`
- tema derivado do branding em `src/theme.ts`
- metadados de build parametrizados por ambiente em `app.config.js`
- defaults de build por perfil em `branding.build-profiles.js`
- exemplos de variaveis de marca em `.env.example`
- exemplos de perfis de marca em `.env.brand-rafiels.example` e `.env.brand-cliente-a.example`
- exemplo de pipeline EAS em `eas.json.example`
- preparacao de assets por marca em `assets/brands/README.md`
- guia de build/configuracao em `GUARITA_GUIA_BUILD_WHITELABEL_2026-04-13.md`

## MVP incluido

- Login do operador com validacao de perfil operacional.
- Painel de movimento com visitas previstas, visitantes que chegaram e ultimos acessos.
- Registro de chegada/saida de visita prevista pelo painel de movimento.
- Nova encomenda com foto do volume, conferencia manual e envio para a API.
- Busca operacional de unidades por texto com `GET /api/v1/operation/units`.
- Upload de foto em base64 para obter `photoUrl` antes do cadastro.
- Historico local das encomendas recebidas no dia.
- Historico sincronizado com `GET /api/v1/deliveries`.
- Validacao de retirada com codigo ou confirmacao manual.
- Leitura de QR code para retirada de encomenda.
- OCR de etiqueta de encomenda com fallback entre `POST /api/v1/deliveries/ocr` e `POST /api/v1/deliveries/ocr-label`.
- Auto-preenchimento conservador de destinatario, unidade, transportadora e rastreio quando o OCR trouxer correspondencia forte.
- Lista oficial de moradores por unidade via `GET /api/v1/people/unit-residents`, sem complemento local de `locatarios`.
- Reenvio operacional de notificacao de encomenda com `POST /api/v1/deliveries/{id}/renotify`.
- Cadastro de pessoa no app para fluxo operacional e admin.
- OCR documental no cadastro de pessoa com `POST /api/v1/people/document-ocr`, sugerindo nome, documento, tipo e data de nascimento.
- Cadastro facial com busca de pessoa, resumo de acessos e envio com preferencia para `POST /api/v1/facial/register`, com fallback legado para `POST /api/v1/facial/register-async`.
- Leitura de status facial da pessoa quando a API informar `hasFacialCredential`, `faceListId` e grupos de acesso.
- Leitura de `faceStatus` quando o backend publicar o campo canonico, com compatibilidade aos campos legados.
- Compatibilidade com os estados faciais canonicos da V4.4, incluindo `NO_PHOTO`, `PHOTO_ONLY`, `FACE_PENDING_SYNC`, `FACE_SYNCED` e `FACE_ERROR`.
- Compatibilidade com a semantica de visitas da V4.5, incluindo `PENDING_ARRIVAL`, `EXPIRED`, `releaseMode` e `visitForecastId`.
- Sessao persistida localmente para nao exigir novo login a cada abertura.
- Cache local basico de movimento e encomendas para contingencia.
- Fila offline para reenviar operacoes pendentes quando a conexao voltar.
- Reconciliacao de encomendas offline com `GET /api/v1/internal/sync/reconcile/{client_request_id}` antes de reenviar, reduzindo duplicidade.
- Rascunhos locais por operador para encomenda, cadastro facial e cadastro de pessoa.
- Busca e filtros salvos por operador para retomada de turno sem vazar contexto entre usuarios.
- Interface ajustada por perfil para ocultar ou bloquear acoes operacionais quando o usuario estiver em modo consulta.
- Busca rapida no painel de movimento para abrir fluxos de encomenda e face.
- Resumo de acessos da pessoa selecionada em Face usando `GET /api/v1/people/{id}/access-summary`.
- Resumo de turno em Movimento e Historico para repasse operacional mais rapido.
- Atualizacao reativa por `GET /api/v1/events/stream`, orientada por `GET /api/v1/auth/stream-capabilities`.
- Indicador visual de estado do stream operacional no cabecalho.
- Preparacao de prioridade canonica de midia de camera no front seguindo a ordem do contrato do ecossistema.
- Conciliacao de encomendas locais com remotas agora cruza `id`, codigo principal, rastreio, unidade e proximidade temporal antes de limpar pendencia local.
- Leitura canônica da configuracao de condominio com `GET /api/v1/condominiums/{id}`, aplicando `enabledModules`, `residentManagementSettings`, `slimMode` e `deliveryRenotification` na sessao operacional.
- Analise cruzada inicial com `App Morador` e `Portaria Web` documentada em `ANALISE_CRUZADA_MODULOS_2026-04-11.md`.

## Backend esperado

Endpoints usados:

```text
POST /api/v1/auth/login
GET /api/v1/auth/permissions-matrix
GET /api/v1/auth/sync-capabilities
GET /api/v1/auth/stream-capabilities
GET /api/v1/auth/me
GET /api/v1/condominiums/{id}
GET /api/v1/visit-forecasts
PATCH /api/v1/visit-forecasts/{id}/status
GET /api/v1/access-logs
GET /api/v1/units
GET /api/v1/operation/units?q=<texto>&limit=<n>
POST /api/v1/people
POST /api/v1/people/document-ocr
GET /api/v1/people/unit-residents?unitId=<uuid>
GET /api/v1/people/{id}/access-summary
POST /api/v1/people/photo/upload
POST /api/v1/deliveries
GET /api/v1/deliveries
POST /api/v1/deliveries/photo/upload
POST /api/v1/deliveries/ocr
POST /api/v1/deliveries/ocr-label
POST /api/v1/deliveries/{id}/renotify
POST /api/v1/deliveries/{id}/validate-withdrawal
GET /api/v1/operation/search?q=<texto>
POST /api/v1/facial/register
POST /api/v1/facial/register-async
GET /api/v1/events/stream
GET /api/v1/internal/sync/reconcile/{client_request_id}
```

Observacoes:

- O cadastro de encomenda continua exigindo `recipientUnitId`, `deliveryCompany` e `receivedBy`; por isso o app envia o ID do operador autenticado como `receivedBy`.
- O OCR ja esta integrado no front, mas o app continua exigindo conferencia humana antes de salvar.
- O fluxo de `Encomendas` usa `people/unit-residents` como caminho canonico para destinatarios da unidade.
- O fluxo de `Pessoas` ja usa OCR documental para sugerir nome, documento, tipo e data de nascimento antes do cadastro manual.
- O stream operacional e usado como acelerador de atualizacao. Se o runtime nao suportar SSE por `fetch`, o app continua funcional com cache, fila offline e atualizacao manual.
- O app trata `eventType` e `occurredAt` como campos canonicos do stream e mantem `type`, `timestamp` e `eventTime` apenas como compatibilidade temporaria.
- A leitura do stream ja considera `entityType` e `entityId` como obrigatorios e usa os campos ricos estabilizados, como `title`, `body`, `snapshotUrl`, `liveUrl`, `replayUrl`, `replayAvailable`, `secondsBefore` e `secondsAfter`.
- O cliente ja consome `GET /api/v1/auth/sync-capabilities` e `GET /api/v1/auth/stream-capabilities`, com cache local e parser do stream orientado pelas capacidades canonicas publicadas pelo backend.
- O front ja convive com nomenclatura vigente e alvo em retirada de encomendas, incluindo `qrCodeUrl` e `withdrawalQrCodeUrl`.
- O login ja aceita escopo estruturado da V4.4, incluindo `scopeType`, `condominiumIds`, `unitIds`, `selectedUnitId` e `requiresUnitSelection`.
- Quando `requiresUnitSelection=true` vier sem `selectedUnitId`, o front passa a tratar fluxos de escrita como indisponiveis e mantem o acesso em modo consulta ate a sessao ser enriquecida corretamente.
- O app tenta enriquecer a sessao com `GET /api/v1/auth/me` no login e no bootstrap para aproveitar campos novos da V4.4 mesmo quando o payload de login vier mais enxuto.
- O cliente ja usa `GET /api/v1/auth/permissions-matrix` como fonte primaria de permissao, complementada por `effectiveAccess` e cache local de contingencia.
- O app tambem enriquece a sessao com configuracao canonica de condominio quando `condominiumId` estiver disponivel, passando a obedecer `enabledModules`, `residentManagementSettings`, `slimMode` e a governanca de `deliveryRenotification`.
- O app ja aceita a mudanca de status de visitas publicada na V4.5, tratando `PENDING_ARRIVAL` como previsto e `EXPIRED` como encerrado.
- A conciliacao do `Historico` agora evita remover cedo demais um item local quando a API ainda nao devolveu prova suficiente de que ele ja foi absorvido pelo sistema.
- Antes de reenviar uma encomenda offline, o app agora consulta `clientRequestId` no reconcile da V4.6 para reduzir risco de duplicidade apos retomada de conexao.
- A API V5.3 ainda nao foi incorporada nesta documentacao. Quando o contrato novo estiver disponivel no workspace, os endpoints e campos acima devem ser revisados contra a versao nova.
