# Jogadores V2: aplicação ao projeto existente

## Substituir
- `app/(management)/jogadores/page.tsx`
- `next.config.ts`
- `database/players.sql` apenas como ficheiro local (executar no Neon; não elimina registos V1).

## Criar
- `app/(management)/jogadores/actions.ts`
- `app/(management)/jogadores/players-list.tsx`
- `app/api/players/[id]/photo/route.ts`

Não substituas `auth.ts`, `users`, `seasons`, `.env.local` ou os outros módulos. Este pacote substitui o ZIP Jogadores V1 anterior, não se soma a ele. Se V1 já criou a tabela, o SQL adiciona as colunas em falta.

## Pré-requisitos
1. Na Vercel do projeto, criar em Storage um **Blob store privado**, ligar o store ao projeto nos ambientes Production e Development. Para trabalhar localmente, obter o `BLOB_READ_WRITE_TOKEN` do store e colocá-lo em `.env.local`, nunca no Git. Não publicar a chave nem fotografias no repositório.
2. Na raiz do projeto, executar `npm install @vercel/blob@^2.3.0`. Este comando atualiza `package.json` e `package-lock.json`.
3. Copiar os ficheiros deste ZIP para os caminhos indicados. Reiniciar `npm run dev` após alterar `next.config.ts`.
4. Executar `database/players.sql` no SQL Editor da Neon no mesmo branch/base usados por `DATABASE_URL`. Se a tabela V1 existir, os dados permanecem.
5. Em `localhost:3000/jogadores`, como admin: criar com/sem fotografia, filtrar, editar, associar e desassociar login, testar número duplicado, eliminar um jogador de teste. Como utilizador comum: verificar leitura sem botões de alteração.
6. Executar `npm run build` e `npm run lint`. Confirmar `git status --short` e `git diff --cached --name-status` antes de `git commit -m "create-players-module"` e `git push`. Não usar `git add .` se existirem ficheiros locais fora do módulo.

## Regras
- Login opcional um-para-um: `players.user_id` referencia `users.id` com índice único. Email de contacto e email Google são independentes.
- Sem ligação direta jogador/equipa; futuras tabelas `team_memberships` e resultados devem criar chaves estrangeiras para `players.id` com `ON DELETE RESTRICT` ou `NO ACTION` para impedir a eliminação de jogadores com histórico.
- Atualmente, enquanto ainda não existem tabelas de inscrições/resultados, a eliminação só encontra relações já efetivamente declaradas na base de dados. Não promete bloquear relações futuras se essas tabelas forem criadas sem FK.
- Fotografias privadas JPG/PNG/WebP até 2 MB, servidas apenas a utilizadores autenticados e ativos; restantes dados de contacto estão disponíveis aos utilizadores autorizados. Confirma a política de privacidade do clube antes de registar dados reais.
