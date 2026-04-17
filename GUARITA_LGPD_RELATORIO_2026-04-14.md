# Relatorio LGPD Do Guarita

Data: `2026-04-14`

## Principio adotado

O `Guarita` segue a regra de `minimizacao de dados`: mostrar ao operador apenas o que e necessario para executar a tarefa.

## O que ja foi reduzido

- menos exposicao de:
  - documento;
  - telefone;
  - e-mail;
  - codigo de retirada;
  - detalhes excessivos de operador;
  - detalhes excessivos de historico.
- `Encomendas` prioriza:
  - unidade;
  - destinatario;
  - status operacional.
- `Pessoas` prioriza:
  - nome;
  - unidade;
  - categoria;
  - status facial;
  - status operacional.
- `Acessos` prioriza:
  - nome;
  - unidade;
  - entrou ou saiu;
  - horario;
  - categoria.

## Pontos sensiveis no app

- foto de etiqueta;
- foto de volume;
- foto de pessoa;
- foto facial;
- OCR de documento;
- dados salvos localmente em rascunho;
- fila offline com operacoes pendentes.

## Controles ja presentes

- rascunhos presos ao operador.
- cache e fila local com escopo operacional.
- reducao de exibicao de dados sensiveis na interface.
- ocultacao de codigo de retirada para o porteiro.
- trilha de auditoria local minima em operacoes offline.

## Riscos residuais

- dados em cache local ainda exigem politica clara de expiracao e descarte.
- OCR documental e facial precisam continuar sob governanca forte.
- busca reversa por foto/face, se implementada, exigira regra explicita de permissao e base legal.

## Recomendacoes

- manter a regra de minimo necessario em todas as telas novas.
- continuar evitando expor documento completo e contatos sem necessidade.
- formalizar no backend a politica de retencao e descarte para dados sincronizados e caches.
- tratar facial e OCR sempre como dominio de maior sensibilidade.
