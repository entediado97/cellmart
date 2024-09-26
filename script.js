// Inicialização do script
console.log('Script iniciado');

// URL base da API
const API_URL = 'http://localhost:5000';

// Variáveis globais
let produtos = [];
let carrinho = [];
let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let paginaAtual = 1;
const itensPorPagina = 12;

// Array para armazenar logs
let appLogs = [];

// Função para adicionar log
function addLog(message, origin) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        message: message,
        origin: origin
    };
    appLogs.push(logEntry);
    console.log(`${logEntry.timestamp} [${origin}]: ${message}`);
}

// Função para enviar logs para o servidor
async function sendLogsToServer() {
    try {
        const response = await fetch(`${API_URL}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ logs: appLogs })
        });
        if (response.ok) {
            console.log('Logs enviados com sucesso para o servidor');
            appLogs = []; // Limpo os logs após envio bem-sucedido
        } else {
            console.error('Falha ao enviar logs para o servidor');
        }
    } catch (error) {
        console.error('Erro ao enviar logs:', error);
    }
}

// Função para verificar se o usuário está autenticado
async function checkAuth() {
    addLog('Verificando autenticação', 'checkAuth');
    const loginBtn = document.getElementById('login-btn');
    const meusPedidosItem = document.getElementById('meus-pedidos-item');
    if (!loginBtn || !meusPedidosItem) {
        addLog('Elementos de autenticação não encontrados', 'checkAuth');
        return;
    }
    if (token) {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                throw new Error('Token inválido');
            }
            const data = await response.json();
            isAdmin = data.isAdmin;
            localStorage.setItem('isAdmin', isAdmin);
            loginBtn.innerHTML = '<i class="fas fa-user"></i>';
            loginBtn.classList.add('logged-in');
            loginBtn.removeEventListener('click', showAuthModal);
            loginBtn.addEventListener('click', logout);
            meusPedidosItem.style.display = 'block';
            if (isAdmin) {
                window.location.href = 'admin.html';
            }
            await carregarCarrinho();
        } catch (error) {
            addLog(`Erro na verificação do token: ${error.message}`, 'checkAuth');
            await logout();
        }
    } else {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
        loginBtn.classList.remove('logged-in');
        loginBtn.removeEventListener('click', logout);
        loginBtn.addEventListener('click', showAuthModal);
        meusPedidosItem.style.display = 'none';
    }
}

// Função para fazer logout
async function logout() {
    addLog('Iniciando logout', 'logout');
    showLoading('Saindo...');
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
    } catch (error) {
        addLog(`Erro ao fazer logout: ${error.message}`, 'logout');
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        token = null;
        isAdmin = false;
        carrinho = [];
        atualizarContadorCarrinho();
        hideLoading();
        window.location.href = 'index.html';
    }
}

// Função para mostrar o modal de autenticação
function showAuthModal() {
    addLog('Mostrando modal de autenticação', 'showAuthModal');
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    authModal.show();
}

// Função para fazer login
async function login(email, senha) {
    addLog('Tentando login', 'login');
    if (!validarEmail(email) || !validarSenha(senha)) {
        mostrarAlerta('Email ou senha inválidos', 'danger');
        return;
    }

    showLoading('Autenticando...');
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
            token = data.token;
            isAdmin = data.isAdmin;
            await checkAuth();
            fecharModal('authModal');
            mostrarAlerta('Login realizado com sucesso!', 'success');
            limparFormularioLogin();
            window.location.href = isAdmin ? 'admin.html' : 'index.html';
        } else {
            mostrarAlerta(data.message || 'Erro ao fazer login', 'danger');
        }
    } catch (error) {
        addLog(`Erro ao fazer login: ${error.message}`, 'login');
        mostrarAlerta('Erro ao fazer login. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para adicionar itens ao carrinho
async function adicionarAoCarrinho(produtoId, quantidade) {
    addLog(`Adicionando ao carrinho: ${produtoId}, quantidade: ${quantidade}`, 'adicionarAoCarrinho');
    if (!token) {
        mostrarAlerta('Você precisa estar logado para adicionar itens ao carrinho.', 'warning');
        showAuthModal();
        return;
    }

    showLoading('Adicionando ao carrinho...');
    try {
        const response = await fetch(`${API_URL}/api/carrinho`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ produtoId, quantidade })
        });

        const data = await response.json();

        if (response.ok) {
            const produto = produtos.find(p => p._id === produtoId);
            if (produto) {
                const itemExistente = carrinho.find(item => item.produtoId === produtoId);
                if (itemExistente) {
                    itemExistente.quantidade += quantidade;
                } else {
                    carrinho.push({ produtoId, quantidade });
                }
                atualizarContadorCarrinho();
                atualizarTotalCarrinho();
                mostrarAlerta('Item adicionado ao carrinho com sucesso!', 'success');
            }
        } else {
            mostrarAlerta(data.message || 'Erro ao adicionar item ao carrinho.', 'danger');
        }
    } catch (error) {
        addLog(`Erro ao adicionar ao carrinho: ${error.message}`, 'adicionarAoCarrinho');
        mostrarAlerta('Erro ao adicionar item ao carrinho. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para atualizar a quantidade de um item no carrinho
async function atualizarQuantidadeCarrinho(produtoId, novaQuantidade) {
    addLog(`Atualizando quantidade no carrinho: ${produtoId}, nova quantidade: ${novaQuantidade}`, 'atualizarQuantidadeCarrinho');
    showLoading('Atualizando carrinho...');
    try {
        const response = await fetch(`${API_URL}/api/carrinho/${produtoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ quantidade: novaQuantidade })
        });

        const data = await response.json();

        if (response.ok) {
            const itemIndex = carrinho.findIndex(item => item.produtoId === produtoId);
            if (itemIndex > -1) {
                carrinho[itemIndex].quantidade = novaQuantidade;
            }
            atualizarContadorCarrinho();
            atualizarTotalCarrinho();
            mostrarAlerta('Carrinho atualizado com sucesso!', 'success');
        } else {
            mostrarAlerta(data.message || 'Erro ao atualizar carrinho.', 'danger');
        }
    } catch (error) {
        addLog(`Erro ao atualizar quantidade no carrinho: ${error.message}`, 'atualizarQuantidadeCarrinho');
        mostrarAlerta('Erro ao atualizar carrinho. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para atualizar o contador de itens no carrinho
function atualizarContadorCarrinho() {
    addLog('Atualizando contador do carrinho', 'atualizarContadorCarrinho');
    const carrinhoIcon = document.getElementById('carrinho-contador');
    if (carrinhoIcon) {
        carrinhoIcon.innerText = carrinho.reduce((total, item) => total + item.quantidade, 0);
    } else {
        addLog('Elemento do contador do carrinho não encontrado', 'atualizarContadorCarrinho');
    }
}

// Função para atualizar o total do carrinho
function atualizarTotalCarrinho() {
    const total = carrinho.reduce((acc, item) => {
        const produto = produtos.find(p => p._id === item.produtoId);
        return acc + (produto ? produto.preco * item.quantidade : 0);
    }, 0);
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Função para carregar produtos
async function carregarProdutos(pagina = 1, busca = '', ordenacao = '') {
    addLog('Iniciando carregamento de produtos', 'carregarProdutos');
    showLoading('Carregando produtos...');
    
    try {
        const url = new URL(`${API_URL}/api/produtos`);
        url.searchParams.append('pagina', pagina);
        url.searchParams.append('itensPorPagina', itensPorPagina);
        if (busca) url.searchParams.append('busca', busca);
        if (ordenacao) url.searchParams.append('ordenacao', ordenacao);

        addLog(`URL da requisição: ${url.toString()}`, 'carregarProdutos');

        const response = await fetch(url);
        addLog(`Resposta recebida: ${response.status}`, 'carregarProdutos');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        addLog(`Dados recebidos: ${JSON.stringify(data)}`, 'carregarProdutos');

        if (!Array.isArray(data.produtos)) {
            throw new Error('Formato de dados inválido');
        }

        produtos = data.produtos;
        addLog('Exibindo produtos', 'carregarProdutos');
        exibirProdutos(produtos);
        atualizarPaginacao(data.totalPaginas, pagina);
    } catch (error) {
        addLog(`Erro ao carregar produtos: ${error.message}`, 'carregarProdutos');
        mostrarAlerta('Erro ao carregar produtos. Tente novamente mais tarde.', 'danger');
    } finally {
        addLog('Finalizando carregamento', 'carregarProdutos');
        hideLoading();
    }
}

// Função para exibir produtos
function exibirProdutos(produtos) {
    addLog('Exibindo produtos', 'exibirProdutos');
    const listaProdutos = document.getElementById('lista-produtos');
    if (!listaProdutos) {
        addLog('Elemento lista-produtos não encontrado', 'exibirProdutos');
        return;
    }
    listaProdutos.innerHTML = '';
    if (produtos.length === 0) {
        listaProdutos.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
        return;
    }
    produtos.forEach(produto => {
        const divProduto = document.createElement('div');
        divProduto.className = 'col-md-4 mb-4';
        divProduto.innerHTML = `
            <div class="card h-100">
                <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}" onerror="this.src='https://via.placeholder.com/300x200?text=Imagem+não+disponível'">
                <div class="card-body">
                    <h5 class="card-title">${produto.nome}</h5>
                    <p class="card-text">${produto.descricao}</p>
                    <p class="card-text">Preço: R$ ${produto.preco.toFixed(2)}</p>
                    <button class="btn btn-primary adicionar-carrinho" data-id="${produto._id}">Adicionar ao Carrinho</button>
                </div>
            </div>
        `;
        listaProdutos.appendChild(divProduto);
    });

    // Adiciono listeners para expandir imagens
    addImageClickListeners();
}

// Função para adicionar event listeners às imagens dos produtos
function addImageClickListeners() {
    document.querySelectorAll('.card-img-top').forEach(img => {
        img.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('imageModal'));
            const modalImg = document.getElementById('modalImage');
            modalImg.src = this.src;
            modal.show();
        });
    });
}

