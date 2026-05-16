// ==================== CONFIGURAÇÕES DO SISTEMA ====================
let systemConfig = {
    loginBackground: '',
    devBackground: '',
    printerType: 'default',
    emailTo: ''
};

// ==================== DADOS DAS LOJAS ====================
// LOJA PADRÃO INICIAL (PODE SER DELETADA PELO DEV)
let stores = {
    exemplo: {
        id: 'exemplo',
        name: '📘 Loja Exemplo',
        backgroundImage: '',
        license: { active: true, startDate: new Date().toISOString(), daysLeft: 30 },
        products: [
            { id: '1', code: 'PROD001', name: 'Produto Exemplo', price: 10.00, stock: 100, barcode: '7891234567890', image: '' }
        ],
        users: {
            admin: { password: 'admin123', role: 'admin', name: 'Administrador' }
        },
        sales: [],
        pendingSales: []
    }
};

let currentStore = '';
let currentUser = null;
let cart = [];
let currentScreen = 'login';
let pendingPaymentSale = null;

// ==================== FUNÇÕES DE LICENÇA ====================
function getStoreDaysLeft(storeId) {
    const store = stores[storeId];
    if (!store || !store.license) return 0;
    if (!store.license.active) return 0;
    
    const startDate = new Date(store.license.startDate);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const daysLeft = store.license.daysLeft - diffDays;
    
    if (daysLeft <= 0) {
        store.license.active = false;
        saveData();
        return 0;
    }
    return daysLeft;
}

function checkStoreLicense(storeId) {
    const daysLeft = getStoreDaysLeft(storeId);
    return daysLeft > 0;
}

function activateStoreLicense(storeId, days) {
    const store = stores[storeId];
    if (store) {
        store.license.active = true;
        store.license.startDate = new Date().toISOString();
        store.license.daysLeft = parseInt(days);
        saveData();
        return true;
    }
    return false;
}

function addDaysToStoreLicense(storeId, days) {
    const store = stores[storeId];
    if (store) {
        const currentDays = getStoreDaysLeft(storeId);
        if (currentDays > 0) {
            store.license.startDate = new Date().toISOString();
            store.license.daysLeft = currentDays + parseInt(days);
        } else {
            store.license.active = true;
            store.license.startDate = new Date().toISOString();
            store.license.daysLeft = parseInt(days);
        }
        saveData();
        return true;
    }
    return false;
}

function blockStoreLicense(storeId) {
    const store = stores[storeId];
    if (store) {
        store.license.active = false;
        saveData();
        return true;
    }
    return false;
}

function getExpirationAlert(storeId) {
    const daysLeft = getStoreDaysLeft(storeId);
    if (daysLeft > 0 && daysLeft <= 5) {
        return { show: true, days: daysLeft };
    }
    return { show: false, days: 0 };
}

function deleteStore(storeId) {
    if (stores[storeId] && confirm(`⚠️ Tem certeza que deseja EXCLUIR a loja "${stores[storeId].name}" permanentemente?`)) {
        delete stores[storeId];
        saveData();
        alert(`✅ Loja "${stores[storeId]?.name || storeId}" excluída!`);
        renderApp();
        return true;
    }
    return false;
}

function saveData() {
    localStorage.setItem('sismega_stores', JSON.stringify(stores));
}

function loadData() {
    const saved = localStorage.getItem('sismega_stores');
    if (saved) {
        stores = JSON.parse(saved);
    } else {
        saveData();
    }
}

function loadSystemConfig() {
    const saved = localStorage.getItem('sismega_system_config');
    if (saved) {
        systemConfig = JSON.parse(saved);
        if (systemConfig.loginBackground) {
            document.getElementById('loginBg').style.backgroundImage = `url(${systemConfig.loginBackground})`;
        }
        if (systemConfig.devBackground) {
            document.getElementById('devBg').style.backgroundImage = `url(${systemConfig.devBackground})`;
        }
    }
}

function saveSystemConfig() {
    localStorage.setItem('sismega_system_config', JSON.stringify(systemConfig));
}

function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ==================== NOTA FISCAL ====================
function generateInvoice(sale, store, receivedValue = null) {
    const date = new Date(sale.date);
    let invoice = `
╔══════════════════════════════════════════════════════════════════════╗
║                         SISMEGA PDV SYSTEM                          ║
║                      NOTA FISCAL DE VENDA                           ║
╠══════════════════════════════════════════════════════════════════════╣
║ ${store.name.padEnd(62)} ║
║ Data: ${date.toLocaleDateString('pt-BR').padEnd(25)} Hora: ${date.toLocaleTimeString('pt-BR').padEnd(28)} ║
║ Operador: ${sale.operator.padEnd(52)} ║
║ Pagamento: ${sale.paymentMethod.toUpperCase().padEnd(50)} ║
╠══════════════════════════════════════════════════════════════════════╣
║ ITEM                          QTD     VALOR UNIT    TOTAL           ║
╠══════════════════════════════════════════════════════════════════════╣`;

    for (let item of sale.items) {
        const name = item.product.name.substring(0, 30).padEnd(30);
        const qty = item.quantity.toString().padStart(5);
        const price = formatMoney(item.product.price).padStart(14);
        const total = formatMoney(item.product.price * item.quantity).padStart(13);
        invoice += `\n║ ${name} ${qty} ${price} ${total} ║`;
    }

    invoice += `
╠══════════════════════════════════════════════════════════════════════╣
║ TOTAL GERAL: ${formatMoney(sale.total).padStart(54)} ║`;

    if (sale.paymentMethod === 'dinheiro' && receivedValue) {
        invoice += `
║ Valor recebido: ${formatMoney(receivedValue).padStart(50)} ║
║ Troco: ${formatMoney(sale.change).padStart(59)} ║`;
    }

    invoice += `
╠══════════════════════════════════════════════════════════════════════╣
║                     OBRIGADO PELA PREFERÊNCIA!                       ║
╚══════════════════════════════════════════════════════════════════════╝`;
    
    return invoice;
}

