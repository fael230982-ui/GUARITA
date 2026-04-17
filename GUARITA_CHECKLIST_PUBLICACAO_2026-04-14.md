# Checklist De Publicacao Do Guarita

Data: `2026-04-14`

## App

- validar `Login` em rede local e externa.
- validar `Encomendas`:
  - recebimento;
  - OCR;
  - manual;
  - consulta;
  - entrega;
  - reenvio de notificacao.
- validar `Pessoas`:
  - busca;
  - cadastro;
  - OCR documental;
  - cadastro facial.
- validar `Acessos`:
  - previsoes;
  - busca;
  - ultimos acessos.
- validar `Alertas`.
- validar comportamento offline parcial.
- validar reconciliação apos retorno da internet.

## UX

- revisar teclado e rolagem em aparelho real.
- revisar campos obrigatorios em todas as telas.
- revisar textos, acentuacao e mensagens amigaveis.
- revisar centralizacao de numeros e legibilidade dos cards.

## Backend

- homologar estabilidade do `POST /deliveries`.
- homologar OCR de encomendas.
- homologar OCR documental de pessoas.
- homologar `renotify`.
- homologar `unit-residents`.
- homologar `clientRequestId` e `reconcile`.

## LGPD

- validar minimizacao de dados nas telas.
- validar ocultacao de codigos sensiveis.
- validar exibicao de fotos e evidencias.
- validar governanca de facial e OCR.

## Whitelabel

- validar perfil de marca.
- validar nome do app.
- validar paleta e assinatura.
- validar assets por cliente.

## Documentacao

- changelog atualizado.
- pendencias backend atualizadas.
- parecer consolidado atualizado.
- checklist compartilhada publicada na `DES-RAFIELS`.
