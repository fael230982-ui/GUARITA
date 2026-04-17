# Matriz De Alinhamento Do Ecossistema

Data de referencia: `2026-04-11`

## Criterio De Leitura

Esta matriz mede principalmente `maturidade de produto e fluxo`, nao apenas existencia de endpoint no backend.

Legenda:

- `Feito`: fluxo implementado e operando de forma consistente no modulo
- `Parcial`: fluxo existente, mas ainda dependente de contrato, padronizacao, cobertura ou refinamento
- `Faltando`: fluxo ainda nao consolidado no produto analisado

Observacoes importantes:

- `Faltando` aqui nao significa que o ecossistema nao tenha nenhuma iniciativa no tema.
- Itens marcados como `Parcial` muitas vezes ja existem em tela, mas ainda sem contrato oficial unico entre `Guarita`, `App Morador`, `Portaria Web` e backend.
- O maior gap atual do ecossistema continua sendo `semantica compartilhada`, principalmente em status, permissoes, eventos e nomenclaturas.

## Visao Rapida

| Dominio | Guarita | App Morador | Portaria Web | Leitura direta |
| --- | --- | --- | --- | --- |
| Encomendas | Feito | Parcial | Feito | Guarita e Portaria estao mais maduros operacionalmente; Morador acompanha melhor do que opera |
| Faces e foto de pessoa | Parcial | Parcial | Parcial | Os tres convergem bem em foto e cadastro; o principal gap ainda e o status facial unificado |
| Pessoas e unidades | Feito | Parcial | Feito | Guarita e Portaria ja trabalham mais no eixo operacional; Morador usa o recorte da unidade |
| Acessos e visitas | Feito | Parcial | Feito | Guarita e Portaria estao mais proximos; Morador consulta e autoriza no escopo da propria unidade |
| Alertas | Faltando | Parcial | Feito | Morador ja possui fluxo visivel; Portaria segue como referencia operacional mais ampla |
| Cameras | Faltando | Parcial | Feito | Portaria e a referencia principal; Morador ja consome cameras da unidade ativa com escopo mais restrito |
| Mensagens e notificacoes | Faltando | Parcial | Feito | Fluxos ja existem em Morador e Portaria; o padrao final entre canais ainda nao fechou |
| Offline e contingencia | Feito | Parcial | Parcial | Guarita hoje e a referencia mais forte de contingencia |
| Tempo real e eventos | Parcial | Parcial | Parcial | Existe preparacao e consumo nos tres, mas o contrato final de eventos ainda nao esta fechado |
| Permissoes por app/acao | Parcial | Parcial | Parcial | Ainda falta matriz unica oficial do backend |
| Linguagem e rotulos operacionais | Parcial | Parcial | Parcial | Ja existe convergencia, mas nao um glossario unico fechado |

## Por Dominio

### Encomendas

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Recebimento operacional | Feito | Faltando | Feito |
| Retirada com validacao | Feito | Parcial | Feito |
| Foto/evidencia | Feito | Parcial | Feito |
| OCR de etiqueta | Feito | Faltando | Feito |
| Historico coerente | Feito | Parcial | Feito |
| Status compartilhados | Parcial | Parcial | Parcial |

Leitura:

- `Guarita` ficou forte em recebimento, OCR, evidencias e retirada.
- `App Morador` ja cobre acompanhamento e retirada, mas ainda depende de contrato final de status e nomenclatura.
- `Portaria Web` segue como referencia ampla do fluxo e ja opera OCR de etiqueta por API.

Pontos de atencao:

- Ainda existe disputa de nomenclatura entre `pickupCode`, `withdrawalCode` e o nome final do QR de retirada.
- O contrato compartilhado de status de encomenda ainda precisa ser fechado oficialmente.

### Faces E Foto

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Upload de foto | Feito | Feito | Parcial |
| Cadastro facial | Feito | Parcial | Parcial |
| Resumo de status facial | Parcial | Parcial | Parcial |
| Status facial unificado | Faltando | Faltando | Faltando |

Leitura:

- Os tres produtos apontam para a mesma direcao.
- O ecossistema ja converge melhor em `foto` e `cadastro` do que em `status facial`.
- O principal gap ainda e um campo padrao de backend, como `faceStatus`, com semantica unica para todos.

