# Equipas e inscrições por época

## Criar
- `database/teams.sql`
- `app/(management)/equipas/actions.ts`
- `app/(management)/equipas/teams-view.tsx`

## Substituir
- `app/(management)/equipas/page.tsx`
- `app/(management)/jogadores/page.tsx`
- `app/(management)/dashboard/page.tsx`

Não substituir `players-list.tsx`, `auth.ts`, `users`, `seasons` ou os ficheiros de fotografias. Não instalar dependências. A lista de Jogadores V2 deve ter a propriedade opcional `team_name` e apresentar a coluna Equipa; confirma antes de copiar.

## Aplicação
1. Copiar apenas os seis ficheiros do pacote para os caminhos indicados. No Neon SQL Editor, executar `database/teams.sql` na mesma base de dados/branch de `DATABASE_URL`. Não executar `DROP` nem recriar `players`/`seasons`.
2. Reiniciar `npm run dev`; como administrador, em `/equipas`, selecionar 2026/2027, criar Equipa A, inscrever um jogador ativo e verificar que a coluna Equipa em `/jogadores` mostra Equipa A se 2026/2027 for a época ativa.
3. Terminar inscrição; confirmar histórico na Equipa A. Inscrever o mesmo jogador na Equipa B na mesma época. Selecionar 2027/2028, criar uma equipa e inscrever o jogador nela. Alternar época ativa em Administração e verificar que `/jogadores` mostra apenas a equipa da época ativa.
4. Tentar inscrever o mesmo jogador simultaneamente em duas equipas da mesma época; deve ser recusado. Tentar eliminar equipa com histórico ou jogador inscrito; deve ser recusado. Com conta comum, confirmar consulta sem formulários de edição e sem emails/telemóveis no payload de Jogadores.
5. Validar `npm run build` e `npm run lint` antes de publicar. Rever `git status --short` e preparar apenas os ficheiros deste pacote. Commit sugerido: `create-teams-and-memberships-module`.

O contador Equipas no dashboard refere-se à época ativa; Jogadores Ativos continua a contar todas as fichas ativas. Inscrições terminadas não são eliminadas. `team_memberships` possui FK para `players` e `teams` com `ON DELETE RESTRICT`; assim não se elimina histórico.
