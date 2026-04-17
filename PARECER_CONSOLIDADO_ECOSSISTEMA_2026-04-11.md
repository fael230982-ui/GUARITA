# Parecer Consolidado Do Ecossistema

Data de referencia: `2026-04-11`

Base considerada:

- `MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`
- `devolutiva-matriz-alinhamento-ecossistema-2026-04-11.md`
- `DEVOLUTIVA_MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`

## Parecer Geral

A matriz do `Guarita` faz sentido como visao executiva do ecossistema.

Ela esta correta ao apontar que:

- `Portaria Web` segue como referencia operacional mais ampla;
- `Guarita` esta forte no eixo operacional movel e de contingencia;
- `App Morador` atua como camada de relacionamento e autosservico;
- o principal risco atual continua sendo desalinhamento de contrato e semantica entre os tres canais.

As duas devolutivas recebidas confirmaram a direcao da matriz.

O ajuste necessario nao era mudar a arquitetura do raciocinio, e sim deixar a matriz mais precisa em dois pontos:

- diferenciar melhor `fluxo implementado` de `contrato backend fechado`;
- corrigir itens que estavam subavaliados em `Portaria Web` e `App Morador`.

Esses ajustes ja foram incorporados na versao revisada da matriz principal.

## Consensos Entre Os Tres Lados

Hoje existe consenso de que:

- `Tempo real e eventos` deve continuar como `Parcial` nos tres;
- `Permissoes por app/acao` deve continuar como `Parcial` nos tres;
- `Linguagem e rotulos operacionais` deve continuar como `Parcial` nos tres;
- `Portaria Web` e a referencia principal em `alertas`, `cameras` e operacao ampla;
- `Guarita` e a referencia mais forte em contingencia e operacao movel;
- `App Morador` e naturalmente mais restrito em operacao direta, busca ampla e auditoria;
- o backend ainda precisa fechar contratos oficiais unificados para status, permissoes, facial, alertas, mensagens, notificacoes e streaming.

## Ajustes Consolidados Na Matriz

### 1. Portaria Web foi reposicionado onde estava subavaliado

Os retornos indicaram corretamente que o `Portaria Web` ja estava mais maduro do que a leitura inicial mostrava em:

- `OCR de etiqueta`, agora tratado como `Feito`;
- `Mensagens entre ponta e operacao`, agora tratado como `Feito`.

Em `Notificacoes coerentes entre telas`, a leitura mais segura continua sendo `Parcial`, porque o contrato unificado ainda nao esta fechado de ponta a ponta.

### 2. App Morador deixou de ser lido como camada apenas embrionaria

O `App Morador` ja nao esta apenas em intencao nos dominios de:

- `alertas`;
- `cameras`;
- `mensagens`;
- `notificacoes`;
- `faces/foto`.

Nesses pontos, a classificacao `Parcial` foi mantida, mas a leitura consolidada agora deixa claro que:

- o fluxo ja existe em interface e consumo;
- o gap principal agora e contrato final, padronizacao de semantica e fechamento de backend.

### 3. A legenda ficou mais precisa

O maior problema da primeira versao era que `Feito`, `Parcial` e `Faltando` acabavam misturando:

- tela pronta;
- integracao parcial;
- contrato oficial;
- consolidacao final de produto.

Por isso, a matriz revisada passou a explicitar esta regra:

- `Feito`: fluxo consolidado no produto;
- `Parcial`: fluxo existe, mas ainda depende de contrato, backend ou refinamento;
- `Faltando`: ainda nao consolidado no produto, mesmo que existam ideias, preparacao tecnica ou caminho previsto.

Isso evita duas leituras erradas:

- achar que algo inexiste quando na verdade ja existe no front;
- achar que algo esta totalmente fechado quando o contrato ainda nao esta estavel.

## Leitura Consolidada Por Produto

### Guarita

O `Guarita` esta bem alinhado principalmente em:

- encomendas;
- pessoas e unidades;
- acessos e visitas;
- disciplina operacional;
- contingencia local.

Ainda precisa evoluir para ficar no mesmo patamar do `Portaria Web` em:

- alertas;
- cameras;
- mensagens e notificacoes;
- cobertura visual mais ampla do ecossistema.

### App Morador

O `App Morador` esta bem alinhado em:

- acompanhamento de encomendas;
- notificacoes do residente;
- consulta da unidade ativa;
- cameras no escopo da unidade;
- mensagens com a portaria;
- fluxo de foto e biometria facial no recorte do residente.

Mas continua naturalmente mais restrito que os produtos operacionais em:

- operacao direta;
- busca operacional ampla;
- monitoramento geral;
- contingencia forte;
- auditoria operacional.

### Portaria Web

O `Portaria Web` segue como referencia principal do ecossistema em:

- operacao ampla;
- alertas;
- cameras;
- encomendas completas;
- monitoramento master;
- integracao mais extensa com a `V4.3`.

Tambem deve ser reconhecido na matriz como mais maduro em:

- OCR de etiqueta;
- mensagens operacionais.

## Ajustes Objetivos Consolidados

Os ajustes consolidados aplicados na matriz sao estes:

1. `Portaria Web > OCR de etiqueta`: mudou de `Parcial` para `Feito`.
2. `Portaria Web > Mensagens entre ponta e operacao`: mudou de `Parcial` para `Feito`.
3. `Portaria Web > Notificacoes coerentes entre telas`: permaneceu como `Parcial`.
4. `App Morador`: varios itens permaneceram como `Parcial`, mas o texto agora deixa claro que o fluxo ja existe em tela e o gap e de contrato final.
5. `Guarita`: `Faltando` foi mantido em `alertas`, `cameras` e parte de `mensagens/notificacoes`, com a ressalva de que isso significa `nao consolidado no produto`, e nao `inexistente no ecossistema`.
6. A matriz passou a registrar explicitamente que a classificacao considera maturidade de produto, nao apenas existencia de endpoint.

## Padroes Que Precisam Ser Fechados Agora

Os tres lados convergem que o proximo passo correto e fechar tabelas unicas para:

- status de encomenda;
- status facial;
- tipos e status de alerta;
- contratos de camera e prioridade de midia;
- permissoes por app e por acao;
- eventos, mensagens e notificacoes;
- tipagem final de stream e tempo real.

## Conclusao Final

A matriz do `Guarita` esta boa como base e faz sentido.

O que faltava nao era refazer a leitura do ecossistema do zero.

O proximo passo correto e:

- transformar o alinhamento atual em contrato oficial de backend e semantica unica entre `Guarita`, `Portaria Web` e `App Morador`;
- fechar tabelas oficiais de status, permissoes, alertas, facial, cameras e eventos;
- sair da convergencia documental para padrao oficial compartilhado do ecossistema.

Em resumo:

- a direcao geral esta correta;
- a matriz pode ser mantida;
- a revisao ja absorveu os principais ajustes trazidos pelas devolutivas;
- o foco agora deve ser contrato oficial e padronizacao compartilhada.
