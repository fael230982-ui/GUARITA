# Pendencias e melhorias futuras

## Identidade visual

- Feito: incluir os dois logos na tela de login:
  - `assets/logo-v8.png`
  - `assets/Logo-Rafiels.png`
- Pendente: avaliar se tambem vale exibir os logos no cabecalho ou rodape interno sem poluir a operacao.

## Login e usabilidade

- Melhorar a tela de login com visual mais rico, mantendo campos simples para porteiro, zelador e admin.
- Manter o teclado sem cobrir email e senha.
- Avaliar salvar a ultima URL de backend usada.
- Feito: sessão persistida localmente para reabrir o app ja logado.

## Painel de movimento

- Deixar os numeros principais centralizados nos cards.
- Mostrar mais contexto util para o porteiro:
  - visitas previstas;
  - quem ja chegou;
  - quem ainda não chegou;
  - ultimos acessos liberados e negados;
  - unidade, morador responsavel e horario.
- Corrigir qualquer corte visual no botao Atualizar em telas menores.
- Feito: acessos negados agora ja alimentam leitura local de `alerta operacional`, preparando separacao formal entre `movimento` e `alerta`.
- Feito: atalho de `Alertas` no fluxo operacional e badge da aba com base no cache local e no carregamento das telas.
- Feito: `Movimento` agora abre `Alertas` e `Cameras` com contexto pronto, inclusive a partir de alerta ou acesso individual.
- Feito: `Movimento` agora prioriza leitura de turno e encaminha a tratativa detalhada para a central de `Alertas`, reduzindo duplicidade de card operacional.
- Pendente: avaliar se o resumo de alertas em `Movimento` ainda deve mostrar mais recortes prontos por severidade ou permanecer apenas como ponte para a central.

## Alertas

- Feito: aba dedicada de `Alertas` no `Guarita`, usando acessos negados do dia como base operacional.
- Feito: triagem local alinhada ao workflow operacional `NEW`, `ON_HOLD` e `RESOLVED`, persistida por operador no aparelho.
- Feito: tela de `Alertas` agora consome `GET /api/v1/alerts` como caminho principal e atualiza workflow oficial por `PATCH /api/v1/alerts/{id}/workflow`.
- Feito: triagem local agora fica escopada por operador para evitar mistura de contexto entre turnos diferentes.
- Feito: a persistencia da triagem por operador foi centralizada em storage para reduzir risco de sobrescrita entre leituras e gravacoes.
- Feito: estrutura pronta para `alertId`, `cameraId` e `snapshotUrl` quando o backend publicar isso formalmente.
- Pendente:
  - reduzir mais o fallback por cache local de triagem, conforme a listagem oficial de alertas ficar consolidada no turno real;
  - incluir evidencias visuais reais quando `snapshotUrl` vier nos eventos.

## Cameras

- Fora do escopo atual do produto:
  - o `Guarita` nao deve expor uma aba propria de `Cameras` para o operador;
  - qualquer dado de camera deve entrar apenas como contexto complementar dentro de `Alertas`, quando isso ajudar a operacao.
- Registro tecnico:
  - existe preparacao local da ordem canonica de prioridade de midia:
    - `liveUrl`
    - `hlsUrl`
    - `webRtcUrl`
    - `imageStreamUrl`
    - `mjpegUrl`
    - `snapshotUrl`
    - `thumbnailUrl`
  - existe tambem uma tela residual de `Cameras`, mas ela nao faz parte da navegacao principal atual do app.

## Encomendas

- Feito com V4.4: busca operacional de unidade por texto em `GET /api/v1/operation/units`.
- Feito com V4.4: OCR de etiqueta integrado via `POST /api/v1/deliveries/ocr` com fallback para `POST /api/v1/deliveries/ocr-label`.
- Feito no app: OCR ja pode sugerir destinatário, unidade, transportadora e código de rastreio com confirmação humana antes do salvamento.
- O app deve permitir correcao manual de:
  - unidade;
  - destinatário;
  - transportadora;
  - código de rastreio.
