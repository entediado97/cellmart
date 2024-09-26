// URL base da API
const API_URL = 'http://localhost:5000';

// Variáveis globais
let token = localStorage.getItem('token');
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let paginaAtualProdutos = 1;
let paginaAtualUsuarios = 1;
let paginaAtualMensagens = 1;
const itensPorPagina = 10;

// Função para verificar se o usuário está autenticado e é admin
async function checkAuth() {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        const data = await response.json();
        if (!data.isAdmin) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        await logout();
    }
}

// Função para fazer logout
async function logout() {
    showLoading('Saindo...');
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        hideLoading();
        window.location.href = 'index.html';
    }
}

// Função para carregar produtos
async function carregarProdutos(pagina = 1, busca = '', ordenacao = '') {
    showLoading('Carregando produtos...');
    try {
        const url = new URL(`${API_URL}/api/produtos`);
        url.searchParams.append('pagina', pagina);
        url.searchParams.append('itensPorPagina', itensPorPagina);
        if (busca) url.searchParams.append('busca', busca);
        if (ordenacao) url.searchParams.append('ordenacao', ordenacao);
        const response = await fetch(url, {
            headers: {
                'x-auth-token': token
            }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar produtos');
        }
        const data = await response.json();
        exibirProdutos(data.produtos);
        atualizarPaginacao('paginacao-produtos', data.totalPaginas, pagina, carregarProdutos);
        paginaAtualProdutos = pagina;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        mostrarAlerta('Erro ao carregar produtos. Por favor, tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para exibir produtos
function exibirProdutos(produtos) {
    const listaProdutos = document.getElementById('lista-produtos');
    listaProdutos.innerHTML = '';
    produtos.forEach(produto => {
        const divProduto = document.createElement('div');
        divProduto.className = 'col';
        divProduto.innerHTML = `
            <div class="card h-100">
                <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}">
                <div class="card-body">
                    <h5 class="card-title">${produto.nome}</h5>
                    <p class="card-text">Preço: R$ ${produto.preco.toFixed(2)}</p>
                    <p class="card-text">${produto.descricao}</p>
                    <button class="btn btn-primary btn-sm editar-produto" data-id="${produto._id}">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button class="btn btn-danger btn-sm remover-produto" data-id="${produto._id}">
                        <i class="fas fa-trash me-1"></i>Remover
                    </button>
                </div>
            </div>
        `;
        listaProdutos.appendChild(divProduto);
    });
}

// Função para adicionar ou editar produto
async function adicionarOuEditarProduto(produto) {
    if (!validarProduto(produto)) {
        return;
    }
    showLoading('Salvando produto...');
    try {
        const url = produto._id ? `${API_URL}/api/produtos/${produto._id}` : `${API_URL}/api/produtos`;
        const method = produto._id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(produto),
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erro ao salvar produto');
        }
        await carregarProdutos(paginaAtualProdutos);
        fecharModal('produtoModal');
        limparFormulario('produto-form');
        mostrarAlerta('Produto salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        mostrarAlerta(error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Função para remover produto
async function removerProduto(id) {
    if (confirm('Tem certeza que deseja remover este produto?')) {
        showLoading('Removendo produto...');
        try {
            const response = await fetch(`${API_URL}/api/produtos/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token
                }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao remover produto');
            }
            await carregarProdutos(paginaAtualProdutos);
            mostrarAlerta('Produto removido com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao remover produto:', error);
            mostrarAlerta(error.message, 'danger');
        } finally {
            hideLoading();
        }
    }
}

// Função para carregar usuários
async function carregarUsuarios(pagina = 1, busca = '', ordenacao = '') {
    showLoading('Carregando usuários...');
    try {
        const url = new URL(`${API_URL}/api/admin/usuarios`);
        url.searchParams.append('pagina', pagina);
        url.searchParams.append('itensPorPagina', itensPorPagina);
        if (busca) url.searchParams.append('busca', busca);
        if (ordenacao) url.searchParams.append('ordenacao', ordenacao);
        const response = await fetch(url, {
            headers: {
                'x-auth-token': token
            }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar usuários');
        }
        const data = await response.json();
        exibirUsuarios(data.usuarios);
        atualizarPaginacao('paginacao-usuarios', data.totalPaginas, pagina, carregarUsuarios);
        paginaAtualUsuarios = pagina;
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        mostrarAlerta('Erro ao carregar usuários. Por favor, tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para exibir usuários
function exibirUsuarios(usuarios) {
    const listaUsuarios = document.getElementById('lista-usuarios');
    listaUsuarios.innerHTML = '';
    usuarios.forEach(usuario => {
        const divUsuario = document.createElement('div');
        divUsuario.className = 'col';
        divUsuario.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${usuario.nome}</h5>
                    <p class="card-text">Email: ${usuario.email}</p>
                    <p class="card-text">Telefone: ${usuario.telefone}</p>
                    <p class="card-text">CPF: ${usuario.cpf}</p>
                    <p class="card-text">Admin: ${usuario.isAdmin ? 'Sim' : 'Não'}</p>
                    <button class="btn btn-primary btn-sm editar-usuario" data-id="${usuario._id}">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button class="btn btn-danger btn-sm remover-usuario" data-id="${usuario._id}">
                        <i class="fas fa-trash me-1"></i>Remover
                    </button>
                </div>
            </div>
        `;
        listaUsuarios.appendChild(divUsuario);
    });
}

// Função para editar usuário
async function editarUsuario(usuario) {
    if (!validarUsuario(usuario)) {
        return;
    }
    showLoading('Atualizando usuário...');
    try {
        const response = await fetch(`${API_URL}/api/admin/usuarios/${usuario._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(usuario),
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erro ao atualizar usuário');
        }
        await carregarUsuarios(paginaAtualUsuarios);
        fecharModal('usuarioModal');
        limparFormulario('usuario-form');
        mostrarAlerta('Usuário atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        mostrarAlerta(error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Função para remover usuário
async function removerUsuario(id) {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
        showLoading('Removendo usuário...');
        try {
            const response = await fetch(`${API_URL}/api/admin/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token
                }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao remover usuário');
            }
            await carregarUsuarios(paginaAtualUsuarios);
            mostrarAlerta('Usuário removido com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            mostrarAlerta(error.message, 'danger');
        } finally {
            hideLoading();
        }
    }
}

// Função para carregar mensagens
async function carregarMensagens(pagina = 1, ordenacao = '') {
    showLoading('Carregando mensagens...');
    try {
        const url = new URL(`${API_URL}/api/admin/mensagens`);
        url.searchParams.append('pagina', pagina);
        url.searchParams.append('itensPorPagina', itensPorPagina);
        if (ordenacao) url.searchParams.append('ordenacao', ordenacao);
        const response = await fetch(url, {
            headers: {
                'x-auth-token': token
            }
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar mensagens');
        }
        const data = await response.json();
        exibirMensagens(data.mensagens);
        atualizarPaginacao('paginacao-mensagens', data.totalPaginas, pagina, carregarMensagens);
        paginaAtualMensagens = pagina;
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        mostrarAlerta('Erro ao carregar mensagens. Por favor, tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para exibir mensagens
function exibirMensagens(mensagens) {
    const containerMensagens = document.getElementById('mensagens-contato');
    containerMensagens.innerHTML = '';
    mensagens.forEach(mensagem => {
        const divMensagem = document.createElement('div');
        divMensagem.className = 'card mb-3';
        divMensagem.setAttribute('data-mensagem-id', mensagem._id);
        divMensagem.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${mensagem.nome}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${mensagem.email}</h6>
                <p class="card-text">${mensagem.mensagem}</p>
                <p class="card-text"><small class="text-muted">Enviado em: ${new Date(mensagem.dataEnvio).toLocaleString()}</small></p>
                <button class="btn btn-success btn-sm marcar-respondida" data-id="${mensagem._id}">
                    <i class="fas fa-check me-1"></i>Marcar como Respondida
                </button>
            </div>
        `;
        containerMensagens.appendChild(divMensagem);
    });
}

// Função para marcar mensagem como respondida
async function marcarMensagemComoRespondida(id) {
    showLoading('Excluindo mensagem...');
    try {
        const response = await fetch(`${API_URL}/api/admin/mensagens/${id}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token
            }
        });
        
        if (response.status === 404) {
            throw new Error('Mensagem não encontrada. Ela pode já ter sido excluída.');
        }
        
        if (!response.ok) {
            throw new Error('Erro ao excluir mensagem');
        }

        mostrarAlerta('Mensagem excluída com sucesso!', 'success');
        
        // Removo o elemento da mensagem do DOM
        const mensagemElement = document.querySelector(`[data-mensagem-id="${id}"]`);
        if (mensagemElement) {
            mensagemElement.remove();
        }
    } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        mostrarAlerta(error.message || 'Erro ao excluir mensagem. Tente novamente.', 'danger');
    } finally {
        hideLoading();
    }
}

// Função para atualizar a paginação
function atualizarPaginacao(containerId, totalPaginas, paginaAtual, carregarFuncao) {
    const paginacao = document.getElementById(containerId);
    paginacao.innerHTML = '';

    const maxPaginas = 5;
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
                await carregarFuncao(novaPagina);
            }
        }
    });
}

// Funções de validação
function validarProduto(produto) {
    if (!produto.nome || produto.nome.trim() === '') {
        mostrarAlerta('O nome do produto é obrigatório.', 'danger');
        return false;
    }
    if (!produto.preco || isNaN(produto.preco) || produto.preco <= 0) {
        mostrarAlerta('O preço do produto deve ser um número positivo.', 'danger');
        return false;
    }
    if (!produto.descricao || produto.descricao.trim() === '') {
        mostrarAlerta('A descrição do produto é obrigatória.', 'danger');
        return false;
    }
    if (!produto.imagem || produto.imagem.trim() === '') {
        mostrarAlerta('A URL da imagem do produto é obrigatória.', 'danger');
        return false;
    }
    return true;
}

function validarUsuario(usuario) {
    if (!usuario.nome || usuario.nome.trim() === '') {
        mostrarAlerta('O nome do usuário é obrigatório.', 'danger');
        return false;
    }
    if (!validarEmail(usuario.email)) {
        mostrarAlerta('O email do usuário é inválido.', 'danger');
        return false;
    }
    if (!validarTelefone(usuario.telefone)) {
        mostrarAlerta('O telefone do usuário é inválido.', 'danger');
        return false;
    }
    if (!validarCPF(usuario.cpf)) {
        mostrarAlerta('O CPF do usuário é inválido.', 'danger');
        return false;
    }
    return true;
}

function validarEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email);
}

function validarTelefone(telefone) {
    const re = /^(\+55|55)?(\d{2})?\d{8,9}$/;
    return re.test(telefone.replace(/\D/g, ''));
}

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

// Funções utilitárias
function showLoading(message) {
    const loadingElement = document.getElementById('loading');
    loadingElement.textContent = message;
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'none';
}

function mostrarAlerta(mensagem, tipo) {
    const alertPlaceholder = document.getElementById('alert-placeholder');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertPlaceholder.appendChild(wrapper);

    setTimeout(() => {
        wrapper.remove();
    }, 5000);
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    bootstrapModal.hide();
}

function limparFormulario(formId) {
    document.getElementById(formId).reset();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await Promise.all([
        carregarProdutos(),
        carregarUsuarios(),
        carregarMensagens()
    ]);

    // Listener para o botão de logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Listener para o botão de adicionar produto
    document.getElementById('adicionar-produto-btn').addEventListener('click', () => {
        document.getElementById('produto-id').value = '';
        document.getElementById('produto-nome').value = '';
        document.getElementById('produto-preco').value = '';
        document.getElementById('produto-descricao').value = '';
        document.getElementById('produto-imagem').value = '';
        const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
        modal.show();
    });

    // Listener para o formulário de produto
    document.getElementById('produto-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const produto = {
            nome: document.getElementById('produto-nome').value,
            preco: parseFloat(document.getElementById('produto-preco').value),
            descricao: document.getElementById('produto-descricao').value,
            imagem: document.getElementById('produto-imagem').value
        };
        const id = document.getElementById('produto-id').value;
        if (id) {
            produto._id = id;
        }
        await adicionarOuEditarProduto(produto);
    });

    // Listener para ações nos produtos (editar, remover)
    document.getElementById('lista-produtos').addEventListener('click', async (e) => {
        if (e.target.classList.contains('editar-produto')) {
            const id = e.target.getAttribute('data-id');
            const produto = await fetch(`${API_URL}/api/produtos/${id}`, {
                headers: {
                    'x-auth-token': token
                }
            }).then(res => res.json());
            document.getElementById('produto-id').value = produto._id;
            document.getElementById('produto-nome').value = produto.nome;
            document.getElementById('produto-preco').value = produto.preco;
            document.getElementById('produto-descricao').value = produto.descricao;
            document.getElementById('produto-imagem').value = produto.imagem;
            const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
            modal.show();
        } else if (e.target.classList.contains('remover-produto')) {
            const id = e.target.getAttribute('data-id');
            await removerProduto(id);
        }
    });

    // Listener para ações nos usuários (editar, remover)
    document.getElementById('lista-usuarios').addEventListener('click', async (e) => {
        if (e.target.classList.contains('editar-usuario')) {
            const id = e.target.getAttribute('data-id');
            const usuario = await fetch(`${API_URL}/api/admin/usuarios/${id}`, {
                headers: { 'x-auth-token': token }
            }).then(res => res.json());
            document.getElementById('usuario-id').value = usuario._id;
            document.getElementById('usuario-nome').value = usuario.nome;
            document.getElementById('usuario-email').value = usuario.email;
            document.getElementById('usuario-telefone').value = usuario.telefone;
            document.getElementById('usuario-cpf').value = usuario.cpf;
            document.getElementById('usuario-admin').checked = usuario.isAdmin;
            const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
            modal.show();
        } else if (e.target.classList.contains('remover-usuario')) {
            const id = e.target.getAttribute('data-id');
            await removerUsuario(id);
        }
    });

    // Listener para o formulário de usuário
    document.getElementById('usuario-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuario = {
            _id: document.getElementById('usuario-id').value,
            nome: document.getElementById('usuario-nome').value,
            email: document.getElementById('usuario-email').value,
            telefone: document.getElementById('usuario-telefone').value,
            cpf: document.getElementById('usuario-cpf').value,
            isAdmin: document.getElementById('usuario-admin').checked
        };
        await editarUsuario(usuario);
    });

    // Listener para marcar mensagem como respondida
    document.getElementById('mensagens-contato').addEventListener('click', async (e) => {
        if (e.target.classList.contains('marcar-respondida')) {
            const id = e.target.getAttribute('data-id');
            await marcarMensagemComoRespondida(id);
        }
    });

    // Listener para busca de produtos
    document.getElementById('produto-busca-btn').addEventListener('click', () => {
        const busca = document.getElementById('produto-busca').value;
        paginaAtualProdutos = 1;
        carregarProdutos(paginaAtualProdutos, busca);
    });

    // Listener para busca de usuários
    document.getElementById('usuario-busca-btn').addEventListener('click', () => {
        const busca = document.getElementById('usuario-busca').value;
        paginaAtualUsuarios = 1;
        carregarUsuarios(paginaAtualUsuarios, busca);
    });

    // Listener para ordenação de produtos
    document.getElementById('ordenar-produtos').addEventListener('change', (e) => {
        const ordenacao = e.target.value;
        paginaAtualProdutos = 1;
        carregarProdutos(paginaAtualProdutos, '', ordenacao);
    });

    // Listener para ordenação de usuários
    document.getElementById('ordenar-usuarios').addEventListener('change', (e) => {
        const ordenacao = e.target.value;
        paginaAtualUsuarios = 1;
        carregarUsuarios(paginaAtualUsuarios, '', ordenacao);
    });

    // Listener para ordenação de mensagens
    document.getElementById('ordenar-mensagens').addEventListener('change', (e) => {
        const ordenacao = e.target.value;
        paginaAtualMensagens = 1;
        carregarMensagens(paginaAtualMensagens, ordenacao);
    });
});