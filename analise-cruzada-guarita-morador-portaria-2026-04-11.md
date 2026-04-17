# Análise Cruzada

## Escopo analisado

Documentos considerados:

- [SOLUCAO_UNIFICADA_V8.md](C:\Users\Pc Rafa\Desktop\portaria\my-app\docs\SOLUCAO_UNIFICADA_V8.md)
- [alinhamento-ecossistema-guarita-portaria-morador.md](C:\Users\Pc Rafa\Desktop\portaria\my-app\docs\alinhamento-ecossistema-guarita-portaria-morador.md)
- [handoff-app-morador-2026-04-09.md](C:\Users\Pc Rafa\Desktop\portaria\my-app\docs\handoff-app-morador-2026-04-09.md)
- [app-guarita-ocr-faces-especificacao-inicial-2026-04-10.md](C:\Users\Pc Rafa\Desktop\portaria\my-app\docs\app-guarita-ocr-faces-especificacao-inicial-2026-04-10.md)
- [alinhamento-guarita-morador-portaria-2026-04-11.md](C:\Users\Pc Rafa\Desktop\portaria\my-app\docs\alinhamento-guarita-morador-portaria-2026-04-11.md)

---

## Conclusão executiva

Os três produtos estão conceitualmente bem posicionados, mas ainda existem diferenças importantes em:

- nomenclatura de status;
- contrato de encomendas;
- payload de alertas e notificações;
- modelo de câmera;
- responsabilidades por fluxo;
- expectativa sobre offline, OCR e facial.

O principal risco hoje não é visual. O principal risco é **desalinhamento de contrato e semântica** entre os três canais.

---

## O que está bom e deve ser preservado

### Guarita

Pontos fortes:

- foco operacional correto;
- OCR de encomenda bem direcionado;
- ideia certa de captura de evidência;
- cadastro facial pelo celular faz sentido;
- escopo móvel está claro e não concorre com o web.

### App Morador

Pontos fortes:

- foco em autosserviço;
- separação entre previsto e histórico;
- linguagem menos técnica;
- restrição correta de perfil;
- boa direção para notificações, encomendas e câmeras da unidade.

### Portaria Web

Pontos fortes:

- visão ampla e transversal;
- operação mais densa;
- histórico e relatórios;
- monitor externo;
- troca de turno;
- camada Master.

---

## Inconsistências encontradas

## 1. Encomendas

### Problema

Os documentos ainda misturam nomenclaturas e expectativas de campos.

Exemplos:

- `RECEIVED`
- `NOTIFIED`
- `WITHDRAWN`
- `pickupCode`
- `withdrawalCode`
- `qrCodeUrl`

Em paralelo, o produto já evoluiu para uma leitura mais humana do status, especialmente na portaria.

### Risco

- Morador vê um status diferente do que a portaria entende.
- Guarita pode cadastrar usando um campo que o App Morador não trata.
- Backend pode expor dois nomes para o mesmo conceito.

### Padrão sugerido

Manter um vocabulário único:

- `RECEIVED` = recebida na portaria
- `NOTIFIED` = morador notificado
- `READY_FOR_WITHDRAWAL` = aguardando retirada
- `WITHDRAWN` = retirada concluída

Campos únicos sugeridos:

- `withdrawalCode`
- `withdrawalQrCodeUrl`

Evitar manter `pickupCode` e `withdrawalCode` ao mesmo tempo no contrato final.

---

## 2. Segurança da retirada

### Problema

Nos documentos antigos do app morador ainda aparece a lógica de exibir código/QR sem reforçar que a portaria não deve conhecer o segredo.

### Estado correto hoje

No Portaria Web, a retirada segura já foi ajustada:

- o porteiro não deve visualizar o código;
- ele apenas valida o que o morador apresentar;
- a apresentação do QR/código deve partir do morador.

### Padrão sugerido

Isso deve ser regra única do ecossistema:

- `App Morador` apresenta;
- `Guarita` e `Portaria Web` validam;
- `backend` nunca devolve o segredo para telas operacionais.

---

## 3. Alertas e snapshot

### Problema

Todos os documentos falam de alerta, mas ainda não existe contrato final unificado para imagem do evento.

Hoje falta padronizar:

- `snapshotUrl`
- `thumbnailUrl`
- `cameraId`
- `alertId`
- `location`
- `occurredAt`

### Risco

- Morador recebe alerta sem evidência.
- Portaria vê uma imagem e o morador vê só texto.
- Guarita não sabe se deve capturar ou só consumir a imagem.

### Padrão sugerido

Para alertas de pessoa não cadastrada, perímetro, facial ou evento crítico:

```json
{
  "id": "alert-id",
  "type": "UNREGISTERED_PERSON",
  "severity": "HIGH",
  "title": "Pessoa não cadastrada detectada",
  "body": "Movimentação detectada no perímetro.",
  "cameraId": "camera-id",
  "unitId": "unit-id",
  "location": "Portão lateral",
  "snapshotUrl": "https://...",
  "thumbnailUrl": "https://...",
  "occurredAt": "2026-04-11T10:00:00Z"
}
```

---

## 4. Câmeras

### Problema

Os documentos convergem bem, mas ainda há risco de ambiguidade sobre qual URL usar.

### Padrão que precisa ficar fechado

Prioridade de mídia:

1. `liveUrl`
2. `hlsUrl`
3. `webRtcUrl`
4. `imageStreamUrl`
5. `mjpegUrl`
6. `snapshotUrl`
7. `thumbnailUrl`

### Regra

- `Portaria Web`: pode usar vídeo ao vivo, mosaico e monitor externo.
- `App Morador`: câmera apenas da própria unidade, com fallback simples.
- `Guarita`: preview leve, sem obrigação de mosaico pesado.

