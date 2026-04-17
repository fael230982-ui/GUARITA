# Solicitar ao backend apos analise da API V4.0

## Contexto

A API V4.0 melhorou bastante o contrato para o app da guarita, principalmente em:

- entregas e retirada;
- QR code de retirada;
- detalhes de validacao de retirada;
- cadastro facial assincrono;
- recursos de pessoa e unidade.

Mesmo assim, ainda faltam alguns pontos importantes para o app ficar redondo na operacao de portaria.

## O que a V4.0 ja resolveu

1. Entregas com mais detalhes

O retorno de entrega agora contem campos uteis para a operacao:

- `pickupCode`
- `withdrawalCode`
- `qrCodeUrl`
- `withdrawalValidatedAt`
- `withdrawalValidatedByUserName`
- `withdrawalFailureReason`

2. Validacao de retirada documentada

O endpoint abaixo esta documentado com request e response proprios:

```text
POST /api/v1/deliveries/{id}/validate-withdrawal
```

3. Cadastro facial assincrono

Agora existe tambem:

```text
POST /api/v1/facial/register-async
```

4. Acesso a resumo de pessoa

Agora existe:

```text
GET /api/v1/people/{id}/access-summary
```

Isso pode ajudar em evolucoes futuras do app.

## O que ainda falta providenciar

### Prioridade alta

1. OCR de etiqueta de encomenda

Eu nao encontrei rota de OCR na V4.0.

Esse continua sendo o principal item pendente para o fluxo ideal de encomendas:

```text
foto da etiqueta -> OCR no backend -> sugestoes no app -> validacao do porteiro -> salvar entrega
```

Sugestao:

```text
POST /api/v1/deliveries/ocr-label
```

Payload:

```json
{
  "photoBase64": "...",
  "fileName": "etiqueta.jpg"
}
```

Resposta esperada:

```json
{
  "rawText": "texto lido",
  "confidence": 0.92,
  "suggestions": {
    "recipientName": "Nome",
    "recipientPersonId": "uuid",
    "recipientUnitId": "uuid",
    "unitName": "Apto 101",
    "deliveryCompany": "Correios",
    "trackingCode": "BR123..."
  }
}
```

2. Schema real de `GET /api/v1/operation/search`

Na V4.0 o endpoint existe, mas o OpenAPI ainda documenta a resposta assim:

- `people: object[]`
- `deliveries: object[]`
- `accessLogs: object[]`

Ou seja, ainda sem schema detalhado para uso confiavel do app.

Precisamos que o backend documente oficialmente os itens retornados.

Para `people`, o minimo esperado e algo nessa linha:

```json
{
  "id": "uuid",
  "name": "Nome",
  "document": "CPF opcional",
  "category": "RESIDENT",
  "categoryLabel": "Morador",
  "status": "ACTIVE",
  "statusLabel": "Ativo",
  "unitId": "uuid",
  "unitName": "Apto 101",
  "unitIds": ["uuid"],
  "unitNames": ["Apto 101"]
}
```

3. Busca textual de unidades

`GET /api/v1/units` existe, mas a V4.0 continua orientada a filtros tecnicos como:

- `streetId`
- `blockId`
- `quadId`
- `lotId`

Para a operacao da guarita, o ideal e busca textual direta:

```text
GET /api/v1/units?q=101
```

ou

```text
GET /api/v1/units/search?q=101
```

Isso evita carregar todas as unidades e filtrar no celular.

4. Upload proprio para foto de encomenda

Hoje o app usa:

```text
POST /api/v1/people/photo/upload
```

porque ainda nao existe upload proprio para entrega.

O ideal e criar:

```text
POST /api/v1/deliveries/photo/upload
```

Resposta:

```json
{
  "photoUrl": "https://..."
}
```

5. Nome amigavel da unidade nas entregas

`PublicDeliveryResponse` continua retornando `recipientUnitId`, mas nao vi `recipientUnitName`.

Para o app da guarita isso faz falta.

Solicitar que a resposta da entrega passe a incluir:

```json
{
  "recipientUnitId": "uuid",
  "recipientUnitName": "Apto 101"
}
```

### Prioridade media

6. Confirmacao do fluxo facial oficial

A V4.0 agora tem dois caminhos:

```text
POST /api/v1/facial/register
POST /api/v1/facial/register-async
```

Precisamos confirmar:

- qual endpoint o app deve usar;
- se o fluxo assincrono passa a ser o oficial;
- se o cadastro ja sincroniza com equipamento automaticamente;
- se ainda precisa chamar endpoint extra de sincronizacao;
- se ha validacao de qualidade da foto;
- se ha retorno especifico quando o rosto nao e detectado.

7. Consentimento no cadastro facial

Precisamos confirmar se o backend quer receber algo como:

```json
{
  "personId": "uuid",
  "photoUrl": "https://...",
  "consentAccepted": true,
  "source": "PORTARIA_APP"
}
```

Se isso fizer parte da regra, precisa entrar oficialmente no contrato.

8. Permissoes por acao

A V4.0 retorna `role` e `permissions`, mas ainda falta uma definicao objetiva para o app:

- quem pode cadastrar morador;
- quem pode cadastrar visitante;
- quem pode cadastrar prestador;
- quem pode cadastrar entregador;
- quem pode cadastrar face;
- quem pode validar retirada;
- quem pode alterar status de visita;
- quem pode alterar status de entrega.

### Melhorias desejadas

9. Endpoint de detalhes da retirada por QR

Existe:

```text
GET /api/v1/deliveries/withdrawal-qr/{code}
```

Mas vale confirmar e documentar melhor qual e o schema de retorno e se ele pode ser usado no app para:

- localizar a encomenda pelo QR;
- mostrar os dados antes da validacao final.

10. Aproveitar `GET /api/v1/people/{id}/access-summary`

Esse endpoint apareceu na V4.0 e pode ser muito util para uma proxima evolucao do app.

Vale confirmar se ele retorna, de forma estavel:

- ultimos acessos;
- status atual da pessoa;
- faces cadastradas;
- grupos de acesso;
- unidade vinculada.

11. Filtros operacionais por periodo

Se ainda nao estiver implementado no backend, segue sendo util ter filtros por data para:

```text
GET /api/v1/deliveries?from=2026-04-10&to=2026-04-10
GET /api/v1/visit-forecasts?from=2026-04-10&to=2026-04-10
GET /api/v1/access-logs?from=2026-04-10&to=2026-04-10
```

Hoje o app ainda precisa filtrar parte disso no cliente.

## Resumo direto do que ainda falta

Os principais itens pendentes para deixar a guarita realmente redonda sao:

1. OCR de etiqueta
2. Schema tipado de `operation/search`
3. Busca textual de unidades
4. Upload proprio de foto de encomenda
5. `recipientUnitName` nas entregas
6. Definicao oficial do fluxo facial
7. Regras finais de permissao por perfil e por acao

