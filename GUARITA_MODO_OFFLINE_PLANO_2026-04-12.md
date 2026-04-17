# Modo Offline Do Guarita

Data de referencia: `2026-04-12`

## Objetivo

Definir a evolucao do `Guarita` para operar sem `4G` ou `wifi` quando necessario, mantendo continuidade operacional com limites claros e sincronizacao posterior.

## O Que Ja Existe Hoje

O `Guarita` ja possui base real de operacao offline no aparelho:

- sessao salva localmente;
- rascunhos de `encomenda`, `face` e `cadastro de pessoa`;
- cache de telas e dados recentes;
- fila local de operacoes pendentes;
- tentativa automatica de sincronizacao quando a conexao volta.

## Operacoes Que Ja Entram Em Fila

- `createDelivery`
- `createPerson`
- `sendFace`
- `updateVisitForecastStatus`

## Telas Que Ja Usam Cache

- `Inicio/Acessos`
- `Historico`
- `Alertas`
- `Permissoes`
- estados de tela e ultima aba

## Leitura Atual

Status geral:

- `offline parcial com base funcional`

Isso significa que o app ja continua funcionando em parte sem internet, mas ainda nao cobre um modo offline operacional completo.

## O Que Ja Funciona Bem Offline

### Encomendas

- continuar preenchimento com rascunho local;
- registrar recebimento e enfileirar envio;
- consultar historico previamente carregado.

### Pessoas e Face

- manter rascunho local;
- criar pessoa em fila local;
- enviar face em fila local.

### Acessos

- visualizar cache recente de acessos e previsoes;
- manter alteracoes de status de previsao em fila local.

## O Que Ainda E Limitado

- buscas novas de pessoas e unidades dependem da API;
- entrega de encomenda ainda depende mais de validacao online;
- dados nunca carregados antes nao existem no aparelho;
- reconciliacao ainda pode melhorar quando o backend responder com dado oficial.

## Evolucao Recomendada

### Prioridade Alta

1. Criar `modo offline operacional` explicito no app.
2. Exibir status visual claro quando o app estiver usando cache/fila local.
3. Baixar catalogo minimo para operacao:
   - unidades;
   - moradores essenciais por unidade;
   - previsoes do dia;
   - permissoes efetivas.
4. Permitir `consulta local por unidade` mesmo sem conexao, com base nesse catalogo.

### Prioridade Media

5. Melhorar reconciliacao de fila quando a internet voltar.
6. Definir conflitos entre dado local e dado oficial do backend.
7. Separar no UI o que e:
   - dado em cache;
   - dado pendente de sincronizacao;
   - dado confirmado pelo sistema.

### Prioridade Estrategica

8. Criar politica unica de offline para `Guarita`, `Portaria Web` e `App Morador` onde fizer sentido.
9. Formalizar no contrato do ecossistema o que pode operar offline com seguranca.

## Regras Operacionais Recomendadas

- operador deve saber claramente quando esta offline;
- acoes criticas devem deixar claro se estao `pendentes de envio`;
- consulta offline deve usar somente dados ja baixados e identificados como cache;
- validacoes sensiveis devem ter criterio conservador quando nao houver internet.

## Pendencias Para Backend

1. Definir quais dados podem ser espelhados localmente com seguranca.
2. Definir politica de validade do cache local.
3. Definir estrategia de reconciliacao para:
   - encomendas;
   - pessoas;
   - face;
   - previsoes.
4. Definir tratamento de conflito entre evento local e dado oficial.
5. Publicar suporte oficial a sincronizacao incremental quando possivel.

## Posicao Do Guarita

O `Guarita` considera viavel e desejavel um `modo offline com limitacoes`, especialmente para porteiro e zelador. A base tecnica ja existe. O proximo passo e transformar essa base em comportamento explicitamente suportado pelo produto.