// Função para atualizar a paginação
function atualizarPaginacao(totalPaginas, paginaAtual) {
    addLog('Atualizando paginação', 'atualizarPaginacao');
    const paginacao = document.getElementById('paginacao');
    if (!paginacao) {
        addLog('Elemento paginacao não encontrado', 'atualizarPaginacao');
        return;
    }
    paginacao.innerHTML = '';
    const maxPaginas = 5; // Número máximo de botões de página para exibir
    const metade = Math.floor(maxPaginas / 2);
    let inicio = Math.max(paginaAtual - metade, 1);
    let fim = Math.min(inicio + maxPaginas - 1, totalPaginas);

    if (fim - inicio + 1 < maxPaginas) {
        inicio = Math.max(fim - maxPaginas + 1, 1);
    }

    // Botão "Anterior"
    const anteriorLi = document.createElement('li');
    anteriorLi.className = `page-item ${paginaAtual === 1 ? 'disabled' : ''}`;
    anteriorLi.innerHTML = `<a class="page-link" href="#" data-pagina="${paginaAtual - 1}">Anterior</a>`;
    paginacao.appendChild(anteriorLi);

    // Páginas numeradas
    for (let i = inicio; i <= fim; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-pagina="${i}">${i}</a>`;
        paginacao.appendChild(li);
    }

    // Botão "Próximo"
    const proximoLi = document.createElement('li');
    proximoLi.className = `page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`;
    proximoLi.innerHTML = `<a class="page-link" href="#" data-pagina="${paginaAtual + 1}">Próximo</a>`;
    paginacao.appendChild(proximoLi);

    // Adiciono evento de clique para os botões de paginação
    paginacao.addEventListener('click', async (e) => {
        if (e.target.tagName === 'A' && e.target.hasAttribute('data-pagina')) {
            e.preventDefault();
            const novaPagina = parseInt(e.target.getAttribute('data-pagina'));
            if (novaPagina !== paginaAtual && novaPagina > 0 && novaPagina <= totalPaginas) {
                await carregarProdutos(novaPagina);
            }
        }
    });
}

// Função para carregar o carrinho do usuário
async function carregarCarrinho() {
    addLog('Carregando carrinho', 'carregarCarrinho');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/api/carrinho`, {
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar o carrinho');
        }
        const data = await response.json();
        carrinho = data.produtos;
        atualizarContadorCarrinho();
        atualizarTotalCarrinho();
    } catch (error) {
        addLog(`Erro ao carregar o carrinho: ${error.message}`, 'carregarCarrinho');
    }
}

