# Ligação OAuth do canal YouTube (aplicação existente)

## Ficheiros
Substituir: `lib/club-tv.ts`, `app/(management)/tv/page.tsx`, `app/(management)/tv/scheduled-broadcasts.tsx`, `app/(management)/administracao/page.tsx`, `app/privacidade/page.tsx`.
Criar: `lib/youtube-channel.ts`, `app/api/youtube/connect/route.ts`, `app/api/youtube/callback/route.ts`, `app/(management)/administracao/youtube/page.tsx`, `app/(management)/administracao/youtube/actions.ts`, `database/youtube-channel-oauth.sql`.

## Antes do teste local
1. Executar `database/youtube-channel-oauth.sql` no branch Neon usado por DATABASE_URL. Fazer backup primeiro.
2. No `.env.local` (ignorado pelo Git), adicionar as variáveis seguintes com os valores do cliente OAuth do projeto Google AmigosGinasioYouTube:
   YOUTUBE_OAUTH_CLIENT_ID="..."
   YOUTUBE_OAUTH_CLIENT_SECRET="..."
   YOUTUBE_OAUTH_REDIRECT_URI="http://localhost:3000/api/youtube/callback"
   YOUTUBE_TOKEN_ENCRYPTION_KEY="..."
3. Gerar a chave local com PowerShell: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guardar o valor de forma segura; não alterar a chave depois de ligar o canal sem voltar a autorizá-lo.
4. A conta que autoriza o canal deve estar em Test users do projeto Google AmigosGinasioYouTube enquanto este estiver em Testing. A conta da aplicação que clica em Ligar deve ser admin, mas não precisa de ser o mesmo email do gestor do canal.
5. Confirmar que `http://localhost:3000/api/youtube/callback` está nos redirect URIs do cliente OAuth do YouTube.
6. Executar `npm run dev`, abrir `/administracao/youtube` como admin e clicar Ligar canal. Selecionar a conta e o canal @BilharGCS. A aplicação só aceita o ID do canal que corresponda ao handle e ao canal efetivamente autorizado. Depois usar Verificar agora em `/tv`.
7. Testar uma transmissão agendada não listada e, se possível, um direto. Não publicar antes de `npx tsc --noEmit`, `npm run lint`, `npm run build` e de confirmar que a TV continua privada e o login normal funciona.

## Produção
Na Vercel Production adicionar as quatro variáveis acima, com redirect `https://amigosginasio.bilhar3tabelas.com/api/youtube/callback`. A chave de cifragem DEVE ser exatamente a mesma se a base Neon é partilhada entre local e produção. Se o canal for ligado localmente e o cliente OAuth de produção for diferente, será necessário voltar a ligar em produção; o refresh token pertence ao cliente que o emitiu. O cliente OAuth criado neste projeto deve ser o mesmo para os dois redirect URIs. Publicar código e verificar deployment Ready; autorizar de novo em produção se necessário.

## Limites
- OAuth do canal é separado do login Google da aplicação; não mexe em auth.ts.
- Se não existir ligação OAuth, mantém-se a pesquisa pública atual com YOUTUBE_API_KEY.
- Com ligação OAuth, a consulta mine=true devolve eventos do canal autorizado, incluindo não listados; eventos privados não são apresentados.
- A verificação continua no primeiro acesso após uma hora e com botão manual sujeito ao limite existente de 5 minutos.
- Em External + Testing, os refresh tokens para youtube.readonly podem expirar após sete dias; a página de Administração permite voltar a ligar.
- O link de um vídeo não listado continua a poder ser partilhado e aberto diretamente no YouTube.
- A política de privacidade incluída descreve a ligação OAuth de leitura ao canal; confirmar com o responsável pelo tratamento antes da publicação.
