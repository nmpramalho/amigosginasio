# Atualização da designação da associação

Copiar as pastas `app`, `components` e `public` para a raiz do projeto existente, substituindo apenas os ficheiros incluídos neste pacote.

O ficheiro `public/club-logo.svg` usa o logótipo oficial fornecido e atualiza o título acessível. Se já o instalaste, a substituição mantém a imagem e corrige apenas a designação.

A sidebar conserva o nome curto `Amigos do Ginásio` para caber na largura atual, com o nome completo no atributo `title`. A landing page, o header, os metadados e os textos de conteúdo usam `Associação dos Amigos do Ginásio`.

```bash
npm run dev
npm run build
git add .
git commit -m "update-association-name"
git push
```
