// Dados de usuários (simulado - em produção usar banco de dados)
const usuarios = [
    { username: 'caixa', password: '123456', type: 'caixa', nome: 'Operador Caixa' },
    { username: 'revendedor', password: '123456', type: 'revendedor', nome: 'João Revendedor', codigo: 'REV001' },
    { username: 'promotor', password: '123456', type: 'promotor', nome: 'Maria Promotora', codigo: 'PRO001' },
    { username: 'admin', password: 'admin123', type: 'caixa', nome: 'Administrador' }
];

let currentUser = null;
let currentScreen = 'caixa';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está logado
    const savedUser = localStorage.getItem('pharmaUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
    
    // Event Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const screen = this.dataset.screen;
            switchScreen(screen);
        });
    });
    
    // Tecla F12 para finalizar venda
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' && currentScreen === 'caixa') {
            e.preventDefault();
            finalizarVenda();
        }
    });
    
    // Busca de produtos
    document.getElementById('productSearch').addEventListener('input', filtrarProdutos);
    document.getElementById('estoqueSearch').addEventListener('input', filtrarEstoque);
    document.getElementById('categoriaFilter').addEventListener('change', filtrarEstoque);
    
    // Modal
    document.getElementById('produtoForm').addEventListener('submit', salvarProduto);
});

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;
    
    const user = usuarios.find(u => u.username === username && u.password === password && u.type === userType);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('pharmaUser', JSON.stringify(user));
        showDashboard();
        showNotification('Login realizado com sucesso!', 'success');
    } else {
        showNotification('Usuário ou senha inválidos!', 'error');
    }
}

function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    document.getElementById('currentUser').textContent = currentUser.nome;
    
    if (currentUser.type === 'revendedor' || currentUser.type === 'promotor') {
        document.getElementById('revendedorNome').textContent = currentUser.nome;
        document.getElementById('revendedorCodigo').textContent = `Código: ${currentUser.codigo}`;
        switchScreen('mobile');
    } else {
        switchScreen('caixa');
        carregarProdutos();
    }
}

function switchScreen(screen) {
    currentScreen = screen;
    
    // Atualizar navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screen) {
            btn.classList.add('active');
        }
    });
    
    // Mostrar tela correspondente
    document.querySelectorAll('.content-screen').forEach(s => {
        s.classList.remove('active');
    });
    
    const screenMap = {
        'caixa': 'caixaScreen',
        'estoque': 'estoqueScreen',
        'mobile': 'mobileScreen',
        'relatorios': 'relatoriosScreen'
    };
    
    document.getElementById(screenMap[screen]).classList.add('active');
    
    // Carregar dados específicos
    if (screen === 'caixa') carregarProdutos();
    if (screen === 'estoque') carregarEstoque();
    if (screen === 'mobile') carregarProdutosMobile();
    if (screen === 'relatorios') carregarRelatorios();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('pharmaUser');
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
}

function showNotification(message, type) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}