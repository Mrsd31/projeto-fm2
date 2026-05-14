// Dados simulados de produtos
let produtos = JSON.parse(localStorage.getItem('pharmaProdutos')) || [
    { codigo: 'MED001', nome: 'Paracetamol 750mg', categoria: 'medicamento', precoCusto: 8.50, precoVenda: 15.90, estoque: 100 },
    { codigo: 'MED002', nome: 'Dipirona 500mg', categoria: 'medicamento', precoCusto: 5.00, precoVenda: 9.90, estoque: 150 },
    { codigo: 'MED003', nome: 'Omeprazol 20mg', categoria: 'medicamento', precoCusto: 12.00, precoVenda: 25.90, estoque: 80 },
    { codigo: 'MED004', nome: 'Losartana 50mg', categoria: 'medicamento', precoCusto: 6.50, precoVenda: 12.90, estoque: 200 },
    { codigo: 'MED005', nome: 'Amoxicilina 500mg', categoria: 'medicamento', precoCusto: 18.00, precoVenda: 35.90, estoque: 60 },
    { codigo: 'HIG001', nome: 'Sabonete Líquido', categoria: 'higiene', precoCusto: 3.50, precoVenda: 7.90, estoque: 300 },
    { codigo: 'HIG002', nome: 'Creme Dental', categoria: 'higiene', precoCusto: 4.00, precoVenda: 8.90, estoque: 250 },
    { codigo: 'COS001', nome: 'Protetor Solar FPS 50', categoria: 'cosmetico', precoCusto: 25.00, precoVenda: 49.90, estoque: 40 },
    { codigo: 'SUP001', nome: 'Vitamina C 1000mg', categoria: 'suplemento', precoCusto: 15.00, precoVenda: 29.90, estoque: 120 },
    { codigo: 'SUP002', nome: 'Whey Protein', categoria: 'suplemento', precoCusto: 45.00, precoVenda: 89.90, estoque: 30 },
];

let carrinho = [];

function carregarProdutos() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    
    produtos.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => adicionarAoCarrinho(produto);
        
        const icons = {
            'medicamento': 'fa-pills',
            'higiene': 'fa-soap',
            'cosmetico': 'fa-spa',
            'suplemento': 'fa-dumbbell'
        };
        
        card.innerHTML = `
            <i class="fas ${icons[produto.categoria]} product-icon"></i>
            <h3>${produto.nome}</h3>
            <div class="product-price">R$ ${produto.precoVenda.toFixed(2)}</div>
            <div class="product-stock">Estoque: ${produto.estoque}</div>
        `;
        
        grid.appendChild(card);
    });
}

function filtrarProdutos() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const nome = card.querySelector('h3').textContent.toLowerCase();
        card.style.display = nome.includes(search) ? 'block' : 'none';
    });
}

function adicionarAoCarrinho(produto) {
    if (produto.estoque <= 0) {
        showNotification('Produto sem estoque!', 'error');
        return;
    }
    
    const itemExistente = carrinho.find(item => item.codigo === produto.codigo);
    
    if (itemExistente) {
        if (itemExistente.quantidade < produto.estoque) {
            itemExistente.quantidade++;
        } else {
            showNotification('Estoque insuficiente!', 'error');
            return;
        }
    } else {
        carrinho.push({
            ...produto,
            quantidade: 1
        });
    }
    
    atualizarCarrinho();
    showNotification(`${produto.nome} adicionado ao carrinho`, 'success');
}

function removerDoCarrinho(codigo) {
    carrinho = carrinho.filter(item => item.codigo !== codigo);
    atualizarCarrinho();
}

function alterarQuantidade(codigo, delta) {
    const item = carrinho.find(item => item.codigo === codigo);
    if (item) {
        const novaQuantidade = item.quantidade + delta;
        if (novaQuantidade > 0 && novaQuantidade <= item.estoque) {
            item.quantidade = novaQuantidade;
        } else if (novaQuantidade <= 0) {
            removerDoCarrinho(codigo);
            return;
        }
    }
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const subtotalEl = document.getElementById('subtotal');
    const descontoEl = document.getElementById('desconto');
    const totalEl = document.getElementById('total');
    
    cartItems.innerHTML = '';
    
    let subtotal = 0;
    let totalItens = 0;
    
    carrinho.forEach(item => {
        const itemTotal = item.precoVenda * item.quantidade;
        subtotal += itemTotal;
        totalItens += item.quantidade;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.nome}</div>
                <div class="cart-item-price">R$ ${item.precoVenda.toFixed(2)} cada</div>
            </div>
            <div class="cart-item-quantity">
                <button class="btn-qty" onclick="alterarQuantidade('${item.codigo}', -1)">-</button>
                <span>${item.quantidade}</span>
                <button class="btn-qty" onclick="alterarQuantidade('${item.codigo}', 1)">+</button>
            </div>
            <div style="font-weight: bold; margin-left: 15px;">
                R$ ${itemTotal.toFixed(2)}
            </div>
            <button onclick="removerDoCarrinho('${item.codigo}')" style="background: none; border: none; color: #dc3545; cursor: pointer; margin-left: 10px;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItems.appendChild(div);
    });
    
    cartCount.textContent = `${totalItens} itens`;
    subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    
    // Aplicar desconto (exemplo: 5% para compras acima de R$ 100)
    const desconto = subtotal > 100 ? subtotal * 0.05 : 0;
    const total = subtotal - desconto;
    
    descontoEl.textContent = `R$ ${desconto.toFixed(2)}`;
    totalEl.textContent = `R$ ${total.toFixed(2)}`;
}

function finalizarVenda() {
    if (carrinho.length === 0) {
        showNotification('Carrinho vazio!', 'error');
        return;
    }
    
    // Atualizar estoque
    carrinho.forEach(item => {
        const produto = produtos.find(p => p.codigo === item.codigo);
        if (produto) {
            produto.estoque -= item.quantidade;
        }
    });
    
    // Salvar no localStorage
    localStorage.setItem('pharmaProdutos', JSON.stringify(produtos));
    
    // Registrar venda (simulado)
    const vendas = JSON.parse(localStorage.getItem('pharmaVendas')) || [];
    vendas.push({
        data: new Date().toISOString(),
        itens: [...carrinho],
        total: calcularTotal(),
        vendedor: currentUser.nome
    });
    localStorage.setItem('pharmaVendas', JSON.stringify(vendas));
    
    showNotification('Venda finalizada com sucesso!', 'success');
    cancelarVenda();
    carregarProdutos();
}

function calcularTotal() {
    let subtotal = carrinho.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);
    const desconto = subtotal > 100 ? subtotal * 0.05 : 0;
    return subtotal - desconto;
}

function cancelarVenda() {
    carrinho = [];
    atualizarCarrinho();
    showNotification('Venda cancelada', 'warning');
}
