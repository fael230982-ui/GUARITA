# Solicitar ao backend

## Prioridade alta

1. OCR de etiqueta de encomenda

Criar endpoint para o app fotografar a etiqueta, receber sugestoes e o porteiro validar antes de salvar.

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

2. Schema real de busca operacional

Documentar os itens de `GET /api/v1/operation/search`.

Hoje o OpenAPI ainda marca `people`, `deliveries` e `accessLogs` como `object[]`, sem schema detalhado.

O app precisa que `people` retorne:

```json
{
  "id": "uuid",
  "name": "Nome",
  "document": "CPF opcional",
  "category": "RESIDENT",
  "categoryLabel": "Morador",
  "unitId": "uuid",
  "unitName": "Apto 101",
  "unitIds": ["uuid"],
  "unitNames": ["Apto 101"]
}
```

3. Busca de unidade com filtro textual

A API 3.9 ja tem:

```text
GET /api/v1/units
```

Mas seria melhor aceitar busca direta:

```text
GET /api/v1/units?q=101
```

Ou:

```text
GET /api/v1/units/search?q=101
```

Isso evita o app carregar todas as unidades e filtrar localmente.

4. Foto especifica de encomenda

Hoje o app usa:

```text
POST /api/v1/people/photo/upload
```

para gerar `photoUrl` da encomenda, porque nao ha upload especifico de encomenda.

Solicitar endpoint proprio:

```text
POST /api/v1/deliveries/photo/upload
```

Resposta:

```json
{
  "photoUrl": "https://..."
}
```

## Prioridade media

5. Confirmar regras de permissao por perfil

Precisamos confirmar o que cada perfil pode fazer no app:

- porteiro/zelador/operacional: ver todas as unidades do escopo, registrar encomenda, registrar chegada/saida, cadastrar face de visitante/prestador;
- admin: tudo acima e cadastro de morador;
- morador: nao usar este app.

6. Cadastro de pessoa pelo app da guarita

A API 3.9 tem `POST /api/v1/people`. Confirmar regra:

- admin pode cadastrar morador;
- operacional pode cadastrar visitante, prestador, entregador ou locatario;
- operacional nao pode cadastrar morador.

7. Cadastro facial com consentimento

Confirmar se `POST /api/v1/facial/register` deve receber:

```json
{
  "personId": "uuid",
  "photoUrl": "https://...",
  "consentAccepted": true,
  "source": "PORTARIA_APP"
}
```

Se sim, atualizar o contrato OpenAPI.

8. Sincronizacao facial

Confirmar se `POST /api/v1/facial/register` ja sincroniza automaticamente com os equipamentos integrados.

Se nao sincronizar, informar qual endpoint deve ser chamado depois.

## Melhorias desejadas

9. Encomenda com nome amigavel de unidade na resposta

`PublicDeliveryResponse` retorna `recipientUnitId`, mas nao retorna `recipientUnitName`.

Solicitar:

```json
{
  "recipientUnitId": "uuid",
  "recipientUnitName": "Apto 101"
}
```

10. Historico de encomendas por data

Adicionar filtros:

```text
GET /api/v1/deliveries?date=2026-04-10
GET /api/v1/deliveries?from=2026-04-10&to=2026-04-10
```

11. Visitas previstas por periodo

Adicionar filtros:

```text
GET /api/v1/visit-forecasts?from=2026-04-10&to=2026-04-10
```

Hoje o app carrega e filtra localmente.
