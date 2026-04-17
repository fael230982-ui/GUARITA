# LGPD - Auditoria Inicial Do Guarita

Data de referencia: `2026-04-12`

## Objetivo

Registrar o estado atual do `Guarita` em relacao a minimizacao de dados, exposicao em tela e pontos que ainda dependem de definicao oficial do ecossistema.

## Ajustes Aplicados No Guarita

- reducao de exposicao de `documento`, `telefone` e `e-mail` nas telas operacionais;
- ocultacao do `codigo de retirada` em telas do operador;
- foco visual em `nome`, `unidade`, `categoria` e `status operacional`;
- reducao de dados exibidos em `Encomendas`, `Pessoas` e `Acessos`;
- captura de etiqueta com fluxo guiado, sem ampliar exposicao desnecessaria de dados.

## Pontos Sensiveis Mapeados No Guarita

- biometria facial;
- foto de pessoa;
- foto de etiqueta e imagem de volume;
- documento, telefone e e-mail de pessoas;
- historico de acesso;
- codigos e QR de retirada;
- evidencias e auditoria offline.

## Direcao Adotada

- o operador deve ver apenas o necessario para agir;
- `porteiro` e `zelador` nao devem receber dado completo sem necessidade operacional clara;
- `codigo de retirada` nao deve ser exibido em claro;
- facial, OCR, imagem e evidencia devem seguir criterio mais restritivo.

## Onde Houve Reducao De Exposicao

- [src/screens/DeliveryScreen.tsx](/C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/DeliveryScreen.tsx)
- [src/screens/FaceScreen.tsx](/C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/FaceScreen.tsx)
- [src/screens/MovementScreen.tsx](/C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/MovementScreen.tsx)
- [src/screens/HistoryScreen.tsx](/C:/Users/Pc%20Rafa/Desktop/guarita/src/screens/HistoryScreen.tsx)

## Pontos De Atencao No Guarita

- rascunhos locais precisam continuar com criterio de expurgo e restauracao controlada;
- auditoria offline deve armazenar apenas o necessario para rastreabilidade;
- fotos, OCR e evidencias ainda dependem de politica oficial de retencao;
- facial ainda depende de definicao formal de consentimento e governanca compartilhada.

## Pendencias Externas

- definicao oficial de `controlador`, `operador` e `encarregado`;
- regra oficial de `mascaramento` por perfil;
- politica oficial de `retencao`, descarte e anonimização;
- persistencia oficial de aceite e ciencia no `backend`;
- diretriz oficial para `biometria facial`, `OCR`, `fotos` e `evidencias`.

## Regra Recomendada

- tela operacional deve priorizar `nome`, `unidade`, `tipo` e `status`;
- dado completo deve aparecer apenas quando indispensavel para a tarefa;
- historico e consulta devem evitar virar vitrine de dado pessoal.
