document.addEventListener('DOMContentLoaded', function() {
    const paymentMethod = document.getElementById('payment-method');
    const creditCardFields = document.getElementById('credit-card-fields');
    const pixFields = document.getElementById('pix-fields');
    const paymentForm = document.getElementById('payment-form');
    const finalizarCompraBtn = document.getElementById('finalizar-compra-btn');

    if (finalizarCompraBtn) {
        finalizarCompraBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
            paymentModal.show();
        });
    }

    paymentMethod.addEventListener('change', function() {
        if (this.value === 'credit-card' || this.value === 'debit-card') {
            creditCardFields.style.display = 'block';
            pixFields.style.display = 'none';
        } else if (this.value === 'pix') {
            creditCardFields.style.display = 'none';
            pixFields.style.display = 'block';
        } else {
            creditCardFields.style.display = 'none';
            pixFields.style.display = 'none';
        }
    });

    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Aqui você pode adicionar a lógica para processar o pagamento
        // Por enquanto, vamos apenas simular um pagamento bem-sucedido
        alert('Pagamento processado com sucesso!');
        const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        paymentModal.hide();

        // Chama a função finalizarCompra do script.js
        if (typeof finalizarCompra === 'function') {
            finalizarCompra();
        }
    });

    // Máscara para o número do cartão
    const cardNumber = document.getElementById('card-number');
    cardNumber.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 16) value = value.slice(0, 16);
        e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    });

    // Máscara para a data de expiração
    const cardExpiry = document.getElementById('card-expiry');
    cardExpiry.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length > 2) {
            e.target.value = value.slice(0, 2) + '/' + value.slice(2);
        } else {
            e.target.value = value;
        }
    });

    // Máscara para o CVV
    const cardCvv = document.getElementById('card-cvv');
    cardCvv.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        e.target.value = value;
    });
});