# Analise Cruzada Dos Modulos

## Escopo Da Analise

Esta analise foi feita com base nos materiais compartilhados na pasta deste projeto:

- [alinhamento-guarita-morador-portaria-2026-04-11.md](C:\Users\Pc Rafa\Desktop\app-morador\docs\alinhamento-guarita-morador-portaria-2026-04-11.md)
- [SOLUCAO_UNIFICADA_V8.md](C:\Users\Pc Rafa\Desktop\app-morador\docs\SOLUCAO_UNIFICADA_V8.md)
- [porteiro-app-ocr-facial-proposal.md](C:\Users\Pc Rafa\Desktop\app-morador\docs\porteiro-app-ocr-facial-proposal.md)

Observacao importante:

- a comparacao do `App Morador` foi feita com base no estado real do front atual;
- a comparacao de `Guarita` e `Portaria` foi feita principalmente com base em documento funcional e de produto, nao em codigo-fonte dos dois modulos.

Entao esta analise e confiavel para produto, contrato e alinhamento, mas ainda nao substitui uma leitura tecnica direta dos repositorios do `Guarita` e do `Portaria`.

---

## Diagnostico Geral

Os tres modulos ja apontam para a mesma solucao, mas ainda nao estao no mesmo patamar em tres aspectos:

1. **padrao de contrato**
2. **padrao de linguagem**
3. **definicao de responsabilidade**

Hoje existe coerencia conceitual. O que ainda falta e fechar coerencia operacional e tecnica.

---

## O Que Ja Esta Bem Alinhado

### 1. Separacao de papel entre os tres

Isso esta correto e deve ser mantido:

- `Guarita`: operacao rapida e movel
- `App Morador`: autosservico, seguranca e visibilidade da unidade
- `Portaria Web`: operacao ampla, supervisao e administracao

Essa separacao esta boa. Nao recomendo misturar esses papeis.

### 2. Linha de raciocinio de cameras

Os materiais estao coerentes ao defender:

- `liveUrl` e `hlsUrl` para video real;
- `imageStreamUrl`, `mjpegUrl`, `snapshotUrl`, `thumbnailUrl` como fallback.

Isso ja foi seguido no app morador e deve virar padrao oficial do ecossistema.

### 3. Centralidade do backend

Os tres materiais tratam o backend como autoridade para:

- permissao;
- escopo;
- auditoria;
- integracao com facial;
- integracao com equipamentos;
- notificacoes.

Isso tambem esta correto.

### 4. Foto, evidencia e biometria facial

Os materiais convergem para a mesma direcao:

- foto da pessoa importa;
- foto de encomenda importa;
- snapshot de alerta importa;
- cadastro facial deve ficar no backend.

Esse e um eixo forte e deve continuar como prioridade.

---

## Inconsistencias E Riscos Encontrados

## 1. Status de alerta ainda estao conceitualmente frouxos

Hoje os documentos falam em:

- criticidade;
- alerta ativo;
- resolvido;
- em acompanhamento;
- lido;
- encerrado.

Mas ainda nao ha uma semantica unica claramente fechada entre os tres.

### Risco

Cada modulo pode passar a interpretar `resolver`, `ler`, `acompanhar` e `encerrar` de forma diferente.

### Recomendacao

Padronizar oficialmente:

- `NEW`
- `ACKNOWLEDGED`
- `IN_PROGRESS`
- `RESOLVED`
- `DISMISSED`

E decidir quem pode fazer o que:

- Morador pode `acknowledge`?
- Morador pode `resolve`?
- Somente operacao resolve?

Hoje esse e um dos pontos mais sensiveis.

---

## 2. Status de encomenda ainda pedem contrato mais rico

Os materiais falam em:

- recebida;
- pronta para retirada;
- retirada concluida;
- retirada validada;
- notificada.

Mas ainda faltam campos e nomes fechados para auditoria entre os tres.

### Risco

Portaria, Guarita e Morador podem mostrar a mesma encomenda com interpretacoes visuais diferentes.

### Recomendacao

Padronizar no backend, para todos os modulos:

- `receivedAt`
- `receivedByUserId`
- `receivedByName`
- `withdrawnAt`
- `withdrawnByUserId`
- `withdrawnByName`
- `notificationStatus`
- `packagePhotoUrl`
- `labelPhotoUrl`

No app morador, ja vale continuar dando prioridade para:

