# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue o padrão de "Keep a Changelog" e o versionamento adotado no repositório.

## [v1.0.0] - 2026-04-17

### Adicionado

- Estrutura inicial versionada do aplicativo `Guarita` com publicação no GitHub.
- Fluxos operacionais para login, movimento, encomendas, pessoas e histórico.
- Integração com OCR documental e captura de foto para fluxos operacionais.
- Busca facial reversa integrada à linha da `API V5.3`.
- Registro manual de entrada e saída alinhado ao padrão operacional do módulo `Portaria`.
- Fila offline e cache local para reduzir impacto de perda de conexão em operações críticas.
- Documentação central de autoria em `README.md` e `AUTHORS.md`.

### Alterado

- Apresentação do repositório no `README.md` para publicação inicial.
- Regras do `.gitignore` para ignorar artefatos locais e arquivos temporários do ambiente Expo.

## [unreleased]

### Adicionado

- Módulo de mensagens por unidade no app `Guarita`.
- Conexão de WhatsApp por QR com polling de status da instância.
- Envio operacional de mensagens com `origin=WHATSAPP`.

### Alterado

- Documentação do `README.md` alinhada à `API V6.1`.
- Módulo de mensagens ajustado para operar com `unitIds` e `unitNames` retornados por `auth/me`.
- Revisão de impacto da `API V6.3` registrada para manter alinhamento com a pasta compartilhada.
- Revisão de impacto da `API V6.5` registrada.
- Configuração `eas.json` adicionada para build interno de homologação.
