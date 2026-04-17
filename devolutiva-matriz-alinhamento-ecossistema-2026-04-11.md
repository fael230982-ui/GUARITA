# Devolutiva Da Matriz De Alinhamento Do Ecossistema

Referencia analisada: `MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`

Data: `2026-04-11`

## Parecer geral

A matriz faz sentido como visao executiva entre `Guarita`, `App Morador` e `Portaria Web`.

Ela esta boa em tres pontos:

- organiza a leitura por dominio;
- evita olhar so endpoint e considera maturidade de fluxo;
- mostra corretamente que `Portaria Web` ainda e a referencia mais ampla em varios eixos.

Mas, para ficar tecnicamente precisa com base na `API Sapinho V4.3` e no estado atual do front web, alguns itens precisam ser corrigidos ou refinados.

## O que eu manteria

- `Tempo real e eventos` como `Parcial` nos tres.
- `Permissoes por app/acao` como `Parcial` nos tres.
- `Linguagem e rotulos operacionais` como `Parcial` nos tres.
- `Portaria Web` como referencia principal em `alertas`, `cameras` e monitoramento mais amplo.
- leitura de que `App Morador` acompanha mais do que opera.
- leitura de que `Guarita` ficou forte no eixo operacional e de contingencia.

## O que eu mudaria

### 1. Encomendas em Portaria Web nao sao mais apenas “Feito” com OCR “Parcial”

Hoje o `Portaria Web` ja integra:

- cadastro operacional de encomenda;
- retirada com validacao;
- foto/evidencia;
- OCR de etiqueta via API;
- upload de foto via API.

Sugestao:

- manter `Encomendas` como `Feito` para `Portaria Web`;
- trocar `OCR de etiqueta` em `Portaria Web` de `Parcial` para `Feito`.

### 2. Mensagens e notificacoes em Portaria Web estao subavaliadas

No estado atual:

- `Portaria Web` ja trabalha com mensagens operacionais;
- `Portaria Web` ja tem fluxo de notificacoes de morador;
- o problema principal ainda e padrao final de contrato, nao ausencia funcional.

Sugestao:

- em `Mensagens e notificacoes`, trocar `Portaria Web` de `Parcial` para algo entre `Parcial forte` e `Feito`;
- como a matriz so aceita tres niveis, eu marcaria `Feito` em mensagens operacionais e manteria a observacao de que o padrao entre apps ainda nao esta fechado.

### 3. Cameras no App Morador continuam “Parcial”, mas com nota mais forte

Isso esta correto, porem vale ajustar a leitura:

- o morador ja consulta cameras da propria unidade;
- o gap maior nao e tela inexistente, e sim limite de escopo por perfil.

Sugestao textual:

- trocar “Morador acompanha a propria unidade” por “Morador ja consome cameras da unidade ativa, com escopo naturalmente mais restrito”.

### 4. Faces e foto de pessoa precisam separar melhor “foto” de “status facial”

A matriz mistura dois assuntos:

- upload de foto;
- estado da credencial facial.

Na `V4.3`, o ecossistema ja converge melhor em foto do que em status facial.

Sugestao:

- manter `Status facial unificado` como `Faltando`;
- deixar claro que o principal gap e um campo padrao do backend, como `faceStatus`, e nao apenas a existencia de upload.

### 5. Pessoas e unidades estao bem posicionadas, mas a observacao sobre busca operacional pode ser mais precisa

Hoje a `V4.3` ja tem `GET /api/v1/operation/units`, mas o uso ainda nao esta consolidado igualmente nos tres produtos.

Sugestao:

- manter `Busca operacional` como `Feito` para `Portaria Web`;
- acrescentar observacao de que o backend ja publicou a rota oficial, mas o ecossistema ainda nao padronizou o consumo dela em todos os apps.

### 6. Alertas e cameras no Guarita como `Faltando` fazem sentido, mas so se a matriz estiver olhando produto consolidado

Se a leitura for:

- “ja existe no app de forma madura e padronizada”,

entao `Faltando` faz sentido.

Se a leitura for:

- “nao existe nada em andamento”,

entao fica forte demais.

Sugestao:

- manter `Faltando`, mas explicitar que significa “nao consolidado no produto do Guarita”, nao “inexistente no ecossistema”.

## Ajustes recomendados na matriz

### Visao rapida

Eu deixaria assim:

| Dominio | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Encomendas | Feito | Parcial | Feito |
| Faces e foto de pessoa | Parcial | Parcial | Parcial |
| Pessoas e unidades | Feito | Parcial | Feito |
| Acessos e visitas | Feito | Parcial | Feito |
| Alertas | Faltando | Parcial | Feito |
| Cameras | Faltando | Parcial | Feito |
| Mensagens e notificacoes | Faltando | Parcial | Feito |
| Offline e contingencia | Feito | Parcial | Parcial |
| Tempo real e eventos | Parcial | Parcial | Parcial |
| Permissoes por app/acao | Parcial | Parcial | Parcial |
| Linguagem e rotulos operacionais | Parcial | Parcial | Parcial |

### Encomendas

Eu ajustaria:

- `Portaria Web > OCR de etiqueta`: de `Parcial` para `Feito`.

### Alertas, cameras, mensagens e notificacoes

Eu ajustaria:

- `Portaria Web > Mensagens entre ponta e operacao`: de `Parcial` para `Feito`;
- `Portaria Web > Notificacoes coerentes entre telas`: manter `Parcial`, porque o contrato unificado ainda nao fechou de ponta a ponta.

## Leitura mais fiel para devolver ao Guarita e ao App Morador

### Guarita

Mensagem recomendada:

O `Guarita` esta alinhado principalmente em:

- encomendas;
- pessoas e unidades;
- acessos e visitas;
- contingencia local;
- disciplina operacional.

Ainda precisa evoluir para ficar no mesmo patamar do `Portaria Web` em:

- alertas;
- cameras;
- mensagens/notificacoes;
- cobertura visual mais completa do ecossistema.

### App Morador

Mensagem recomendada:

O `App Morador` ja esta bem alinhado em:

- acompanhamento de encomendas;
- notificacoes do morador;
- consulta da unidade ativa;
- cameras no escopo do residente.

Mas continua naturalmente mais restrito que os produtos operacionais em:

- operacao direta;
- busca operacional;
- monitoramento amplo;
- fluxos de contingencia e auditoria.

### Portaria Web

Mensagem recomendada:

O `Portaria Web` hoje segue como referencia principal do ecossistema para:

- fluxo operacional amplo;
- alertas;
- cameras;
- encomendas completas;
- monitoramento master;
- integracao mais extensa com a `V4.3`.

## Conclusao

A matriz esta boa e faz sentido.

Eu so recomendaria estes ajustes finais:

1. marcar `OCR de etiqueta` em `Portaria Web` como `Feito`;
2. elevar `Mensagens entre ponta e operacao` em `Portaria Web` para `Feito`;
3. manter as demais classificacoes, mas esclarecer melhor a legenda de `Faltando` no `Guarita`;
4. acrescentar uma nota dizendo que a classificacao considera maturidade de produto, nao apenas existencia de endpoint.