- quem recebeu;
- quem retirou;
- quando retirou.

---

## 3. Foto e status facial ainda nao tem uma trilha unica

Os tres materiais valorizam foto e face, mas a trilha de status ainda esta solta.

### Risco

Um app pode tratar foto enviada como face sincronizada, enquanto outro trata como apenas foto de cadastro.

### Recomendacao

Padronizar estes estados:

- `NO_PHOTO`
- `PHOTO_ONLY`
- `FACE_PENDING_SYNC`
- `FACE_SYNCED`
- `FACE_ERROR`

E padronizar estes campos:

- `photoUrl`
- `faceStatus`
- `faceUpdatedAt`
- `faceProvider`
- `faceErrorMessage`

---

## 4. Fronteira de permissao ainda pode vazar

A documentacao esta certa ao dizer que:

- `App Morador` nao deve aceitar operacional;
- `Guarita` deve aceitar operacional;
- `Portaria` deve aceitar admin e operacao ampla.

Mas isso precisa ser fechado tambem no backend, nao so no front.

### Risco

Mesmo com o front certo, tokens de perfis indevidos podem circular entre apps.

### Recomendacao

Definir matriz oficial por app:

- `allowedClient = RESIDENT_APP | GUARD_APP | PORTARIA_WEB`

Ou equivalente por claim/token.

---

## 5. Busca operacional ainda parece pulverizada

O material cita `operation/search`, mas ele ainda aparece como ponto critico.

### Risco

Guarita e Portaria ficam com lógicas diferentes para buscar:

- pessoa;
- unidade;
- entrega;
- alerta;
- camera.

### Recomendacao

Fechar `GET /api/v1/operation/search?q=...` com resposta unificada e tipada.

Esse endpoint e um dos mais valiosos para manter os tres produtos coerentes.

---

## 6. Turno existe forte no Portaria, mas ainda nao esta bem conectado ao restante

O `Portaria Web` parece mais maduro em:

- troca de turno;
- resumo;
- observacoes;
- relatorios;
- visao consolidada.

### Oportunidade

O `Guarita` pode aproveitar:

- resumo do turno atual;
- checklist de inicio de turno;
- sinalizacao de fila pendente;
- proxima acao.

### Recomendacao

Nao levar turno para o app morador, mas levar para a Guarita uma versao resumida e muito operacional.

---

## 7. OCR de encomenda esta bem pensado, mas ainda isolado

O documento do porteiro esta bom, mas esta mais em forma de proposta que de contrato fechado.

### Risco

O fluxo do Guarita pode nascer forte no front e fraco no backend.

### Recomendacao

Fechar desde ja estes pontos:

- OCR no backend, nao no app;
- foto da etiqueta e foto do volume como arquivos distintos;
- sugestao de unidade e pessoa;
- confianca do OCR;
- revisao manual obrigatoria antes de salvar.

---

## 8. Linguagem ainda nao esta 100% unificada

Os materiais usam variacoes como:

- Portaria
- Guarita
- App porteiro
- App da guarita
- operacao
- operador
- porteiro

Isso pode gerar ruído nas interfaces e documentos.

### Recomendacao

Padrao sugerido:

- `Portaria Web`
- `App Guarita`
- `App Morador`

E, para perfil:

- `Morador`
- `Sindico`
- `Porteiro`
- `Operador`
- `Administrador`
- `Master`

---

## Melhorias Que O App Morador Pode Incorporar Agora

Mesmo sem receber codigo dos outros dois modulos, ja da para incorporar algumas ideias deles.

## 1. Conceito de "proxima acao"

Veio forte nos materiais da Guarita.

Pode ser adaptado no app morador como:

- `O que precisa da sua atencao`
- `Proxima acao recomendada`

Exemplos:

- confirmar visitante de hoje;
- revisar alerta novo;
- retirar encomenda pendente;
- atualizar foto do cadastro.

## 2. Melhor status de sincronizacao

A Guarita traz bem a ideia de:

- dado local;
- dado enviado;
- dado sincronizado;
- falha de envio.

No app morador isso pode melhorar:

- foto facial;
- notificacoes;
- alteracao de perfil;
- cancelamento ou encerramento de acesso.

## 3. Checklists curtos

Podem ser usados no app morador em:

- cadastrar foto;
- concluir biometria;
- revisar notificacoes;
- conferir acessos previstos do dia.

## 4. Padrao de auditoria visivel

