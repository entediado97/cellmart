const API_URL = 'http://localhost:5000';

// Função para validar o formato de email
function validarEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email);
}

// Função para validar o tamanho da senha
function validarSenha(senha) {
    return senha.length >= 6;
}

// Função para mostrar mensagens de erro
function mostrarMensagem(mensagem, tipo) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = mensagem;
    messageElement.className = `alert alert-${tipo}`;
    messageElement.style.display = 'block';

    // Esconder a mensagem após 5 segundos
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Função para mostrar o indicador de carregamento
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

// Função para esconder o indicador de carregamento
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Função para fazer login
async function login(email, senha) {
    if (!validarEmail(email)) {
        mostrarMensagem('Por favor, insira um email válido.', 'danger');
        return;
    }

    if (!validarSenha(senha)) {
        mostrarMensagem('A senha deve ter no mínimo 6 caracteres.', 'danger');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAdmin', data.isAdmin);
            mostrarMensagem('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = data.isAdmin ? 'admin.html' : 'index.html';
            }, 1000);
        } else {
            mostrarMensagem(data.message || 'Erro ao fazer login. Verifique suas credenciais.', 'danger');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        mostrarMensagem('Erro ao fazer login. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para fazer cadastro
async function cadastrar(nome, email, senha, telefone, cpf) {
    if (!nome || !email || !senha || !telefone || !cpf) {
        mostrarMensagem('Todos os campos são obrigatórios.', 'danger');
        return;
    }

    if (!validarEmail(email)) {
        mostrarMensagem('Por favor, insira um email válido.', 'danger');
        return;
    }

    if (!validarSenha(senha)) {
        mostrarMensagem('A senha deve ter no mínimo 6 caracteres.', 'danger');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, telefone, cpf })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            document.getElementById('loginTab').click(); // Muda para a aba de login
        } else {
            mostrarMensagem(data.message || 'Erro ao fazer cadastro.', 'danger');
        }
    } catch (error) {
        console.error('Erro ao fazer cadastro:', error);
        mostrarMensagem('Erro ao fazer cadastro. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const cadastroForm = document.getElementById('cadastro-form');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        login(email, senha);
    });

    cadastroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cadastro-nome').value;
        const email = document.getElementById('cadastro-email').value;
        const senha = document.getElementById('cadastro-senha').value;
        const telefone = document.getElementById('cadastro-telefone').value;
        const cpf = document.getElementById('cadastro-cpf').value;
        cadastrar(nome, email, senha, telefone, cpf);
    });
});