# Alinhamento de Produto

## Escopo

Este documento serve para alinhar as três frentes da mesma solução:

- `Portaria Web`
- `App Morador`
- `App Guarita`

O objetivo é manter os três produtos no mesmo nível de maturidade, com linguagem consistente, contratos compatíveis e reaproveitamento de regras, sem perder a função própria de cada um.

---

## Visão por produto

### 1. Portaria Web

Foco principal:

- operação em tempo real;
- visão administrativa e operacional;
- monitoramento de câmeras;
- registro e validação de acessos;
- encomendas;
- mensagens;
- troca de turno;
- relatórios;
- gestão master de clientes, licença e módulos.

O Portaria Web é o centro operacional e administrativo.

### 2. App Morador

Foco principal:

- receber notificações;
- acompanhar encomendas;
- visualizar câmeras da própria unidade;
- receber alertas;
- conversar com a portaria;
- confirmar retirada ou eventos;
- consultar histórico da própria unidade.

O App Morador é a interface de relacionamento do residente com a operação.

### 3. App Guarita

Foco principal:

- operação móvel do porteiro;
- cadastro rápido em campo;
- OCR de etiqueta de encomenda;
- captura de foto e evidência;
- cadastro facial;
- apoio operacional fora da estação fixa.

O App Guarita é a extensão móvel e enxuta da operação.

---

## Responsabilidades separadas

### Portaria Web deve concentrar

- operação completa;
- monitor externo;
- gestão administrativa;
- relatórios;
- troca de turno;
- visão consolidada;
- master/licença/módulos.

### App Morador deve concentrar

- notificações;
- autosserviço da unidade;
- confirmação e acompanhamento;
- visualização limitada ao escopo do morador.

### App Guarita deve concentrar

- captura rápida;
- cadastro assistido;
- coleta de evidência;
- operação de mobilidade.

---

## Funcionalidades comuns que devem permanecer alinhadas

Estas funções existem ou devem existir com a mesma lógica de negócio nos três produtos:

### Encomendas

- status padronizados;
- regra de retirada segura;
- auditoria de recebimento e retirada;
- vínculo com unidade;
- notificações ao morador;
- histórico.

### Alertas

- tipos padronizados;
- criticidade padronizada;
- vínculo com câmera, local e unidade quando existir;
- suporte a snapshot;
- trilha de horário e operador.

### Câmeras

- priorização de `liveUrl` e `hlsUrl`;
- `imageStreamUrl`/`mjpegUrl`/`snapshotUrl` apenas como fallback;
- status online/offline coerente;
- mesmos nomes e identificadores.

### Pessoas e unidades

- mesmo `personId`;
- mesmo `unitId`;
- mesma regra de vínculo por unidade;
- mesma interpretação de morador, visitante, prestador e locatário.

### Mensagens

- status lida/não lida;
- origem da mensagem;
- histórico por unidade;
- mesma semântica entre portaria e morador.

### Turno e auditoria

- operador responsável;
- data/hora;
- cliente/condomínio;
- eventos contados do mesmo jeito;
- histórico rastreável.

---

## O que o Portaria Web já tem e pode inspirar os outros dois

### Pronto ou bem encaminhado no Portaria Web

- monitor externo com layouts `1/4/9/16`;
- seleção manual de câmera por slot;
- presets salvos;
- rotação automática;
- busca operacional;
- fluxo de retirada de encomenda dentro da operação;
- segurança para não expor código/QR ao porteiro;
- troca de turno com resumo e observações;
- relatórios com exportação `CSV` e `JSON`;
- Master com gestão de clientes, módulos, licenças e monitoramento.

### O que pode ser reaproveitado conceitualmente

- nomenclatura dos status;
- padrões visuais de criticidade;
- estrutura de relatórios;
- modelo de contagem e agregação;
- lógica de fallback de mídia em câmeras;
- regras de segurança de entrega e retirada;
- leitura de heartbeat/offline;
- linguagem operacional.

---

## O que o App Morador deve espelhar do Portaria Web

### Encomendas

- mesmos status;
- mesma interpretação de pendência;
- confirmação clara de retirada;
- notificação coerente com o que a portaria vê.

### Alertas

- título e texto compatíveis com a operação;
- se houver snapshot, o morador deve ver exatamente a evidência vinculada ao alerta;
- idealmente ter `alertId`, `cameraId`, `snapshotUrl`, `occurredAt`.

