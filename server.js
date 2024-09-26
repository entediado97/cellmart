const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Carrego as variáveis de ambiente
dotenv.config();

// Configuração do servidor Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do Winston para logs
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Configuração CSP
const csp = {
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
    fontSrc: ["'self'", "https:", "http:"],
    connectSrc: ["'self'", "https:", "http:"]
  }
};

//  Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: csp.directives
  }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression()); // Adiciono compressão
app.use(express.static(path.join(__dirname, '../frontend')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por IP
});
app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Middleware para verificar se a CSP está sendo aplicada corretamente
app.use((req, res, next) => {
    console.log('CSP being applied:', JSON.stringify(csp.directives));
    next();
});

// Função para conectar ao MongoDB com lógica de reconexão
const connectWithRetry = () => {
    mongoose.set('strictQuery', false);
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => logger.info('Conectado ao MongoDB'))
    .catch((err) => {
        logger.error('Erro ao conectar ao MongoDB:', err);
        setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// Definição dos esquemas
const produtoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    preco: { type: Number, required: true },
    descricao: { type: String, required: true },
    imagem: { type: String, required: true }
});

const contatoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true },
    mensagem: { type: String, required: true },
    dataEnvio: { type: Date, default: Date.now },
    respondida: { type: Boolean, default: false }
});

const usuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    telefone: { type: String, required: true },
    cpf: { type: String, required: true, unique: true },
    isAdmin: { type: Boolean, default: false },
    dataCriacao: { type: Date, default: Date.now },
    ultimoLogin: { type: Date }
});

const carrinhoSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    produtos: [{
        produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto', required: true },
        quantidade: { type: Number, required: true }
    }]
});

const pedidoSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    produtos: [{
        produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto', required: true },
        quantidade: { type: Number, required: true },
        precoUnitario: { type: Number, required: true }
    }],
    total: { type: Number, required: true },
    status: { type: String, required: true, default: 'Pendente' },
    dataPedido: { type: Date, default: Date.now }
});

// Criação dos modelos
const Produto = mongoose.model('Produto', produtoSchema);
const Contato = mongoose.model('Contato', contatoSchema);
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Carrinho = mongoose.model('Carrinho', carrinhoSchema);
const Pedido = mongoose.model('Pedido', pedidoSchema);

