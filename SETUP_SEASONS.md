# Módulo Épocas

## Ficheiros a criar
- `database/seasons.sql`
- `app/(management)/administracao/epocas/actions.ts`
- `app/(management)/administracao/epocas/page.tsx`

## Ficheiro a substituir
- `app/(management)/administracao/page.tsx`

Não alterar `.env.local`, autenticação, dependências, Prisma nem a sidebar. A rota `/administracao/epocas` está protegida para administradores; o acesso faz-se a partir da página Administração.

## Aplicar
1. Copiar as pastas `app` e `database` para a raiz do projeto existente, substituindo apenas o ficheiro indicado acima.
2. Na Neon, abrir o SQL Editor no branch e na base de dados usados por `DATABASE_URL`. Executar `database/seasons.sql` **uma vez**. O script não altera `users` nem apaga dados.
3. `npm run dev`, abrir `/administracao`, entrar em Épocas, criar `2026/2027` e ativá-la. Criar `2027/2028`, ativá-la e verificar que a anterior permanece na lista sem o estado Atual.
4. Testar `/administracao/epocas` com um utilizador comum: deve redirecionar para `/dashboard`.
5. `npm run build` e `npm run lint`. Só depois `git add -- database/seasons.sql "app/(management)/administracao/epocas" "app/(management)/administracao/page.tsx" && git commit -m "add-seasons-module" && git push`.

As épocas não são apagadas nem renomeadas para preservar futuras referências de equipas e jogadores. Não é introduzida qualquer ligação direta entre jogador e equipa.
