# CellMart - Loja Online de Smartphones

## Descrição
CellMart é uma plataforma de e-commerce especializada em smartphones, oferecendo uma experiência de compra intuitiva para usuários e ferramentas de gerenciamento para administradores.

## Desenvolvedor
- **Nome:** B3niwH
- **Email:** beniw@alu.ufc.br

## Tecnologias Utilizadas

### Frontend
- **HTML5**: Utilizado para estruturar o conteúdo da aplicação web.
- **CSS3**: Empregado para estilização e design responsivo da interface.
- **JavaScript (ES6+)**: Implementado para a lógica do cliente e interatividade da aplicação.
- **Bootstrap 5**: Framework CSS usado para design responsivo e componentes pré-estilizados, como visto nos modais e na estrutura geral da página.
- **Fetch API**: Utilizada para realizar requisições HTTP assíncronas ao backend, como visto nas funções de carregamento de produtos e histórico de pedidos.

### Backend (Node.js)
- **Express.js**: Framework web para Node.js, utilizado para criar a API RESTful.
  ```javascript
  const express = require('express');
  const app = express();
  ```
- **MongoDB**: Banco de dados NoSQL usado para armazenamento de dados.
  ```javascript
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI, {...});
  ```
- **Mongoose**: ODM para MongoDB, facilitando a interação com o banco de dados.
  ```javascript
  const produtoSchema = new mongoose.Schema({...});
  const Produto = mongoose.model('Produto', produtoSchema);
  ```
- **JWT (jsonwebtoken)**: Utilizado para autenticação e autorização de usuários.
  ```javascript
  const jwt = require('jsonwebtoken');
  jwt.sign(payload, process.env.JWT_SECRET, {...});
  ```
- **bcrypt.js**: Implementado para hash e salting de senhas, aumentando a segurança.
  ```javascript
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(senha, salt);
  ```
- **dotenv**: Para gerenciamento de variáveis de ambiente.
  ```javascript
  require('dotenv').config();
  ```
- **cors**: Middleware para habilitar CORS (Cross-Origin Resource Sharing).
  ```javascript
  const cors = require('cors');
  app.use(cors({...}));
  ```
- **helmet**: Middleware para adicionar cabeçalhos de segurança.
  ```javascript
  const helmet = require('helmet');
  app.use(helmet({...}));
  ```
- **express-validator**: Usado para validação de dados de entrada.
  ```javascript
  const { body, validationResult } = require('express-validator');
  ```
- **winston**: Implementado para logging avançado.
  ```javascript
  const winston = require('winston');
  const logger = winston.createLogger({...});
  ```
- **compression**: Utilizado para compressão de respostas HTTP.
  ```javascript
  const compression = require('compression');
  app.use(compression());
  ```
- **express-rate-limit**: Para limitar requisições repetidas à API.
  ```javascript
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({...});
  ```

## Justificativas para Escolha das Tecnologias

1. **Node.js e Express.js**: Escolhidos pela sua eficiência em operações I/O não bloqueantes, ideal para uma aplicação de e-commerce que precisa lidar com múltiplas requisições simultâneas.

2. **MongoDB e Mongoose**: Selecionados pela flexibilidade em lidar com dados não estruturados, permitindo fácil adaptação do esquema de produtos e pedidos conforme necessário.

3. **JWT**: Implementado para fornecer um método seguro e stateless de autenticação, essencial para proteger rotas de administração e informações do usuário.

4. **bcrypt.js**: Adotado para garantir a segurança no armazenamento de senhas dos usuários, protegendo contra ataques de força bruta.

5. **Bootstrap**: Utilizado para acelerar o desenvolvimento frontend e garantir uma interface responsiva e consistente em diferentes dispositivos.

6. **Helmet**: Incluído para adicionar camadas extras de segurança através de cabeçalhos HTTP, protegendo contra ataques comuns da web.

7. **Winston**: Escolhido para logging avançado, facilitando o monitoramento e depuração da aplicação em produção.

8. **Compression**: Implementado para reduzir o tamanho das respostas HTTP, melhorando o tempo de carregamento da aplicação.

9. **Express-rate-limit**: Utilizado para prevenir abusos à API, protegendo contra ataques de força bruta e DOS.

## Instalação e Configuração

1. Clone o repositório:
   ```
   git clone https://github.com/B3niwH/cellmart.git
   ```

2. Instale as dependências:
   ```
   cd cellmart
   npm install
   ```

