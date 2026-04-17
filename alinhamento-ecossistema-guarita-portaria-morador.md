# Alinhamento Do Ecossistema

## Objetivo

Este documento serve para alinhar as tres solucões do ecossistema:

- Guarita
- App Morador
- Portaria Web

A ideia e comparar os tres produtos pelos mesmos eixos:

- objetivo principal
- publico e perfil de acesso
- funcionalidades ja implementadas
- integracoes com backend
- pontos fortes
- pontos faltantes
- oportunidades de reaproveitamento entre as solucoes

Com isso, fica mais facil:

1. identificar o que ja existe em um produto e pode ser reutilizado nos outros;
2. evitar retrabalho;
3. manter a experiencia coerente entre os tres;
4. pedir ao backend apenas o que realmente falta;
5. separar melhor o que e exclusivo de cada perfil.

---

## Visao Geral Das Tres Solucoes

### 1. Guarita

**Funcao principal**

Uso operacional rapido na portaria/guarita para atendimento imediato.

**Perfil esperado**

- porteiro
- operador local
- atendimento de acesso presencial

**Responsabilidades naturais**

- entrada e saida em tempo real
- liberacao de acesso
- consulta rapida de pessoas, visitantes, prestadores e veiculos
- registro de encomendas
- captura de foto e evidencias
- leitura de QR ou codigo
- possivel cadastro facial

**Observacao**

Esse app precisa ser extremamente rapido, com poucos toques, visual de operacao e foco em fila de atendimento.

---

### 2. App Morador

**Funcao principal**

Dar ao morador visibilidade, controle e seguranca sobre sua unidade.

**Perfil esperado**

- morador
- sindico, quando a regra permitir

**Responsabilidades naturais**

- acompanhar alertas
- ver cameras
- acompanhar encomendas
- autorizar visitantes, prestadores e locatarios
- consultar ultimos acessos
- gerenciar veiculos da unidade
- receber mensagens e notificacoes
- manter foto e biometria facial atualizadas

**Observacao**

O app morador nao deve aceitar perfis operacionais. Esse bloqueio ja foi aplicado no front.

---

### 3. Portaria Web

**Funcao principal**

Painel administrativo e operacional mais completo, com maior densidade de dados.

**Perfil esperado**

- admin
- master
- central
- operacional
- portaria

**Responsabilidades naturais**

- gestao geral do condominio
- monitoramento de unidades
- operacao ampla de acessos
- consultas administrativas
- acoes remotas
- mensagens
- acompanhamento de eventos
- cadastros amplos e manutencao de configuracoes

**Observacao**

O web pode ter mais detalhe, mais filtros e mais dados tecnicos. O app morador e o app guarita devem ser mais guiados e menos tecnicos.

---

## Estado Atual Do App Morador

### O que ja esta bem encaminhado

- login com bloqueio de perfis operacionais
- home focada em seguranca
- cameras com tela cheia
- tentativa de stream ao vivo por `hlsUrl` e `liveUrl`
- fallback de snapshot/imagem atual
- alertas com snapshot quando a API envia imagem
- resolucao de alerta preparada no front
- encomendas com detalhe mais humano
- exibicao de quem recebeu e quem retirou encomenda
- acessos previstos e ultimos acessos separados
- cadastro de visitante, prestador, morador e locatario
- perfil com foto
- upload de foto
- fluxo preparado para biometria facial
- notificacoes do morador
- mensagens com a portaria
- fluxo real de recuperacao de senha
- documentacao de pendencias do backend atualizada

### Pontos ainda dependentes do backend

- encerramento real de alertas persistindo no backend
- push real
- device registration em producao
- status real da biometria facial
- vehicles totalmente liberados para MORADOR, se ainda nao estiverem
- events/stream em producao
- payload final de notificacoes

### Problemas que merecem alinhamento com os outros produtos

- definicao unica de status de alerta
- definicao unica de status de encomenda
- definicao unica de status de acesso
- padrao unico para foto de pessoa e biometria
- padrao unico de nomenclatura e textos para usuario