### Câmeras

- listar apenas as câmeras da unidade do morador;
- mesma ordem de prioridade de mídia do web;
- tratamento coerente para câmera offline.

### Mensagens

- histórico por unidade;
- indicador de não lida;
- possibilidade de resposta e confirmação.

---

## O que o App Guarita deve espelhar do Portaria Web

### Operação móvel

- mesmos status de acesso e encomenda;
- mesmas regras de validação;
- mesma leitura de unidade e pessoa;
- mesma trilha de auditoria.

### OCR de encomendas

- leitura da etiqueta;
- preenchimento assistido;
- confirmação manual antes de salvar;
- envio da foto do volume e da etiqueta.

### Cadastro facial

- captura guiada;
- vínculo com pessoa/unidade;
- qualidade mínima da imagem;
- retorno claro de sucesso, pendência ou erro.

### Evidência

- foto do momento;
- foto da entrega;
- foto do visitante;
- mesma lógica de armazenamento e vínculo que o web usa.

---

## Contratos e dados que precisam ser iguais nos três

### Identificadores

- `condominiumId`
- `unitId`
- `personId`
- `userId`
- `cameraId`
- `deliveryId`
- `alertId`
- `messageId`

### Campos de câmera

- `snapshotUrl`
- `thumbnailUrl`
- `imageStreamUrl`
- `hlsUrl`
- `liveUrl`
- `webRtcUrl`
- `status`
- `location`
- `unitId`

### Campos de alerta

- `id`
- `type`
- `severity`
- `title`
- `body`
- `createdAt`
- `unitId`
- `personId`
- `cameraId`
- `snapshotUrl`
- `location`

### Campos de encomenda

- `id`
- `recipientUnitId`
- `status`
- `trackingCode`
- `withdrawalCode`
- `withdrawalQrCode`
- `deliveredAt`
- `withdrawnAt`
- `recipientName`

### Campos de troca de turno

- `id`
- `operatorId`
- `operatorName`
- `startedAt`
- `endedAt`
- `durationMinutes`
- `summary`
- `notes`
- `condominiumId`
- `operationDeviceName`

---

## Sugestão de processo entre os três times/projetos

### Fluxo recomendado

1. Cada frente mantém seu documento de estado atual.
2. Cada frente compartilha:
   - funcionalidades prontas;
   - contratos usados;
   - gaps do backend;
   - componentes reutilizáveis;
   - padrões visuais e de status.
3. Uma revisão cruzada identifica:
   - o que deve ficar igual;
   - o que deve ficar diferente por função;
   - o que pode ser reaproveitado.
4. O backend recebe um pedido consolidado apenas quando a próxima API sair.

---

## Formato ideal de troca entre Portaria, Morador e Guarita

Cada solução deveria me entregar um documento com estes blocos:

### 1. O que já está pronto

- telas prontas;
- fluxos prontos;
- integrações prontas.

### 2. O que ainda depende do backend

- endpoint faltante;
- campo faltante;
- regra faltante;
- tipagem incompleta.

### 3. O que pode ser reaproveitado pelos outros

- componente;
- regra;
- contrato;
- ideia de UX;
- nomenclatura.

### 4. O que precisa ficar exclusivo

- responsabilidade única daquele app;
- função que não deve migrar para outro produto.

---

## Roadmap de convergência

### Curto prazo

- alinhar status e contratos;
- alinhar alertas, câmeras e encomendas;
- alinhar nomenclatura visual;
- fechar gaps mais urgentes do backend.

### Médio prazo

- consolidar troca de turno no backend;
- heartbeat real;
- notificações com snapshot;
- OCR no app guarita;
- camada analítica mais forte no admin.

### Longo prazo

- painel tipo Power BI;
- histórico consolidado por cliente e por período;
- métricas comparativas entre condomínios;
- trilha analítica de operação.

---

## Conclusão

Sim, vale muito a pena formalizar isso.

O melhor caminho é:

- manter um documento mestre de alinhamento;
- receber o documento do `App Morador`;
- receber o documento do `App Guarita`;
- comparar os três;
- consolidar o que pode ser reaproveitado;
- e só depois refinar o que precisa virar pedido ao backend.

Esse documento é a base inicial da frente `Portaria Web`.
