# Solicitar ao backend apos analise da API V4.1

## Leitura objetiva da V4.1

A V4.1 nao trouxe uma mudanca grande nos endpoints principais que o app da guarita usa.

Para o nosso fluxo, ela confirma e documenta melhor alguns campos de pessoa, principalmente:

- `accessGroupIds`
- `accessGroupNames`
- `faceListId`
- `faceListItemId`
- `hasFacialCredential`

Tambem mantem:

- `GET /api/v1/people/{id}/access-summary`
- `POST /api/v1/facial/register`
- `POST /api/v1/facial/register-async`
- `GET /api/v1/units`
- `GET /api/v1/operation/search`
- `GET /api/v1/deliveries`
- `POST /api/v1/deliveries/{id}/validate-withdrawal`
- `GET /api/v1/deliveries/withdrawal-qr/{code}`

## O que o front ja consegue melhorar com a V4.1

Com a V4.1, o app ja pode aproveitar melhor:

1. estado da credencial facial da pessoa
2. grupos de acesso
3. indicacao de que a pessoa ja esta vinculada a lista facial
4. melhor contexto operacional na tela de face

Esses ajustes ja foram aplicados no front.

## O que ainda falta do backend

### Prioridade alta

1. OCR de etiqueta de encomenda

Ainda nao apareceu rota de OCR na V4.1.

Continua faltando algo como:

```text
POST /api/v1/deliveries/ocr-label
```

com retorno de:

- `rawText`
- `confidence`
- `suggestions.recipientName`
- `suggestions.recipientPersonId`
- `suggestions.recipientUnitId`
- `suggestions.unitName`
- `suggestions.deliveryCompany`
- `suggestions.trackingCode`

2. Schema tipado de `GET /api/v1/operation/search`

Na V4.1 o contrato continua assim:

- `people: object[]`
- `deliveries: object[]`
- `accessLogs: object[]`

Isso ainda esta generico demais para o front confiar oficialmente no retorno.

Precisamos do schema real dos itens.

3. Busca textual de unidades no servidor

`GET /api/v1/units` continua existindo, mas o app ainda precisa carregar e filtrar do lado do celular.

Para guarita, o ideal continua sendo algo como:

```text
GET /api/v1/units?q=101
```

ou

```text
GET /api/v1/units/search?q=101
```

4. Upload proprio para foto de encomenda

Ainda nao apareceu endpoint proprio.

Hoje o front continua usando:

```text
POST /api/v1/people/photo/upload
```

para foto de encomenda.

O ideal seria:

```text
POST /api/v1/deliveries/photo/upload
```

5. Nome amigavel da unidade na resposta de entrega

`PublicDeliveryResponse` continua sem `recipientUnitName`.

Para a operacao da guarita isso ainda faz falta.

O ideal e devolver:

```json
{
  "recipientUnitId": "uuid",
  "recipientUnitName": "Apto 101"
}
```

### Prioridade media

6. Confirmacao oficial do fluxo facial

A V4.1 mantem:

```text
POST /api/v1/facial/register
POST /api/v1/facial/register-async
```

Mas ainda falta fechar:

- qual endpoint deve ser o oficial para o app;
- se o assincrono ja sincroniza com o motor facial automaticamente;
- se ha callback ou polling recomendado;
- se existe erro especifico de qualidade de foto;
- se existe erro especifico para rosto nao detectado.

7. Consentimento no payload facial

O contrato da V4.1 ainda nao mostra:

- `consentAccepted`
- `source`

Se isso for exigencia de negocio, precisa entrar oficialmente no request.

8. Regras finais de permissao por acao

A V4.1 continua retornando `permissions`, mas ainda falta definir claramente:

- quem pode cadastrar morador;
- quem pode cadastrar visitante;
- quem pode cadastrar prestador;
- quem pode cadastrar entregador;
- quem pode cadastrar face;
- quem pode validar retirada;
- quem pode registrar chegada;
- quem pode registrar saida.

### Melhorias desejadas

9. Schema claro de `GET /api/v1/deliveries/withdrawal-qr/{code}`

O endpoint existe, mas vale documentar melhor o retorno para uso seguro no app.

10. Filtros por periodo nos endpoints operacionais

Continua muito util ter:

```text
GET /api/v1/deliveries?from=2026-04-11&to=2026-04-11
GET /api/v1/visit-forecasts?from=2026-04-11&to=2026-04-11
GET /api/v1/access-logs?from=2026-04-11&to=2026-04-11
```

## Resumo curto do que ainda esta pendente

1. OCR de etiqueta
2. Schema tipado de `operation/search`
3. Busca textual de unidades
4. Upload proprio de foto de encomenda
5. `recipientUnitName` nas entregas
6. Fluxo facial oficial fechado
7. Permissoes por acao fechadas