// Middleware para verificação de autenticação
const isAuthenticated = async (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (!token) {
        logger.warn('Tentativa de acesso sem token');
        return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await Usuario.findById(decoded.id).select('-senha');
        if (!usuario) {
            logger.warn('Tentativa de acesso com token inválido');
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        req.usuario = usuario;
        next();
    } catch (error) {
        logger.error('Erro de autenticação:', error);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Middleware para verificação de admin
const isAdmin = async (req, res, next) => {
    if (!req.usuario || !req.usuario.isAdmin) {
        logger.warn(`Tentativa de acesso administrativo não autorizado por: ${req.usuario ? req.usuario.email : 'Usuário desconhecido'}`);
        return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
    }
    next();
};

// Rotas de Autenticação
app.post('/api/auth/register', [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),
    body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
    body('cpf').isLength({ min: 11, max: 11 }).withMessage('CPF inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Tentativa de registro com dados inválidos');
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, telefone, cpf } = req.body;

    try {
        let usuario = await Usuario.findOne({ $or: [{ email }, { cpf }] });
        if (usuario) {
            logger.warn(`Tentativa de registro com email ou CPF já existente: ${email}`);
            return res.status(400).json({ message: 'Usuário já existe.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        usuario = new Usuario({
            nome,
            email,
            senha: hashedPassword,
            telefone,
            cpf
        });

        await usuario.save();
        logger.info(`Novo usuário registrado: ${email}`);

        const payload = {
            id: usuario.id,
            isAdmin: usuario.isAdmin
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, isAdmin: usuario.isAdmin });
        });
    } catch (error) {
        logger.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.post('/api/auth/login', [
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').exists().withMessage('Senha é obrigatória')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Tentativa de login com dados inválidos');
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    try {
        let usuario = await Usuario.findOne({ email });
        if (!usuario) {
            logger.warn(`Tentativa de login com email não cadastrado: ${email}`);
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        const isMatch = await bcrypt.compare(senha, usuario.senha);
        if (!isMatch) {
            logger.warn(`Tentativa de login com senha incorreta para: ${email}`);
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        usuario.ultimoLogin = new Date();
        await usuario.save();

        const payload = {
            id: usuario.id,
            isAdmin: usuario.isAdmin
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            logger.info(`Login bem-sucedido: ${email}`);
            res.json({ token, isAdmin: usuario.isAdmin });
        });
    } catch (error) {
        logger.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.get('/api/auth/verify', isAuthenticated, (req, res) => {
    logger.info(`Token verificado para usuário: ${req.usuario.email}`);
    res.json({ isValid: true, isAdmin: req.usuario.isAdmin });
});

app.post('/api/auth/logout', isAuthenticated, (req, res) => {
    logger.info(`Logout realizado para usuário: ${req.usuario.email}`);
    res.json({ message: 'Logout realizado com sucesso' });
});

// Rotas de Produtos
app.get('/api/produtos', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const limit = parseInt(req.query.itensPorPagina) || 10;
        const skip = (page - 1) * limit;
        const busca = req.query.busca || '';
        const ordenacao = req.query.ordenacao || 'nome';

        let query = {};
        if (busca) {
            query = { nome: { $regex: busca, $options: 'i' } };
        }

        const total = await Produto.countDocuments(query);
        const produtos = await Produto.find(query)
            .sort(ordenacao)
            .skip(skip)
            .limit(limit);

        logger.info(`Produtos buscados. Página: ${page}, Busca: "${busca}", Ordenação: ${ordenacao}`);
        res.json({
            produtos,
            totalPaginas: Math.ceil(total / limit),
            paginaAtual: page
        });
    } catch (error) {
        logger.error('Erro ao buscar produtos:', error);
        res.status(500).json({ message: 'Erro ao buscar produtos' });
    }
});

app.post('/api/produtos', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const novoProduto = new Produto(req.body);
        await novoProduto.save();
        logger.info(`Novo produto criado: ${novoProduto.nome}`);
        res.status(201).json(novoProduto);
    } catch (error) {
        logger.error('Erro ao criar produto:', error);
        res.status(500).json({ message: 'Erro ao criar produto' });
    }
});

app.put('/api/produtos/:id', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const produto = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!produto) {
            logger.warn(`Tentativa de atualizar produto inexistente: ${req.params.id}`);
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        logger.info(`Produto atualizado: ${produto.nome}`);
        res.json(produto);
    } catch (error) {
        logger.error('Erro ao atualizar produto:', error);
        res.status(500).json({ message: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/produtos/:id', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const produto = await Produto.findByIdAndDelete(req.params.id);
        if (!produto) {
            logger.warn(`Tentativa de remover produto inexistente: ${req.params.id}`);
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        logger.info(`Produto removido: ${produto.nome}`);
        res.json({ message: 'Produto removido com sucesso' });
    } catch (error) {
        logger.error('Erro ao remover produto:', error);
        res.status(500).json({ message: 'Erro ao remover produto' });
    }
});

// Rotas de Carrinho
app.get('/api/carrinho', isAuthenticated, async (req, res) => {
    try {
        let carrinho = await Carrinho.findOne({ usuario: req.usuario.id }).populate('produtos.produto');
        if (!carrinho) {
            carrinho = new Carrinho({ usuario: req.usuario.id, produtos: [] });
        }
        logger.info(`Carrinho buscado para usuário: ${req.usuario.email}`);
        res.json(carrinho);
    } catch (error) {
        logger.error('Erro ao buscar carrinho:', error);
        res.status(500).json({ message: 'Erro ao buscar carrinho' });
    }
});

app.post('/api/carrinho', isAuthenticated, async (req, res) => {
    try {
        const { produtoId, quantidade } = req.body;
        let carrinho = await Carrinho.findOne({ usuario: req.usuario.id });
        if (!carrinho) {
            carrinho = new Carrinho({ usuario: req.usuario.id, produtos: [] });
        }
        const produtoIndex = carrinho.produtos.findIndex(item => item.produto.toString() === produtoId);
        if (produtoIndex > -1) {
            carrinho.produtos[produtoIndex].quantidade += quantidade;
        } else {
            carrinho.produtos.push({ produto: produtoId, quantidade });
        }
        await carrinho.save();
        logger.info(`Item adicionado ao carrinho do usuário: ${req.usuario.email}`);
        res.json(carrinho);
    } catch (error) {
        logger.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).json({ message: 'Erro ao adicionar item ao carrinho' });
    }
});

app.put('/api/carrinho/:produtoId', isAuthenticated, async (req, res) => {
    try {
        const { quantidade } = req.body;
        let carrinho = await Carrinho.findOne({ usuario: req.usuario.id });
        if (!carrinho) {
            return res.status(404).json({ message: 'Carrinho não encontrado' });
        }
        const produtoIndex = carrinho.produtos.findIndex(item => item.produto.toString() === req.params.produtoId);
        if (produtoIndex > -1) {
            carrinho.produtos[produtoIndex].quantidade = quantidade;
            await carrinho.save();
            logger.info(`Quantidade atualizada no carrinho do usuário: ${req.usuario.email}`);
            res.json(carrinho);
        } else {
            res.status(404).json({ message: 'Produto não encontrado no carrinho' });
        }
    } catch (error) {
        logger.error('Erro ao atualizar quantidade no carrinho:', error);
        res.status(500).json({ message: 'Erro ao atualizar quantidade no carrinho' });
    }
});

app.delete('/api/carrinho/:produtoId', isAuthenticated, async (req, res) => {
    try {
        const carrinho = await Carrinho.findOne({ usuario: req.usuario.id });
        if (!carrinho) {
            logger.warn(`Tentativa de remover item de carrinho inexistente para usuário: ${req.usuario.email}`);
            return res.status(404).json({ message: 'Carrinho não encontrado' });
        }
        carrinho.produtos = carrinho.produtos.filter(item => item.produto.toString() !== req.params.produtoId);
        await carrinho.save();
        logger.info(`Item removido do carrinho do usuário: ${req.usuario.email}`);
        res.json(carrinho);
    } catch (error) {
        logger.error('Erro ao remover item do carrinho:', error);
        res.status(500).json({ message: 'Erro ao remover item do carrinho' });
    }
});

// Rotas de Pedidos
app.post('/api/pedidos', isAuthenticated, async (req, res) => {
    try {
        const carrinho = await Carrinho.findOne({ usuario: req.usuario.id }).populate('produtos.produto');
        if (!carrinho || carrinho.produtos.length === 0) {
            return res.status(400).json({ message: 'Carrinho vazio' });
        }

        let total = 0;
        const produtosPedido = carrinho.produtos.map(item => {
            const subtotal = item.produto.preco * item.quantidade;
            total += subtotal;
            return {
                produto: item.produto._id,
                quantidade: item.quantidade,
                precoUnitario: item.produto.preco
            };
        });

        const novoPedido = new Pedido({
            usuario: req.usuario.id,
            produtos: produtosPedido,
            total: total
        });

        await novoPedido.save();

        // Limpo o carrinho
        carrinho.produtos = [];
        await carrinho.save();

        logger.info(`Pedido finalizado para o usuário: ${req.usuario.email}`);
        res.status(201).json(novoPedido);
    } catch (error) {
        logger.error('Erro ao finalizar pedido:', error);
        res.status(500).json({ message: 'Erro ao finalizar pedido' });
    }
});

app.get('/api/pedidos', isAuthenticated, async (req, res) => {
    try {
        const pedidos = await Pedido.find({ usuario: req.usuario.id })
            .populate('produtos.produto')
            .sort({ dataPedido: -1 });
        logger.info(`Histórico de pedidos acessado pelo usuário: ${req.usuario.email}`);
        res.json(pedidos);
    } catch (error) {
        logger.error('Erro ao buscar histórico de pedidos:', error);
        res.status(500).json({ message: 'Erro ao buscar histórico de pedidos' });
    }
});

// Rotas de Contato
app.post('/api/contato', [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('mensagem').notEmpty().withMessage('Mensagem é obrigatória')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Tentativa de envio de mensagem de contato com dados inválidos');
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const novoContato = new Contato(req.body);
        await novoContato.save();
        logger.info(`Nova mensagem de contato recebida de: ${novoContato.email}`);
        res.status(201).json({ message: 'Mensagem enviada com sucesso' });
    } catch (error) {
        logger.error('Erro ao enviar mensagem de contato:', error);
        res.status(500).json({ message: 'Erro ao enviar mensagem de contato' });
    }
});