// Função de validação de email
function validarEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email);
}

// Função de validação de senha
function validarSenha(senha) {
    return senha.length >= 6;
}

// Função de validação de CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g,'');    
    if(cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11))  resto = 0;
    if (resto != parseInt(cpf.substring(9, 10)) ) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11))  resto = 0;
    if (resto != parseInt(cpf.substring(10, 11) ) ) return false;
    return true;
}

// Função de validação de telefone
function validarTelefone(telefone) {
    const re = /^(\+55|55)?(\d{2})?\d{8,9}$/;
    return re.test(telefone.replace(/\D/g, ''));
}

// Função para mostrar o indicador de carregamento
function showLoading(message) {
    addLog(`Mostrando loading: ${message}`, 'showLoading');
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        const textElement = loadingElement.querySelector('span:not(.visually-hidden)');
        if (textElement) {
            textElement.textContent = message;
        }
        loadingElement.style.display = 'flex';
    } else {
        addLog('Elemento de loading não encontrado', 'showLoading');
    }
}

// Função para esconder o indicador de carregamento
function hideLoading() {
    addLog('Escondendo loading', 'hideLoading');
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    } else {
        addLog('Elemento de loading não encontrado', 'hideLoading');
    }
}

// Função para mostrar alertas
function mostrarAlerta(mensagem, tipo) {
    addLog(`Mostrando alerta: ${mensagem}, tipo: ${tipo}`, 'mostrarAlerta');
    const alertPlaceholder = document.getElementById('alert-placeholder');
    if (!alertPlaceholder) {
        addLog('Elemento alert-placeholder não encontrado', 'mostrarAlerta');
        return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertPlaceholder.appendChild(wrapper);

    // Removo o alerta após 5 segundos
    setTimeout(() => {
        wrapper.remove();
    }, 5000);
}

// Função para fechar modal
function fecharModal(modalId) {
    addLog(`Fechando modal: ${modalId}`, 'fecharModal');
    const modal = document.getElementById(modalId);
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    } else {
        addLog(`Modal não encontrado: ${modalId}`, 'fecharModal');
    }
}

