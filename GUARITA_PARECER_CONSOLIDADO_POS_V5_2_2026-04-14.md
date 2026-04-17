# Parecer Consolidado Do Guarita Pos V5.2

Data: `2026-04-14`

## Leitura executiva

O `Guarita` entrou em um ponto de boa maturidade operacional para `porteiro`, `zelador` e `admin`, com os fluxos principais ja aderentes ao ecossistema em:

- `Encomendas`
- `Pessoas`
- `Acessos`
- `Alertas`
- `offline parcial com reconciliacao`

A `API v5.2` agregou valor real ao app em dois pontos:

- OCR documental no cadastro de pessoa;
- capacidades oficiais mais ricas de `sync` e `stream`.

## O que ja esta bem consolidado

- `Encomendas` com fluxo operacional mais enxuto, OCR de etiqueta, resumo de `Na portaria` e reenvio de notificacao.
- `Pessoas` com busca operacional, cadastro mais simples, resumo de acessos e cadastro facial.
- `Acessos` como painel rapido de turno, sem poluicao excessiva.
- `Alertas` usando workflow operacional oficial.
- whitelabel com base real de branding, perfis e configuracao por ambiente.
- fila offline, cache local e reconciliacao por `clientRequestId`.
- cadastro de encomenda homologado com sucesso em uso real apos a estabilizacao do backend.

## O que a V5.2 melhorou no Guarita

- OCR documental de pessoa com sugestao de:
  - nome;
  - documento;
  - tipo do documento;
  - data de nascimento.
- suporte mais rico a `sync-capabilities`:
  - token;
  - agregados;
  - estados suportados;
  - estados finais;
  - estados reprocessaveis.
- suporte mais rico a `stream-capabilities`.

## Pendencias que ainda impactam o uso real

- o OCR de encomendas ainda nao esta consistente o bastante para ser quase automatico em todos os casos.
- o pos-OCR de `Encomendas` ainda pode subir mais a confirmacao principal para reduzir rolagem.
- ainda existe acabamento de teclado, campos obrigatorios e mensagens amigaveis para expandir em telas secundarias.

## Conclusao

O `Guarita` nao esta travado. Ele ja e utilizavel e aderente ao ecossistema em boa parte do dominio operacional.

O proximo salto relevante agora depende menos de arquitetura interna e mais de:

- calibracao fina do OCR em uso real;
- refinamento de UX com base no uso real em campo;
- publicacao disciplinada dos documentos compartilhados do ecossistema.
