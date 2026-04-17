# Padrao de Repositorio dos Modulos

Este arquivo serve como guia curto para deixar os outros módulos no mesmo padrão deste repositório.

## Base minima obrigatoria

- Repositório Git inicializado.
- `origin` publicado no GitHub.
- Identidade Git configurada com nome e e-mail do responsável.
- `README.md` com visão geral, execução, backend esperado e autoria.
- `AUTHORS.md` com autoria centralizada.
- `CHANGELOG.md` com histórico de versões.
- `.gitignore` cobrindo artefatos locais, logs, segredos e arquivos gerados.
- Tag de versão inicial publicada, como `v1.0.0`.

## Padrao de documentação

- `README.md`: visão geral do módulo, como rodar, dependências principais e autoria.
- `AUTHORS.md`: autoria técnica centralizada.
- `CHANGELOG.md`: mudanças relevantes por versão.
- `CONTRIBUTING.md`: regras de branch, commit, validação e publicação.

## Padrao de Git

- Branch principal: `main`
- Tipos de commit:
  - `feat`
  - `fix`
  - `docs`
  - `refactor`
  - `test`
  - `chore`
- Tag anotada por versão publicada.

## Padrao de GitHub

- Template de `pull request` em `.github/PULL_REQUEST_TEMPLATE.md`
- Templates de issue em `.github/ISSUE_TEMPLATE/`
- Repositório remoto com histórico rastreável e autoria visível

## Checklist de implantacao do padrao

1. Configurar `git config user.name` e `git config user.email`
2. Inicializar o repositório com `git init`
3. Revisar `.gitignore`
4. Adicionar documentação base
5. Fazer commit inicial
6. Conectar com o GitHub
7. Publicar `main`
8. Criar tag `v1.0.0`
9. Criar `CHANGELOG.md`
10. Publicar novos commits menores a partir daí

## Observacao sobre licenca

A escolha de licença não deve ser padronizada no escuro. Ela depende da empresa, do cliente e do contrato. Se houver dúvida jurídica, não publique `LICENSE` sem alinhamento prévio.