// Função para cadastrar novo usuário
async function cadastrar(nome, email, senha, telefone, cpf) {
    addLog('Iniciando cadastro de novo usuário', 'cadastrar');
    if (!validarEmail(email) || !validarSenha(senha) || !validarCPF(cpf) || !validarTelefone(telefone)) {
        mostrarAlerta('Por favor, verifique os dados informados.', 'danger');
        return;
    }

    showLoading('Cadastrando...');
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, telefone, cpf })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarAlerta('Cadastro realizado com sucesso! Faça o login.', 'success');
            limparFormularioCadastro();
            // Mudo para a aba de login após cadastro bem-sucedido
            const loginTab = document.querySelector('#authModal a[href="#login"]');
            if (loginTab) {
                loginTab.click();
            }
        } else {
            mostrarAlerta(data.message || 'Erro ao fazer cadastro', 'danger');
        }
    } catch (error) {
        addLog(`Erro ao cadastrar: ${error.message}`, 'cadastrar');
        mostrarAlerta('Erro ao fazer cadastro. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para mostrar o carrinho
function mostrarCarrinho() {
    addLog('Mostrando carrinho', 'mostrarCarrinho');
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    if (!cartItems || !cartTotal) {
        addLog('Elementos do carrinho não encontrados', 'mostrarCarrinho');
        return;
    }

    cartItems.innerHTML = '';
    let total = 0;

    carrinho.forEach(item => {
        const produto = produtos.find(p => p._id === item.produtoId);
        if (produto) {
            const itemTotal = produto.preco * item.quantidade;
            total += itemTotal;
            cartItems.innerHTML += `
                <div class="cart-item">
                    <span>${produto.nome} - ${item.quantidade}x</span>
                    <span>R$ ${itemTotal.toFixed(2)}</span>
                    <button class="btn btn-sm btn-danger remover-do-carrinho" data-id="${produto._id}">Remover</button>
                    <input type="number" min="1" value="${item.quantidade}" class="form-control form-control-sm atualizar-quantidade" data-id="${produto._id}" style="width: 60px; display: inline-block;">
                </div>
            `;
        }
    });

    cartTotal.textContent = total.toFixed(2);
    cartModal.show();

    // Adiciono event listeners para remover itens e atualizar quantidade
    cartItems.addEventListener('click', (e) => {
        if (e.target.classList.contains('remover-do-carrinho')) {
            const produtoId = e.target.getAttribute('data-id');
            removerDoCarrinho(produtoId);
        }
    });

    cartItems.addEventListener('change', (e) => {
        if (e.target.classList.contains('atualizar-quantidade')) {
            const produtoId = e.target.getAttribute('data-id');
            const novaQuantidade = parseInt(e.target.value);
            if (novaQuantidade > 0) {
                atualizarQuantidadeCarrinho(produtoId, novaQuantidade);
            }
        }
    });
}

// Função para remover item do carrinho
async function removerDoCarrinho(produtoId) {
    addLog(`Removendo item do carrinho: ${produtoId}`, 'removerDoCarrinho');
    showLoading('Removendo item...');
    try {
        const response = await fetch(`${API_URL}/api/carrinho/${produtoId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token
            }
        });

        if (response.ok) {
            carrinho = carrinho.filter(item => item.produtoId !== produtoId);
            atualizarContadorCarrinho();
            atualizarTotalCarrinho();
            mostrarCarrinho(); // Atualizo a visualização do carrinho
            mostrarAlerta('Item removido do carrinho com sucesso!', 'success');
        } else {
            throw new Error('Falha ao remover item do carrinho');
        }
    } catch (error) {
        addLog(`Erro ao remover item do carrinho: ${error.message}`, 'removerDoCarrinho');
        mostrarAlerta('Erro ao remover item do carrinho. Tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para finalizar a compra
async function finalizarCompra() {
    addLog('Iniciando processo de finalização de compra', 'finalizarCompra');
    if (carrinho.length === 0) {
        mostrarAlerta('Seu carrinho está vazio', 'warning');
        return;
    }

    showLoading('Processando sua compra...');
    try {
        const response = await fetch(`${API_URL}/api/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ itens: carrinho })
        });

        if (response.ok) {
            carrinho = [];
            atualizarContadorCarrinho();
            atualizarTotalCarrinho();
            fecharModal('cartModal');
            mostrarAlerta('Compra realizada com sucesso!', 'success');
        } else {
            throw new Error('Falha ao processar a compra');
        }
    } catch (error) {
        addLog(`Erro ao finalizar compra: ${error.message}`, 'finalizarCompra');
        mostrarAlerta('Erro ao finalizar compra. Por favor, tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para buscar produtos
function buscarProdutos() {
    const busca = document.getElementById('busca-input').value;
    carregarProdutos(1, busca);
}

// Função para carregar o histórico de pedidos
async function carregarHistoricoPedidos() {
    addLog('Carregando histórico de pedidos', 'carregarHistoricoPedidos');
    showLoading('Carregando histórico de pedidos...');
    try {
        const response = await fetch(`${API_URL}/api/pedidos`, {
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar o histórico de pedidos');
        }
        const pedidos = await response.json();
        exibirHistoricoPedidos(pedidos);
    } catch (error) {
        addLog(`Erro ao carregar histórico de pedidos: ${error.message}`, 'carregarHistoricoPedidos');
        mostrarAlerta('Erro ao carregar histórico de pedidos. Tente novamente mais tarde.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para exibir o histórico de pedidos
function exibirHistoricoPedidos(pedidos) {
    addLog('Exibindo histórico de pedidos', 'exibirHistoricoPedidos');
    const historicoPedidosContainer = document.getElementById('historico-pedidos');
    if (!historicoPedidosContainer) {
        addLog('Elemento historico-pedidos não encontrado', 'exibirHistoricoPedidos');
        return;
    }

    historicoPedidosContainer.innerHTML = '';
    if (pedidos.length === 0) {
        historicoPedidosContainer.innerHTML = '<p>Você ainda não fez nenhum pedido.</p>';
        return;
    }

    pedidos.forEach(pedido => {
        const pedidoElement = document.createElement('div');
        pedidoElement.className = 'pedido-item mb-3 p-3 border rounded';
        pedidoElement.innerHTML = `
            <h5>Pedido #${pedido._id}</h5>
            <p>Data: ${new Date(pedido.dataPedido).toLocaleString()}</p>
            <p>Status: ${pedido.status}</p>
            <p>Total: R$ ${pedido.total.toFixed(2)}</p>
            <ul>
                ${pedido.produtos.map(item => `
                    <li>${item.produto.nome} - ${item.quantidade}x - R$ ${(item.precoUnitario * item.quantidade).toFixed(2)}</li>
                `).join('')}
            </ul>
        `;
        historicoPedidosContainer.appendChild(pedidoElement);
    });
}

// Função para enviar mensagem de contato
async function enviarMensagemContato(nome, email, mensagem) {
    addLog('Enviando mensagem de contato', 'enviarMensagemContato');
    showLoading('Enviando mensagem...');
    try {
        const response = await fetch(`${API_URL}/api/contato`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, mensagem })
        });

        if (response.ok) {
            mostrarAlerta('Mensagem enviada com sucesso!', 'success');
            limparFormularioContato();
        } else {
            throw new Error('Falha ao enviar mensagem');
        }
    } catch (error) {
        addLog(`Erro ao enviar mensagem de contato: ${error.message}`, 'enviarMensagemContato');
        mostrarAlerta('Erro ao enviar mensagem. Por favor, tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Funções para limpar formulários
function limparFormularioContato() {
    document.getElementById('contato-nome').value = '';
    document.getElementById('contato-email').value = '';
    document.getElementById('contato-mensagem').value = '';
}

function limparFormularioLogin() {
    document.getElementById('login-email').value = '';
    document.getElementById('login-senha').value = '';
}

function limparFormularioCadastro() {
    document.getElementById('register-nome').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-senha').value = '';
    document.getElementById('register-telefone').value = '';
    document.getElementById('register-cpf').value = '';
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    addLog('DOM carregado, iniciando aplicação', 'DOMContentLoaded');
    
    showLoading('Inicializando aplicação...');

    try {
        await checkAuth();
        addLog('Autenticação verificada', 'DOMContentLoaded');

        addLog('Iniciando carregamento de produtos', 'DOMContentLoaded');
        await carregarProdutos();
        addLog('Produtos carregados com sucesso', 'DOMContentLoaded');
    } catch (error) {
        addLog(`Erro durante a inicialização: ${error.message}`, 'DOMContentLoaded');
        mostrarAlerta('Ocorreu um erro ao inicializar a aplicação. Por favor, recarregue a página.', 'danger');
    } finally {
        hideLoading();
        addLog('Finalização da inicialização', 'DOMContentLoaded');
    }

    // Event listener para paginação
    const paginacaoElement = document.getElementById('paginacao');
    if (paginacaoElement) {
        paginacaoElement.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const pagina = parseInt(e.target.getAttribute('data-pagina'));
                try {
                    await carregarProdutos(pagina);
                } catch (error) {
                    addLog(`Erro na paginação: ${error.message}`, 'paginacao');
                    mostrarAlerta('Erro ao carregar produtos. Por favor, tente novamente.', 'danger');
                }
            }
        });
    }

    // Event listener para adicionar ao carrinho
    const listaProdutos = document.getElementById('lista-produtos');
    if (listaProdutos) {
        listaProdutos.addEventListener('click', (e) => {
            if (e.target.classList.contains('adicionar-carrinho')) {
                const produtoId = e.target.getAttribute('data-id');
                adicionarAoCarrinho(produtoId, 1);
            }
        });
    }

    // Event listener para o formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            login(email, senha);
        });
    }

    // Event listener para o formulário de cadastro
    const cadastroForm = document.getElementById('register-form');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('register-nome').value;
            const email = document.getElementById('register-email').value;
            const senha = document.getElementById('register-senha').value;
            const telefone = document.getElementById('register-telefone').value;
            const cpf = document.getElementById('register-cpf').value;
            cadastrar(nome, email, senha, telefone, cpf);
        });
    }

    // Event listener para busca de produtos
    const buscaForm = document.getElementById('busca-form');
    if (buscaForm) {
        buscaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            buscarProdutos();
        });
    }

    // Event listener para ordenação de produtos
    const ordenacaoSelect = document.getElementById('ordenar-produtos');
    if (ordenacaoSelect) {
        ordenacaoSelect.addEventListener('change', (e) => {
            const ordenacao = e.target.value;
            carregarProdutos(1, '', ordenacao);
        });
    }

    // Event listener para o botão do carrinho
    const carrinhoBtn = document.getElementById('carrinho-btn');
    if (carrinhoBtn) {
        carrinhoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarCarrinho();
        });
    }

    // Event listener para finalizar compra
    const finalizarCompraBtn = document.getElementById('finalizar-compra-btn');
    if (finalizarCompraBtn) {
        finalizarCompraBtn.addEventListener('click', finalizarCompra);
    }

    // Event listener para carregar histórico de pedidos
    const historicoBtn = document.getElementById('historico-btn');
    if (historicoBtn) {
        historicoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            carregarHistoricoPedidos();
        });
    }

    // Event listener para o formulário de contato
    const contatoForm = document.getElementById('contato-form');
    if (contatoForm) {
        contatoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('contato-nome').value;
            const email = document.getElementById('contato-email').value;
            const mensagem = document.getElementById('contato-mensagem').value;
            enviarMensagemContato(nome, email, mensagem);
        });
    }

    addLog('Todos os event listeners configurados', 'DOMContentLoaded');
});

// Evento para enviar logs antes de fechar a página
window.addEventListener('beforeunload', () => {
    sendLogsToServer();
});

addLog('Script completamente carregado', 'global');