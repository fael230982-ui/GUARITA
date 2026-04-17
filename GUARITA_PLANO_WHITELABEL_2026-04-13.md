# Plano Whitelabel Do Guarita

Data: `2026-04-13`

## Objetivo

Avaliar o que o `Guarita` ja tem de base para `whitelabel`, o que ainda falta obrigatoriamente e a ordem correta para transformar o app em um produto reutilizavel por marca, cliente ou operacao sem baguncar o ecossistema.

## Diagnostico atual

O `Guarita` ainda nao esta pronto para ser considerado `whitelabel-ready` no sentido de distribuicao multi-cliente completa, mas a base tecnica ja avancou bem.

### O que ja ajuda

- `backend` configuravel por ambiente via `EXPO_PUBLIC_API_URL`.
- identidade visual razoavelmente centralizada em [src/theme.ts](C:/Users/Pc%20Rafa/Desktop/guarita/src/theme.ts:1).
- fluxos principais ja bem separados por dominio:
  - `Encomendas`
  - `Pessoas`
  - `Acessos`
- app mais operacional e menos preso a dashboard generico.
- contrato e documentacao do ecossistema ja estao mais organizados do que no inicio.

### O que ainda impede chamar de whitelabel completo

- assets ainda nao estao organizados por marca de forma final;
- icone e splash por cliente ainda nao foram fechados;
- labels e flags ja existem, mas ainda nao cobrem 100% das telas;
- nao existe pipeline formal de build por cliente;
- o backend ainda nao arbitrou se `enabledModules` e configuracoes publicas serao fonte oficial de feature flags;
- partes da documentacao e do comportamento ainda assumem um ecossistema unico e nao multiplos tenants com identidade propria.

## O que precisa existir para virar whitelabel

### 1. Configuracao central de marca

Criar uma camada unica, por exemplo:

- `src/branding/config.ts`

Com algo nesta linha:

- `appName`
- `shortName`
- `companyName`
- `signaturePrefix`
- `signatureName`
- `primaryColor`
- `primaryDark`
- `accentColor`
- `backgroundColor`
- `surfaceColor`
- `logoLight`
- `logoDark`
- `loginLogo`
- `supportEmail`
- `showDeveloperSignature`

Objetivo:
- trocar nome, assinatura, logo e cores sem sair caçando string espalhada no app.

### 2. Tema parametrizado

Hoje as cores saem de [src/theme.ts](C:/Users/Pc%20Rafa/Desktop/guarita/src/theme.ts:1).

O certo para whitelabel e:
- o `theme` ser derivado da marca;
- componentes lerem sempre do tema;
- evitar cor hardcoded fora do tema.

Objetivo:
- trocar visual por cliente sem editar dezenas de telas.

### 3. Textos e nomenclaturas parametrizaveis

Hoje ainda existem labels fixos como:
- `Guarita`
- `Encomendas`
- `Pessoas`
- `Acessos`

Isso pode ate continuar como padrao, mas o app precisa suportar:
- nomes alternativos por operacao;
- textos institucionais diferentes;
- assinatura e rodape configuraveis;
- mensagens padrao por cliente.

Objetivo:
- evitar que toda troca de cliente vire alteracao manual de copy no codigo.

### 4. Modulos e recursos configuraveis

Nem todo cliente vai querer exatamente o mesmo produto.

O app precisa suportar, por configuracao:
- habilitar ou ocultar `Acessos`;
- habilitar ou ocultar `Pessoas`;
- habilitar ou ocultar `OCR`;
- habilitar ou ocultar `face`;
- habilitar ou ocultar `renotify`;
- habilitar ou ocultar assinatura do rodape;
- habilitar modulos por papel, cliente ou tenant.

Objetivo:
- ter um produto base com variacao por implantacao sem fork de codigo desnecessario.

### 5. Assets por marca

Hoje os logos principais estao fixos em `assets`.

Para whitelabel, o ideal e:
- pasta por `brand`;
- mapa de assets por marca;
- fallback padrao;
- nao referenciar `logo-v8.png` e `Logo-Rafiels.png` diretamente na UI.

