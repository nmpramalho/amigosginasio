# Integração de encontros por equipas

Projeto completo baseado no ZIP fornecido, com os ficheiros de `/jogos` e `database/team-matches.sql` acrescentados.

1. Confirmar que `database/seasons.sql`, `database/players.sql`, `database/teams.sql` e `database/team-phase-orders.sql` já foram aplicados à base de dados usada por `DATABASE_URL`.
2. Executar `database/team-matches.sql` na mesma base de dados. Não apaga dados existentes.
3. Instalar dependências (`npm ci`) e validar (`npx tsc --noEmit`, `npm run build`) antes de fazer deploy.
4. Testar: criar encontro, reagendar, convocar 4 jogadores ordenados pela fase, registar 4 partidas e concluir.

A edição é reservada ao administrador; outros utilizadores autenticados podem consultar. A convocatória fica fixa depois de gravada; os resultados podem ser corrigidos enquanto o encontro está aberto, com auditoria por partida. O formulário não impõe regras federativas de pontuação não confirmadas: os limites técnicos são 0-999 carambolas e 1-999 entradas. A integração com o portal federativo continua adiada.

**Validação neste ambiente:** a sintaxe TypeScript dos ficheiros novos foi verificada, mas `npm ci --offline` foi terminado pelo ambiente (exit 137), pelo que não foi possível executar build ou testes end-to-end. A migração SQL também não foi executada contra a tua base de dados. Não colocar em produção sem estes passos.
