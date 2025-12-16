# 🛡️ Nemesis Chat

> Sistema de Atendimento Multi-setorial Integrado ao Telegram.

O **Nemesis Chat** é uma plataforma de Helpdesk moderna projetada para centralizar atendimentos via Telegram. Com uma interface robusta e responsiva, o sistema permite que múltiplos agentes, divididos por departamentos, atendam clientes em tempo real, mantendo a organização e a segurança dos dados utilizando a infraestrutura do **Supabase**.

---

## 🚀 Funcionalidades

### 💬 Atendimento em Tempo Real
- **Chat Interativo:** Interface amigável similar a aplicativos de mensagem modernos.
- **Polling Inteligente:** Atualização automática de mensagens sem necessidade de recarregar a página.
- **Anexos:** Envio de imagens e documentos com pré-visualização antes do envio.

### 🏢 Multi-Tenancy por Departamento
- **Segregação de Setores:** Usuários do **Suporte** não veem tickets do **Financeiro**.
- **Triagem:** O setor **Geral** recebe os chamados e transfere para o departamento correto.
- **Segurança de Rotas:** Proteção via API para impedir acesso a chats de outros departamentos via URL.

### 📊 Dashboard e Métricas
- **KPIs:** Contadores de clientes, mensagens totais e ativos nas últimas 24h.
- **Gráficos:** Visualização do volume de mensagens dos últimos dias (Recharts).
- **Lista de Chats:** Ordenação por urgência e data, com indicadores de mensagens não lidas (bolinha azul).

### 🛡️ Gestão Administrativa
- **Painel Admin:** Interface exclusiva para Administradores.
- **CRUD de Usuários:** Criar, Editar, Listar e Excluir membros da equipe.
- **Controle de Acesso:** Definição de Cargos (`ADMIN` ou `AGENT`) e Departamentos.

---

## 🛠️ Tech Stack (Tecnologias)

O projeto foi desenvolvido utilizando as tecnologias mais modernas do ecossistema JavaScript/TypeScript:

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Autenticação:** [NextAuth.js](https://next-auth.js.org/)
- **Criptografia:** BcryptJS
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Integração:** Telegram Bot API

---

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js (v18+)
- Conta no Supabase (para o Banco de Dados)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
     git clone [https://github.com/seu-usuario/nemesis-chat.git]
     cd nemesis-chat
   ```
2. Instale as dependências:
  ```bash
    npm install
  ```

3. Configure as Variáveis de Ambiente: Crie um arquivo .env na raiz do projeto com as chaves do Supabase e Telegram:
  ```bash
    # Conexão com o Supabase (Transaction ou Session Pooler recommended)
    DATABASE_URL="postgresql://postgres.[ref]:[password]@[aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true)"

    # URL Direta para Migrações (Supabase Direct)
    DIRECT_URL="postgresql://postgres.[ref]:[password]@[aws-0-sa-east-1.pooler.supabase.com:5432/postgres](https://aws-0-sa-east-1.pooler.supabase.com:5432/postgres)"

    # Autenticação (Gere uma chave segura: openssl rand -base64 32)
    NEXTAUTH_SECRET="sua-chave-secreta-aqui"
    NEXTAUTH_URL="http://localhost:3000"

    # Token do Bot do Telegram (Criado via @BotFather)
    TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

  ```
4. Configure o Banco de Dados (Prisma):
  ```bash
    npx prisma generate
    npx prisma db push
  ```

5. Inicie o Servidor de Desenvolvimento:
 ```bash
    npm run dev
 ```

## 👤 Como Usar
Primeiro Acesso (Admin)
Como o sistema possui travas de segurança rigorosas, o primeiro usuário deve ser criado manipulando o banco de dados. Você pode usar o Prisma Studio para criar o primeiro Admin:

```bash
  npx prisma studio
```
 Crie um usuário na tabela User com role: ADMIN e department: GERAL.

Painel de Gestão
Acesse o menu Gestão de Equipe (ícone de engrenagem na sidebar ou card na dashboard) para cadastrar os demais atendentes e definir seus departamentos (Suporte, Financeiro, Vendas, etc.).  

## 🔮 Futuras Implementações
[ ] Alerta sonoro para novas mensagens.

[ ] Proxy de arquivos para maior segurança dos links.

[ ] Página de perfil do usuário.

[ ] Respostas rápidas (/canned-responses).






<div align="center">

Desenvolvido por NordicManX 📍 Guaratuba - PR

💀 Nemesis Team

</div>
