# Divisao definida na equipa, herdada pelos encontros

1. Fazer backup ou usar branch Neon de testes.
2. Se ainda nao foi aplicado, executar `database/team-matches.sql` (do pacote anterior).
3. Executar `database/team-division.sql` na mesma base Neon usada por `DATABASE_URL`.
4. Substituir os cinco ficheiros TS/TSX do ZIP nas respetivas pastas.
5. Em Equipas, editar cada equipa antiga sem divisao e selecionar 1.a ou 2.a divisao. Nao ha divisao assumida automaticamente a partir do nome A/B/C.
6. Em Jogos, criar encontro: a divisao surge junto do nome da equipa e e guardada automaticamente. Equipas sem divisao nao estao disponiveis. A base de dados tambem recusa uma divisao diferente, mesmo em escritas diretas.
7. Depois do primeiro encontro da equipa, mudar a divisao fica bloqueado para proteger o historico. Se a divisao tiver sido registada erradamente, rever os encontros antes de corrigir dados manualmente.
8. Correr `npm ci`, `npx tsc --noEmit`, `npm run lint` e `npm run build` antes do deploy.

Se existirem encontros anteriores com divisoes diferentes para a mesma equipa, a migracao aborta integralmente: corrigir primeiro esses dados com revisao humana. Se ja houver encontros consistentes, a migracao preenche apenas as equipas cuja divisao e inequivoca. O ficheiro `database/teams.sql` original nao e alterado: a alteracao e uma migracao incremental.

Validacao realizada: verificacao de sintaxe TypeScript dos cinco ficheiros e integridade do ZIP. Nao foi possivel executar build completo nem testar a migracao na Neon neste ambiente.
