# TV do Clube: rel=0 e autoplay sem som

Substituir apenas `app/(management)/tv/page.tsx` pelo ficheiro completo incluído neste ZIP. A versão inclui o autoplay sem som para o primeiro direto e acrescenta `rel=0` a todos os leitores de diretos, incluindo os que não iniciam automaticamente.

Não requer migração SQL, dependências ou alterações à autenticação. Não modifica a deteção dos diretos nem os agendamentos.

`rel=0` limita os vídeos relacionados apresentados pelo YouTube aos do mesmo canal; não remove as sugestões, o logótipo do YouTube nem os links do leitor.

Antes de publicar: executar `npm run lint` e `npm run build` e testar num direto quando possível.