// Rotas de Admin
app.get('/api/admin/usuarios', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const limit = parseInt(req.query.itensPorPagina) || 10;
        const skip = (page - 1) * limit;
        const busca = req.query.busca || '';
        const ordenacao = req.query.ordenacao || 'nome';
        let query = {};
        if (busca) {
            query = { 
                $or: [
                    { nome: { $regex: busca, $options: 'i' } },
                    { email: { $regex: busca, $options: 'i' } }
                ]
            };
        }

        const total = await Usuario.countDocuments(query);
        const usuarios = await Usuario.find(query)
            .select('-senha')
            .sort(ordenacao)
            .skip(skip)
            .limit(limit);

        logger.info(`Lista de usuários acessada por admin: ${req.usuario.email}`);
        res.json({
            usuarios,
            totalPaginas: Math.ceil(total / limit),
            paginaAtual: page
        });
    } catch (error) {
        logger.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

app.put('/api/admin/usuarios/:id', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const { nome, email, telefone, cpf, isAdmin } = req.body;
        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            { nome, email, telefone, cpf, isAdmin },
            { new: true, runValidators: true }
        ).select('-senha');

        if (!usuario) {
            logger.warn(`Tentativa de atualizar usuário inexistente: ${req.params.id}`);
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        logger.info(`Usuário atualizado por admin: ${usuario.email}`);
        res.json(usuario);
    } catch (error) {
        logger.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
});