function printInvoice(invoice) {
    if (systemConfig.printerType === 'email' && systemConfig.emailTo) {
        const mailtoLink = `mailto:${systemConfig.emailTo}?subject=Nota Fiscal SISMEGA&body=${encodeURIComponent(invoice)}`;
        window.location.href = mailtoLink;
        alert(`📧 Nota fiscal enviada para ${systemConfig.emailTo}`);
    } else {
        const printWindow = window.open('', '_blank', 'width=500,height=700');
        printWindow.document.write(`
            <html><head><title>Nota Fiscal</title>
            <style>body{font-family:'Courier New',monospace;padding:20px;} pre{font-size:11px;}</style>
            </head><body><pre>${invoice}</pre>
            <button onclick="window.print();window.close();">🖨️ Imprimir</button>
            </body></html>
        `);
    }
}

function askToPrint(invoice) {
    return confirm('🖨️ Deseja imprimir/enviar a nota fiscal?');
}

// ==================== PAGAMENTO ====================
function showCashPaymentModal() {
    const total = pendingPaymentSale.total;
    const modalHtml = `
        <div class="modal" id="cashModal">
            <div class="modal-content">
                <h2 style="color:#0ff;">💵 Pagamento em Dinheiro</h2>
                <div class="cash-display">Total: ${formatMoney(total)}</div>
                <input type="number" id="cashReceived" placeholder="Valor recebido" step="0.01" style="width:100%; padding:12px; font-size:1.2rem;">
                <div id="changeDisplay" style="margin:1rem 0; font-size:1.2rem; text-align:center;"></div>
                <div style="display:flex; gap:1rem; margin-top:1rem;">
                    <button onclick="window.confirmCashPayment()" class="btn-success" style="flex:1;">✅ Confirmar</button>
                    <button onclick="window.closeModal()" class="btn-danger" style="flex:1;">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('app').insertAdjacentHTML('beforeend', modalHtml);
    
    const input = document.getElementById('cashReceived');
    input.addEventListener('input', () => {
        const received = parseFloat(input.value);
        const change = received - total;
        const display = document.getElementById('changeDisplay');
        if (received >= total) {
            display.innerHTML = `✅ Troco: ${formatMoney(change)}`;
            display.style.color = '#0f0';
        } else if (received > 0) {
            display.innerHTML = `⚠️ Faltam: ${formatMoney(Math.abs(change))}`;
            display.style.color = '#ff0';
        } else {
            display.innerHTML = '';
        }
    });
}

window.confirmCashPayment = () => {
    const received = parseFloat(document.getElementById('cashReceived')?.value);
    const total = pendingPaymentSale.total;
    if (received >= total) {
        const change = received - total;
        processPayment('dinheiro', received, change);
    } else {
        alert('⚠️ Valor insuficiente!');
    }
};

function processPayment(method, receivedValue = null, change = 0) {
    if (!pendingPaymentSale) return;
    
    for (let item of pendingPaymentSale.cart) {
        const prod = stores[currentStore].products.find(p => p.id === item.product.id);
        if (prod) prod.stock -= item.quantity;
    }
    
    const sale = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        items: pendingPaymentSale.cart,
        total: pendingPaymentSale.total,
        paymentMethod: method,
        change: change,
        operator: currentUser.name
    };
    
    stores[currentStore].sales.unshift(sale);
    saveData();
    
    const invoice = generateInvoice(sale, stores[currentStore], receivedValue);
    
    if (askToPrint(invoice)) {
        printInvoice(invoice);
    }
    
    cart = [];
    pendingPaymentSale = null;
    window.closeModal();
    renderApp();
}

function processCardPayment(method) {
    if (!pendingPaymentSale) return;
    processPayment(method);
}

// ==================== FUNÇÕES DO PDV ====================
function addToCart(product, quantity = 1) {
    if (product.stock < quantity) {
        alert(`⚠️ Estoque insuficiente! Disponível: ${product.stock}`);
        return false;
    }
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
        if (existing.quantity + quantity > product.stock) {
            alert(`⚠️ Limite de estoque atingido`);
            return false;
        }
        existing.quantity += quantity;
    } else {
        cart.push({ product, quantity });
    }
    renderApp();
    return true;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderApp();
}

function addProduct(productData) {
    const newId = Date.now().toString();
    const newProduct = {
        id: newId,
        code: productData.code,
        name: productData.name,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock),
        barcode: productData.barcode || productData.code,
        image: ''
    };
    stores[currentStore].products.push(newProduct);
    saveData();
    renderApp();
}

function updateStock(productId, newStock) {
    const product = stores[currentStore].products.find(p => p.id === productId);
    if (product) product.stock = Math.max(0, parseInt(newStock));
    saveData();
    renderApp();
}

function deleteProduct(productId) {
    if (confirm('🗑️ Excluir este produto permanentemente?')) {
        stores[currentStore].products = stores[currentStore].products.filter(p => p.id !== productId);
        saveData();
        renderApp();
    }
}

function openPaymentModal() {
    if (cart.length === 0) {
        alert('🛒 Carrinho vazio!');
        return;
    }
    pendingPaymentSale = { cart: [...cart], total: cart.reduce((s, i) => s + (i.product.price * i.quantity), 0) };
    
    const modalHtml = `
        <div class="modal" id="paymentModal">
            <div class="modal-content">
                <h2 style="color:#0ff;">💳 Forma de Pagamento</h2>
                <div style="font-size:2rem; text-align:center; margin:1rem 0;">${formatMoney(pendingPaymentSale.total)}</div>
                <div class="payment-option">
                    <button onclick="window.showCashPaymentModal()" style="background:linear-gradient(135deg,#2ecc71,#27ae60);color:white;">💵 Dinheiro</button>
                    <button onclick="window.processCardPayment('débito')" style="background:linear-gradient(135deg,#3498db,#2980b9);color:white;">💳 Débito</button>
                    <button onclick="window.processCardPayment('crédito')" style="background:linear-gradient(135deg,#e67e22,#d35400);color:white;">💳 Crédito</button>
                    <button onclick="window.processCardPayment('pix')" style="background:linear-gradient(135deg,#9b59b6,#8e44ad);color:white;">📱 PIX</button>
                </div>
                <button onclick="window.closeModal()" style="width:100%;">Cancelar</button>
            </div>
        </div>
    `;
    document.getElementById('app').insertAdjacentHTML('beforeend', modalHtml);
}

function saveAsPending() {
    if (cart.length === 0) return;
    stores[currentStore].pendingSales.push({
        id: Date.now(),
        date: new Date().toLocaleString(),
        cart: [...cart],
        total: cart.reduce((s, i) => s + (i.product.price * i.quantity), 0)
    });
    cart = [];
    saveData();
    alert('⏸️ Venda suspensa!');
    renderApp();
}

function loadPendingSale(index) {
    const pending = stores[currentStore].pendingSales[index];
    if (pending) {
        cart = pending.cart;
        stores[currentStore].pendingSales.splice(index, 1);
        saveData();
        renderApp();
    }
}

window.processCardPayment = processCardPayment;
window.showCashPaymentModal = showCashPaymentModal;
window.confirmCashPayment = confirmCashPayment;
window.closeModal = () => {
    document.querySelectorAll('.modal').forEach(m => m.remove());
    pendingPaymentSale = null;
    renderApp();
};

function printSalesReport() {
    const sales = stores[currentStore].sales;
    if (sales.length === 0) {
        alert('📊 Nenhuma venda registrada!');
        return;
    }
    const totalGeral = sales.reduce((s, v) => s + v.total, 0);
    const report = `
╔══════════════════════════════════════════════════════════════════════╗
║                     SISMEGA PDV - RELATÓRIO GERENCIAL                ║
╠══════════════════════════════════════════════════════════════════════╣
║ ${stores[currentStore].name.padEnd(62)} ║
║ Data: ${new Date().toLocaleDateString('pt-BR').padEnd(56)} ║
╠══════════════════════════════════════════════════════════════════════╣
║ TOTAL GERAL: ${formatMoney(totalGeral).padStart(54)} ║
╚══════════════════════════════════════════════════════════════════════╝`;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html><head><title>Relatório</title>
        <style>body{font-family:monospace;padding:20px;}</style>
        </head><body><pre>${report}</pre>
        <button onclick="window.print();window.close();">🖨️ Imprimir</button>
        </body></html>
    `);
}

