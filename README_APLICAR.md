# Jogadores e dashboard: atualização pontual

## Substituir os três ficheiros completos
- `app/(management)/jogadores/page.tsx`
- `app/(management)/jogadores/players-list.tsx`
- `app/(management)/dashboard/page.tsx`

Sem novas dependências nem migração SQL. A consulta da página Jogadores mantém email de contacto, telemóvel e email de login exclusivamente na resposta do administrador. Ambos os perfis veem a coluna Equipa, atualmente «Por atribuir», pois o projeto ainda não dispõe de `teams` e `team_memberships` por época. Não foi introduzida ligação direta `players.team_id`.

O cartão Jogadores Ativos consulta `players.is_active = true` na Neon. Os outros cartões continuam placeholders. Esta contagem é de fichas ativas, não de jogadores inscritos numa equipa na época ativa.

## Validar
1. Reiniciar `npm run dev` e verificar `/jogadores` como admin e utilizador comum; este último não deve receber contactos no HTML/payload.
2. Criar e desativar um jogador de teste, visitar `/dashboard` e verificar que a contagem muda após atualização.
3. Executar `npm run build` e `npm run lint`. Publicar apenas se ambos passarem.