3. Configure as variáveis de ambiente criando um arquivo `.env` na raiz do projeto:
   ```
   MONGODB_URI=sua_uri_do_mongodb
   JWT_SECRET=seu_segredo_jwt
   PORT=5000
   ```

4. Inicie o servidor:
   ```
   npm start
   ```

5. Acesse a aplicação em `http://localhost:5000`

# Comandos curl para API do CellMart

## Autenticação

### Registro de Usuário
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome": "Usuário Teste", "email": "usuario@teste.com", "senha": "senha123", "telefone": "11999999999", "cpf": "12345678900"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@teste.com", "senha": "senha123"}'
```

### Verificar Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

## Produtos

### Listar Produtos
```bash
curl -X GET "http://localhost:5000/api/produtos?pagina=1&itensPorPagina=10"
```

### Adicionar Produto (Admin)
```bash
curl -X POST http://localhost:5000/api/produtos \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN" \
  -d '{"nome": "Smartphone XYZ", "preco": 999.99, "descricao": "Um ótimo smartphone", "imagem": "url_da_imagem"}'
```

### Atualizar Produto (Admin)
```bash
curl -X PUT http://localhost:5000/api/produtos/ID_DO_PRODUTO \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN" \
  -d '{"nome": "Smartphone XYZ Atualizado", "preco": 1099.99}'
```

### Remover Produto (Admin)
```bash
curl -X DELETE http://localhost:5000/api/produtos/ID_DO_PRODUTO \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN"
```

## Carrinho

### Obter Carrinho
```bash
curl -X GET http://localhost:5000/api/carrinho \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

### Adicionar Item ao Carrinho
```bash
curl -X POST http://localhost:5000/api/carrinho \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT" \
  -d '{"produtoId": "ID_DO_PRODUTO", "quantidade": 1}'
```

### Atualizar Quantidade no Carrinho
```bash
curl -X PUT http://localhost:5000/api/carrinho/ID_DO_PRODUTO \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT" \
  -d '{"quantidade": 2}'
```

### Remover Item do Carrinho
```bash
curl -X DELETE http://localhost:5000/api/carrinho/ID_DO_PRODUTO \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

## Pedidos

### Criar Pedido
```bash
curl -X POST http://localhost:5000/api/pedidos \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

### Listar Pedidos do Usuário
```bash
curl -X GET http://localhost:5000/api/pedidos \
  -H "x-auth-token: SEU_TOKEN_JWT"
```

## Contato

### Enviar Mensagem de Contato
```bash
curl -X POST http://localhost:5000/api/contato \
  -H "Content-Type: application/json" \
  -d '{"nome": "Nome do Cliente", "email": "cliente@email.com", "mensagem": "Mensagem de contato"}'
```

## Administração (Apenas para usuários admin)

### Listar Usuários
```bash
curl -X GET "http://localhost:5000/api/admin/usuarios?pagina=1&itensPorPagina=10" \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN"
```

### Atualizar Usuário
```bash
curl -X PUT http://localhost:5000/api/admin/usuarios/ID_DO_USUARIO \
  -H "Content-Type: application/json" \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN" \
  -d '{"nome": "Nome Atualizado", "email": "email@atualizado.com", "isAdmin": true}'
```

### Remover Usuário
```bash
curl -X DELETE http://localhost:5000/api/admin/usuarios/ID_DO_USUARIO \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN"
```

### Listar Mensagens de Contato
```bash
curl -X GET "http://localhost:5000/api/admin/mensagens?pagina=1&itensPorPagina=10" \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN"
```

### Marcar Mensagem como Respondida
```bash
curl -X PUT http://localhost:5000/api/admin/mensagens/ID_DA_MENSAGEM \
  -H "x-auth-token: SEU_TOKEN_JWT_ADMIN"
```

Lembre-se de substituir `SEU_TOKEN_JWT`, `SEU_TOKEN_JWT_ADMIN`, `ID_DO_PRODUTO`, `ID_DO_USUARIO`, e `ID_DA_MENSAGEM` pelos valores reais em seu sistema. Além disso, ajuste a URL base (`http://localhost:5000`) se seu servidor estiver rodando em um endereço diferente.


## Contribuição

Contribuições são bem-vindas! Por favor, entre em contato com o desenvolvedor através do email fornecido para discutir possíveis melhorias ou correções.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE.md para detalhes.
