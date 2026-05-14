function carregarEstoque() {
    const tbody = document.getElementById('estoqueTableBody');
    tbody.innerHTML = '';
    
    produtos.forEach(produto => {
        const row = document.createElement('tr');
        
        let statusClass, statusText;
        if (produto.estoque > 20) {
            statusClass = 'disponivel';
            statusText = 'Disponível';
        } else if (produto.estoque > 0) {
            statusClass = 'baixo';
            statusText = 'Estoque Baixo';
        } else {
            statusClass = 'esgotado';
            statusText = 'Esgotado';
        }
        
        row.innerHTML = `
            <td>${produto.codigo}</td>
            <td>${produto.nome}</td>
            <td><span class="badge badge-categoria">${produto.categoria}</span></td>
            <td>R$ ${produto.precoVenda.toFixed(2)}</td>
            <td>${produto.estoque}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="editarProduto('${produto.codigo}')" class="btn-action" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="excluirProduto('${produto.codigo}')" class="btn-action btn-danger" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function filtrarEstoque() {
    const search = document.getElementById('estoqueSearch').value.toLowerCase();
    const categoria = document.getElementById('categoriaFilter').value;
    
    const rows = document.querySelectorAll('#estoqueTableBody tr');
    
    rows.forEach(row => {
        const nome = row.children[1].textContent.toLowerCase();
        const cat = row.children[2].textContent.toLowerCase();
        
        const matchSearch = nome.includes(search);
        const matchCategoria = !categoria || cat.includes(categoria);
        
        row.style.display = matchSearch && matchCategoria ? '' : 'none';
    });
}

function abrirModalProduto(produto = null) {
    const modal = document.getElementById('produtoModal');
    modal.classList.add('active');
    
    if (produto) {
        document.getElementById('codigoProduto').value = produto.codigo;
        document.getElementById('codigoProduto').readOnly = true;
        document.getElementById('nomeProduto').value = produto.nome;
        document.getElementById('categoriaProduto').value = produto.categoria;
        document.getElementById('precoCusto').value = produto.precoCusto;
        document.getElementById('precoVenda').value = produto.precoVenda;
        document.getElementById('quantidadeEstoque').value = produto.estoque;
    } else {
        document.getElementById('produtoForm').reset();
        document.getElementById('codigoProduto').readOnly = false;
    }
}

function fecharModal() {
    document.getElementById('produtoModal').classList.remove('active');
}

function salvarProduto(e) {
    e.preventDefault();
    
    const codigo = document.getElementById('codigoProduto').value;
    const nome = document.getElementById('nomeProduto').value;
    const categoria = document.getElementById('categoriaProduto').value;
    const precoCusto = parseFloat(document.getElementById('precoCusto').value);
    const precoVenda = parseFloat(document.getElementById('precoVenda').value);
    const estoque = parseInt(document.getElementById('quantidadeEstoque').value);
    
    const index = produtos.findIndex(p => p.codigo === codigo);
    
    if (index >= 0) {
        // Atualizar existente
        produtos[index] = { ...produtos[index], nome, categoria, precoCusto, precoVenda, estoque };
        showNotification('Produto atualizado com sucesso!', 'success');
    } else {
        // Novo produto
        produtos.push({ codigo, nome, categoria, precoCusto, precoVenda, estoque });
        showNotification('Produto cadastrado com sucesso!', 'success');
    }
    
    localStorage.setItem('pharmaProdutos', JSON.stringify(produtos));
    fecharModal();
    carregarEstoque();
    carregarProdutos();
}

function editarProduto(codigo) {
    const produto = produtos.find(p => p.codigo === codigo);
    if (produto) {
        abrirModalProduto(produto);
    }
}

function excluirProduto(codigo) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        produtos = produtos.filter(p => p.codigo !== codigo);
        localStorage.setItem('pharmaProdutos', JSON.stringify(produtos));
        carregarEstoque();
        carregarProdutos();
        showNotification('Produto excluído com sucesso!', 'success');
    }
}