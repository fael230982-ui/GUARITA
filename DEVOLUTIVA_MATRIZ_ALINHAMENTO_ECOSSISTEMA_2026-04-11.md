# Devolutiva Da Matriz De Alinhamento Do Ecossistema

Data de referencia: `2026-04-11`

Documento analisado:

- `MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`

## Conclusao Executiva

A matriz faz sentido como fotografia de direcao do ecossistema.

Ela acerta principalmente em:

- preservar papeis diferentes entre `Guarita`, `App Morador` e `Portaria Web`;
- tratar `Portaria Web` como referencia operacional mais ampla;
- tratar o `App Morador` como camada de relacionamento e autosservico;
- reconhecer que ainda faltam contratos oficiais unificados para status, permissoes, alertas, facial e tempo real.

Mas a matriz ainda mistura tres coisas diferentes no mesmo nivel:

- funcionalidade ja implementada em tela;
- integracao parcialmente pronta;
- contrato backend oficialmente fechado.

Isso gera uma leitura um pouco imprecisa, principalmente para o `App Morador`.

## Ajuste Mais Importante

A matriz nao deveria usar apenas `Feito`, `Parcial` e `Faltando` como se isso cobrisse tudo.

Para a proxima versao, recomendo separar a leitura em dois eixos:

### 1. Maturidade de interface/fluxo

- `Implementado`
- `Implementado com dependencia`
- `Nao implementado`

### 2. Maturidade de contrato backend

- `Contrato estavel`
- `Contrato parcial`
- `Contrato em aberto`

Sem isso, um item que ja existe no app pode parecer ausente, quando na verdade o problema esta no contrato final e nao na interface.

## O Que Faz Sentido Manter

### Encomendas

Faz sentido manter que:

- `Guarita` e `Portaria Web` sao mais fortes no operacional;
- `App Morador` acompanha melhor do que opera;
- ainda falta padronizacao final de status compartilhados.

### Pessoas, unidades, acessos e visitas

Faz sentido manter que:

- `Guarita` e `Portaria Web` concentram busca operacional;
- `App Morador` trabalha com recorte da propria unidade;
- o mesmo dominio precisa continuar coerente entre os tres.

### Offline e contingencia

Faz sentido manter que:

- `Guarita` e a referencia mais forte;
- `App Morador` nao deve receber o mesmo peso de contingencia offline;
- `Portaria Web` pode ter tolerancia parcial, mas nao a mesma estrategia do mobile operacional.

## O Que Precisa Ser Corrigido Na Matriz

### 1. Alertas no App Morador nao estao apenas como intencao

No `App Morador`, alertas ja existem em tela, lista, filtros, snapshot e acao de resolucao.

Referencia:

- [app/(tabs)/alerts.tsx](/C:/Users/Pc%20Rafa/Desktop/app-morador/app/(tabs)/alerts.tsx)
- [types/alarm.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/types/alarm.ts)

Correcao sugerida:

- nao descrever alertas do `App Morador` como algo apenas embrionario;
- registrar que o fluxo existe, mas o contrato semantico global de status e tipos ainda nao esta fechado.

Leitura melhor:

- `App Morador`: implementado em interface, contrato ainda parcial.

### 2. Cameras no App Morador estao mais maduras do que a matriz indica

O app ja possui:

- listagem por unidade;
- prioridade de `liveUrl` e `hlsUrl`;
- fallback para snapshot, frame, preview e `imageStream`;
- tela cheia e tratamento de indisponibilidade.

Referencia:

- [app/(tabs)/cameras.tsx](/C:/Users/Pc%20Rafa/Desktop/app-morador/app/(tabs)/cameras.tsx)
- [services/cameraService.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/services/cameraService.ts)

Correcao sugerida:

- manter que `Portaria Web` e a referencia principal;
- mas mudar a leitura do `App Morador` para algo como "implementado com contrato parcial de midia".

### 3. Mensagens e notificacoes no App Morador ja estao separadas semanticamente

No app ja existe separacao clara entre:

- `mensagem` de conversa com a portaria;
- `notificacao` de inbox/push;
- `alerta` operacional/seguranca.

Referencias:

- [app/messages.tsx](/C:/Users/Pc%20Rafa/Desktop/app-morador/app/messages.tsx)
- [services/operationMessages.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/services/operationMessages.ts)
- [services/residentNotifications.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/services/residentNotifications.ts)

Correcao sugerida:

- a matriz deve dizer que a separacao conceitual ja existe no `App Morador`;
- o que ainda falta e padrao oficial unico entre os tres produtos e o backend.

### 4. Faces e foto precisam ser descritas com mais precisao

No `App Morador`, upload de foto e fluxo de biometria facial ja existem.

O que ainda nao esta fechado e:

- o status facial unico do ecossistema;
- a semantica oficial do backend para sincronizacao;
- a correspondencia entre estados locais e estados globais.

Referencia:

- [app/profile/face-enrollment.tsx](/C:/Users/Pc%20Rafa/Desktop/app-morador/app/profile/face-enrollment.tsx)

Correcao sugerida:

- `upload de foto`: implementado;
- `consulta/cadastro facial do morador`: implementado com dependencia;
- `status facial unificado`: em aberto nos tres.

### 5. Tempo real no App Morador ainda nao pode ser tratado como fechado

O app ja tem infraestrutura para:

- preparar sessao;
- refletir estado `prepared`, `connected` e `degraded`;
- disparar refresh por eventos.

Mas isso ainda e infraestrutura preparada, nao contrato final consolidado de stream.

Referencia:

- [services/residentRealtime.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/services/residentRealtime.ts)

Correcao sugerida:

- manter `Parcial` para tempo real;
- explicitar que hoje existe preparacao de camada e nao fechamento funcional completo de eventos SSE para o ecossistema.

### 6. Encomendas ainda carregam inconsistencias de contrato

Hoje o `App Morador` ainda trabalha com:

- status `RECEIVED`, `NOTIFIED` e `WITHDRAWN`;
- campos `pickupCode` e `withdrawalCode`;
- campo `qrCodeUrl`.

Referencias:

- [services/deliveries.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/services/deliveries.ts)
- [types/delivery.ts](/C:/Users/Pc%20Rafa/Desktop/app-morador/types/delivery.ts)

Isso confirma que a matriz esta correta ao dizer que falta padrao final de encomendas, mas ela deveria explicitar o problema:

- ainda existem nomes concorrentes para o mesmo conceito;
- o contrato final de retirada segura ainda precisa ser normalizado.

### 7. Permissoes ainda nao sao matriz oficial do ecossistema

O app possui regras locais de permissao e adaptacao de interface, mas isso nao equivale a matriz oficial unica do backend.

Correcao sugerida:

- manter `Parcial`;
- registrar explicitamente que a referencia atual ainda e local por front, nao corporativa por acao.

## Leitura Corrigida Do App Morador

Se a matriz quiser representar melhor o estado atual do `App Morador`, a leitura recomendada e esta:

| Dominio | Leitura melhor para o App Morador |
| --- | --- |
| Encomendas | Implementado para acompanhamento e retirada, mas com contrato ainda parcial |
| Faces e foto de pessoa | Implementado para foto e fluxo de biometria, sem status facial unificado |
| Pessoas e unidades | Implementado no recorte da unidade, sem busca operacional ampla |
| Acessos e visitas | Implementado para consulta, autorizacao e historico da propria unidade |
| Alertas | Implementado em tela e consumo, com semantica global ainda parcial |
| Cameras | Implementado com fallback de midia, dependente de contrato final de streaming |
| Mensagens e notificacoes | Implementado, mas ainda sem padrao oficial unificado entre todos os canais |
| Offline e contingencia | Parcial e suficiente para o residente, sem ambicao de contingencia forte |
| Tempo real e eventos | Infraestrutura preparada, mas contrato ainda em aberto |
| Permissoes por app/acao | Parcial e ainda nao oficializado pelo backend |
| Linguagem e rotulos operacionais | Em convergencia, ainda sem glossario unico formal |

## O Que Eu Recomendo Mudar No Documento Do Guarita

### Mudancas objetivas

- trocar a leitura de `App Morador` em `alertas`, `cameras`, `mensagens` e `faces` para refletir que esses fluxos ja existem no app;
- diferenciar claramente "fluxo implementado" de "contrato backend fechado";
- explicitar que o principal gap atual esta em semantica e contrato, nao em ausencia de tela;
- adicionar uma observacao especifica sobre encomendas:
  - ainda existe disputa entre `pickupCode` x `withdrawalCode`
  - ainda existe disputa entre `qrCodeUrl` x nome final de QR de retirada
- adicionar uma observacao especifica sobre facial:
  - estados locais ja existem
  - estado oficial unico do ecossistema ainda nao existe
- adicionar uma observacao especifica sobre tempo real:
  - ha preparacao de infraestrutura
  - ainda nao ha fechamento oficial do stream entre os tres canais

## Mensagem Objetiva Para Guarita E Portaria

Minha leitura final para devolver aos outros dois projetos e:

- a direcao da matriz esta correta;
- o maior risco hoje continua sendo desalinhamento de contrato e semantica;
- o `App Morador` ja nao esta mais so em intencao em `alertas`, `cameras`, `mensagens`, `notificacoes` e `facial`;
- nesses dominios, o problema principal agora e padronizacao oficial, nao falta de interface;
- `Portaria Web` continua sendo a referencia operacional ampla;
- `Guarita` continua sendo a referencia de operacao movel e contingencia;
- o proximo passo correto e fechar tabelas unicas de:
  - status de encomenda
  - status facial
  - tipos/status de alerta
  - contratos de camera e prioridade de midia
  - permissoes por acao
  - eventos/notificacoes/mensagens

## Fechamento

Se a matriz for atualizada com esses ajustes, ela passa a representar melhor o estado real do ecossistema sem reduzir o `App Morador` a uma camada ainda "incipiente" em areas onde o fluxo ja esta presente.

Hoje, o problema principal nao e mais falta de tela no `App Morador`.

O problema principal e fechar contrato unico, nomes finais e semantica compartilhada entre `Guarita`, `Portaria Web`, `App Morador` e `backend`.
