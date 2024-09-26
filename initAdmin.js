const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Usuario = require('./models/Usuario');

// Carregar variáveis de ambiente
dotenv.config();

// Função para conectar ao MongoDB com tratamento de falhas
const connectWithRetry = () => {
    mongoose.set('strictQuery', false);
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log('Conectado ao MongoDB');
        criarAdmin(); // Chama a função de criação do admin
    })
    .catch((err) => {
        console.error('Erro ao conectar ao MongoDB:', err);
        setTimeout(connectWithRetry, 5000); // Tentar reconectar após 5 segundos
    });
};

// Função para criar o administrador
async function criarAdmin() {
    try {
        // Verificar se o admin já existe
        const adminExistente = await Usuario.findOne({ email: 'admin@admin.com' });
        if (adminExistente) {
            console.log('Administrador já existe.');
            return;
        }

        // Gerar a senha do admin
        const senhaHash = await bcrypt.hash('admin123', 10);
        const admin = new Usuario({
            nome: 'Admin',
            email: 'admin@admin.com',
            senha: senhaHash,
            telefone: '99999999999',
            cpf: '00000000000',
            isAdmin: true
        });

        // Salvar o admin no banco de dados
        await admin.save();
        console.log('Administrador criado com sucesso.');
    } catch (error) {
        console.error('Erro ao criar administrador:', error);
    }
}

// Iniciar a conexão com o MongoDB
connectWithRetry();