---

## Quadro De Comparacao

Preencha este bloco para cada produto e compartilhe de volta.

### Produto

**Nome**

**Responsavel**

**Stack**

**Objetivo principal**

**Usuario principal**

**Rotas ou telas principais**

**Funcionalidades implementadas**

**Funcionalidades em andamento**

**Integracoes com backend**

**Endpoints ja usados**

**Permissoes e perfis aceitos**

**Maiores dores hoje**

**O que esse produto faz melhor do que os outros**

**O que pode ser reaproveitado nos outros**

**O que precisa virar padrao para todo o ecossistema**

---

## Reaproveitamento Entre Os Tres Produtos

### 1. Cadastros e identidade

Vale padronizar entre os tres:

- foto de pessoa
- foto do morador
- cadastro facial
- campos minimos por pessoa
- status do cadastro
- validade de autorizacao

### 2. Acessos

Vale padronizar:

- visitante
- prestador
- locatario
- morador
- veiculo
- ultimo acesso
- acesso previsto
- acesso negado
- acesso encerrado

### 3. Encomendas

Vale padronizar:

- recebida
- notificada
- retirada
- retirada validada
- quem recebeu
- quem retirou
- foto da encomenda
- codigo de retirada
- QR de retirada

### 4. Alertas e seguranca

Vale padronizar:

- tipos de alerta
- severidade
- status
- snapshot ou imagem do evento
- camera relacionada
- hora e local do evento
- quem tratou o alerta

### 5. Cameras

Vale padronizar:

- `snapshotUrl`
- `thumbnailUrl`
- `imageStreamUrl`
- `mjpegUrl`
- `liveUrl`
- `hlsUrl`
- regra de exibicao por perfil
- regra de fallback quando o video falhar

### 6. Notificacoes e mensagens

Vale padronizar:

- payload de notificacao
- tipos
- origem
- navegacao ao tocar
- marcacao de leitura
- diferenca entre mensagem e alerta

---

## O Que Eu Gostaria De Receber Do Guarita E Do Portaria

Para eu conseguir comparar e incorporar melhor, o ideal e receber de cada um:

1. lista de telas principais;
2. lista de funcionalidades prontas;
3. lista de endpoints em uso;
4. pontos que estao melhores que no app morador;
5. screenshots ou descricao visual;
6. regras de permissao;
7. principais dores atuais;
8. pendencias do backend;
9. o que eles gostariam de reaproveitar no app morador.

---

## O Que Ja Faz Sentido Compartilhar A Partir Do App Morador

Hoje o app morador ja tem ideias e fluxos que podem servir de referencia para os outros:

- bloqueio de perfil operacional em app indevido
- linguagem menos tecnica para usuario final
- organizacao de home por seguranca
- uso de foto do usuario como identidade visual principal
- separacao de acessos previstos x ultimos acessos
- regra de preview x video ao vivo em cameras
- fluxo de recuperacao de senha alinhado com API
- tratamento mais humano de estados vazios e erros

---

## Proposta De Processo De Alinhamento

### Etapa 1

Voce compartilha este documento com os responsaveis por:

- Guarita
- Portaria Web

### Etapa 2

Cada um preenche seu bloco com:

- o que ja existe
- o que falta
- o que quer reaproveitar

### Etapa 3

Voce me devolve os materiais dos tres.

### Etapa 4

Eu comparo tudo e devolvo:

- gaps
- duplicidades
- oportunidades de reaproveitamento
- itens que devem virar padrao do ecossistema
- sugestao de backlog unificado

---

## Resultado Esperado

Ao final desse alinhamento, os tres produtos devem ficar:

- no mesmo patamar de qualidade;
- com linguagem coerente;
- com contratos de backend mais consistentes;
- com menos duplicidade de esforco;
- com identidades claras:
  - Guarita: operacao rapida
  - App Morador: seguranca e autonomia da unidade
  - Portaria Web: gestao e operacao ampla

