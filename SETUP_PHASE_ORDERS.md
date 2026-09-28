# Equipas: ordenação nas três fases

## Aplicar

1. Extrair este ZIP na raiz do projeto, substituindo apenas os três ficheiros de `app/(management)/equipas/` e acrescentando `database/team-phase-orders.sql`.
2. Executar `database/team-phase-orders.sql` no SQL Editor da Neon, no branch/base de dados configurados em `DATABASE_URL`. O script preserva equipas e inscrições existentes, cria três ordens iniciais por equipa e instala a sincronização automática de adições/remoções. Fazer backup antes de qualquer migração em produção.
3. Reiniciar `npm run dev`. Na página Equipas, escolher época e equipa. As três listas aparecem lado a lado em ecrãs largos, empilhadas em ecrãs pequenos. Arrastar ou usar setas; clicar **Guardar ordem** em cada fase alterada.
4. Confirmar: uma alteração na 1.ª volta não muda a 2.ª nem o apuramento; adicionar e remover um jogador atualiza as três listas; utilizador comum apenas consulta; um segundo separador com ordem desatualizada não substitui a versão recente.
5. Executar `npm run lint`, `npx tsc --noEmit` e `npm run build` na tua máquina antes de fazer commit/push. Não incluir `.env.local` no Git.

## Ficheiros
- Criar: `database/team-phase-orders.sql`.
- Substituir: `app/(management)/equipas/page.tsx`, `app/(management)/equipas/teams-view.tsx`, `app/(management)/equipas/actions.ts`.

A ligação entre jogador e equipa continua a ser `team_memberships` por época; os três arrays guardam apenas a ordem dos jogadores atualmente associados. O histórico de inscrições não é apagado. O código usa drag and drop nativo e setas, sem dependências novas.

## Validação realizada neste ambiente
`npm run lint` e `npx tsc --noEmit` passaram. O build ficou bloqueado pela resposta HTTP 403 de `fonts.googleapis.com` ao tentar descarregar as fontes Geist, pelo que é necessário validar `npm run build` na máquina local antes de publicar. Não foi executada a migração na Neon nem foram feitos testes funcionais com dados reais.