app.delete('/api/admin/usuarios/:id', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndDelete(req.params.id);
        if (!usuario) {
            logger.warn(`Tentativa de remover usuário inexistente: ${req.params.id}`);
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        logger.info(`Usuário removido por admin: ${usuario.email}`);
        res.json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        logger.error('Erro ao remover usuário:', error);
        res.status(500).json({ message: 'Erro ao remover usuário' });
    }
});

app.get('/api/admin/mensagens', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const limit = parseInt(req.query.itensPorPagina) || 10;
        const skip = (page - 1) * limit;
        const ordenacao = req.query.ordenacao || '-dataEnvio';

        const total = await Contato.countDocuments();
        const mensagens = await Contato.find()
            .sort(ordenacao)
            .skip(skip)
            .limit(limit);

        logger.info(`Mensagens de contato acessadas por admin: ${req.usuario.email}`);
        res.json({
            mensagens,
            totalPaginas: Math.ceil(total / limit),
            paginaAtual: page
        });
    } catch (error) {
        logger.error('Erro ao buscar mensagens de contato:', error);
        res.status(500).json({ message: 'Erro ao buscar mensagens de contato' });
    }
});

app.put('/api/admin/mensagens/:id', [isAuthenticated, isAdmin], async (req, res) => {
    try {
        const mensagem = await Contato.findByIdAndUpdate(
            req.params.id,
            { respondida: true },
            { new: true }
        );
        if (!mensagem) {
            logger.warn(`Tentativa de marcar mensagem inexistente como respondida: ${req.params.id}`);
            return res.status(404).json({ message: 'Mensagem não encontrada' });
        }
        logger.info(`Mensagem marcada como respondida por admin: ${req.usuario.email}`);
        res.json(mensagem);
    } catch (error) {
        logger.error('Erro ao marcar mensagem como respondida:', error);
        res.status(500).json({ message: 'Erro ao marcar mensagem como respondida' });
    }
});

// Rota para receber logs do cliente
app.post('/api/logs', isAuthenticated, (req, res) => {
    const { logs } = req.body;
    const logString = logs.map(log => `${log.timestamp} [${log.origin}]: ${log.message}`).join('\n');
    
    fs.appendFile('client_logs.txt', logString + '\n', (err) => {
        if (err) {
            logger.error('Erro ao salvar logs do cliente:', err);
            res.status(500).json({ message: 'Erro ao salvar logs' });
        } else {
            logger.info(`Logs do cliente salvos para o usuário: ${req.usuario.email}`);
            res.status(200).json({ message: 'Logs salvos com sucesso' });
        }
    });
});

app.delete('/api/admin/mensagens/:id', [isAuthenticated, isAdmin], async (req, res) => {
    const { id } = req.params;
    console.log(`Tentativa de exclusão de mensagem com ID: ${id}`);
    try {
        const mensagem = await Contato.findByIdAndDelete(id);
        if (!mensagem) {
            console.log(`Mensagem com ID ${id} não encontrada`);
            return res.status(404).json({ message: 'Mensagem não encontrada' });
        }
        console.log(`Mensagem com ID ${id} excluída com sucesso`);
        res.json({ message: 'Mensagem excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        res.status(500).json({ message: 'Erro ao excluir mensagem' });
    }
});

// Rota para verificar a saúde do servidor
app.get('/api/health', (req, res) => {
    logger.info('Verificação de saúde do servidor realizada');
    res.status(200).json({ message: 'Servidor está funcionando' });
});

// Rotas para servir os arquivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    logger.error(`Erro: ${err.message}`);
    logger.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

// Rota para lidar com rotas não encontradas
app.use((req, res) => {
    logger.warn(`Tentativa de acesso a rota não existente: ${req.originalUrl}`);
    res.status(404).json({ message: 'Rota não encontrada' });
});

// Inicialização do servidor
const server = app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    logger.error('Erro não tratado:', error);
    // Aqui eu poderia implementar uma lógica para reiniciar o servidor se necessário
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promessa rejeitada não tratada:', reason);
    // Aqui eu poderia implementar uma lógica para lidar com promessas rejeitadas não tratadas
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido. Encerrando servidor graciosamente...');
    server.close(() => {
        logger.info('Servidor encerrado.');
        mongoose.connection.close(false, () => {
            logger.info('Conexão com o MongoDB fechada.');
            process.exit(0);
        });
    });
});

module.exports = app;