// ==================== FUNÇÕES DE UPLOAD ====================
async function uploadImageToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

async function handleImageUpload(event, targetType, targetId = null) {
    const file = event.target.files?.[0] || (event.dataTransfer?.files?.[0]);
    if (!file || !file.type.startsWith('image/')) {
        alert('📸 Selecione uma imagem válida!');
        return;
    }
    
    const base64 = await uploadImageToBase64(file);
    
    if (targetType === 'login_bg') {
        systemConfig.loginBackground = base64;
        document.getElementById('loginBg').style.backgroundImage = `url(${base64})`;
        saveSystemConfig();
        alert('🎨 Fundo do login atualizado!');
    } else if (targetType === 'dev_bg') {
        systemConfig.devBackground = base64;
        document.getElementById('devBg').style.backgroundImage = `url(${base64})`;
        saveSystemConfig();
        alert('🎨 Fundo do DEV atualizado!');
    } else if (targetType === 'store_bg' && targetId) {
        stores[targetId].backgroundImage = base64;
        saveData();
        alert(`🎨 Fundo da loja atualizado!`);
        renderApp();
    } else if (targetType === 'product_image' && targetId) {
        const product = stores[currentStore].products.find(p => p.id === targetId);
        if (product) {
            product.image = base64;
            saveData();
            alert(`📦 Imagem do produto atualizada!`);
            renderApp();
        }
    }
}

function createUploadArea(targetType, targetId = null, label = '📸 Clique ou arraste uma imagem') {
    const area = document.createElement('div');
    area.className = 'upload-area';
    area.innerHTML = `<div>${label}</div><input type="file" accept="image/*"><div style="font-size:0.7rem;">PNG, JPG, GIF</div>`;
    const input = area.querySelector('input');
    input.addEventListener('change', (e) => handleImageUpload(e, targetType, targetId));
    
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = '#0ff'; });
    area.addEventListener('dragleave', () => { area.style.borderColor = 'var(--border-color)'; });
    area.addEventListener('drop', async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const base64 = await uploadImageToBase64(file);
            if (targetType === 'login_bg') {
                systemConfig.loginBackground = base64;
                document.getElementById('loginBg').style.backgroundImage = `url(${base64})`;
                saveSystemConfig();
                alert('🎨 Fundo do login atualizado!');
            } else if (targetType === 'dev_bg') {
                systemConfig.devBackground = base64;
                document.getElementById('devBg').style.backgroundImage = `url(${base64})`;
                saveSystemConfig();
                alert('🎨 Fundo do DEV atualizado!');
            } else if (targetType === 'store_bg' && targetId) {
                stores[targetId].backgroundImage = base64;
                saveData();
                alert(`🎨 Fundo da loja atualizado!`);
                renderApp();
            } else if (targetType === 'product_image' && targetId) {
                const product = stores[currentStore].products.find(p => p.id === targetId);
                if (product) {
                    product.image = base64;
                    saveData();
                    alert(`📦 Imagem do produto atualizada!`);
                    renderApp();
                }
            }
        }
    });
    return area;
}

