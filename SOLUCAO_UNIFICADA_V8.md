# Solucao Unificada V8

## Objetivo

Este documento organiza a visao unificada da solucao formada por:

- `Guarita`
- `App-Morador`
- `Portaria`

A ideia e manter os tres produtos no mesmo patamar de qualidade, integracao e linguagem operacional, respeitando o papel de cada um.

Este arquivo tambem serve como base para comparacao futura entre os tres segmentos, reaproveitamento de fluxos e alinhamento com backend, operacao e experiencia do usuario.

---

## Visao Geral Da Solucao

A plataforma atende tres camadas diferentes da operacao condominial:

1. **Guarita**
   Uso operacional de porteiro, zelador, operador e administrador em rotinas de entrada, visitas, encomendas e cadastro facial.

2. **App-Morador**
   Uso do morador para acompanhar entregas, autorizar acessos, consultar movimentacoes e interagir com a operacao do condominio sem expor ferramentas administrativas.

3. **Portaria**
   Camada operacional e administrativa mais ampla, podendo concentrar fluxos de controle, monitoramento, historico, configuracao e integracao com acesso.

Os tres devem parecer partes da mesma solucao, mas com interface, prioridades e permissoes diferentes conforme o publico.

---

## Papel De Cada Produto

### 1. Guarita

**Foco principal**

- operacao rapida no balcão;
- baixa friccao;
- decisao imediata;
- contingencia offline;
- leitura visual objetiva.

**Responsabilidades**

- login operacional;
- acompanhar movimento do dia;
- registrar chegada e saida;
- buscar pessoa/unidade;
- cadastrar encomenda;
- validar retirada;
- cadastrar pessoa operacional;
- cadastrar face;
- consultar historico.

**Nao deve virar**

- app de configuracao profunda do condominio;
- painel pesado de administracao;
- central de cadastro completo de estrutura.

---

### 2. App-Morador

**Foco principal**

- experiencia simples e limpa;
- autosservico do morador;
- transparencia;
- autorizacao e acompanhamento.

**Responsabilidades esperadas**

- acompanhar encomendas;
- receber notificacoes;
- autorizar ou acompanhar visitas;
- consultar historico pessoal;
- interagir com a unidade;
- acompanhar liberacoes e status.

**Nao deve virar**

- ferramenta de operacao de portaria;
- app para gerenciamento de todos os moradores/unidades;
- interface de administracao ampla.

---

### 3. Portaria

**Foco principal**

- supervisao e operacao ampliada;
- acompanhamento transversal;
- visao consolidada;
- controle administrativo e operacional.

**Responsabilidades esperadas**

- visao ampliada da operacao;
- historico consolidado;
- monitoramento de acesso;
- configuracoes operacionais;
- administracao de pessoas, unidades e fluxos;
- integracoes com controle de acesso.

**Nao deve virar**

- copia do app de balcão da guarita;
- app focado em autosservico do morador.

---

## Principios Comuns Aos 3

Os tres produtos devem compartilhar estes principios:

1. **Mesma verdade de negocio**
   - status de visita;
   - status de entrega;
   - status de pessoa;
   - status de credencial facial;
   - regras de permissao.

2. **Mesma linguagem**
   - evitar termos tecnicos desnecessarios;
   - usar rotulos operacionais humanos;
   - manter coerencia de nomes e estados.

3. **Mesma identidade de produto**
   - mesma familia visual;
   - mesma marca principal;
   - mesma forma de tratar sucesso, alerta, erro e pendencia.

4. **Mesmo contrato de integracao**
   - backend padronizado;
   - schemas consistentes;
   - retorno rico o suficiente para todos os canais.

5. **Mesma governanca de permissao**
   - o backend define escopo;
   - o front respeita o contrato;
   - cada app exibe apenas o que faz sentido para o perfil.

---

## Funcionalidades Compartilhadas

Estas capacidades tendem a existir em mais de um segmento:

- autenticacao;
- sessao persistida;
- busca de pessoa;
- busca de unidade;
- visualizacao de encomenda;
- visualizacao de visita;
- status de acesso;
- exibicao de grupos de acesso;
- exibicao de status facial;
- historico;
- notificacoes;
- leitura de QR code;
- contingencia offline em contextos operacionais.