### Pessoas, Unidades, Acessos E Visitas

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Busca operacional | Feito | Faltando | Feito |
| Vinculo pessoa/unidade | Feito | Parcial | Feito |
| Visitas previstas | Feito | Parcial | Feito |
| Ultimos acessos | Feito | Parcial | Feito |
| Consulta por unidade do morador | Faltando | Feito | Feito |

Leitura:

- `Guarita` e `Portaria Web` estao mais alinhados no operacional.
- `App Morador` usa o mesmo dominio, mas com recorte mais restrito da unidade.
- O backend ja publicou rota oficial para busca operacional de unidades, mas o consumo ainda nao esta padronizado igualmente nos tres produtos.

### Alertas, Cameras, Mensagens E Notificacoes

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Alertas operacionais | Faltando | Parcial | Feito |
| Snapshot/evidencia de alerta | Faltando | Parcial | Feito |
| Visualizacao de cameras | Faltando | Parcial | Feito |
| Mensagens entre ponta e operacao | Faltando | Parcial | Feito |
| Notificacoes coerentes entre telas | Faltando | Parcial | Parcial |

Leitura:

- Aqui o `Guarita` ainda nao esta no mesmo nivel de produto consolidado.
- `Portaria Web` e a referencia principal em monitoramento, mensagens operacionais e cobertura visual mais ampla.
- `App Morador` ja possui fluxos de alertas, cameras, mensagens e notificacoes, mas com escopo naturalmente mais restrito e contrato ainda parcial.

Pontos de atencao:

- No `App Morador`, o problema principal ja nao e ausencia de tela; e padrao oficial unico de status, tipos e contratos.
- Em `Portaria Web`, mensagens operacionais ja podem ser tratadas como `Feito`, mesmo com necessidade de padronizacao final entre apps.

### Offline, Tempo Real E Operacao

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Cache local | Feito | Parcial | Parcial |
| Fila offline | Feito | Parcial | Parcial |
| Rascunho por operador/usuario | Feito | Parcial | Parcial |
| Distincao entre dado local e sistema | Feito | Parcial | Parcial |
| Stream de eventos | Parcial | Parcial | Parcial |

Leitura:

- `Guarita` hoje e a melhor referencia de contingencia.
- `App Morador` possui nivel de offline suficiente para o residente, mas nao precisa ter a mesma ambicao de contingencia do mobile operacional.
- Nos tres produtos, existe preparacao ou consumo de tempo real, mas ainda nao ha fechamento oficial do contrato de eventos do ecossistema.

## O Que Ja Esta Bem Padronizado

- Separacao de papel entre os tres produtos
- Uso de `personId`, `unitId`, `deliveryId` como eixo de contrato
- Linha de encomendas com recebimento, retirada e auditoria
- Uso de foto como evidencia operacional
- Busca operacional como responsabilidade principal de Guarita e Portaria
- Leitura de `Portaria Web` como referencia operacional mais ampla
- Leitura de `Guarita` como referencia forte de operacao movel e contingencia

## O Que Ainda Precisa Virar Padrao Oficial

- Matriz unica de status de alerta
- Matriz unica de status facial
- Matriz unica de status de encomenda para os tres fronts
- Matriz unica de permissao por app e por acao
- Tipagem final de `operation/search`
- Tipos oficiais do `events/stream`
- Contrato final de cameras e prioridade de midia
- Padrao unico para mensagens, notificacoes e eventos
- Glossario unico de rotulos operacionais e textos de usuario

## Leitura Final

Hoje o `Guarita` ficou bem mais alinhado ao ecossistema do que estava no inicio desta rodada.

Ele ainda nao esta no mesmo patamar funcional de `Portaria Web` em `alertas`, `cameras` e `mensagens`, nem no mesmo patamar de experiencia final do `App Morador` para relacionamento com o residente.

Ao mesmo tempo, o `App Morador` ja nao deve mais ser lido como camada apenas incipiente em `alertas`, `cameras`, `mensagens`, `notificacoes` e `facial`. Nesses dominios, o principal problema agora e `padronizacao oficial`, nao ausencia de interface.

No eixo operacional de `encomendas`, `pessoas`, `unidades`, `faces`, `contingencia` e `tempo real`, o alinhamento geral do ecossistema esta substancialmente melhor, mas ainda depende do fechamento formal de contratos unicos entre os tres modulos e o backend.
