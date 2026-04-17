# Contribuindo

Este repositório segue um padrão simples para manter histórico limpo, rastreabilidade e consistência com os demais módulos.

## Fluxo recomendado

1. Atualize a branch principal antes de começar.
2. Crie uma branch curta por tarefa.
3. Faça commits pequenos e objetivos.
4. Rode a validação local antes de publicar.
5. Abra `pull request` com contexto suficiente para revisão.

## Convenções de branch

- `feat/nome-curto-da-feature`
- `fix/nome-curto-do-ajuste`
- `docs/nome-curto-da-documentacao`
- `chore/nome-curto-da-tarefa`

## Convenções de commit

Use mensagens curtas no formato:

```text
tipo: resumo objetivo
```

Exemplos:

- `feat: add reverse face search workflow`
- `fix: normalize uploaded photo url`
- `docs: add changelog for v1.0.0`

Tipos recomendados:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

## Validação mínima

Antes de publicar:

```bash
npm run typecheck
```

Se houver teste automatizado no módulo, rode também os testes aplicáveis antes do `push`.

## Versionamento

- Use tags anotadas para versões publicadas.
- Registre mudanças relevantes em `CHANGELOG.md`.
- Atualize o `README.md` quando houver mudança de uso, setup ou escopo.

## Autoria e documentação

- Mantenha `README.md`, `AUTHORS.md` e `CHANGELOG.md` atualizados.
- Não espalhe autoria em todos os arquivos de código.
- A autoria técnica deve ficar centralizada na documentação e no histórico Git.
