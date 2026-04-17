# Guia De Build Whitelabel Do Guarita

Data: `2026-04-13`

## Objetivo

Descrever como o `Guarita` passou a suportar branding por ambiente e como preparar builds diferentes por cliente sem fork de codigo.

## Base atual

O app agora usa:

- `src/branding/config.ts` para runtime branding;
- `src/branding/profiles.ts` para perfis de marca bundled;
- `src/theme.ts` derivado do branding;
- `app.config.js` para metadados de build;
- `branding.build-profiles.js` para defaults de build por perfil;
- `.env.example` como base generica;
- `.env.brand-rafiels.example` como exemplo da marca atual;
- `.env.brand-cliente-a.example` como exemplo de cliente alternativo.
- `eas.json.example` como exemplo de profiles de build por cliente.

## O que ja pode variar por ambiente

### Branding visivel no app

- nome do app
- nome curto
- subtitulo de login
- texto de boot
- assinatura
- labels principais
- feature flags simples
- paleta de cores

### Metadados de build

- `name`
- `slug`
- `scheme`
- `ios.bundleIdentifier`
- `android.package`
- texto de permissao da camera
- cor de splash

## Fluxo recomendado por marca

### Marca padrao

Usar:

- `.env.brand-rafiels.example`

### Nova marca

1. duplicar um arquivo exemplo;
2. ajustar:
   - `EXPO_PUBLIC_BRAND_PROFILE`
   - `EXPO_PUBLIC_BRAND_APP_NAME`
   - `EXPO_PUBLIC_BRAND_APP_SHORT_NAME`
   - `EXPO_PUBLIC_BRAND_SLUG`
   - `EXPO_PUBLIC_BRAND_SCHEME`
   - `EXPO_PUBLIC_BRAND_IOS_BUNDLE_ID`
   - `EXPO_PUBLIC_BRAND_ANDROID_PACKAGE`
   - labels
   - cores
   - feature flags
3. substituir ou organizar os assets da nova marca;
4. subir com esse conjunto de variaveis.

## Exemplo de build por perfil

O projeto agora tambem tem um exemplo em:

- `eas.json.example`

Perfis incluidos:

- `rafiels-android`
- `rafiels-ios`
- `cliente-a-android`
- `cliente-a-ios`

Objetivo:
- mostrar como separar build por cliente sem fork de codigo.

## Estrategia de operacao

### Perfil de marca

Hoje o runtime ja aceita `EXPO_PUBLIC_BRAND_PROFILE`, com perfis bundled como:

- `rafiels`
- `cliente-a`

Esse perfil define defaults de:
- logo
- assinatura
- labels
- palette
- feature flags

As variaveis de ambiente continuam podendo sobrescrever esses defaults quando necessario.

### Etapa 1. Mesmo codigo, ambientes diferentes

Modelo recomendado agora:

- um unico codigo;
- um conjunto de `.env` por marca;
- um build por cliente quando necessario.

Vantagem:
- baixo custo de manutencao;
- rapida validacao comercial;
- evita fork prematuro.

### Etapa 2. Pipeline mais formal

Quando houver necessidade real:

- perfis de build por cliente;
- icone e splash por marca;
- automacao de release por ambiente;
- possivel `eas.json` com profiles por cliente.

## Pontos que ainda faltam para fechar a distribuicao

- ligar assets de logo principal e desenvolvedor por marca, nao so por config textual;
- organizar `icon` e `splash` por cliente;
- decidir se a assinatura do desenvolvedor segue em todas as marcas;
- definir se `enabledModules` do backend entrarao como fonte oficial de feature flags;
- decidir se havera builds separados por loja ou um app unico configuravel.

## Recomendacao objetiva

Hoje, o caminho certo e:

1. manter um unico codigo;
2. configurar branding por `.env`;
3. consolidar assets por marca;
4. so depois evoluir para pipeline de multiplos builds.
