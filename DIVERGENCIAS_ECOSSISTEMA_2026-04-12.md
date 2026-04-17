# Divergencias Ecossistema 2026-04-12

Documento do `Guarita` apos leitura da pasta compartilhada `DES-RAFIELS`.

## Divergencias reais encontradas

### 1. Permissions Matrix

- `Guarita` ja passou a consumir `GET /api/v1/auth/permissions-matrix` com cache local e fallback por papel.
- `App Morador` registrou recomendacao de nao migrar para `permissions-matrix` ainda sem confirmar como o backend quer o consumo em producao.
- `Portaria Web` tambem pede exemplos reais do backend para homologacao cruzada.
- Nos documentos compartilhados ainda aparecem permissoes em estilos mistos como `people.view`, `alerts.view` e `deliveries:create`.

Leitura:
- ha alinhamento de que a rota existe;
- ainda nao ha alinhamento de governanca sobre quando ela vira fonte primaria oficial;
- ainda falta um formato canonico unico de permissao por acao.

### 2. Identificador canonico de visita

- documentos do ecossistema ainda citam `visitId` ou `visitForecastId`.
- `Guarita` ja esta operando localmente com `visitForecastId` como canonico preferencial.

Leitura:
- ainda existe ambiguidade contratual nos documentos compartilhados;
- backend precisa fechar um unico nome oficial por conceito.

### 3. Encomendas: padrao vigente x alvo

- documentos do ecossistema continuam tratando `READY_FOR_WITHDRAWAL` e `withdrawalQrCodeUrl` como alvo, nao como vigente oficial.
- `App Morador` confirma essa leitura.
- `Portaria Web` tambem pede confirmacao se `READY_FOR_WITHDRAWAL` vira oficial ou apenas alias de transicao.

Leitura:
- os tres fronts parecem alinhados na cautela;
- a divergencia agora e com o backend ainda nao oficializar o estado final.

### 4. FaceStatus

- `App Morador` e `Portaria Web` apontam `faceStatus` como grande novidade contratual da `V4.4`.
- docs do ecossistema ainda pedem confirmacao de onde `faceStatus` sera publicado de forma estavel.
- `Guarita` ja suporta os estados canonicos, mas ainda convive com legados como `hasFacialCredential`.

Leitura:
- ha alinhamento de direcao;
- ainda falta o backend fechar as rotas e campos de coexistencia/substituicao.

### 5. Alertas e cameras

- docs do ecossistema pedem contrato oficial de `alertType`, `alertSeverity`, `alertStatus`, `cameraId` e `snapshotUrl`.
- `Guarita` e `Portaria Web` ja usam preparacao defensiva local.

Leitura:
- os fronts avancaram antes do contrato final;
- o risco agora e cada modulo consolidar fallback diferente se o backend nao fechar logo o shape oficial.

### 6. Eventos em tempo real

- materiais compartilhados ainda misturam `type` com `eventType` e `timestamp` com `occurredAt`.
- `Portaria Web` tambem pede definicao oficial de `POST /api/v1/events/stream/confirm`.
- `Guarita` ja aceita os dois formatos por compatibilidade.

Leitura:
- ha compatibilidade temporaria no front;
- ainda nao existe contrato unico suficientemente fechado para o ecossistema tratar stream como base canonica.

### 7. Referencias de caminho legado na documentacao compartilhada

- o relatorio de divergencias do `App Morador` ainda cita caminhos antigos em subpastas de `DES-RAFIELS`, apesar de o padrao atual ser publicar os arquivos dos modulos na raiz com prefixo.

Leitura:
- a governanca de nomes e local de publicacao melhorou;
- ainda falta atualizar todos os documentos para refletir o padrao atual sem referencia obsoleta.

## Recomendacao

1. Backend declarar em documento unico o que ja e contrato vigente e o que ainda e alvo.
2. Ecossistema corrigir a ambiguidade `visitId` x `visitForecastId`.
3. Ecossistema declarar explicitamente o status da `permissions-matrix`:
   - experimental
   - fallback
   - fonte primaria
4. Backend fechar publicacao de `faceStatus`, `alertas` e `cameras` com exemplos reais.
5. Ecossistema limpar referencias antigas de arquivo e pasta na documentacao compartilhada.
