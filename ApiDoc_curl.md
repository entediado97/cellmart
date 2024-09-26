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