Objetivo:
- trocar logo e splash sem edicao espalhada.

### 6. Estrategia de build

E preciso decidir cedo entre dois modelos:

#### Opcao A. Um app com configuracao por ambiente

- mesmo codigo;
- muda config por `.env` ou arquivo de brand;
- mais simples para operar;
- menos forte para lojas diferentes.

#### Opcao B. Builds separadas por marca

- um profile por cliente;
- nome, bundle id, icone e splash proprios;
- melhor para distribuicao mais formal;
- exige pipeline mais organizada.

Minha recomendacao:
- comecar pela `Opcao A` para estabilizar a camada de branding;
- depois evoluir para `Opcao B` se a operacao comercial realmente pedir.

## Ordem certa de implementacao

### Fase 1. Fundacao

1. criar `branding config` central.
2. mover nome do app, assinatura e logos para essa camada.
3. derivar `theme` a partir dessa configuracao.
4. remover textos de marca hardcoded das telas principais.

Impacto:
- baixo risco;
- alto ganho estrutural.

### Fase 2. Parametrizacao funcional

1. criar `feature flags` por modulo.
2. permitir ligar/desligar `OCR`, `face`, `Acessos`, `Pessoas`, `renotify`.
3. centralizar labels principais do app.

Impacto:
- medio;
- necessario para produto realmente reutilizavel.

### Fase 3. Distribuicao

1. definir perfis de build por marca.
2. separar icone, splash, nome e bundle id por cliente.
3. amarrar isso ao processo de release.

Impacto:
- medio/alto;
- mais importante quando a camada de branding ja estiver madura.

## O que eu avaliaria como prioridade alta

### Alta

- configuracao central de marca
- assinatura e logos fora da UI fixa
- tema derivado de branding
- textos de marca parametrizados

### Media

- feature flags
- assets por marca
- nomes alternativos por cliente

### Baixa por agora

- pipeline de multiplos builds
- internacionalizacao completa
- customizacao profunda por tenant remoto

## Pontos concretos no codigo atual

Os primeiros lugares para atacar sao:

- [src/theme.ts](C:/Users/Pc%20Rafa/Desktop/guarita/src/theme.ts:1)
- [App.tsx](C:/Users/Pc%20Rafa/Desktop/guarita/App.tsx:258)
- [App.tsx](C:/Users/Pc%20Rafa/Desktop/guarita/App.tsx:437)
- [src/screens/LoginScreen.tsx](C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/LoginScreen.tsx:88)
- [src/screens/LoginScreen.tsx](C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/LoginScreen.tsx:129)

Esses pontos concentram:
- nome do app;
- logo;
- assinatura;
- cor principal;
- identidade visivel da marca.

## Recomendacao objetiva

Sim, vale preparar o `Guarita` para `whitelabel`.

Mas a forma correta nao e sair trocando logo e cor manualmente. O caminho certo e:

1. criar uma camada de branding;
2. tirar marca fixa do codigo;
3. parametrizar tema e assinatura;
4. depois parametrizar modulos;
5. so entao pensar em build por cliente.

## Proximo passo sugerido

Se a decisao for avancar, o proximo bloco tecnico ideal e:

1. criar a estrutura de `branding config`;
2. migrar `theme`, nome do app e assinatura para ela;
3. deixar o `Guarita` pronto para trocar marca sem refatorar tela por tela.

## Status atual

Ja executado nesta fase inicial:

- `branding config` criado em `src/branding/config.ts`;
- perfis bundled de marca em `src/branding/profiles.ts`;
- `theme` derivado do branding em `src/theme.ts`;
- `App` e `Login` ligados ao branding para nome, assinatura, logo e paleta base;
- labels principais e flags simples de recurso centralizadas;
- `app.config.js` criado para parametrizar `name`, `slug`, `scheme`, `bundleIdentifier`, `package` e permissao de camera por ambiente;
- `.env.example` ampliado com variaveis de branding e feature flags;
- pasta `assets/brands/` preparada para organizacao futura por marca.
