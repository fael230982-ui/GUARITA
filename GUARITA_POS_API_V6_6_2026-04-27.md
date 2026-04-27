# Guarita - Analise Pos API V6.6 - 2026-04-27

## Objetivo

Registrar o impacto da `API Sapinho V6.6` no modulo `Guarita` e manter a padronizacao com os demais modulos.

## Arquivos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.6.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.5.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_POS_API_V65_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_PENDENCIAS_BACKEND_ATIVAS_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\APP_MORADOR_POS_API_V6_5_2026-04-27.md`

## Resultado da comparacao V6.5 -> V6.6

Nao houve inclusao ou remocao de rotas.

A mudanca identificada foi a inclusao do schema:

- `PublicDeviceInterlockConfig`

Esse schema aparece dentro de `remoteAccessConfig.interlockConfig` e possui:

- `enabled`
- `blockedByDeviceIds`
- `openStateTtlSeconds`

## Impacto no Guarita

Sem alteracao funcional obrigatoria no app neste momento.

O `Guarita` nao possui hoje tela de administracao de dispositivos Control ID, configuracao de acionamentos ou intertravamento de portas. Portanto, a `V6.6` deve ser tratada como informacao de contrato para manter alinhamento, nao como integracao de tela.

Os contratos usados pelo `Guarita` continuam compativeis:

- mensagens por unidade
- WhatsApp por QR
- `auth/me` com `unitIds` e `unitNames`
- pessoas
- encomendas
- busca facial reversa
- visitas e acessos

## Impacto nos outros modulos

Para `Portaria Web` e modulos administrativos, a `V6.6` e relevante para futuras telas ou ajustes de dispositivo que precisem configurar intertravamento.

O contrato esperado para intertravamento deve seguir `remoteAccessConfig.interlockConfig`:

```json
{
  "enabled": true,
  "blockedByDeviceIds": ["id-do-dispositivo"],
  "openStateTtlSeconds": 180
}
```

## Decisao tecnica

No `Guarita`, a aplicacao feita foi documental:

- registrar a leitura da `V6.6`
- manter `README.md` e `CHANGELOG.md` alinhados
- compartilhar este relatorio na pasta comum

Nao foi adicionada chamada nova no cliente da API porque nao existe fluxo de UI no app que consuma esse recurso com seguranca.

## Proxima acao recomendada

Prosseguir com homologacao do `Guarita` nos fluxos ja implementados:

- mensagens por unidade
- QR WhatsApp
- pessoas
- busca facial reversa
- registro de entrada/saida
- encomendas
