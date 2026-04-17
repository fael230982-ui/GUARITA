# Proposta Tecnica: Captura Automatica Guiada

## Objetivo

Criar um componente reutilizavel de captura guiada para reduzir erro operacional em fotos usadas por `Guarita`, `Portaria Web` e, quando fizer sentido, `App Morador`.

O foco inicial e melhorar fluxos em que a qualidade da imagem interfere diretamente no cadastro, na leitura OCR e na seguranca operacional.

## Onde Reutilizar

- `Guarita > Encomendas`: fotografia de etiqueta para OCR.
- `Guarita > Pessoas`: fotografia de documento ou imagem de apoio em cadastro.
- `Portaria Web`: captura por webcam ou camera conectada em fluxos de cadastro e validacao.
- outros fluxos futuros que dependam de imagem padronizada.

## Ganhos Esperados

- menos fotos cortadas ou tremidas;
- menos falhas de OCR;
- menos erro de cadastro por imagem ruim;
- menos dependencia de treinamento manual do operador;
- operacao mais rapida para porteiro e apoio.

## O Que Ja Existe Hoje

No `Guarita`, ja existe captura guiada manual para etiqueta com:

- moldura visual;
- orientacao em tempo real;
- revisao da foto;
- confirmacao antes do OCR.

Isso ja melhora a operacao, mas ainda depende do operador tocar no botao no momento certo.

## O Que E Captura Automatica

Captura automatica nao e apenas abrir a camera e tirar foto sozinha. Para funcionar bem, o app precisa decidir se a imagem esta pronta para ser capturada.

Na pratica, isso exige pelo menos parte destas validacoes:

- enquadramento correto;
- borda/documento identificado;
- estabilidade por alguns frames;
- nitidez minima;
- tamanho suficiente da area util;
- opcionalmente OCR preliminar com confianca minima.

## O Que Nao Depende Do Backend

A decisao de disparar a foto automaticamente e responsabilidade do app, nao do backend.

Isso significa que a captura automatica depende principalmente de:

- biblioteca mobile com suporte a `document auto capture`;
- ou implementacao propria de visao computacional no app.

## O Que Ainda Pode Depender Do Backend

Depois da foto capturada, o backend continua importante para:

- OCR definitivo;
- extracao estruturada de campos;
- padronizacao de resposta entre os modulos;
- auditoria e armazenamento quando aplicavel.

## Recomendacao Tecnica

Implementar em 3 etapas.

### Etapa 1: Componente Guiado Reutilizavel

Padronizar um componente unico de captura com:

- moldura;
- cantos destacados;
- orientacao curta;
- revisao;
- confirmacao.

Status:
- `Guarita` ja iniciou essa etapa no fluxo de etiqueta.

### Etapa 2: Validacao De Qualidade

Adicionar heuristicas antes da captura automatica:

- detectar area principal;
- verificar estabilidade;
- verificar nitidez;
- bloquear captura ruim.

### Etapa 3: Captura Automatica

Liberar o disparo automatico apenas quando a qualidade estiver confiavel.

## Risco De Fazer Antes Da Hora

Se a captura automatica for ligada sem validacao forte, o efeito pode ser pior que a captura manual:

- foto disparada cedo demais;
- documento/etiqueta cortado;
- OCR pior;
- retrabalho para o operador;
- perda de confianca no recurso.

## Posicao Do Guarita

O `Guarita` considera essa iniciativa valida e estrategica para o ecossistema, desde que seja tratada como capacidade reutilizavel da plataforma e nao como ajuste isolado de uma tela.

## Encaminhamento Sugerido

1. Registrar esta frente como iniciativa compartilhada do ecossistema.
2. Avaliar biblioteca/SDK com suporte a `auto capture` para mobile.
3. Definir se o `Portaria Web` tambem precisa de versao equivalente para webcam.
4. Criar um padrao visual unico de captura guiada com assinatura `Rafiels`.
5. So liberar captura automatica em producao depois de validacao real em operacao.
