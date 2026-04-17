# Analise Cruzada Dos Modulos

## Base analisada

Documentos comparados:

- `SOLUCAO_UNIFICADA_V8.md`
- `alinhamento-ecossistema-guarita-portaria-morador.md`
- `alinhamento-guarita-morador-portaria-2026-04-11.md`

Esta analise consolida:

- pontos convergentes;
- inconsistencias entre modulos;
- oportunidades de reaproveitamento;
- ajustes recomendados para a Guarita;
- itens que devem virar padrao do ecossistema.

---

## Leitura geral

Os tres materiais estao coerentes na visao macro:

- `Guarita` como operacao movel, rapida e assistida;
- `App Morador` como autosservico da unidade;
- `Portaria Web` como centro operacional e administrativo.

Nao apareceu conflito estrutural grave entre os documentos.  
O que existe hoje e mais uma diferenca de maturidade e detalhamento entre as frentes.

---

## Convergencias fortes

### 1. Papel de cada produto

Os tres documentos convergem em:

- `Guarita` nao deve virar painel administrativo pesado;
- `App Morador` nao deve virar app operacional;
- `Portaria Web` deve concentrar visao ampla, filtros, auditoria e operacao transversal.

### 2. Elementos que precisam ser iguais

Todos os materiais apontam para padronizacao de:

- status de encomenda;
- status de acesso;
- status de pessoa;
- status facial;
- campos de camera;
- alertas;
- notificacoes;
- trilha de auditoria.

### 3. Backend como fonte de verdade

Os tres materiais reforcam que:

- escopo deve vir do token;
- permissoes devem vir do backend;
- o front nao deve inventar regra de negocio;
- schemas precisam ser tipados de forma consistente.

---

## Inconsistencias e lacunas encontradas

### 1. OCR aparece como premissa em um documento, mas ainda nao existe na API

No alinhamento do ecossistema e do Portaria Web, o OCR aparece como parte natural do fluxo da Guarita.  
Na pratica atual da Guarita, isso ainda esta apenas preparado visualmente.

Impacto:

- risco de o ecossistema assumir uma capacidade que ainda nao existe em producao;
- risco de documentacao vender um fluxo ainda nao fechado.

Recomendacao:

- tratar OCR como `em preparacao no front e pendente no backend`.

### 2. Cameras e alertas estao muito mais maduras no Morador e no Portaria do que na Guarita

Os outros documentos tratam:

- monitor externo;
- layouts de camera;
- stream ao vivo;
- snapshot;
- severidade de alertas;
- mensagens e notificacoes.

Na Guarita, isso ainda nao entrou como modulo funcional.

Leitura:

- nao e necessariamente problema;
- mas precisa ficar claro que a Guarita hoje e mais forte em:
  - movimento,
  - encomendas,
  - retirada,
  - cadastro de pessoa,
  - cadastro facial,
  - contingencia offline.

### 3. Troca de turno esta citada no Portaria Web e ainda nao estava explicitada na Guarita

O Portaria Web cita:

- troca de turno;
- resumo;
- observacoes;
- trilha de operacao.

Na Guarita, isso ainda estava mais implicito do que explicito.

Recomendacao:

- manter ao menos um resumo operacional de turno na Guarita;
- deixar troca de turno formal e completa no Web.

### 4. Contratos compartilhados ainda nao estao fechados no mesmo nivel

Os tres materiais pedem alinhamento em:

- `operation/search`
- `deliveries`
- `people`
- `units`
- `alerts`
- `cameras`
- `messages`

Hoje a parte mais madura na Guarita esta em:

- `deliveries`
- `visit-forecasts`
- `access-logs`
- `people`
- `facial`

E a mais fraca continua sendo:

- OCR
- `operation/search` tipado
- busca textual server-side de unidades
- retorno rico de entrega

---

## O que a Guarita ja pode aproveitar dos outros dois

### Do Portaria Web

1. Conceito de `troca de turno`
2. Mais padrao visual de criticidade
3. Mais disciplina de auditoria e resumo operacional
4. Padrao mais forte para camera, alerta e heartbeat
5. Padrao unico de nomenclatura operacional

### Do App Morador

1. Linguagem menos tecnica
2. Estados vazios mais humanos
3. Tratamento mais amigavel de erro e orientacao
4. Coerencia de notificacao e mensageria
5. Melhor separacao entre informacao e acao

---

## O que a Guarita pode devolver como referencia para os outros

Hoje a Guarita esta mais forte em:

1. fila offline com sincronizacao;
2. rascunho por operador;
3. busca operacional guiada;
4. checklist rapido;
5. prioridade do turno;
6. distincao clara entre dado local e dado do sistema;
7. retirada por codigo, QR e confirmacao manual;
8. resumo de acesso por pessoa;
9. protecao contra vazamento de contexto entre operadores.

Esses pontos podem e devem inspirar:

- o `Portaria Web`, principalmente em contingencia e clareza de estado;
- o `App Morador`, principalmente em clareza de status e consistencia de historico.

---

## Ajustes recomendados para a Guarita apos a analise

### Ja vale fazer no front

1. reforcar o resumo de turno;
2. padronizar ainda mais criticidade visual;
3. manter a Guarita focada em operacao movel e nao em configuracao;
4. continuar removendo qualquer resquicio de linguagem tecnica;
5. manter rastro claro de:
   - dado local;
   - dado do sistema;
   - pendencia;
   - falha;
   - acompanhamento.

### Nao vale puxar para a Guarita agora

1. monitor de cameras em grade pesada;
2. relatorios extensos;
3. gestao master de clientes, licenca e modulos;
4. tela administrativa ampla de configuracao.

---

## O que deve virar padrao compartilhado do ecossistema

### Status

- `Recebida`
- `Morador avisado`
- `Pronta para retirada`
- `Retirada`
- `Pendente de sincronizacao`
- `Falha ao enviar`
- `Aguardar sistema`
- `Liberado`
- `Negado`
- `Chegada atrasada`
- `Saida atrasada`
- `Credencial facial ja cadastrada`
- `Cadastro facial em integracao`
- `Sem credencial facial cadastrada`

### Rotulos operacionais

- `Proxima acao`
- `Checklist rapido`
- `Conferencia recomendada`
- `Dados do aparelho`
- `Origem: sistema`
- `Origem: cache do aparelho`

### Contratos minimos

- `personId`
- `unitId`
- `deliveryId`
- `cameraId`
- `alertId`
- `messageId`
- `userId`

---

## Pendencias compartilhadas que continuam de pe

### Backend

1. OCR de etiqueta
2. `operation/search` tipado
3. busca textual de unidades no servidor
4. endpoint proprio para foto de encomenda
5. `recipientUnitName` nas entregas
6. fluxo facial oficial fechado
7. permissoes por acao

### Produto

1. matriz unica de status
2. matriz unica de permissao
3. padrao unico de alertas
4. padrao unico de cameras
5. padrao unico de notificacoes e mensagens
6. definicao do que e exclusivo de cada app

---

## Conclusao

Os tres materiais estao alinhados na direcao certa.

O principal agora nao e repensar a arquitetura.  
E consolidar:

- linguagem;
- contratos;
- status;
- permissao;
- e reaproveitamento entre os tres.

Para a Guarita, a analise confirma que o caminho atual esta correto:

- operacao rapida;
- fluxo assistido;
- contingencia local;
- interface enxuta;
- e nada de virar painel administrativo pesado.
