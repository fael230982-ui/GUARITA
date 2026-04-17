# Proposta Tecnica De Busca Reversa Por Foto Ou Face

Data: `2026-04-14`

## Objetivo

Permitir que o operador consulte, a partir de uma foto, se a pessoa ja existe no cadastro.

## Valor operacional

- reduz cadastro duplicado;
- acelera atendimento em portaria;
- ajuda a descobrir se a pessoa ja possui face cadastrada;
- melhora a qualidade da base.

## O que o backend precisaria oferecer

- endpoint de busca por imagem ou face;
- retorno de candidatos com confianca;
- regra de permissao por perfil;
- trilha de auditoria;
- governanca LGPD explicita.

## Resposta esperada

- lista curta de candidatos;
- `personId`;
- nome;
- unidade;
- categoria;
- status facial;
- score de confianca.

## Regras importantes

- nao autoidentificar sem confirmacao humana;
- exigir permissao especifica;
- registrar auditoria da consulta;
- limitar uso por perfil e contexto;
- tratar imagem facial como dado de alta sensibilidade.

## Recomendacao

- implementar primeiro como busca assistida, nunca como decisao automatica;
- liberar inicialmente so para perfis operacionais autorizados;
- homologar com critério de LGPD antes de publicar em producao.