- Pendente de evolucao:
  - feito em uso real: o salvamento de encomenda foi homologado com sucesso apos a estabilizacao backend do `POST /deliveries`.
  - melhorar o casamento automatico entre OCR e pessoa/unidade com heuristica mais forte;
  - persistir `labelPhotoUrl` e `packagePhotoUrl` de forma mais rica no contrato unificado do ecossistema;
  - ampliar ainda mais a conciliacao visual entre item local e item remoto apos sincronização, embora a conciliacao funcional ja use correspondencia mais forte.
  - feito no app: ao tocar em `Na portaria`, abrir um resumo das encomendas aguardando retirada, com tempo de permanencia e atalho de `Reenviar notificacao` para o morador.
  - redesenhar a confirmação do OCR para aparecer em camada mais direta, como modal ou painel destacado, trazendo unidade, destinatário e campos principais para o topo sem exigir rolagem longa.
  - feito no app: no fluxo de OCR, o topo da captura agora mantem `Voltar` de um lado e `Digitar manualmente` do outro, com o botao de captura centralizado.
  - revisar a distribuicao vertical da tela de `Recebendo encomenda`, porque a parte util de confirmação e preenchimento ainda esta muito baixa e mal aproveitada.
  - feito no app: `Consulta` agora pesquisa e lista encomendas por unidade, sem obrigar selecao de morador quando a unidade tem mais de um residente.
  - feito no app: no resumo da `Consulta`, mostrar so o que ajuda na operacao:
    - data de recebimento na portaria;
    - quando a notificacao foi enviada;
    - destinatário, ou `Destinatário não informado` quando não houver.
  - feito no app: na consulta/retirada de encomendas, o botao `Entregar agora` deve ficar ao lado de `Reenviar notificacao` e com o mesmo peso visual e tamanho.
  - feito no app: `Entregando encomenda` agora segue a mesma logica de `Consulta`, pesquisando so por unidade.
  - feito no app: apos selecionar a unidade em `Entregando encomenda`, listar diretamente as encomendas encontradas e deixar visiveis as acoes:
    - ler QR;
    - validar código;
    - revisar o significado e a UX de `Confirmar manualmente`, que hoje não esta clara para o operador.
  - fazer revisao global de gramatica, acentuacao, palavras quebradas e consistencia textual em todas as telas do app, não apenas em `Encomendas`.

## Cadastro facial

- Reduzir termos tecnicos visiveis no app.
- O fluxo atual deve ficar com linguagem operacional:
  - buscar pessoa;
  - tirar foto;
  - confirmar autorizacao;
  - salvar face.
- Avaliar se o app tambem deve cadastrar pessoas antes de cadastrar a face.
- Regra desejada:
  - feito no app: admin/master pode cadastrar morador;
  - feito no app: porteiro/zelador pode cadastrar visitante, prestador, entregador ou locatario;
  - morador não deve ser cadastrado por perfil operacional comum.
- Feito com V4.4: fluxo agora prioriza `POST /api/v1/facial/register` e usa `POST /api/v1/facial/register-async` apenas como fallback legado.
- Pendente no backend:
  - fechar matriz oficial de permissao por acao;
  - devolver status facial mais padronizado para todo o ecossistema.
  - avaliar endpoint de busca reversa por foto/face para identificar se a pessoa ja existe no cadastro, com regra clara de permissao e LGPD.
- Pendente no app:
  - feito no app: a busca de `Pessoas` usa lista vertical simples logo abaixo do campo, sem cards horizontais.
  - feito no app: a tela de `Pessoas` esta mais alinhada a operacao, com menos texto, menos rolagem lateral e selecao mais direta.
  - manter a tela coerente com a regra geral do app para campos obrigatórios e mensagens de validacao amigaveis.

## Validacao e mensagens

- Pendente no app:
  - feito parcialmente no app: ja existe suporte global a `* Campo obrigatório` nos componentes de campo e a tela de login/cadastro de pessoa ja usa essa regra.
  - feito parcialmente no app: o cadastro de pessoa ja troca mensagens tecnicas por orientacoes claras para o operador.
  - pendente no app: expandir a mesma regra de obrigatoriedade e validacao amigavel para os fluxos restantes.

