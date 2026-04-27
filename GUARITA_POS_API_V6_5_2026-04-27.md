# Guarita - Analise Pos API V6.5 - 2026-04-27

## Objetivo

Registrar o impacto da `API Sapinho V6.5` no modulo `Guarita` e manter a pasta compartilhada alinhada com os demais modulos.

## Arquivos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.5.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.3.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\BUILD_TESTE_IOS_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_DIAGNOSTICO_VMS_FACIAL_2026-04-24.md`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\PORTARIA_WEB_PENDENCIAS_BACKEND_ATIVAS_2026-04-24.md`

## Resultado da comparacao V6.3 -> V6.5

A `V6.5` adicionou rotas de notificacao Control ID fora de `/api/v1`:

- `GET /api/notifications/push`
- `POST /api/notifications/push`
- `POST /api/notifications/result`

Essas rotas pertencem ao grupo `control-id-online` e funcionam como callbacks/polling tecnico para integracao com dispositivos Control ID.

## Impacto no Guarita

Sem integracao funcional obrigatoria no app neste momento.

Os contratos usados pelo `Guarita` permanecem compativeis com o que ja foi implementado:

- `GET /api/v1/messages?unitId=...`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/{id}/read`
- `GET /api/v1/messages/whatsapp/connection?unitId=...`
- `POST /api/v1/messages/whatsapp/connect?unitId=...`
- `GET /api/v1/auth/me` com `unitIds` e `unitNames`
- fluxos de pessoas, encomendas, acessos e busca facial reversa

## Aplicacao feita no Guarita

Foi criado `eas.json` real com perfis:

- `development`
- `preview`
- `production`

Tambem foram adicionados scripts de build preview para facilitar homologacao fora do Expo Go, especialmente no iPhone.

## Itens de uso comum para outros modulos

- As rotas `/api/notifications/push` e `/api/notifications/result` devem ser tratadas como integracao tecnica Control ID, nao como API de notificacao para tela comum de usuario.
- O padrao de build interna iOS descrito em `BUILD_TESTE_IOS_2026-04-27.md` deve ser reaproveitado nos modulos mobile.
- Para homologacao real no iPhone, build interna via EAS tende a ser mais confiavel que `Expo Go --tunnel`.

## Proxima acao recomendada

Gerar build interna iOS quando houver login Expo e credenciais Apple disponiveis:

```bash
npm run build:ios:preview
```

Para Android interno:

```bash
npm run build:android:preview
```
