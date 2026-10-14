# Autoplay sem som - TV do Clube

Substituir apenas `app/(management)/tv/page.tsx` pelo ficheiro completo incluído neste ZIP.

O primeiro direto detetado é carregado imediatamente e tenta iniciar sem som (`autoplay=1&mute=1`). Os restantes diretos continuam visíveis, mas aguardam interação do utilizador para reproduzir. As transmissões agendadas não são alteradas. O utilizador pode ativar o som no leitor do YouTube.

Sem SQL, novas dependências ou alterações à autenticação e à pesquisa de transmissões. A reprodução automática depende das políticas do browser e do leitor YouTube e não é garantida em todos os dispositivos. Esta alteração não faz a aplicação descobrir transmissões não listadas: o canal tem de estar corretamente ligado por OAuth para essas transmissões aparecerem.

Validar `npm run lint` e `npm run build`. Testar durante um direto com a página /tv aberta, com uma conta autorizada, incluindo um teste com vários diretos quando possível. Não publicar antes de validar o build local.