### Inconsistência atual

Alguns documentos antigos ainda tratam RTSP como algo quase consumível no front. Isso deve sair de vez da linguagem funcional.

RTSP é origem técnica do backend/VMS, não contrato de frontend.

---

## 5. Facial

### Problema

O Guarita já assume cadastro facial móvel, enquanto os outros documentos ainda tratam facial mais como intenção geral.

### Oportunidade

Usar o Guarita como origem principal de captura, mas manter um status único para todos os canais:

- `NOT_REGISTERED`
- `PENDING_PROCESSING`
- `READY`
- `FAILED`
- `BLOCKED`

### Regra sugerida

- `Guarita`: captura e envio
- `Portaria Web`: gestão, revisão e auditoria
- `App Morador`: consulta do próprio status facial, quando fizer sentido

---

## 6. Offline e contingência

### Problema

O documento da solução unificada fala em contingência offline para Guarita, mas isso ainda não aparece do mesmo jeito nos outros dois.

### Observação

Isso faz sentido fortemente para:

- `Guarita`
- partes da `Portaria Web`, se houver cache local

Não faz sentido investir igual no `App Morador`.

### Padrão sugerido

- Guarita: offline forte com fila
- Portaria Web: tolerância parcial com cache e recuperação
- App Morador: foco em consistência online

---

## 7. Mensagens e notificações

### Problema

Os documentos ainda tratam “mensagem”, “alerta” e “notificação” de forma próxima demais.

### Separação necessária

- `mensagem`: conversa entre pessoas/portaria
- `notificação`: evento push/inbox
- `alerta`: evento de segurança/ocorrência

### Risco

Misturar isso gera payload ruim e UI confusa.

### Padrão sugerido

Cada item deve ter tipo e origem claros:

- `MESSAGE`
- `NOTIFICATION`
- `SECURITY_ALERT`
- `DELIVERY_ALERT`
- `ACCESS_EVENT`

---

## 8. Busca operacional

### Problema

A busca aparece como importante em todos os contextos, mas o peso dela é diferente.

### Padrão sugerido

- `Portaria Web`: busca consolidada com pessoa, unidade, acesso, encomenda e alerta
- `Guarita`: busca ultrarrápida e enxuta, focada em atendimento
- `App Morador`: quase sempre navegação guiada, não busca ampla

---

## 9. Escopo de responsabilidade

### Ponto crítico

Os documentos estão bem intencionados, mas ainda há risco de “cópia de produto” se isso não for vigiado.

### Limite que deve ser mantido

#### Guarita não deve virar

- mini painel administrativo;
- monitor geral;
- cadastro estrutural profundo.

#### App Morador não deve virar

- ferramenta operacional;
- console administrativo;
- app multiunidade sem controle estrito de escopo.

#### Portaria Web não deve virar

- app balcão simplificado demais;
- duplicata completa do Guarita.

---

## Melhorias que podem ser incorporadas ao Portaria Web a partir dos outros dois

## A partir do App Morador

- linguagem ainda mais humana em alguns estados;
- separação mais clara entre histórico e ação pendente;
- foco em leitura simples de alerta e notificação;
- uso de imagem pessoal e identidade visual menos técnica.

## A partir do App Guarita

- conceito de “próxima ação” operacional;
- captura de evidência mais guiada;
- OCR como redutor de esforço manual;
- cadastro facial assistido;
- rotina móvel mais objetiva.

---

## Melhorias que o Portaria Web pode exportar para os outros dois

## Para o App Morador

- estrutura de status padronizados;
- modelo de alertas com evidência;
- lógica consistente de câmeras;
- trilha de retirada segura;
- histórico mais estruturado.

## Para o App Guarita

- regras de auditoria;
- modelo de relatórios;
- fluxo seguro de retirada;
- mesma semântica de mensagens, alertas e ocorrências;
- reaproveitamento de contratos normalizados.

---

## Padrões obrigatórios para os três

### 1. Nomes finais de status

Precisa fechar isso em uma tabela única.

### 2. Campos finais dos contratos

Precisa fechar:

- deliveries
- alerts
- notifications
- messages
- cameras
- facial status

### 3. Regras de permissão

Precisa fechar:

- o que MORADOR pode ler;
- o que OPERACIONAL pode validar;
- o que ADMIN pode gerenciar;
- o que MASTER pode configurar.

### 4. Regra única de mídia

Precisa fechar:

- vídeo ao vivo;
- snapshot;
- thumbnail;
- fallback.

### 5. Regra única de auditoria

Precisa fechar:

- quem fez;
- quando fez;
- em qual unidade;
- em qual cliente;
- com qual dispositivo;
- com qual evidência.

---

## Roadmap sugerido de convergência

### Fase 1

- padronizar status;
- padronizar payload de alertas;
- padronizar payload de entregas;
- padronizar payload de notificações.

### Fase 2

- fechar fluxo facial;
- fechar OCR e upload;
- fechar heartbeat e monitoramento;
- fechar troca de turno real no backend.

### Fase 3

- consolidar dados para BI;
- consolidar trilha analítica por cliente;
- consolidar exportações e histórico entre os três.

---

## Recomendação prática

Sim, vale compartilhar os três materiais e usar este documento como referência cruzada.

O melhor caminho agora é:

1. manter este documento como análise de divergências;
2. quando chegar a próxima API, cruzar com este material;
3. gerar um único pedido ao backend com:
   - gaps técnicos;
   - padrões finais de contrato;
   - itens necessários para BI;
   - itens necessários para os três produtos ficarem coerentes.
