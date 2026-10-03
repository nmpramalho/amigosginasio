import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Informação sobre o tratamento de dados pessoais na plataforma da Associação dos Amigos do Ginásio.",
};

const heading = "mt-9 text-lg font-semibold text-[var(--club-green-800)]";
const paragraph = "mt-3 text-sm leading-7 text-[var(--foreground)]";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <header className="border-b border-[var(--border)] pb-7">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--club-green-700)]">
            <Image src="/club-logo.svg" alt="Logótipo da Associação dos Amigos do Ginásio" width={44} height={44} className="h-11 w-11 object-contain" />
            Associação dos Amigos do Ginásio
          </Link>
          <h1 className="mt-7 text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Plataforma de gestão de Bilhar 3 Tabelas · Atualizada em 03/10/2026</p>
        </header>
        <section>
          <h2 className={heading}>1. Responsável e contacto</h2>
          <p className={paragraph}>A Associação dos Amigos do Ginásio é responsável pelo tratamento dos dados pessoais utilizados na sua plataforma de gestão desportiva. Para questões sobre privacidade ou exercício dos seus direitos, contacte <a className="font-medium text-[var(--club-green-700)] underline" href="mailto:nramalho@gmail.com">nramalho@gmail.com</a>, endereço indicado como contacto de suporte da aplicação.</p>
          <h2 className={heading}>2. Dados tratados</h2>
          <p className={paragraph}>Para o acesso com Google, a aplicação recebe o endereço de email, o nome e a confirmação de que o email da conta Google foi verificado. Estes dados são usados para verificar se a conta foi previamente autorizada e para identificar o utilizador na aplicação. A aplicação não recebe nem guarda a palavra-passe da conta Google.</p>
          <p className={paragraph}>Na gestão desportiva podem ser registados o nome do jogador, número de afiliado da Federação Portuguesa de Bilhar, email de contacto, telemóvel, fotografia, associação opcional a uma conta autorizada, equipa e época, convocatórias, resultados e estatísticas. O email de contacto do jogador pode ser diferente do email usado para iniciar sessão.</p>
          <p className={paragraph}>São ainda registadas tentativas de acesso de contas não autorizadas, com o email apresentado, o motivo e a data da tentativa. O serviço de alojamento pode tratar dados técnicos necessários ao funcionamento e segurança do website, de acordo com as suas próprias condições.</p>
          <h2 className={heading}>3. Finalidades e fundamento</h2>
          <p className={paragraph}>Os dados são utilizados para gerir contas e permissões, manter a segurança do acesso, organizar épocas, equipas e encontros, apresentar resultados e estatísticas e disponibilizar a TV do Clube aos utilizadores autorizados. O tratamento necessário à gestão desportiva e à segurança da plataforma assenta, conforme o caso concreto, na relação com a associação e nos seus interesses legítimos de organização e proteção do serviço, sem prejuízo dos direitos dos titulares. Quando uma finalidade específica exigir outro fundamento, este será comunicado antes do respetivo tratamento.</p>
          <h2 className={heading}>4. Quem pode consultar os dados</h2>
          <p className={paragraph}>A plataforma está reservada a contas previamente autorizadas. Os administradores podem gerir os registos e consultar os dados de contacto dos jogadores. Os restantes utilizadores autorizados podem consultar os dados desportivos disponibilizados pela aplicação, mas não têm acesso aos campos de email de contacto e telemóvel dos jogadores na lista. A página de apresentação e esta política são públicas; não apresentam dados dos jogadores ou dos utilizadores.</p>
          <h2 className={heading}>5. Serviços externos</h2>
          <p className={paragraph}>O início de sessão utiliza serviços da Google. A aplicação é disponibilizada na Vercel, utiliza a Neon para armazenamento dos dados e pode utilizar a Vercel Blob para fotografias dos jogadores. A TV do Clube incorpora transmissões do YouTube; ao reproduzir um vídeo, o navegador estabelece ligação aos serviços do YouTube, sujeitos às respetivas práticas de privacidade. O acesso à página da TV exige autenticação na aplicação, mas isso não torna privados os vídeos publicados no YouTube.</p>
          <p className={paragraph}>A utilização destes prestadores pode envolver tratamento de dados fora do Espaço Económico Europeu. As localizações de tratamento e os mecanismos de transferência aplicáveis devem ser confirmados junto dos prestadores e mantidos sob revisão pela associação.</p>
          <h2 className={heading}>6. Conservação e segurança</h2>
          <p className={paragraph}>Os dados de acesso são conservados enquanto a conta estiver autorizada e pelo período necessário para gerir o respetivo histórico e segurança. Os dados desportivos podem ser conservados para preservar o histórico das épocas, equipas e resultados. As tentativas de acesso são mantidas pelo período necessário à análise de segurança. Os prazos concretos e as regras de eliminação devem ser definidos e revistos pela associação de acordo com as obrigações aplicáveis. O acesso aos dados é limitado por autenticação e perfis de autorização.</p>
          <h2 className={heading}>7. Direitos dos titulares</h2>
          <p className={paragraph}>Pode solicitar acesso, retificação, apagamento, limitação ou oposição ao tratamento dos seus dados e, quando aplicável, portabilidade. Para exercer estes direitos, utilize o contacto indicado acima. Os pedidos são analisados de acordo com a legislação aplicável e com a necessidade de preservar registos legítimos, como o histórico desportivo. Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados.</p>
          <h2 className={heading}>8. Alterações</h2>
          <p className={paragraph}>Esta política será atualizada quando mudarem as funcionalidades, os prestadores ou as formas de tratamento dos dados. A data da última atualização é indicada no início desta página.</p>
        </section>
        <footer className="mt-10 border-t border-[var(--border)] pt-6 text-sm">
          <Link href="/" className="font-medium text-[var(--club-green-700)] underline underline-offset-4">Voltar à página inicial</Link>
        </footer>
      </article>
    </main>
  );
}