// ==================== TELAS ====================
function renderLogin() {
    return `
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;">
            <div class="glass-card" style="width:420px;text-align:center;">
                <div class="logo-area">
                    <h1>🏪 SISMEGA PDV</h1>
                    <p>Sistema Profissional de Automação Comercial</p>
                </div>
                <input type="text" id="username" placeholder="👤 Usuário" style="width:100%; margin:0.8rem 0; padding:12px;">
                <input type="password" id="password" placeholder="🔒 Senha" style="width:100%; margin:0.8rem 0; padding:12px;">
                <button id="loginBtn" style="width:100%; padding:12px; font-size:1rem;">🔓 Entrar</button>
                <div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--border-color);">
                    <p style="font-size:0.75rem; color:var(--text-muted);">👨‍💻 Desenvolvedor: dev / dev123</p>
                </div>
                <button onclick="window.toggleTheme()" style="margin-top:15px; width:100%;">🎨 Tema</button>
            </div>
        </div>
    `;
}

function renderDevPanel() {
    return `
        <div class="app-wrapper">
            <div class="sidebar">
                <div class="logo-area"><h1>🔧 DEV PANEL</h1><p>Controle Total</p></div>
                <button class="nav-btn active" onclick="window.changeScreen('dev')">📊 Dashboard</button>
                <button class="nav-btn" onclick="window.logout()">🚪 Sair</button>
            </div>
            <div class="main-content">
                <div class="glass-card">
                    <h2 style="color:#0ff;">🔧 Painel do Desenvolvedor</h2>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
                        <div>
                            <h3>🎨 Personalização</h3>
                            <div id="uploadLoginArea"></div>
                            <div id="uploadDevArea" style="margin-top:1rem;"></div>
                        </div>
                        <div>
                            <h3>📈 Estatísticas</h3>
                            <div class="stat-card">🏪 Total de Lojas: ${Object.keys(stores).length}</div>
                            <div class="stat-card">✅ Lojas Ativas: ${Object.keys(stores).filter(id => checkStoreLicense(id)).length}</div>
                            <div class="stat-card">🔒 Lojas Bloqueadas: ${Object.keys(stores).filter(id => !checkStoreLicense(id)).length}</div>
                            <div class="stat-card">📦 Total de Produtos: ${Object.values(stores).reduce((acc, s) => acc + s.products.length, 0)}</div>
                        </div>
                    </div>
                    
                    <h3>🏪 Gerenciar Lojas</h3>
                    ${Object.keys(stores).map(storeId => {
                        const store = stores[storeId];
                        const daysLeft = getStoreDaysLeft(storeId);
                        const isActive = checkStoreLicense(storeId);
                        const alert = getExpirationAlert(storeId);
                        return `
                            <div class="store-card">
                                ${alert.show && isActive ? `<div class="alert-warning">⚠️ ATENÇÃO! A licença expira em ${alert.days} dias!</div>` : ''}
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                    <div style="flex:2;">
                                        <strong style="font-size:1.1rem;">${store.name}</strong>
                                        <div>ID: ${storeId}</div>
                                        <div class="${isActive ? 'status-active' : 'status-blocked'}">
                                            ${isActive ? `✅ ATIVO - ${daysLeft} dias restantes` : '🔒 BLOQUEADO'}
                                        </div>
                                    </div>
                                    <div style="flex:3;">
                                        <div style="display:flex; flex-wrap:wrap; gap:5px;">
                                            <input type="text" id="storeName_${storeId}" value="${store.name}" placeholder="Nome" style="width:150px;">
                                            <button onclick="window.updateStoreName('${storeId}')" class="btn-success">✏️</button>
                                            <input type="number" id="licenseDays_${storeId}" placeholder="Dias" style="width:80px;">
                                            ${isActive ? `
                                                <button onclick="window.addDaysToStore('${storeId}')" class="btn-success">➕ Dias</button>
                                                <button onclick="window.blockStore('${storeId}')" class="btn-danger">🔒 Bloquear</button>
                                            ` : `
                                                <button onclick="window.activateStore('${storeId}')" class="btn-success">✅ Ativar</button>
                                            `}
                                            <button onclick="window.deleteStoreById('${storeId}')" class="btn-danger">🗑️ Excluir</button>
                                        </div>
                                        <div id="uploadStoreBg_${storeId}" style="margin-top:10px;"></div>
                                        ${store.backgroundImage ? `<img src="${store.backgroundImage}" class="preview-image">` : ''}
                                    </div>
                                </div>
                                <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);">
                                    👥 Usuários: ${Object.keys(store.users).join(', ')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="glass-card">
                    <h3>➕ Criar Nova Loja</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr; gap:1rem;">
                        <input type="text" id="newStoreId" placeholder="ID (ex: papelaria)" style="width:100%;">
                        <input type="text" id="newStoreName" placeholder="Nome da loja" style="width:100%;">
                        <input type="text" id="newStoreAdmin" placeholder="Usuário Admin" style="width:100%;">
                        <input type="password" id="newStorePass" placeholder="Senha Admin" style="width:100%;">
                        <input type="number" id="newStoreDays" placeholder="Dias licença" style="width:100%;">
                        <button onclick="window.createNewStore()" style="grid-column:span 5;">➕ Criar Nova Loja</button>
                    </div>
                    <div style="margin-top:1rem; padding:1rem; background:var(--hover-glow); border-radius:1rem;">
                        <p style="font-size:0.8rem;">💡 <strong>Instruções:</strong> Preencha todos os campos para criar uma nova loja. O usuário Admin será criado automaticamente com a senha definida. A loja já virá com 30 dias de licença padrão.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAdminPanel() {
    const store = stores[currentStore];
    const daysLeft = getStoreDaysLeft(currentStore);
    const isActive = checkStoreLicense(currentStore);
    const alert = getExpirationAlert(currentStore);
    
    return `
        <div class="app-wrapper">
            <div class="sidebar">
                <div class="logo-area"><h1>SISMEGA PRO</h1></div>
                <div class="store-info" style="margin-bottom:1rem;">
                    <div style="font-weight:bold;">${store.name}</div>
                    <div>👑 ${currentUser.name}</div>
                    <div class="${isActive ? 'status-active' : 'status-blocked'}" style="font-size:0.8rem;">
                        ${isActive ? `📆 ${daysLeft} dias restantes` : '🔒 LICENÇA BLOQUEADA'}
                    </div>
                </div>
                <div class="nav-menu">
                    <button class="nav-btn" onclick="window.changeScreen('pdv')">💰 Caixa</button>
                    <button class="nav-btn" onclick="window.changeScreen('history')">📊 Histórico</button>
                    <button class="nav-btn active" onclick="window.changeScreen('admin')">⚙️ Admin</button>
                    <button class="nav-btn" onclick="window.logout()">🚪 Sair</button>
                </div>
            </div>
            <div class="main-content">
                <div class="glass-card">
                    ${alert.show ? `<div class="alert-warning">⚠️ ATENÇÃO! Sua licença expira em ${alert.days} dias! Renove com o desenvolvedor.</div>` : ''}
                    <h2 style="color:#0ff;">⚙️ Configurações</h2>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        <div>
                            <h3>🖨️ Configuração de Impressão</h3>
                            <select id="printerType" style="width:100%; margin-bottom:0.5rem;">
                                <option value="default" ${systemConfig.printerType === 'default' ? 'selected' : ''}>Impressora Padrão</option>
                                <option value="email" ${systemConfig.printerType === 'email' ? 'selected' : ''}>Enviar por E-mail</option>
                            </select>
                            <div id="emailConfig" style="${systemConfig.printerType === 'email' ? 'display:block' : 'display:none'}">
                                <input type="email" id="emailTo" placeholder="E-mail para envio" value="${systemConfig.emailTo}" style="width:100%;">
                            </div>
                            <button onclick="window.savePrinterConfig()" style="margin-top:0.5rem;">💾 Salvar</button>
                        </div>
                        <div>
                            <h3>👥 Usuários da Loja</h3>
                            <div style="max-height:150px; overflow-y:auto;">
                                ${Object.entries(store.users).map(([u, data]) => `<div class="stat-card" style="margin:5px 0;">👤 ${u} - ${data.role === 'admin' ? 'Admin' : 'Operador'}</div>`).join('')}
                            </div>
                            <div style="margin-top:10px;">
                                <input type="text" id="newUserName" placeholder="Usuário" style="width:100%; margin:5px 0;">
                                <input type="password" id="newUserPass" placeholder="Senha" style="width:100%; margin:5px 0;">
                                <select id="newUserRole" style="width:100%; margin:5px 0;">
                                    <option value="admin">Administrador</option>
                                    <option value="operator">Operador</option>
                                </select>
                                <button onclick="window.addUser()" style="width:100%;">➕ Criar Usuário</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="glass-card">
                    <h2>📦 Produtos</h2>
                    ${store.products.map(p => `
                        <div style="background:var(--card-bg);border-radius:1rem;padding:1rem;margin-bottom:1rem;">
                            <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
                                <div style="flex:2;">
                                    <strong>${p.name}</strong><br>
                                    Cód: ${p.code} | ${formatMoney(p.price)} | Estoque: ${p.stock}<br>
                                    <small class="barcode">${p.barcode}</small>
                                </div>
                                <div style="flex:1;">
                                    <input type="number" id="stock_${p.id}" value="${p.stock}" style="width:80px;">
                                    <button onclick="window.updateStock('${p.id}')">Atualizar</button>
                                </div>
                                <div style="flex:1;">
                                    <div id="uploadProduct_${p.id}"></div>
                                    ${p.image ? `<img src="${p.image}" class="preview-image">` : ''}
                                </div>
                                <div>
                                    <button onclick="window.deleteProduct('${p.id}')" class="btn-danger">Excluir</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="glass-card">
                    <h3>➕ Adicionar Produto</h3>
                    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:0.5rem;">
                        <input type="text" id="newCode" placeholder="Código">
                        <input type="text" id="newName" placeholder="Nome">
                        <input type="number" id="newPrice" placeholder="Preço" step="0.01">
                        <input type="number" id="newStock" placeholder="Estoque">
                        <input type="text" id="newBarcode" placeholder="Código Barras">
                        <button onclick="window.addNewProduct()" style="grid-column:span 5;">✨ Adicionar Produto</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPOS() {
    const store = stores[currentStore];
    const cartTotal = cart.reduce((s, i) => s + (i.product.price * i.quantity), 0);
    const alert = getExpirationAlert(currentStore);
    
    if (store.backgroundImage) {
        document.getElementById('storeBg').style.backgroundImage = `url(${store.backgroundImage})`;
    } else {
        document.getElementById('storeBg').style.backgroundImage = '';
    }
    
    setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.oninput = function() {
                const query = this.value.toLowerCase();
                const filtered = store.products.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.code.toLowerCase().includes(query) || 
                    p.barcode.includes(query)
                );
                document.getElementById('productsGrid').innerHTML = filtered.map(p => `
                    <div class="product-card" onclick="window.quickAdd('${p.id}')">
                        ${p.image ? `<img src="${p.image}" class="product-image">` : '<div class="product-image" style="display:flex;align-items:center;justify-content:center;">📦</div>'}
                        <strong>${p.name}</strong>
                        <div class="product-price">${formatMoney(p.price)}</div>
                        <div>📦 ${p.stock}</div>
                        <small class="barcode">${p.barcode}</small>
                    </div>
                `).join('');
            };
            searchInput.focus();
        }
    }, 100);
    
    return `
        <div class="app-wrapper">
            <div class="sidebar">
                <div class="logo-area">
                    <h1>SISMEGA PRO</h1>
                    <button onclick="window.toggleTheme()" style="margin-top:10px; padding:5px 15px;">🎨 Tema</button>
                </div>
                <div class="store-info">
                    <div style="font-weight:bold; font-size:1.1rem;">${store.name}</div>
                    <div style="font-size:0.8rem;">👤 ${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Operador'})</div>
                </div>
                <div class="nav-menu">
                    <button class="nav-btn active" onclick="window.changeScreen('pdv')">💰 Frente de Caixa</button>
                    <button class="nav-btn" onclick="window.changeScreen('history')">📊 Histórico</button>
                    ${currentUser.role === 'admin' ? '<button class="nav-btn" onclick="window.changeScreen(\'admin\')">⚙️ Administração</button>' : ''}
                    <button class="nav-btn" onclick="window.logout()">🚪 Sair</button>
                </div>
            </div>
            <div class="main-content">
                ${alert.show ? `<div class="alert-warning">⚠️ ATENÇÃO! Sua licença expira em ${alert.days} dias! Renove com o desenvolvedor.</div>` : ''}
                <div class="pdv-container">
                    <div>
                        <input type="text" id="searchInput" placeholder="🔍 Buscar por nome, código ou código de barras..." style="width:100%; padding:12px; margin-bottom:1rem; border-radius:2rem;">
                        <div class="products-grid" id="productsGrid">
                            ${store.products.map(p => `
                                <div class="product-card" onclick="window.quickAdd('${p.id}')">
                                    ${p.image ? `<img src="${p.image}" class="product-image">` : '<div class="product-image" style="display:flex;align-items:center;justify-content:center;">📦</div>'}
                                    <strong>${p.name}</strong>
                                    <div class="product-price">${formatMoney(p.price)}</div>
                                    <div>📦 ${p.stock}</div>
                                    <small class="barcode">${p.barcode}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="glass-card" style="display:flex; flex-direction:column; gap:1rem;">
                        <h3 style="color:#0ff;">🛒 Carrinho</h3>
                        <div style="flex:1; max-height:400px; overflow-y:auto;">
                            ${cart.length === 0 ? '<div style="text-align:center; color:var(--text-muted);">Carrinho vazio</div>' : 
                                cart.map((item, idx) => `
                                    <div class="cart-item">
                                        <div><strong>${item.product.name}</strong><br>${item.quantity} x ${formatMoney(item.product.price)}</div>
                                        <div>${formatMoney(item.product.price * item.quantity)} <button onclick="window.removeFromCart(${idx})" style="padding:5px 10px;">✖</button></div>
                                    </div>
                                `).join('')
                            }
                        </div>
                        <div class="cart-total">TOTAL: ${formatMoney(cartTotal)}</div>
                        <button onclick="window.openPaymentModal()" class="btn-success">💵 Finalizar Venda</button>
                        <button onclick="window.saveAsPending()" class="btn-warning">⏸️ Suspender Venda</button>
                    </div>
                </div>
                ${store.pendingSales.length > 0 ? `
                    <div class="glass-card" style="margin-top:1rem;">
                        <h3 style="color:#ff6600;">⏳ Vendas Suspensas</h3>
                        ${store.pendingSales.map((s, idx) => `<div class="pending-sale" onclick="window.loadPendingSale(${idx})" style="background:rgba(255,100,0,0.2); padding:8px; margin:5px 0; border-radius:0.5rem; cursor:pointer;">📅 ${s.date} - ${formatMoney(s.total)}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderSalesHistory() {
    const sales = stores[currentStore].sales;
    const totalDinheiro = sales.filter(s => s.paymentMethod === 'dinheiro').reduce((s, v) => s + v.total, 0);
    const totalDebito = sales.filter(s => s.paymentMethod === 'débito').reduce((s, v) => s + v.total, 0);
    const totalCredito = sales.filter(s => s.paymentMethod === 'crédito').reduce((s, v) => s + v.total, 0);
    const totalPix = sales.filter(s => s.paymentMethod === 'pix').reduce((s, v) => s + v.total, 0);
    const totalGeral = sales.reduce((s, v) => s + v.total, 0);
    
    return `
        <div class="app-wrapper">
            <div class="sidebar">
                <div class="logo-area"><h1>SISMEGA PRO</h1></div>
                <div class="store-info"><div>${stores[currentStore].name}</div><div>👤 ${currentUser.name}</div></div>
                <div class="nav-menu">
                    <button class="nav-btn" onclick="window.changeScreen('pdv')">💰 Caixa</button>
                    <button class="nav-btn active" onclick="window.changeScreen('history')">📊 Histórico</button>
                    ${currentUser.role === 'admin' ? '<button class="nav-btn" onclick="window.changeScreen(\'admin\')">⚙️ Admin</button>' : ''}
                    <button class="nav-btn" onclick="window.logout()">🚪 Sair</button>
                </div>
            </div>
            <div class="main-content">
                <div class="glass-card">
                    <h2 style="color:#0ff;">📊 Extrato de Vendas</h2>
                    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:1rem; margin:1.5rem 0;">
                        <div class="stat-card">💰 Dinheiro<br>${formatMoney(totalDinheiro)}</div>
                        <div class="stat-card">💳 Débito<br>${formatMoney(totalDebito)}</div>
                        <div class="stat-card">💳 Crédito<br>${formatMoney(totalCredito)}</div>
                        <div class="stat-card">📱 PIX<br>${formatMoney(totalPix)}</div>
                        <div class="stat-card" style="background:rgba(0,255,255,0.2);">🏆 TOTAL<br>${formatMoney(totalGeral)}</div>
                    </div>
                    
                    ${sales.length === 0 ? '<div style="text-align:center; padding:2rem;">📭 Nenhuma venda registrada ainda</div>' : `
                        <div style="overflow-x:auto;">
                            <table>
                                <thead>
                                    <tr><th>Data/Hora</th><th>Operador</th><th>Itens</th><th>Total</th><th>Pagamento</th></tr>
                                </thead>
                                <tbody>
                                    ${sales.slice(0, 30).map(s => `
                                        <tr>
                                            <td>${s.date}</td>
                                            <td>${s.operator}</td>
                                            <td>${s.items.length}</td>
                                            <td style="font-weight:bold;">${formatMoney(s.total)}</td>
                                            <td>${s.paymentMethod.toUpperCase()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                    
                    <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                        <button onclick="window.changeScreen('pdv')" style="flex:1;">← Voltar ao Caixa</button>
                        <button onclick="window.printSalesReport()" style="flex:1; background:linear-gradient(135deg,#ff6600,#cc4400);">🖨️ Imprimir Relatório</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== FUNÇÕES GLOBAIS ====================
window.quickAdd = (id) => { const p = stores[currentStore].products.find(p => p.id === id); if(p) addToCart(p,1); };
window.removeFromCart = removeFromCart;
window.openPaymentModal = openPaymentModal;
window.saveAsPending = saveAsPending;
window.loadPendingSale = loadPendingSale;
window.updateStock = updateStock;
window.deleteProduct = deleteProduct;

window.addNewProduct = () => {
    const code = document.getElementById('newCode')?.value;
    const name = document.getElementById('newName')?.value;
    const price = document.getElementById('newPrice')?.value;
    const stock = document.getElementById('newStock')?.value;
    const barcode = document.getElementById('newBarcode')?.value;
    if(code && name && price && stock) {
        addProduct({ code, name, price, stock, barcode });
        document.getElementById('newCode').value = '';
        document.getElementById('newName').value = '';
        document.getElementById('newPrice').value = '';
        document.getElementById('newStock').value = '';
        document.getElementById('newBarcode').value = '';
        alert(`✅ Produto "${name}" adicionado com sucesso!`);
    } else {
        alert('⚠️ Preencha todos os campos obrigatórios!');
    }
};

window.addUser = () => {
    const username = document.getElementById('newUserName')?.value;
    const password = document.getElementById('newUserPass')?.value;
    const role = document.getElementById('newUserRole')?.value;
    if(username && password) {
        if(stores[currentStore].users[username]) {
            alert('⚠️ Usuário já existe!');
            return;
        }
        stores[currentStore].users[username] = { password, role, name: username };
        saveData();
        alert(`✅ Usuário "${username}" criado com sucesso!`);
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserPass').value = '';
        renderApp();
    } else {
        alert('⚠️ Preencha usuário e senha!');
    }
};

window.updateStoreName = (storeId) => {
    const newName = document.getElementById(`storeName_${storeId}`)?.value;
    if(newName && stores[storeId]) {
        stores[storeId].name = newName;
        saveData();
        alert(`✅ Nome da loja atualizado para "${newName}"!`);
        renderApp();
    }
};

window.addDaysToStore = (storeId) => {
    const days = parseInt(document.getElementById(`licenseDays_${storeId}`)?.value);
    if(days && days > 0) {
        addDaysToStoreLicense(storeId, days);
        alert(`✅ +${days} dias adicionados para ${stores[storeId].name}!`);
        renderApp();
    } else {
        alert('⚠️ Informe a quantidade de dias!');
    }
};

window.activateStore = (storeId) => {
    const days = parseInt(document.getElementById(`licenseDays_${storeId}`)?.value);
    if(days && days > 0) {
        activateStoreLicense(storeId, days);
        alert(`✅ Loja ${stores[storeId].name} ATIVADA por ${days} dias!`);
        renderApp();
    } else {
        alert('⚠️ Informe a quantidade de dias para ativação!');
    }
};

window.blockStore = (storeId) => {
    if(confirm(`🔒 Tem certeza que deseja BLOQUEAR ${stores[storeId].name}?`)) {
        blockStoreLicense(storeId);
        alert(`🔒 Loja ${stores[storeId].name} BLOQUEADA!`);
        renderApp();
    }
};

window.deleteStoreById = (storeId) => {
    if(confirm(`🗑️ Tem certeza que deseja EXCLUIR permanentemente a loja "${stores[storeId].name}"? Esta ação não pode ser desfeita!`)) {
        delete stores[storeId];
        saveData();
        alert(`✅ Loja excluída com sucesso!`);
        renderApp();
    }
};

window.createNewStore = () => {
    const id = document.getElementById('newStoreId')?.value;
    const name = document.getElementById('newStoreName')?.value;
    const adminUser = document.getElementById('newStoreAdmin')?.value;
    const adminPass = document.getElementById('newStorePass')?.value;
    const days = parseInt(document.getElementById('newStoreDays')?.value);
    
    if(!id || !name || !adminUser || !adminPass || !days) {
        alert('⚠️ Preencha TODOS os campos para criar a loja!');
        return;
    }
    
    if(stores[id]) {
        alert('⚠️ Já existe uma loja com este ID!');
        return;
    }
    
    stores[id] = {
        id: id,
        name: name,
        backgroundImage: '',
        license: { active: true, startDate: new Date().toISOString(), daysLeft: days },
        products: [],
        users: {
            [adminUser]: { password: adminPass, role: 'admin', name: adminUser }
        },
        sales: [],
        pendingSales: []
    };
    
    saveData();
    alert(`✅ Loja "${name}" criada com sucesso!\n\n📌 Usuário Admin: ${adminUser}\n📌 Senha: ${adminPass}\n📌 Dias de licença: ${days}`);
    
    document.getElementById('newStoreId').value = '';
    document.getElementById('newStoreName').value = '';
    document.getElementById('newStoreAdmin').value = '';
    document.getElementById('newStorePass').value = '';
    document.getElementById('newStoreDays').value = '';
    renderApp();
};

window.printSalesReport = printSalesReport;

window.savePrinterConfig = () => {
    const printerType = document.getElementById('printerType').value;
    const emailTo = document.getElementById('emailTo')?.value || '';
    systemConfig.printerType = printerType;
    systemConfig.emailTo = emailTo;
    saveSystemConfig();
    alert('✅ Configuração salva!');
};

window.toggleTheme = () => {
    const newClass = document.body.className === 'theme-dark' ? 'theme-light' : 'theme-dark';
    document.body.className = newClass;
    renderApp();
};

window.changeScreen = (screen) => { 
    currentScreen = screen; 
    renderApp(); 
};

window.logout = () => { 
    currentUser = null; 
    cart = []; 
    currentStore = '';
    currentScreen = 'login'; 
    renderApp(); 
};

function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;
    
    if (currentScreen === 'login') {
        app.innerHTML = renderLogin();
        document.getElementById('loginBtn').onclick = () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Login do desenvolvedor
            if (username === 'dev' && password === 'dev123') {
                currentUser = { username: 'dev', role: 'developer', name: 'Desenvolvedor' };
                currentScreen = 'dev';
                renderApp();
                return;
            }
            
            // Procurar em todas as lojas
            for (let storeId in stores) {
                const user = stores[storeId]?.users[username];
                if (user && user.password === password) {
                    if (!checkStoreLicense(storeId)) {
                        alert(`⚠️ Licença da loja ${stores[storeId].name} expirada! Contate o desenvolvedor.`);
                        return;
                    }
                    currentUser = { ...user, username: username };
                    currentStore = storeId;
                    cart = [];
                    currentScreen = 'pdv';
                    renderApp();
                    return;
                }
            }
            alert('❌ Usuário ou senha inválidos!');
        };
    } else if (currentScreen === 'dev') {
        app.innerHTML = renderDevPanel();
        if (document.getElementById('uploadLoginArea') && !document.getElementById('uploadLoginArea').hasChildNodes()) {
            document.getElementById('uploadLoginArea').appendChild(createUploadArea('login_bg', null, '🎨 Fundo da Tela de Login'));
            document.getElementById('uploadDevArea').appendChild(createUploadArea('dev_bg', null, '🎨 Fundo da Área do Desenvolvedor'));
        }
        Object.keys(stores).forEach(id => {
            const container = document.getElementById(`uploadStoreBg_${id}`);
            if (container && !container.hasChildNodes()) {
                container.appendChild(createUploadArea('store_bg', id, '🎨 Fundo Personalizado da Loja'));
            }
        });
    } else if (currentScreen === 'pdv') {
        if (!checkStoreLicense(currentStore)) {
            alert(`⚠️ Licença da loja ${stores[currentStore].name} expirada!`);
            logout();
            return;
        }
        app.innerHTML = renderPOS();
    } else if (currentScreen === 'history') {
        app.innerHTML = renderSalesHistory();
    } else if (currentScreen === 'admin' && currentUser?.role === 'admin') {
        if (!checkStoreLicense(currentStore)) {
            alert(`⚠️ Licença da loja ${stores[currentStore].name} expirada!`);
            logout();
            return;
        }
        app.innerHTML = renderAdminPanel();
        stores[currentStore].products.forEach(p => {
            const container = document.getElementById(`uploadProduct_${p.id}`);
            if (container && !container.hasChildNodes()) {
                container.appendChild(createUploadArea('product_image', p.id, '📦 Imagem do Produto'));
            }
        });
        
        const printerSelect = document.getElementById('printerType');
        const emailDiv = document.getElementById('emailConfig');
        if (printerSelect) {
            printerSelect.onchange = () => {
                emailDiv.style.display = printerSelect.value === 'email' ? 'block' : 'none';
            };
        }
    }
}

// Inicializar
loadData();
loadSystemConfig();
renderApp();