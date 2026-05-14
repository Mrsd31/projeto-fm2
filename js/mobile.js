let vendasMobile = JSON.parse(localStorage.getItem('pharmaVendasMobile')) || [];

function carregarProdutosMobile() {
    const container = document.getElementById('mobileProducts');
    container.innerHTML = '';
    
    produtos.slice(0, 6).forEach(produto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <i class="fas fa-box product-icon"></i>
            <h3>${produto.nome}</h3>
            <div class="product-price">R$ ${produto.precoVenda.toFixed(2)}</div>
            <div class="product-stock">Estoque: ${produto.estoque}</div>
            <button onclick="adicionarVendaMobile('${produto.codigo}')" class="btn-add-mobile">
                <i class="fas fa-cart-plus"></i> Vender
            </button>
        `;
        container.appendChild(card);
    });
}

function novaVendaMobile() {
    const codigo = prompt('Digite o código do produto:');
    if (codigo) {
        adicionarVendaMobile(codigo);
    }
}

function adicionarVendaMobile(codigo) {
    const produto = produtos.find(p => p.codigo === codigo);
    if (!produto) {
        showNotification('Produto não encontrado!', 'error');
        return;
    }
    
    if (produto.estoque <= 0) {
        showNotification('Produto sem estoque!', 'error');
        return;
    }
    
    const quantidade = parseInt(prompt(`Quantidade de ${produto.nome}:`, '1'));
    if (!quantidade || quantidade <= 0 || quantidade > produto.estoque) {
        showNotification('Quantidade inválida!', 'error');
        return;
    }
    
    const venda = {
        data: new Date().toISOString(),
        produto: produto.nome,
        codigo: produto.codigo,
        quantidade: quantidade,
        valor: produto.precoVenda * quantidade,
        revendedor: currentUser.nome,
        codigoRevendedor: currentUser.codigo
    };
    
    vendasMobile.push(venda);
    localStorage.setItem('pharmaVendasMobile', JSON.stringify(vendasMobile));
    
    // Atualizar estoque
    produto.estoque -= quantidade;
    localStorage.setItem('pharmaProdutos', JSON.stringify(produtos));
    
    showNotification(`Venda de ${quantidade}x ${produto.nome} registrada!`, 'success');
    carregarProdutosMobile();
}

function verCatalogo() {
    let catalogo = 'Catálogo de Produtos:\n\n';
    produtos.forEach(p => {
        catalogo += `${p.codigo} - ${p.nome}: R$ ${p.precoVenda.toFixed(2)} (${p.estoque} em estoque)\n`;
    });
    alert(catalogo);
}

function minhasVendas() {
    const minhasVendas = vendasMobile.filter(v => v.revendedor === currentUser.nome);
    
    if (minhasVendas.length === 0) {
        showNotification('Nenhuma venda registrada!', 'warning');
        return;
    }
    
    let relatorio = 'Minhas Vendas:\n\n';
    let total = 0;
    
    minhasVendas.forEach((v, i) => {
        relatorio += `${i + 1}. ${v.produto} - ${v.quantidade}x - R$ ${v.valor.toFixed(2)} (${new Date(v.data).toLocaleDateString()})\n`;
        total += v.valor;
    });
    
    relatorio += `\nTotal: R$ ${total.toFixed(2)}`;
    alert(relatorio);
}

function carregarRelatorios() {
    // Vendas do dia
    const vendas = JSON.parse(localStorage.getItem('pharmaVendas')) || [];
    const hoje = new Date().toDateString();
    const vendasHoje = vendas.filter(v => new Date(v.data).toDateString() === hoje);
    const totalHoje = vendasHoje.reduce((acc, v) => acc + v.total, 0);
    document.getElementById('vendasDia').textContent = `R$ ${totalHoje.toFixed(2)}`;
    
    // Produtos mais vendidos
    const todosItens = [];
    vendas.forEach(v => {
        v.itens.forEach(item => {
            todosItens.push(item);
        });
    });
    
    const contagem = {};
    todosItens.forEach(item => {
        contagem[item.nome] = (contagem[item.nome] || 0) + item.quantidade;
    });
    
    const topProducts = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const topProductsEl = document.getElementById('topProducts');
    topProductsEl.innerHTML = topProducts.map(([nome, qtd]) => 
        `<div>${nome}: ${qtd} unidades</div>`
    ).join('');
    
    // Estoque baixo
    const lowStock = produtos.filter(p => p.estoque <= 10);
    const lowStockEl = document.getElementById('lowStock');
    lowStockEl.innerHTML = lowStock.map(p => 
        `<div style="color: ${p.estoque === 0 ? '#dc3545' : '#ffc107'}">
            ${p.nome}: ${p.estoque} unidades
        </div>`
    ).join('');
}