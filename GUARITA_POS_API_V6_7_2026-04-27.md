# Guarita - Validacao Pos API v6.7 - 2026-04-27

## Objetivo

Registrar o impacto da `API Sapinho V6.7` no app `Guarita` e manter alinhamento com a pasta compartilhada do ecossistema.

## Documentos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.7.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_POS_API_V66_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_PENDENCIAS_BACKEND_ATIVAS_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\GUARITA_POS_API_V6_6_2026-04-27.md`

## Recurso novo confirmado

A comunicacao recebida do backend confirma o ajuste do fluxo de Motor Facial:

1. O admin seleciona um servidor Motor Facial.
2. O admin escolhe uma camera ja cadastrada no backend/VMS.
3. O front chama o provisionamento da camera no Motor Facial.
4. O backend reaproveita o stream se ele ja existir.
5. Se nao existir, o backend cria o stream.
6. O backend cria ou vincula automaticamente o analitico facial.
7. O backend cria ou vincula automaticamente a lista facial necessaria.
8. O backend salva os vinculos no cadastro da camera.

Endpoint confirmado no contrato:

```text
POST /api/v1/integrations/face/servers/{server_id}/cameras/{camera_id}/provision
```

Caracteristicas relevantes:

- autenticado por bearer token
- `server_id` e `camera_id` sao UUIDs
- pode ser chamado mais de uma vez sem duplicar stream ou analitico
- pode responder erros padronizados `400`, `401`, `403`, `404` e `502`

Campos retornados/salvos na camera:

```text
eventIntegrationType = FACE_ENGINE
faceEngineServerId
engineStreamId
engineStreamUuid
faceAnalyticsId
faceEngineServerName
```

## Impacto no Guarita

Nao ha alteracao funcional obrigatoria no app `Guarita` nesta rodada.

Motivo:

- o fluxo de provisionamento e administrativo
- depende de selecao de servidor Motor Facial
- depende de selecao/cadastro de camera backend/VMS
- a responsabilidade natural e do modulo administrativo ou `Portaria Web`
- o `Guarita` atua na operacao movel, nao na configuracao tecnica de camera/servidor

Portanto, nao foi adicionada chamada direta ao endpoint de provisionamento no app movel.

## Como o Guarita pode usar isso no futuro

O recurso passa a ser util para o `Guarita` quando o backend entregar eventos ou cameras ja provisionadas com os vinculos faciais.

Uso futuro recomendado:

- exibir indicacao de camera com Motor Facial ativo quando `eventIntegrationType=FACE_ENGINE`
- tratar `faceEngineServerId`, `engineStreamId`, `engineStreamUuid` e `faceAnalyticsId` como metadados de leitura
- usar eventos importados do Motor Facial no fluxo operacional, caso venham pelo stream/eventos canonicos
- manter o app sem acoes administrativas de provisionamento, salvo se houver decisao explicita de produto

## Padrao para os outros modulos

Para `Portaria Web` ou modulo administrativo, o padrao recomendado e:

```text
1. listar/selecionar servidor Motor Facial
2. listar/selecionar camera backend/VMS
3. chamar POST /api/v1/integrations/face/servers/{server_id}/cameras/{camera_id}/provision
4. recarregar a camera
5. confirmar os campos eventIntegrationType, faceEngineServerId, engineStreamId, engineStreamUuid e faceAnalyticsId
```

O front deve tratar a chamada como idempotente e permitir nova tentativa sem criar duplicidade.

## Decisao aplicada no Guarita

- codigo do app nao alterado
- contrato registrado para referencia futura
- documentacao do projeto atualizada
- analise compartilhada com os demais modulos pela pasta `DES-RAFIELS`

## Resumo objetivo

A `API V6.7` corrige e consolida o fluxo de Motor Facial, mas o impacto pratico fica no front administrativo/Portaria Web.

No `Guarita`, a acao correta nesta rodada e manter compatibilidade documental e aguardar eventos/cameras ja provisionadas pelo backend, sem criar tela administrativa de Motor Facial no app movel.
