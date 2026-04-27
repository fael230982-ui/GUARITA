# Guarita - Analise Pos API V6.3 - 2026-04-27

## Objetivo

Registrar o impacto da `API Sapinho V6.3` no modulo `Guarita` e separar o que exige acao no app do que fica apenas como referencia para outros modulos.

## Arquivos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.3.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.1.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_DIAGNOSTICO_VMS_FACIAL_2026-04-24.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_PENDENCIAS_BACKEND_ATIVAS_2026-04-24.md`

## Resultado da comparacao V6.1 -> V6.3

A `V6.3` adicionou rotas de integracao VMS:

- `GET /api/v1/integrations/vms/servers`
- `POST /api/v1/integrations/vms/servers`
- `GET /api/v1/integrations/vms/servers/{server_id}`
- `DELETE /api/v1/integrations/vms/servers/{server_id}`
- `GET /api/v1/integrations/vms/servers/{server_id}/cameras`

Nao houve mudanca relevante nos contratos que o `Guarita` usa hoje para:

- mensagens operacionais
- WhatsApp por QR
- `auth/me`
- encomendas
- pessoas
- busca facial reversa
- acessos e visitas

## Impacto no Guarita

Sem ajuste obrigatorio de codigo neste momento.

O modulo `Mensagens` implementado no `Guarita` continua alinhado com o contrato atual:

- `GET /api/v1/messages?unitId=...`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/{id}/read`
- `GET /api/v1/messages/whatsapp/connection?unitId=...`
- `POST /api/v1/messages/whatsapp/connect?unitId=...`

O app tambem ja usa `unitIds` e `unitNames` retornados por `auth/me` para permitir escolha de unidade no fluxo de mensagens.

## Itens de uso comum para outros modulos

- A caixa global de mensagens da operacao ainda nao deve ser assumida, porque `GET /api/v1/messages` sem `unitId` continua sem contrato suficiente.
- Os endpoints VMS novos da `V6.3` sao mais relevantes para `Portaria Web` e modulos administrativos.
- O diagnostico do `Portaria Web` indica que servidor VMS e dispositivo facial Control ID foram validados, mas `POST /api/v1/cameras` ainda teve retorno `503` no fluxo testado.
- A pendencia de midia de encomendas permanece importante para frentes que exibem imagem real de encomenda.

## Proxima acao recomendada

Prosseguir com homologacao do `Guarita` no Expo Go, principalmente:

- aba `Mensagens`
- selecao de unidade do operador
- geracao de QR do WhatsApp
- envio para morador selecionado
- envio por telefone manual
- retorno da resposta do morador no historico