O Portaria parece mais forte nisso. O app morador pode absorver melhor:

- quem recebeu;
- quem retirou;
- quem tratou o alerta;
- quando o acesso foi encerrado;
- quem autorizou.

---

## Melhorias Que O Guarita Deveria Herdar Do App Morador

## 1. Linguagem menos tecnica

O app morador avancou bem em:

- esconder UUID;
- reduzir texto tecnico;
- humanizar mensagens.

Isso deve ser levado para o Guarita, sem prejudicar velocidade operacional.

## 2. Melhor tratamento de estados vazios e erro

O app morador esta mais maduro nisso hoje.

Vale aplicar na Guarita:

- falha de rede;
- sincronizacao pendente;
- camera sem imagem;
- busca sem resultado.

## 3. Uso forte da foto como identidade principal

Isso e muito importante para os tres e deve virar padrao de pessoa.

---

## Melhorias Que O Portaria Deveria Herdar Do App Morador

## 1. Linguagem mais humana nas telas de uso frequente

O Portaria pode manter mais densidade, mas nao precisa ser tecnico para tudo.

## 2. Melhor prioridade visual por contexto

O app morador ja esta mais orientado por:

- alerta;
- atencao;
- camera;
- encomenda;
- mensagem.

Essa prioridade pode inspirar paineis e cards resumidos do Portaria.

---

## Melhorias Que O App Morador Deve Herdar Do Portaria

## 1. Semantica oficial de status

O Portaria deve ser a referencia operacional para:

- alertas;
- encomendas;
- acessos;
- cameras;
- turno.

O morador deve espelhar isso de forma simplificada.

## 2. Estrutura de relatorio e historico

Mesmo sem virar painel administrativo, o morador pode aproveitar:

- linha do tempo da unidade;
- historico de eventos;
- ultimo evento importante.

## 3. Monitoramento de camera mais consistente

Layouts multipainel nao fazem sentido para o morador, mas:

- ordem de prioridade de stream;
- heartbeat;
- leitura de offline;
- fallback de midia;

devem ser iguais.

---

## Melhorias Que O App Guarita Deve Herdar Do Portaria

## 1. Auditoria e governanca

Tudo que o Guarita faz precisa refletir no Portaria e vice-versa:

- recebimento de encomenda;
- retirada;
- cadastro;
- face;
- visitante;
- acesso negado;
- movimentacao do turno.

## 2. Regras de permissao centralizadas

O Guarita nao deve inventar regra local de negocio.

---

## Backlog Unificado Recomendado

## Prioridade 1 - Backend

1. fechar semantica oficial de status de alerta;
2. fechar matriz oficial de permissao por app e perfil;
3. fechar payload unico de notificacao;
4. fechar status e campos oficiais de facial;
5. fechar `operation/search`;
6. fechar contrato rico de encomendas com auditoria completa;
7. fechar OCR de encomenda no backend.

## Prioridade 2 - App Morador

1. manter foco em seguranca;
2. evoluir timeline da unidade;
3. evoluir status visual da biometria;
4. melhorar historico de tratamento de alerta;
5. consolidar ainda mais a home como painel.

## Prioridade 3 - App Guarita

1. construir fluxo OCR real;
2. construir fluxo de evidencias;
3. tratar offline e fila de sync como primeira classe;
4. cadastrar face com qualidade e auditoria;
5. usar busca operacional unificada.

## Prioridade 4 - Portaria Web

1. virar referencia oficial de status;
2. consolidar turno, relatorio e monitoramento;
3. publicar visualizacoes resumidas reaproveitaveis;
4. expor melhor contratos que os outros dois devem seguir.

---

## Inconsistencias Mais Importantes Para Corrigir Primeiro

Se tiver que escolher so os pontos mais urgentes, eu corrigiria estes:

1. status de alerta;
2. permissao por app;
3. status facial;
4. estrutura de auditoria de encomenda;
5. contrato de camera ao vivo e fallback;
6. busca operacional unificada.

---

## Conclusao

O material recebido esta bom e aponta na direcao certa.

Os tres modulos ja formam claramente a mesma solucao. O problema hoje nao e visao de produto. O problema e consolidacao operacional:

- mesmas regras;
- mesmos status;
- mesmos contratos;
- mesma linguagem;
- e fronteiras de permissao mais firmes.

Se isso for bem fechado agora, os tres avancam juntos sem retrabalho e sem divergencia de comportamento.