## Retirada de encomenda

- Feito no app: validar retirada com código ou confirmação manual usando `POST /api/v1/deliveries/{id}/validate-withdrawal`.
- Feito no app: leitura de QR code da retirada com camera.

## Contingencia

- Feito: cache local basico para movimento e encomendas.
- Feito: fila de reenvio para:
  - cadastro de encomenda;
  - cadastro de pessoa;
  - cadastro facial;
  - chegada/saida de visita.
- Feito: atualizacao reativa por stream operacional quando disponivel.
- Feito: indicador visual do estado do stream no cabecalho.
- Feito: a conciliacao funcional entre item local e item remoto no historico agora cruza `id`, código principal, rastreio, unidade e proximidade temporal antes de limpar pendencia local.
- Pendente: ampliar a conciliacao visual dos itens que saem da fila e ja foram sincronizados no backend.
- Feito: rascunhos de encomenda, face e cadastro de pessoa agora ficam presos ao operador certo no aparelho.
- Feito: busca do Movimento e filtro/busca do Histórico tambem ficam presos ao operador certo.

## API V4.4

- Feito no app: aproveitar melhor campos de pessoa da linha V4:
  - `accessGroupNames`
  - `faceListId`
  - `faceListItemId`
  - `hasFacialCredential`
- Feito no app com V4.4:
  - OCR de etiqueta;
  - busca textual de unidades no servidor;
  - tipagem do `operation/search` alinhada ao schema documentado, com reaproveitamento da resposta agregada no `Movimento`;
  - endpoint proprio para foto de encomenda;
  - fluxo facial oficial fechado no front;
  - stream de eventos operacionais;
  - tratamento canonico de `eventType`/`occurredAt`, mantendo `type`/`timestamp` apenas como legado temporario;
  - suporte ao escopo estruturado de sessão com `scopeType`, `condominiumIds`, `unitIds`, `selectedUnitId` e `requiresUnitSelection`;
  - bloqueio centralizado de fluxos de escrita quando `requiresUnitSelection=true` vier sem `selectedUnitId`, evitando caminho morto na navegacao;
  - enriquecimento da sessão com `GET /api/v1/auth/me` no login e no bootstrap;
  - consumo de `GET /api/v1/auth/permissions-matrix` com cache local e fallback por papel;
  - hidratacao e cache local da `permissions-matrix` para orientar fallback por papel e contingencia offline;
  - compatibilidade com os estados faciais canonicos `NO_PHOTO`, `PHOTO_ONLY`, `FACE_PENDING_SYNC`, `FACE_SYNCED` e `FACE_ERROR`;
- Pendente no backend/ecossistema:
  - manter estabilidade contratual do `operation/search` para `people`, `deliveries` e `accessLogs`, sem variar shape entre ambientes;
  - `recipientUnitName` e campos de auditoria mais ricos nas entregas;
  - `visitForecastId` como identificador canonico publicado de forma consistente nas visitas previstas.

## API V4.5

- Feito no app com V4.5:
  - compatibilidade com `PENDING_ARRIVAL` e `EXPIRED` em visitas;
  - leitura operacional desses novos status em `Acessos`;
  - preparo cliente para `POST /api/v1/deliveries/{id}/renotify`;
  - `reenviar notificacao` disponivel no historico e na consulta de encomendas.
- Pendente no backend/ecossistema:
  - confirmar oficialmente a migracao semantica de `visit-forecasts` de `SCHEDULED/COMPLETED/NO_SHOW` para `PENDING_ARRIVAL/EXPIRED`;
  - confirmar se `EXPIRED` substitui de vez o fechamento operacional antes tratado como `COMPLETED`;
  - documentar o uso esperado de `releaseMode` no ecossistema;
  - confirmar `visitForecastId` como identificador canonico obrigatório em todas as respostas e operacoes relacionadas;
  - confirmar semantica de `POST /api/v1/deliveries/{id}/renotify`, incluindo quem recebe, quando pode ser usado e se atualiza `notificationSentAt`.

