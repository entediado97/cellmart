
// const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', function() {
    const historicoBtn = document.getElementById('historico-btn');
    const historicoPedidosContainer = document.getElementById('historico-pedidos');

    if (historicoBtn) {
        historicoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            carregarHistoricoPedidos();
        });
    }

    async function carregarHistoricoPedidos() {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarAlerta('Você precisa estar logado para ver seu histórico de pedidos.', 'warning');
            return;
        }

        try {
            showLoading('Carregando histórico de pedidos...');
            const response = await fetch(`${API_URL}/api/pedidos`, {
                headers: { 'x-auth-token': token }
            });

            console.log('Resposta completa:', response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            console.log('Texto da resposta:', responseText);

            const pedidos = JSON.parse(responseText);
            console.log('Pedidos recebidos:', pedidos);

            if (!Array.isArray(pedidos)) {
                throw new Error('Formato de dados inválido');
            }

            if (pedidos.length === 0) {
                historicoPedidosContainer.innerHTML = '<p class="text-center">Você ainda não fez nenhum pedido.</p>';
            } else {
                exibirHistoricoPedidos(pedidos);
            }

            const historicoModal = new bootstrap.Modal(document.getElementById('historicoModal'));
            historicoModal.show();
        } catch (error) {
            console.error('Erro ao carregar histórico de pedidos:', error);
            mostrarAlerta(`Erro ao carregar histórico de pedidos: ${error.message}`, 'danger');
        } finally {
            hideLoading();
        }
    }

    function exibirHistoricoPedidos(pedidos) {
        if (!historicoPedidosContainer) {
            console.error('Elemento historico-pedidos não encontrado');
            return;
        }

        historicoPedidosContainer.innerHTML = '';

        pedidos.forEach(pedido => {
            console.log('Processando pedido:', pedido);
            const pedidoElement = document.createElement('div');
            pedidoElement.className = 'pedido-item mb-3 p-3 border rounded';
            
            const produtosHtml = (pedido.produtos || []).map(item => {
                const nomeProduto = item.produto ? (item.produto.nome || 'Nome não disponível') : 'Produto indisponível';
                const quantidade = item.quantidade || 0;
                const precoUnitario = item.precoUnitario || 0;
                return `
                    <li>${nomeProduto} - 
                        ${quantidade}x - R$ ${(precoUnitario * quantidade).toFixed(2)}
                    </li>
                `;
            }).join('');

            pedidoElement.innerHTML = `
                <h5>Pedido #${pedido._id || 'N/A'}</h5> 
                <p>Data: ${pedido.dataPedido ? new Date(pedido.dataPedido).toLocaleString() : 'Data não disponível'}</p> 
                <p>Status: <span class="badge bg-${getStatusColor(pedido.status || 'N/A')}">${pedido.status || 'N/A'}</span></p>
                <p>Total: R$ ${(pedido.total || 0).toFixed(2)}</p>
                <h6>Itens:</h6>
                <ul>
                    ${produtosHtml}
                </ul>
            `;
            historicoPedidosContainer.appendChild(pedidoElement);
        });
    }

    function getStatusColor(status) {
        switch (String(status).toLowerCase()) {
            case 'pendente': return 'warning';
            case 'aprovado': return 'success';
            case 'enviado': return 'info';
            case 'entregue': return 'primary';
            case 'cancelado': return 'danger';
            default: return 'secondary';
        }
    }

    function mostrarAlerta(mensagem, tipo) {
        const alertPlaceholder = document.getElementById('alert-placeholder');
        if (!alertPlaceholder) {
            console.error('Elemento alert-placeholder não encontrado');
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

        setTimeout(() => {
            wrapper.remove();
        }, 5000);
    }

    function showLoading(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            const textElement = loadingElement.querySelector('span:not(.visually-hidden)');
            if (textElement) {
                textElement.textContent = message;
            }
            loadingElement.style.display = 'flex';
        } else {
            console.error('Elemento de loading não encontrado');
        }
    }

    function hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        } else {
            console.error('Elemento de loading não encontrado');
        }
    }
});