Essas capacidades devem ser alinhadas entre si, mesmo quando a interface mudar.

---

## Funcionalidades Exclusivas Por Segmento

### Exclusivas da Guarita

- registrar chegada;
- registrar saida;
- receber encomenda fisica;
- validar retirada no ato;
- cadastrar face na operacao;
- cadastro rapido de visitante/prestador/entregador.

### Exclusivas do App-Morador

- visao apenas da propria unidade/escopo;
- notificacao pessoal;
- consulta pessoal;
- autorizacao de visitas e entregas quando aplicavel.

### Exclusivas do Portaria

- monitoramento amplo;
- administracao de configuracao;
- gestao transversal;
- auditoria consolidada;
- tela mais analitica e administrativa.

---

## O Que Deve Ser Padrao Entre Os 3

### 1. Status

Padronizar textos de:

- visita prevista;
- chegou;
- dentro agora;
- saiu;
- negado;
- encomenda recebida;
- pronta para retirada;
- retirada concluida;
- pendente de sincronizacao;
- falha de sincronizacao;
- cadastro ativo/inativo/bloqueado/pendente;
- face cadastrada/sem face/em integracao.

### 2. Regras De Prioridade

Padronizar o que significa:

- urgente;
- atencao;
- acompanhamento;
- concluido;
- pendente.

### 3. Elementos Visuais

Padronizar:

- cards de resumo;
- badges de status;
- avisos operacionais;
- empty states;
- mensagens de erro;
- mensagens de sincronizacao.

### 4. Componentes Reaproveitaveis

Sempre que possivel, manter coerencia em:

- campo de texto;
- botao;
- card de pessoa;
- card de unidade;
- card de entrega;
- card de visita;
- modal de QR;
- bloco de checklist;
- bloco de “proxima acao”.

---

## O Que Pode Ser Reaproveitado Da Guarita Nos Outros

Hoje, a Guarita ja possui varios pontos que podem servir de referencia para os outros dois segmentos:

- fluxo de rascunho local por operador;
- fila offline com sincronizacao;
- resumo de “proxima acao”;
- checklists de operacao;
- leitura de prioridade do turno;
- tratamento de cache x sistema;
- visualizacao de face e grupos de acesso;
- retirada por codigo, QR e confirmacao manual;
- fluxo de busca mais humano;
- diferenca clara entre dado local e dado do sistema.

---

## O Que Pode Vir Dos Outros Para A Guarita

Quando o material do `App-Morador` e do `Portaria` for compartilhado, analisar principalmente:

- componentes visuais melhores;
- padroes de notificacao;
- padroes de navegacao;
- estrutura de permissoes mais refinada;
- telas analiticas do Portaria que possam gerar versoes resumidas para a Guarita;
- fluxos de autosservico do Morador que possam melhorar a clareza da comunicacao na Guarita.

---

## Regras De Integracao Com Backend

Os tres segmentos dependem de um backend consistente.

### Contratos que precisam ser unificados

1. `operation/search`
2. `people`
3. `units`
4. `deliveries`
5. `visit-forecasts`
6. `access-logs`
7. `facial/register`
8. `facial/register-async`
9. retirada de encomenda
10. notificacoes e status

### Ponto critico atual

Ainda faltam, de forma importante:

- OCR de etiqueta;
- schema tipado de `operation/search`;
- busca textual de unidades;
- `recipientUnitName` em entregas;
- upload proprio de foto de encomenda;
- fechamento oficial do fluxo facial;
- matriz final de permissao por acao.

---

## Matriz Inicial De Permissoes

Esta matriz deve ser refinada quando os outros dois segmentos forem analisados.

### Guarita

- porteiro/zelador/operacional:
  - visualizar movimento amplo;
  - registrar chegada/saida;
  - receber encomenda;
  - validar retirada;
  - cadastrar visitante/prestador/entregador/locatario;
  - cadastrar face quando permitido;
- admin/master:
  - tudo acima;
  - cadastrar morador;
  - acesso administrativo ampliado.

### App-Morador

- morador:
  - apenas seu escopo;
  - sem visao operacional ampla;
  - sem cadastro administrativo.

