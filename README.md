# Salgados Delivery - Sistema de Controle de Entregas com Alexa

Sistema para agendar entregas de salgados com notificação verbal via Alexa Echo Dot.

## Funcionalidades

- Cadastro de entregas com data, horário e descrição
- Notificação verbal na Alexa X minutos antes da entrega
- PWA que funciona no iOS como app de tela cheia
- Funciona offline (visualização)

## Requisitos

- Node.js 18+
- Conta Amazon Developer
- Dispositivo Alexa (Echo Dot, etc.)

## Configuração

### 1. Criar Security Profile na Amazon

1. Acesse: https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html
2. Clique em "Create a New Security Profile"
3. Preencha:
   - **Security Profile Name:** Salgados Delivery
   - **Security Profile Description:** App de controle de entregas
   - **Consent Privacy Notice URL:** https://seu-app.onrender.com/privacy
4. Clique "Save"

### 2. Configurar Web Settings

1. Na lista de Security Profiles, clique na engrenagem
2. Selecione "Web Settings"
3. Anote o **Client ID** e **Client Secret**
4. Em "Allowed Origins" adicione:
   - `http://localhost:3000` (desenvolvimento)
   - `https://seu-app.onrender.com` (produção)
5. Em "Allowed Return URLs" adicione:
   - `http://localhost:3000/auth/callback` (desenvolvimento)
   - `https://seu-app.onrender.com/auth/callback` (produção)

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha:

```bash
cd backend
cp .env.example .env
```

Edite o `.env`:
```
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=xxxxxx
REDIRECT_URI=http://localhost:3000/auth/callback
```

### 4. Instalar dependências e rodar

```bash
cd backend
npm install
npm start
```

Acesse: http://localhost:3000

## Deploy no Render.com

1. Crie uma conta em https://render.com
2. Conecte seu repositório GitHub
3. Crie um novo Web Service
4. Configure as variáveis de ambiente:
   - `AMAZON_CLIENT_ID`
   - `AMAZON_CLIENT_SECRET`
   - `REDIRECT_URI` = https://seu-app.onrender.com/auth/callback
   - `FRONTEND_URL` = https://seu-app.onrender.com

5. Após deploy, atualize as URLs no Amazon Developer Console

## Uso no iOS

1. Acesse o app pelo Safari
2. Toque no botão de compartilhar
3. Selecione "Adicionar à Tela de Início"
4. O app funcionará em tela cheia como um app nativo

## Estrutura do Projeto

```
salgados-delivery/
├── backend/
│   ├── server.js          # Servidor Express
│   ├── database.js        # SQLite
│   ├── routes/
│   │   ├── auth.js        # Autenticação Amazon
│   │   └── entregas.js    # CRUD + Alexa
│   └── .env               # Variáveis de ambiente
├── frontend/
│   ├── index.html         # App principal
│   ├── manifest.json      # PWA config
│   ├── sw.js              # Service Worker
│   └── js/app.js          # Lógica do app
└── render.yaml            # Config deploy
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/auth/login` | Inicia login Amazon |
| GET | `/auth/callback` | Callback OAuth |
| GET | `/auth/status` | Verifica autenticação |
| GET | `/api/entregas` | Lista entregas |
| POST | `/api/entregas` | Cria entrega + lembrete |
| DELETE | `/api/entregas/:id` | Remove entrega |
| POST | `/api/entregas/:id/concluir` | Marca como entregue |

## Limitações

- A Alexa Reminders API requer uma Skill registrada para funcionar completamente
- O plano gratuito do Render "dorme" após 15min de inatividade
- O dispositivo Alexa deve estar online no momento do lembrete