## API V4.6

- Feito no app com V4.6:
  - uso de `GET /api/v1/people/unit-residents` como caminho canonico para destinatários em `Encomendas`;
  - preparo cliente para `GET /api/v1/internal/sync/reconcile/{client_request_id}`;
  - reconciliacao no `Histórico` usando `clientRequestId` quando o backend ja reconhece a encomenda;
  - consulta de `reconcile` antes de reenviar encomenda offline, reduzindo duplicidade na volta da conexão;
  - parser do stream preparado para payload mais rico, incluindo `title`, `body`, `snapshotUrl`, `liveUrl`, `replayUrl` e `eventTime`.
- Pendente no backend/ecossistema:
  - publicar endpoint de persistencia do workflow operacional de alertas para o consumo do app, se o `Guarita` for migrar da triagem local.
  - feito em uso real: o fluxo de `Salvar` encomenda deixou de ser pendencia critica apos a homologacao no `Guarita`.

## API V4.7

- Feito no app com V4.7:
  - `clientRequestId` agora entra oficialmente no `POST /api/v1/deliveries`;
  - a criacao de encomenda ficou alinhada ao reconcile e ao fluxo offline/local que o app ja vinha preparando;
  - o changelog e a pauta para backend foram atualizados para refletir que isso saiu da categoria de preparacao local e virou contrato efetivo.
- Pendente no backend/ecossistema:
  - feito no app: o `Guarita` ja passou a consumir as configuracoes publicas de condominio para aplicar `residentManagementSettings`, `enabledModules`, `slimMode` e `deliveryRenotification`.

## Capacidades e configuracao publica

- Feito no app:
  - `GET /api/v1/auth/stream-capabilities` agora orienta o parser do stream no `Guarita`.
  - `GET /api/v1/auth/sync-capabilities` ja fica em cache e ajuda a leitura da reconciliacao offline.
  - `GET /api/v1/condominiums/{id}` agora enriquece a sessao com:
    - `enabledModules`
    - `residentManagementSettings`
    - `slimMode`
    - `deliveryRenotification`
- Pendente no app:
  - expandir o uso dessas configuracoes canonicas para mais telas secundarias e refinamentos de UX.

## Perfis de uso

- O app tambem podera ser usado pelo admin.
- Manter a interface adaptada para:
  - porteiro;
  - zelador;
  - administrador.
- Avaliar esconder ou liberar funcoes por `role` e `permissions` retornadas no login.

## Alinhamento entre modulos

- Feito: analise cruzada inicial entre `Guarita`, `App Morador` e `Portaria Web`.
- Documento gerado:
  - `ANALISE_CRUZADA_MODULOS_2026-04-11.md`
- Feito: matriz resumida de alinhamento entre os tres modulos em `MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`.
- Feito: matriz revisada apos devolutiva de `App Morador` e `Portaria Web`, separando melhor `fluxo implementado` de `contrato backend fechado`.
- Pendente consolidar como padrao compartilhado do ecossistema:
  - matriz unica de status;
  - matriz unica de permissao;
  - padrao unico de alertas;
  - padrao unico de câmeras;
  - padrao unico de notificacoes e mensagens.
- Pendente transformar a leitura documental revisada em contratos oficiais do ecossistema:
  - status de encomenda;
  - status facial;
  - tipos e status de alerta;
  - prioridade de midia e contrato de câmeras;
  - eventos, notificacoes e mensagens.
- Feito no front do `Guarita`: preparo local para contrato de câmeras com prioridade de midia canonica e para contrato de alertas operacionais derivados de acesso negado.
- Pendente no produto:
  - decidir exposicao de `câmeras` no app;
  - decidir exposicao de `alertas` como area propria ou recorte de `Movimento`;
  - confirmar `visitForecastId` como identificador canonico de visitas previstas no backend.