### Portaria

- admin/operacao central:
  - visao transversal;
  - configuracoes;
  - auditoria;
  - gestao ampliada.

---

## Padrao De Linguagem

Todos os segmentos devem evitar:

- UUID visivel;
- nomes tecnicos desnecessarios;
- textos internos do backend;
- excesso de jargao.

Todos os segmentos devem preferir:

- “Pessoa”
- “Unidade”
- “Pronta para retirada”
- “Aguardando sistema”
- “Falha ao enviar”
- “Conferencia recomendada”
- “Proxima acao”
- “Checklist rapido”

---

## Diretrizes De UX Unificada

### Guarita

- foco em velocidade e decisao imediata;
- muitos atalhos;
- cards objetivos;
- minimo de friccao;
- suporte forte a offline.

### App-Morador

- foco em simplicidade;
- menos densidade;
- mais orientacao;
- mais notificacao do que acao operacional.

### Portaria

- foco em visao ampla;
- filtros mais fortes;
- historico mais rico;
- capacidade analitica maior.

---

## O Que Nao Deve Ser Misturado

1. O app do morador nao deve herdar linguagem de operador.
2. A guarita nao deve virar painel administrativo pesado.
3. O portaria nao deve copiar UX de autosservico.
4. Regras de permissao nao devem ser “inventadas” por app.
5. O backend deve manter o escopo correto por token.

---

## Como Usar Este Documento

1. Compartilhar este arquivo com os responsaveis pelos outros dois segmentos.
2. Receber de volta:
   - resumo funcional do `App-Morador`
   - resumo funcional do `Portaria`
   - telas, fluxos ou documentos tecnicos relevantes
3. Comparar:
   - o que pode ser padrao;
   - o que deve ser exclusivo;
   - o que precisa convergir no backend;
   - o que pode ser reaproveitado visualmente e funcionalmente.
4. Atualizar este documento como matriz principal da solucao.

---

## Proximos Passos

### Passo 1

Compartilhar este documento com os outros dois segmentos.

### Passo 2

Trazer de volta:

- lista de telas;
- responsabilidades;
- fluxos principais;
- integrações;
- componentes reutilizaveis;
- problemas atuais.

### Passo 3

Fazer um comparativo entre os tres e gerar:

- padroes comuns;
- pendencias de alinhamento;
- backlog unificado;
- recomendacoes por produto.

---

## Estado Atual Da Guarita

Hoje, a Guarita ja esta forte em:

- operacao de movimento;
- encomendas;
- retirada;
- busca de pessoa/unidade;
- cadastro de pessoa;
- cadastro facial;
- fila offline;
- rascunhos;
- leitura operacional;
- resumo de acesso da pessoa;
- tratamento de cache x sistema;
- sessao persistida;
- diferenciacao por perfil.

Ela pode servir como base forte para varios padroes compartilhados.

---

## Observacao Final

Este documento e propositalmente amplo.  
Ele nao substitui os documentos tecnicos individuais de cada app.  
Ele funciona como **camada de alinhamento da solucao**.

Quando os materiais dos outros dois segmentos chegarem, este arquivo deve ser revisado e enriquecido com:

- comparativo entre os tres;
- pontos convergentes;
- pontos divergentes;
- plano de unificacao.

---

## Atualizacao De 2026-04-11

Foi feita uma primeira leitura cruzada dos materiais complementares de `App Morador` e `Portaria Web`.

Resultado:

- nao apareceu conflito estrutural grave entre os tres;
- a separacao de papeis continua correta;
- os principais pontos de convergencia sao:
  - status;
  - permissao;
  - contratos;
  - linguagem;
  - auditoria;
  - cameras/alertas/notificacoes como padrao compartilhado do ecossistema.

Documento complementar gerado:

- `ANALISE_CRUZADA_MODULOS_2026-04-11.md`

Conclusao desta rodada:

- a `Guarita` esta forte em operacao movel, offline, rascunho e fluxo assistido;
- o `Portaria Web` esta servindo como referencia melhor para troca de turno, auditoria e operacao ampliada;
- o `App Morador` reforca melhor linguagem humana, alertas, cameras e notificacoes.
