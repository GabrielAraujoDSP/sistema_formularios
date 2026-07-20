/* ── Endpoint do backend ─────────────────────────────────────────
     O URL é necessário aqui pois o navegador faz as chamadas à API.
     A segurança NÃO depende de ocultar este URL — depende dos tokens
     de sessão: sem um token válido, nenhuma ação retorna dados.
  ─────────────────────────────────────────────────────────────────── */
  function endpoint() {
    return 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec';
  }

  /* ── Sessão (token armazenado apenas na sessão do navegador) ───── */
  function getToken() { return sessionStorage.getItem('admin_token') || ''; }
  function getPapel() { return sessionStorage.getItem('admin_papel') || ''; }
  function getEmail() { return sessionStorage.getItem('admin_email') || ''; }

  /* ── Estados globais ─────────────────────────────────────────────── */
  const COLUNAS = [
    { id: 'nova',             label: 'Novo',                  emoji: '🟡', cls: 'col-nova'            },
    { id: 'reprovada',        label: 'Reprovado',             emoji: '🔴', cls: 'col-reprovada'       },
    { id: 'concluida',        label: 'Aprovado',              emoji: '🟢', cls: 'col-concluida'       },
    { id: 'confeccao',        label: 'Confecção de Contrato', emoji: '🔵', cls: 'col-confeccao'       },
    { id: 'contrato_enviado', label: 'Contrato Enviado',      emoji: '📬', cls: 'col-contrato-enviado'},
  ];

  let interfaceAtual = 'kanban';
  let abaAtiva       = 'nova';
  let fichasTodas    = [];
  let revisaoLocal   = null;
  let timerPolling   = null;
  let fichaAtual     = null;
  let fichaEditando  = null;

  /* ── Inicialização ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    if (getToken()) mostrarApp();
    inicializarLinks();
  });

  /* ── Links dos formulários ───────────────────────────────────────── */
  function inicializarLinks() {
    const BASE = 'https://formulario-residencial-locatarios.vercel.app/';
    document.getElementById('url-locatario').value = BASE + 'formulario.html';
    document.getElementById('href-locatario').href = BASE + 'formulario.html';
    // url-locador mantém placeholder até o formulário ser liberado
  }

  function toggleLinks() {
    const painel = document.getElementById('painel-links');
    const btn    = document.getElementById('btn-links');
    const aberto = painel.classList.toggle('aberto');
    painel.setAttribute('aria-hidden', String(!aberto));
    btn.classList.toggle('ativo', aberto);
  }

  function copiarLink(inputId, btn) {
    const input = document.getElementById(inputId);
    navigator.clipboard.writeText(input.value).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.classList.add('copiado');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copiado'); }, 2000);
    });
  }

  /* ── Telas ───────────────────────────────────────────────────────── */
  function mostrarLogin() {
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function mostrarApp() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    const isAdmin = getPapel() === 'admin';
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
    document.getElementById('header-email').textContent = getEmail();
    carregarFichas();
    iniciarPolling();
  }

  /* ── Login ───────────────────────────────────────────────────────── */
  function toggleSenhaLogin(btn) {
    const input = document.getElementById('login-senha');
    const aberto = btn.querySelector('.olho-aberto');
    const fechado = btn.querySelector('.olho-fechado');
    if (input.type === 'password') {
      input.type = 'text';
      aberto.style.display = 'none';
      fechado.style.display = '';
    } else {
      input.type = 'password';
      aberto.style.display = '';
      fechado.style.display = 'none';
    }
  }

  async function fazerLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const senha = document.getElementById('login-senha').value;
    const erroEl = document.getElementById('erro-login');
    const btn    = document.getElementById('btn-entrar');
    erroEl.style.display = 'none';

    if (!email || !senha) {
      erroEl.textContent = 'Preencha e-mail e senha.';
      erroEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verificando…';

    try {
      const res  = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ acao: 'login', email, senha })
      });
      const json = await res.json();

      if (json.status === 'ok') {
        sessionStorage.setItem('admin_token', json.token);
        sessionStorage.setItem('admin_papel', json.papel);
        sessionStorage.setItem('admin_email', json.email);
        mostrarApp();
      } else {
        erroEl.textContent = 'E-mail ou senha incorretos.';
        erroEl.style.display = 'block';
      }
    } catch (err) {
      erroEl.textContent = 'Erro de conexão. Verifique a URL do backend.';
      erroEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  }

  document.getElementById('login-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
  document.getElementById('login-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-senha').focus();
  });

  /* ── Logout ──────────────────────────────────────────────────────── */
  async function sair() {
    pararPolling();
    const token = getToken();
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_papel');
    sessionStorage.removeItem('admin_email');
    document.getElementById('login-email').value = '';
    document.getElementById('login-senha').value = '';
    mostrarLogin();
    try {
      await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ acao: 'logout', token })
      });
    } catch (e) {}
  }

  /* ── Fetch autenticado — redireciona ao login se token expirar ─── */
  async function apiFetch(url, options) {
    const res  = await fetch(url, options);
    const json = await res.json();
    if (json.status === 'auth_error') {
      sair();
      return null;
    }
    return json;
  }

  /* ── POST autenticado — token no corpo JSON, nunca na URL ──────── */
  async function apiPost(payload) {
    return apiFetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(Object.assign({ token: getToken() }, payload))
    });
  }

  /* ── Polling — atualização em tempo real (30 s) ─────────────────── */
  function iniciarPolling() {
    pararPolling();
    revisaoLocal = null;
    timerPolling = setInterval(verificarAtualizacoes, 30000);
    document.getElementById('badge-live').style.display = 'inline';
  }

  function pararPolling() {
    if (timerPolling) { clearInterval(timerPolling); timerPolling = null; }
    const b = document.getElementById('badge-live');
    if (b) b.style.display = 'none';
  }

  // Celulares pausam setInterval quando a tela apaga ou o app vai para segundo plano.
  // Ao voltar para a página, verifica imediatamente e reinicia o intervalo do zero.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timerPolling) {
      verificarAtualizacoes();
      clearInterval(timerPolling);
      timerPolling = setInterval(verificarAtualizacoes, 30000);
    }
  });

  async function verificarAtualizacoes() {
    try {
      const json = await apiPost({ acao: 'ping' });
      if (!json) { pararPolling(); return; } // token expirou — apiFetch já chamou sair()
      const rev = String(json.revisao || '0');
      if (revisaoLocal !== null && rev !== revisaoLocal) {
        revisaoLocal = rev;
        const modalAberto = ['overlay-modal', 'overlay-editar', 'overlay-usuarios']
          .some(id => document.getElementById(id).classList.contains('ativo'));
        if (!modalAberto) await carregarFichas(true);
      } else {
        revisaoLocal = rev;
      }
    } catch (_) { /* erro de rede — aguarda o próximo ciclo */ }
  }

  /* ── Fichas ──────────────────────────────────────────────────────── */
  async function carregarFichas(silencioso = false) {
    if (!silencioso) {
      document.getElementById('kanban-board').innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;padding:40px;width:100%"><div class="spinner"></div><span style="color:var(--muted)">Carregando fichas…</span></div>';
    }
    try {
      const json = await apiPost({ acao: 'listar' });
      if (!json) return;
      fichasTodas = json.fichas || [];
      renderKanban();
    } catch (err) {
      if (!silencioso) {
        document.getElementById('kanban-board').innerHTML =
          `<div style="text-align:center;padding:40px;color:var(--muted);width:100%">
            <div style="font-size:2rem">⚠️</div>
            <p style="margin-top:10px">Erro ao carregar fichas.<br><small>${esc(err.message)}</small></p>
          </div>`;
      }
    }
  }

  function fichasFiltradas() {
    const busca    = (document.getElementById('busca').value || '').toLowerCase();
    const corretor = document.getElementById('filtro-corretor').value;
    return fichasTodas.filter(f => {
      const okBusca    = !busca    || (f.nome||'').toLowerCase().includes(busca) || (f.cpf||'').includes(busca);
      const okCorretor = !corretor || f.corretor === corretor;
      return okBusca && okCorretor;
    });
  }

  /* ── Interface (Kanban / Abas) ───────────────────────────────────── */
  function trocarInterface() {
    interfaceAtual = interfaceAtual === 'kanban' ? 'abas' : 'kanban';
    document.getElementById('view-kanban').style.display = interfaceAtual === 'kanban' ? 'block' : 'none';
    document.getElementById('view-abas').style.display   = interfaceAtual === 'abas'   ? 'block' : 'none';
    document.getElementById('btn-trocar').textContent    = interfaceAtual === 'kanban' ? '⊞ Trocar interface' : '⊟ Trocar interface';
    renderKanban();
  }

  function renderKanban() {
    atualizarStats();
    if (interfaceAtual === 'abas') { renderAbas(); return; }

    const lista = fichasFiltradas();
    document.getElementById('kanban-board').innerHTML = COLUNAS.map(col => {
      const fichasCol = lista.filter(f => (f.status || 'nova') === col.id);
      const cardsHtml = fichasCol.length
        ? fichasCol.map(f => cardKanban(f, col.id)).join('')
        : '<div class="col-vazia"><div class="vi">📭</div>Nenhuma ficha</div>';
      return `
        <div class="kanban-col ${col.cls}">
          <div class="col-header">
            <span>${col.emoji} ${col.label}</span>
            <span class="col-count">${fichasCol.length}</span>
          </div>
          <div class="col-cards">${cardsHtml}</div>
        </div>`;
    }).join('');
  }

  function atualizarStats() {
    document.getElementById('s-total').textContent = fichasTodas.length;
    COLUNAS.forEach(c => {
      const el = document.getElementById('s-' + c.id);
      if (el) el.textContent = fichasTodas.filter(f => (f.status || 'nova') === c.id).length;
    });
    const novas = fichasTodas.filter(f => (f.status || 'nova') === 'nova').length;
    const badge = document.getElementById('badge-novas');
    if (novas > 0) { badge.style.display = 'inline'; badge.textContent = `${novas} nova${novas > 1 ? 's' : ''}`; }
    else badge.style.display = 'none';
  }

  /* ── View Abas ───────────────────────────────────────────────────── */
  function setAba(statusId) { abaAtiva = statusId; renderAbas(); }

  function renderAbas() {
    const lista = fichasFiltradas();
    document.getElementById('aba-nav').innerHTML = COLUNAS.map(c => {
      const total = fichasTodas.filter(f => (f.status || 'nova') === c.id).length;
      const ativa = abaAtiva === c.id ? ' ativa' : '';
      return `<button class="aba-btn aba-${c.id}${ativa}" onclick="setAba('${c.id}')">
        ${c.emoji} ${c.label} <span class="ab-count">${total}</span>
      </button>`;
    }).join('');

    const fichasAba = lista.filter(f => (f.status || 'nova') === abaAtiva);
    const grid = document.getElementById('grid-abas');
    if (!fichasAba.length) {
      grid.innerHTML = `<div class="sem-fichas-aba"><div class="icon">📭</div><p>Nenhuma ficha nesta coluna.</p></div>`;
      return;
    }
    grid.innerHTML = fichasAba.map(f => cardGrande(f)).join('');
  }

  function cardGrande(f) {
    const col     = COLUNAS.find(c => c.id === (f.status || 'nova')) || COLUNAS[0];
    const tipoAs  = f.tipo_assinatura === 'digital' ? '💻 Digital' : f.tipo_assinatura === 'fisica' ? '🖨️ Física' : '—';
    const tipoIm  = String(f.tipo_imovel || '').toLowerCase() === 'comercial' ? '🏢 Comercial' : '🏠 Residencial';
    const isAdmin = getPapel() === 'admin';
    const btnsMover = isAdmin ? COLUNAS
      .filter(c => c.id !== (f.status || 'nova'))
      .map(c => `<button class="btn-mv bm-${c.id}" onclick="moverFichaAba('${esc(f.id)}','${c.id}')">${c.emoji} ${c.label}</button>`)
      .join('') : '';
    const vigIniG = dataParaInput(f.vigencia_inicio);
    const vigHtml = isAdmin
      ? `<div class="card-g-vigencia vig-container" data-id="${esc(f.id)}">
          <div class="vig-titulo">📅 Vigência do Contrato</div>
          <div class="vig-row">
            <div class="vig-campo"><label>Início</label><input type="date" class="v-ini" value="${esc(vigIniG)}"></div>
            <button class="btn-vig-salvar" onclick="salvarVigencia('${esc(f.id)}', this)">💾</button>
          </div>
          ${vigIniG ? `<div class="vig-texto vig-texto--set">📅 Início: ${formatarDataVig(f.vigencia_inicio)}</div>` : ''}
        </div>`
      : (f.vigencia_inicio
          ? `<div class="card-g-vigencia">
              <div class="vig-titulo">📅 Vigência do Contrato</div>
              <div class="vig-texto vig-texto--set">📅 Início: ${formatarDataVig(f.vigencia_inicio)}</div>
            </div>`
          : '');
    return `
      <div class="card-g">
        <div class="card-g-body" onclick="abrirModal('${esc(f.id)}')">
          <span class="card-g-badge" style="${statusStyle(f.status || 'nova')}">${col.emoji} ${col.label}</span>
          <div class="card-g-nome">${esc(f.nome || '—')}</div>
          <div class="card-g-cpf">CPF: ${esc(f.cpf || '—')}</div>
          <div class="card-g-info">
            ${tipoIm} &nbsp;|&nbsp; 🏢 Imóvel: <strong>${esc(f.codigo_imovel || '—')}</strong><br>
            👔 Corretor: ${esc(f.corretor || '—')}<br>
            🔒 Garantia: ${esc(f.tipo_garantia || '—')} &nbsp;|&nbsp; Assinatura: ${tipoAs}
          </div>
          <div class="card-g-data">📅 ${esc(f.data_envio || '—')} &nbsp;·&nbsp; Prot: <strong>${esc(f.id || '—')}</strong></div>
        </div>
        ${vigHtml}
        <div class="card-g-footer">
          ${isAdmin ? `<div class="mover-label">Mover para</div><div class="mover-btns">${btnsMover}</div>` : ''}
          <div class="card-k-acoes">
            <button class="btn-ac btn-ver" onclick="abrirModal('${esc(f.id)}')">🔍 Ver</button>
            ${isAdmin ? `
            <button class="btn-ac btn-editar"  onclick="abrirEditar('${esc(f.id)}')">✏️ Editar</button>
            <button class="btn-ac btn-excluir" onclick="excluirFichaAba('${esc(f.id)}')">🗑️ Excluir</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function moverFichaAba(id, novoStatus) {
    const f = fichasTodas.find(x => x.id === id);
    if (!f) return;
    f.status = novoStatus;
    atualizarStats(); renderAbas();
    fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'status', token: getToken(), id, status: novoStatus }) })
      .catch(() => {});
  }

  function excluirFichaAba(id) {
    const f = fichasTodas.find(x => x.id === id);
    if (!f) return;
    if (!confirm(`Excluir a ficha de "${f.nome || id}"?\nEsta ação não pode ser desfeita.`)) return;
    fichasTodas = fichasTodas.filter(x => x.id !== id);
    atualizarStats(); renderAbas();
    fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'excluir', token: getToken(), id }) }).catch(() => {});
  }

  function cardKanban(f, statusAtual) {
    const tipoAs    = f.tipo_assinatura === 'digital' ? '💻 Digital' : f.tipo_assinatura === 'fisica' ? '🖨️ Física' : '—';
    const tipoIm    = String(f.tipo_imovel || '').toLowerCase() === 'comercial' ? '🏢 Comercial' : '🏠 Residencial';
    const isAdmin   = getPapel() === 'admin';
    const btnsMover = isAdmin ? COLUNAS
      .filter(c => c.id !== statusAtual)
      .map(c => `<button class="btn-mv bm-${c.id}" onclick="moverFicha('${esc(f.id)}','${c.id}')">${c.emoji} ${c.label}</button>`)
      .join('') : '';
    const vigIni = dataParaInput(f.vigencia_inicio);
    const vigHtml = isAdmin
      ? `<div class="card-k-vigencia vig-container" data-id="${esc(f.id)}">
          <div class="vig-titulo">📅 Vigência do Contrato</div>
          <div class="vig-row">
            <div class="vig-campo"><label>Início</label><input type="date" class="v-ini" value="${esc(vigIni)}"></div>
            <button class="btn-vig-salvar" onclick="salvarVigencia('${esc(f.id)}', this)">💾</button>
          </div>
          ${vigIni ? `<div class="vig-texto vig-texto--set">📅 Início: ${formatarDataVig(f.vigencia_inicio)}</div>` : ''}
        </div>`
      : (f.vigencia_inicio
          ? `<div class="card-k-vigencia">
              <div class="vig-titulo">📅 Vigência do Contrato</div>
              <div class="vig-texto vig-texto--set">📅 Início: ${formatarDataVig(f.vigencia_inicio)}</div>
            </div>`
          : '');
    return `
      <div class="card-k">
        <div class="card-k-body" onclick="abrirModal('${esc(f.id)}')">
          <div class="card-k-nome">${esc(f.nome || '—')}</div>
          <div class="card-k-cpf">CPF: ${esc(f.cpf || '—')}</div>
          <div class="card-k-info">
            ${tipoIm} · 🏢 <strong>${esc(f.codigo_imovel || '—')}</strong><br>
            👔 ${esc(f.corretor || '—')}<br>
            🔒 ${esc(f.tipo_garantia || '—')} · ${tipoAs}
          </div>
          <div class="card-k-data">📅 ${esc(f.data_envio || '—')} · Prot: ${esc(f.id || '—')}</div>
        </div>
        ${vigHtml}
        <div class="card-k-footer">
          ${isAdmin ? `<div class="mover-label">Mover para</div><div class="mover-btns">${btnsMover}</div>` : ''}
          <div class="card-k-acoes">
            <button class="btn-ac btn-ver" onclick="abrirModal('${esc(f.id)}')">🔍 Ver</button>
            ${isAdmin ? `
            <button class="btn-ac btn-editar"  onclick="abrirEditar('${esc(f.id)}')">✏️ Editar</button>
            <button class="btn-ac btn-excluir" onclick="excluirFicha('${esc(f.id)}')">🗑️ Excluir</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  /* ── Mover / Excluir ─────────────────────────────────────────────── */
  function moverFicha(id, novoStatus) {
    const f = fichasTodas.find(x => x.id === id);
    if (!f) return;
    f.status = novoStatus;
    renderKanban();
    fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'status', token: getToken(), id, status: novoStatus }) })
      .catch(err => console.error('Erro ao salvar status:', err));
  }

  function excluirFicha(id) {
    const f = fichasTodas.find(x => x.id === id);
    if (!f) return;
    if (!confirm(`Excluir a ficha de "${f.nome || id}"?\nEsta ação não pode ser desfeita.`)) return;
    fichasTodas = fichasTodas.filter(x => x.id !== id);
    renderKanban();
    fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'excluir', token: getToken(), id }) })
      .catch(() => {});
  }

  function marcarTodasLidas() {
    const novas = fichasTodas.filter(f => (f.status || 'nova') === 'nova');
    if (!novas.length) { alert('Não há fichas novas.'); return; }
    if (!confirm(`Marcar ${novas.length} ficha(s) como "Confecção de Contrato"?`)) return;
    novas.forEach(f => { f.status = 'confeccao'; });
    renderKanban();
    novas.forEach(f =>
      fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ acao: 'status', token: getToken(), id: f.id, status: 'confeccao' }) })
        .catch(() => {})
    );
  }

  /* ── Modal Detalhe ───────────────────────────────────────────────── */
  function abrirModal(id) {
    fichaAtual = fichasTodas.find(f => f.id === id);
    if (!fichaAtual) return;
    document.getElementById('modal-titulo').textContent = `Ficha: ${fichaAtual.nome || '—'}`;
    document.getElementById('modal-corpo').innerHTML = renderDetalhe(fichaAtual);
    document.getElementById('overlay-modal').classList.add('ativo');
  }

  function fecharModal() {
    document.getElementById('overlay-modal').classList.remove('ativo');
    fichaAtual = null;
  }

  document.getElementById('overlay-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay-modal')) fecharModal();
  });

  /* ── Modal Edição ────────────────────────────────────────────────── */
  function abrirEditar(id) {
    fichaEditando = fichasTodas.find(f => f.id === id);
    if (!fichaEditando) return;
    const f = fichaEditando;
    const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
    set('e-corretor', f.corretor);
    set('e-codigo_imovel', f.codigo_imovel);
    set('e-tipo_garantia', f.tipo_garantia);
    set('e-nome', f.nome);
    set('e-cpf', f.cpf);
    set('e-nascimento', f.nascimento);
    set('e-estado_civil', f.estado_civil);
    set('e-profissao', f.profissao);
    set('e-email', f.email);
    set('e-celular', f.celular);
    set('e-endereco_logradouro', f.endereco_logradouro);
    set('e-endereco_numero', f.endereco_numero);
    set('e-endereco_bairro', f.endereco_bairro);
    set('e-endereco_complemento', f.endereco_complemento);
    set('e-endereco_lote', f.endereco_lote);
    set('e-endereco_quadra', f.endereco_quadra);
    set('e-cep_atual', f.cep_atual);
    set('e-cidade_atual', f.cidade_atual);
    set('e-estado_atual', f.estado_atual);
    set('e-emerg_nome', f.emerg_nome);
    set('e-emerg_cel', f.emerg_cel);
    set('e-emerg_parentesco', f.emerg_parentesco);
    document.getElementById('overlay-editar').classList.add('ativo');
  }

  function fecharEditar() {
    document.getElementById('overlay-editar').classList.remove('ativo');
    fichaEditando = null;
  }

  document.getElementById('overlay-editar').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay-editar')) fecharEditar();
  });

  function salvarEdicao() {
    if (!fichaEditando) return;
    const get = id => (document.getElementById(id) || {}).value || '';
    Object.assign(fichaEditando, {
      corretor: get('e-corretor'), codigo_imovel: get('e-codigo_imovel'),
      tipo_garantia: get('e-tipo_garantia'), nome: get('e-nome'),
      cpf: get('e-cpf'), nascimento: get('e-nascimento'),
      estado_civil: get('e-estado_civil'), profissao: get('e-profissao'),
      email: get('e-email'), celular: get('e-celular'),
      endereco_logradouro: get('e-endereco_logradouro'), endereco_numero: get('e-endereco_numero'),
      endereco_bairro: get('e-endereco_bairro'), endereco_complemento: get('e-endereco_complemento'),
      endereco_lote: get('e-endereco_lote'), endereco_quadra: get('e-endereco_quadra'),
      cep_atual: get('e-cep_atual'), cidade_atual: get('e-cidade_atual'),
      estado_atual: get('e-estado_atual'),
      emerg_nome: get('e-emerg_nome'), emerg_cel: get('e-emerg_cel'),
      emerg_parentesco: get('e-emerg_parentesco'),
    });
    fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'editar', token: getToken(), id: fichaEditando.id, dados: fichaEditando }),
    }).catch(() => {});
    fecharEditar();
    renderKanban();
  }

  /* ── Gerenciar Usuários ──────────────────────────────────────────── */
  async function abrirUsuarios() {
    document.getElementById('overlay-usuarios').classList.add('ativo');
    await carregarUsuarios();
  }

  function fecharUsuarios() {
    document.getElementById('overlay-usuarios').classList.remove('ativo');
    document.getElementById('nu-email').value = '';
    document.getElementById('nu-senha').value = '';
    document.getElementById('nu-senha2').value = '';
    document.getElementById('nu-ok').style.display = 'none';
    document.getElementById('nu-err').style.display = 'none';
  }

  document.getElementById('overlay-usuarios').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay-usuarios')) fecharUsuarios();
  });

  async function carregarUsuarios() {
    document.getElementById('lista-usuarios').innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;color:var(--muted);padding:10px 0"><div class="spinner"></div> Carregando…</div>';

    const json = await apiPost({ acao: 'listar_usuarios' });
    if (!json) return;

    const usuarios = json.usuarios || [];
    if (!usuarios.length) {
      document.getElementById('lista-usuarios').innerHTML =
        '<p style="color:var(--muted);padding:10px 0">Nenhum usuário cadastrado.</p>';
      return;
    }

    document.getElementById('lista-usuarios').innerHTML = `
      <table class="usuarios-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Criado em</th>
            <th>Status</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${usuarios.map(u => {
            const ativo = u.ativo === true || String(u.ativo).toUpperCase() === 'TRUE';
            const sou   = u.email === getEmail();
            return `<tr>
              <td style="font-weight:600">${esc(u.email)}</td>
              <td><span class="badge-papel badge-${esc(u.papel)}">${u.papel === 'admin' ? '⭐ Admin' : 'Usuário'}</span></td>
              <td style="color:var(--muted);font-size:.78rem">${esc(String(u.criado_em||''))}</td>
              <td><span class="badge-papel ${ativo ? 'badge-ativo' : 'badge-inativo'}">${ativo ? '✅ Ativo' : '❌ Inativo'}</span></td>
              <td style="text-align:right">
                ${sou
                  ? '<span style="font-size:.75rem;color:var(--muted)">(sua conta)</span>'
                  : `<div style="display:flex;gap:5px;justify-content:flex-end">
                      <button class="btn-ac ${ativo ? 'btn-excluir' : 'btn-editar'}"
                          onclick="toggleUsuario('${esc(u.email)}', ${!ativo})">
                          ${ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button class="btn-ac btn-excluir" style="opacity:.75"
                          onclick="excluirUsuario('${esc(u.email)}')">
                          🗑️
                      </button>
                    </div>`
                }
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  async function criarUsuario() {
    const email = document.getElementById('nu-email').value.trim().toLowerCase();
    const senha = document.getElementById('nu-senha').value;
    const senha2 = document.getElementById('nu-senha2').value;
    const papel = document.getElementById('nu-papel').value;
    const okEl  = document.getElementById('nu-ok');
    const errEl = document.getElementById('nu-err');
    okEl.style.display = 'none';
    errEl.style.display = 'none';

    if (!email || email.indexOf('@') === -1) {
      errEl.textContent = 'E-mail inválido.'; errEl.style.display = 'inline'; return;
    }
    if (!senha || senha.length < 6) {
      errEl.textContent = 'Senha deve ter no mínimo 6 caracteres.'; errEl.style.display = 'inline'; return;
    }
    if (senha !== senha2) {
      errEl.textContent = 'As senhas não coincidem.'; errEl.style.display = 'inline'; return;
    }

    const json = await apiFetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'criar_usuario', token: getToken(), novo_email: email, nova_senha: senha, novo_papel: papel })
    });
    if (!json) return;

    if (json.status === 'ok') {
      document.getElementById('nu-email').value = '';
      document.getElementById('nu-senha').value = '';
      document.getElementById('nu-senha2').value = '';
      okEl.style.display = 'inline';
      setTimeout(() => { okEl.style.display = 'none'; }, 4000);
      await carregarUsuarios();
    } else {
      errEl.textContent = json.message || 'Erro ao criar usuário.';
      errEl.style.display = 'inline';
    }
  }

  async function excluirUsuario(email) {
    if (!confirm(`Excluir permanentemente o usuário "${email}"?\n\nEsta ação não pode ser desfeita.`)) return;
    const json = await apiFetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'excluir_usuario', token: getToken(), email_alvo: email })
    });
    if (!json) return;
    if (json.status === 'ok') await carregarUsuarios();
    else alert(json.message || 'Erro ao excluir usuário.');
  }

  async function toggleUsuario(email, ativo) {
    const json = await apiFetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ acao: 'atualizar_usuario', token: getToken(), email_alvo: email, ativo })
    });
    if (!json) return;
    if (json.status === 'ok') await carregarUsuarios();
    else alert(json.message || 'Erro ao atualizar usuário.');
  }

  /* ── Download em massa de documentos do Drive ───────────────────── */
  function driveToDownload(url) {
    const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? 'https://drive.google.com/uc?export=download&id=' + m[1] : url;
  }

  function baixarTodosDocumentos(btn) {
    const f = fichaAtual;
    if (!f) return;
    const campos = [
      'doc_identificacao_url', 'comprovante_residencia_url', 'aprovacao_seguro_url',
      'pj_balancete_url', 'pj_contrato_social_url', 'pj_cartao_cnpj_url', 'pj_extrato_simples_url',
      'conj_doc_url'
    ];
    for (let i = 1; i <= 10; i++) {
      campos.push(`soc${i}_doc_id_url`, `soc${i}_comp_res_url`);
      campos.push(`loc${i}_doc_id_url`, `loc${i}_comp_res_url`);
    }
    const urls = campos.map(c => f[c]).filter(u => u && String(u).startsWith('http'));
    if (!urls.length) { alert('Esta ficha não possui documentos anexados.'); return; }
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = `⏳ Abrindo ${urls.length}…`;
    urls.forEach((url, i) => setTimeout(() => window.open(driveToDownload(url), '_blank'), i * 700));
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, urls.length * 700 + 500);
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function esc(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Converte qualquer formato de data (dd/mm/yyyy, yyyy-mm-dd, ISO) para o valor de <input type="date"> (yyyy-mm-dd)
  function dataParaInput(s) {
    if (!s) return '';
    s = String(s);
    const mBR  = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mBR) return mBR[3] + '-' + mBR[2] + '-' + mBR[1];
    const mISO = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return mISO ? mISO[1] + '-' + mISO[2] + '-' + mISO[3] : '';
  }

  // Converte qualquer formato de data para exibição dd/mm/yyyy
  function formatarDataVig(s) {
    if (!s) return '—';
    s = String(s);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
  }

  function labelStatus(s) {
    const c = COLUNAS.find(x => x.id === s);
    return c ? `${c.emoji} ${c.label}` : (s || '—');
  }

  function statusStyle(s) {
    const map = {
      nova:             'background:#fef3c7;color:#78350f',
      reprovada:        'background:#fee2e2;color:#7f1d1d',
      concluida:        'background:#d1fae5;color:#064e3b',
      confeccao:        'background:#dbeafe;color:#1e3a8a',
      contrato_enviado: 'background:#e2e8f0;color:#334155',
    };
    return map[s] || 'background:#f1f5f9;color:#374151';
  }

  const campo = (label, valor) =>
    `<div class="campo-det"><label>${label}</label><span>${esc(valor)}</span></div>`;

  function secaoDetalhe(titulo, campos) {
    return `<div class="secao-detalhe"><h4>${titulo}</h4><div class="detalhe-grid">${campos.join('')}</div></div>`;
  }

  function renderDetalhe(f) {
    let html = `<div style="margin-bottom:14px;">
      <span style="font-size:.8rem;padding:4px 12px;border-radius:20px;font-weight:700;${statusStyle(f.status)}">${labelStatus(f.status)}</span>
      <span style="margin-left:12px;font-size:.8rem;color:var(--muted)">
        Enviado em: <strong>${esc(f.data_envio)}</strong> &nbsp;|&nbsp; Protocolo: <strong>${esc(f.id)}</strong>
      </span>
    </div>`;

    var _tipoImModal = String(f.tipo_imovel || '').toLowerCase();
    html += secaoDetalhe('🏢 Dados do Imóvel', [
      campo('Tipo de imóvel', _tipoImModal === 'comercial' ? '🏢 Comercial' : '🏠 Residencial'),
      campo('Corretor', f.corretor), campo('Código do imóvel', f.codigo_imovel),
      campo('Vaga', f.tem_vaga === 'sim' ? `Sim (${f.qtd_vagas} vaga${f.qtd_vagas > 1 ? 's' : ''})` : 'Não'),
      campo('Tipo de garantia', f.tipo_garantia),
    ]);

    if (_tipoImModal === 'comercial') {
      html += secaoDetalhe('📋 Dados do Contrato Comercial', [
        campo('Vigência do contrato', f.vigencia_contrato),
        campo('Ramo da atividade', f.ramo_atividade),
      ]);
    }

    if (String(f.tipo_pessoa || '').toLowerCase() === 'pj') {
      html += secaoDetalhe('🏢 Dados da Pessoa Jurídica', [
        campo('Razão Social', f.pj_razao_social),
        campo('CNPJ', f.pj_cnpj),
        f.pj_inscricao ? campo('Inscrição Est./Mun.', f.pj_inscricao) : '',
      ]);
    }

    var _tituloLocatario = String(f.tipo_pessoa || '').toLowerCase() === 'pj'
      ? '👤 Representante Legal' : '👤 Locatário Principal';
    html += secaoDetalhe(_tituloLocatario, [
      campo('Nome', f.nome), campo('CPF', f.cpf), campo('Nascimento', f.nascimento),
      campo('Estado civil', f.estado_civil), campo('Nacionalidade', f.nacionalidade),
      campo('Profissão', f.profissao), campo('E-mail', f.email), campo('Celular', f.celular),
      campo('Logradouro', f.endereco_logradouro), campo('Número', f.endereco_numero),
      campo('Bairro', f.endereco_bairro),
      f.endereco_complemento ? campo('Complemento', f.endereco_complemento) : '',
      f.endereco_lote ? campo('Lote', f.endereco_lote) : '',
      f.endereco_quadra ? campo('Quadra', f.endereco_quadra) : '',
      campo('CEP', f.cep_atual), campo('Cidade', f.cidade_atual), campo('Estado', f.estado_atual),
    ]);

    html += secaoDetalhe('📞 Contato de Emergência', [
      campo('Nome', f.emerg_nome), campo('Celular', f.emerg_cel), campo('Parentesco', f.emerg_parentesco),
    ]);

    if (f.tem_conjuge === 'sim') {
      html += secaoDetalhe('💑 Cônjuge', [
        campo('Nome', f.conj_nome), campo('CPF', f.conj_cpf),
        campo('Nascimento', f.conj_nascimento), campo('Nacionalidade', f.conj_nacionalidade),
        campo('Profissão', f.conj_profissao),
        campo('E-mail', f.conj_email), campo('Celular', f.conj_celular),
      ]);
    }

    const qtdSoc = parseInt(f.qtd_socios) || 0;
    if (String(f.tipo_pessoa || '').toLowerCase() === 'pj' && qtdSoc > 0) {
      for (let i = 1; i <= qtdSoc; i++) {
        html += secaoDetalhe(`🤝 Sócio #${i}`, [
          campo('Nome', f[`soc${i}_nome`]), campo('CPF', f[`soc${i}_cpf`]),
          campo('Nascimento', f[`soc${i}_nascimento`]), campo('Estado civil', f[`soc${i}_estado_civil`]),
          campo('Nacionalidade', f[`soc${i}_nacionalidade`]),
          campo('Profissão', f[`soc${i}_profissao`]), campo('E-mail', f[`soc${i}_email`]),
          campo('Celular', f[`soc${i}_celular`]),
          campo('Logradouro', f[`soc${i}_logradouro`]), campo('Número', f[`soc${i}_numero`]),
          campo('Bairro', f[`soc${i}_bairro`]),
          f[`soc${i}_complemento`] ? campo('Complemento', f[`soc${i}_complemento`]) : '',
          f[`soc${i}_lote`] ? campo('Lote', f[`soc${i}_lote`]) : '',
          f[`soc${i}_quadra`] ? campo('Quadra', f[`soc${i}_quadra`]) : '',
          campo('CEP', f[`soc${i}_cep`]), campo('Cidade', f[`soc${i}_cidade`]), campo('UF', f[`soc${i}_uf`]),
          campo('Emerg. Nome', f[`soc${i}_emerg_nome`]),
          campo('Emerg. Celular', f[`soc${i}_emerg_cel`]),
          campo('Parentesco', f[`soc${i}_emerg_parentesco`]),
        ]);
      }
    }

    const qtd = parseInt(f.qtd_locatarios) || 0;
    for (let i = 1; i <= qtd; i++) {
      html += secaoDetalhe(`👥 Locatário Adicional #${i}`, [
        campo('Nome', f[`loc${i}_nome`]), campo('CPF', f[`loc${i}_cpf`]),
        campo('Nascimento', f[`loc${i}_nascimento`]), campo('Estado civil', f[`loc${i}_estado_civil`]),
        campo('Nacionalidade', f[`loc${i}_nacionalidade`]),
        campo('Profissão', f[`loc${i}_profissao`]), campo('E-mail', f[`loc${i}_email`]),
        campo('Celular', f[`loc${i}_celular`]),
        campo('Logradouro', f[`loc${i}_logradouro`]), campo('Número', f[`loc${i}_numero`]),
        campo('Bairro', f[`loc${i}_bairro`]),
        f[`loc${i}_complemento`] ? campo('Complemento', f[`loc${i}_complemento`]) : '',
        f[`loc${i}_lote`] ? campo('Lote', f[`loc${i}_lote`]) : '',
        f[`loc${i}_quadra`] ? campo('Quadra', f[`loc${i}_quadra`]) : '',
        campo('CEP', f[`loc${i}_cep`]), campo('Cidade', f[`loc${i}_cidade`]), campo('UF', f[`loc${i}_uf`]),
        campo('Emerg. Nome', f[`loc${i}_emerg_nome`]),
        campo('Emerg. Celular', f[`loc${i}_emerg_cel`]),
        campo('Parentesco', f[`loc${i}_emerg_parentesco`]),
      ]);
    }

    const isAdminModal = getPapel() === 'admin';
    if (isAdminModal) {
      const vigIniModal = dataParaInput(f.vigencia_inicio);
      html += `<div class="secao-detalhe vig-container" data-id="${esc(f.id)}">
        <h4>📅 Vigência do Contrato</h4>
        <div class="detalhe-grid">
          <div class="campo-det">
            <label>Início</label>
            <input type="date" class="v-ini" value="${esc(vigIniModal)}"
              style="padding:5px 8px;border:1.5px solid var(--border);border-radius:5px;font-size:.85rem;width:100%;margin-top:3px">
          </div>
        </div>
        ${vigIniModal ? `<div class="vig-texto vig-texto--set" style="margin-top:8px">📅 Início: ${formatarDataVig(f.vigencia_inicio)}</div>` : ''}
        <button class="btn-vig-salvar" style="margin-top:10px"
          onclick="salvarVigencia('${esc(f.id)}', this)">💾 Salvar vigência</button>
      </div>`;
    } else {
      html += secaoDetalhe('📅 Vigência do Contrato', [
        campo('Início', formatarDataVig(f.vigencia_inicio)),
      ]);
    }

    html += secaoDetalhe('📅 Vencimento do Boleto', [
      campo('Data de vencimento', f.vencimento_boleto),
    ]);

    html += secaoDetalhe('✍️ Assinatura', [
      campo('Tipo', f.tipo_assinatura === 'digital' ? 'Digital (R$ 29,00/assinatura)' : 'Física (cartório)'),
    ]);

    const links = [];
    if (f.doc_identificacao_url)      links.push(`<a href="${esc(f.doc_identificacao_url)}" target="_blank" style="color:var(--primary)">📎 Doc. identif.</a>`);
    if (f.comprovante_residencia_url)  links.push(`<a href="${esc(f.comprovante_residencia_url)}" target="_blank" style="color:var(--primary)">🏠 Comp. res.</a>`);
    if (f.aprovacao_seguro_url)        links.push(`<a href="${esc(f.aprovacao_seguro_url)}" target="_blank" style="color:var(--primary)">🛡️ Aprov. seguro</a>`);
    if (f.pj_balancete_url)            links.push(`<a href="${esc(f.pj_balancete_url)}" target="_blank" style="color:var(--primary)">📊 Balancete</a>`);
    if (f.pj_contrato_social_url)      links.push(`<a href="${esc(f.pj_contrato_social_url)}" target="_blank" style="color:var(--primary)">📋 Contrato social</a>`);
    if (f.pj_cartao_cnpj_url)          links.push(`<a href="${esc(f.pj_cartao_cnpj_url)}" target="_blank" style="color:var(--primary)">🪪 Cartão CNPJ</a>`);
    if (f.pj_extrato_simples_url)      links.push(`<a href="${esc(f.pj_extrato_simples_url)}" target="_blank" style="color:var(--primary)">📑 Extrato Simples</a>`);
    if (f.conj_doc_url)                links.push(`<a href="${esc(f.conj_doc_url)}" target="_blank" style="color:var(--primary)">👫 Doc. cônjuge</a>`);
    for (let i = 1; i <= qtdSoc; i++) {
      if (f[`soc${i}_doc_id_url`])   links.push(`<a href="${esc(f[`soc${i}_doc_id_url`])}" target="_blank" style="color:var(--primary)">📎 Doc. sócio ${i}</a>`);
      if (f[`soc${i}_comp_res_url`]) links.push(`<a href="${esc(f[`soc${i}_comp_res_url`])}" target="_blank" style="color:var(--primary)">🏠 Res. sócio ${i}</a>`);
    }
    for (let i = 1; i <= qtd; i++) {
      if (f[`loc${i}_doc_id_url`])    links.push(`<a href="${esc(f[`loc${i}_doc_id_url`])}" target="_blank" style="color:var(--primary)">📎 Doc. loc.${i}</a>`);
      if (f[`loc${i}_comp_res_url`])  links.push(`<a href="${esc(f[`loc${i}_comp_res_url`])}" target="_blank" style="color:var(--primary)">🏠 Res. loc.${i}</a>`);
    }
    if (links.length) {
      html += `<div class="secao-detalhe">
        <h4 style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          📂 Documentos no Drive
          <button class="btn-ac btn-ver" style="font-size:.75rem;padding:5px 12px;font-weight:700"
            onclick="baixarTodosDocumentos(this)">⬇️ Baixar todos (${links.length})</button>
        </h4>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.86rem;margin-top:10px">${links.join('')}</div>
      </div>`;
    }
    return html;
  }

  /* ── PDF ─────────────────────────────────────────────────────────── */
  function baixarPDF() {
    if (!fichaAtual) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const L = 14, W = 182, lh = 7;
    let y = 22;

    function titulo(txt) {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFillColor(26, 60, 110);
      doc.rect(L, y - 5, W, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9); doc.setFont(undefined, 'bold');
      doc.text(txt, L + 3, y + 1);
      doc.setTextColor(0, 0, 0);
      y += 12;
    }

    function linha(label, valor) {
      if (y > 278) { doc.addPage(); y = 18; }
      doc.setFontSize(8); doc.setFont(undefined, 'bold');
      doc.text(String(label) + ':', L, y);
      doc.setFont(undefined, 'normal');
      const linhas = doc.splitTextToSize(String(valor || '—'), 120);
      doc.text(linhas, L + 52, y);
      y += lh * linhas.length;
    }

    function sep() { doc.setDrawColor(200, 210, 225); doc.line(L, y, L + W, y); y += 4; }

    doc.setFillColor(26, 60, 110);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    var _tipoImovel = String(fichaAtual.tipo_imovel || '').toLowerCase() === 'comercial' ? 'Comercial' : 'Residencial';
    doc.text('Ficha Cadastral de Locatário ' + _tipoImovel, 105, 11, { align: 'center' });
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    const stLabel = COLUNAS.find(c => c.id === fichaAtual.status);
    doc.text(`Protocolo: ${fichaAtual.id || '—'}   |   Data: ${fichaAtual.data_envio || '—'}   |   Status: ${stLabel ? stLabel.label : fichaAtual.status}`, 105, 18, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y = 32;

    titulo('DADOS DO IMÓVEL');
    linha('Tipo de imóvel', _tipoImovel);
    linha('Corretor', fichaAtual.corretor);
    linha('Código do imóvel', fichaAtual.codigo_imovel);
    linha('Vaga de garagem', fichaAtual.tem_vaga === 'sim' ? `Sim — ${fichaAtual.qtd_vagas} vaga(s)` : 'Não');
    linha('Tipo de garantia', fichaAtual.tipo_garantia);
    sep();

    if (_tipoImovel === 'Comercial') {
      titulo('DADOS DO CONTRATO COMERCIAL');
      linha('Vigência do contrato', fichaAtual.vigencia_contrato);
      linha('Ramo da atividade', fichaAtual.ramo_atividade);
      sep();
    }

    var _ePJ = String(fichaAtual.tipo_pessoa || '').toLowerCase() === 'pj';
    if (_ePJ) {
      titulo('DADOS DA PESSOA JURÍDICA');
      linha('Razão Social', fichaAtual.pj_razao_social);
      linha('CNPJ', fichaAtual.pj_cnpj);
      if (fichaAtual.pj_inscricao) linha('Inscrição Est./Mun.', fichaAtual.pj_inscricao);
      sep();
    }

    titulo(_ePJ ? 'REPRESENTANTE LEGAL' : 'LOCATÁRIO PRINCIPAL');
    linha('Nome', fichaAtual.nome); linha('CPF', fichaAtual.cpf);
    linha('Nascimento', fichaAtual.nascimento); linha('Estado civil', fichaAtual.estado_civil);
    linha('Nacionalidade', fichaAtual.nacionalidade); linha('Profissão', fichaAtual.profissao);
    linha('E-mail', fichaAtual.email); linha('Celular', fichaAtual.celular);
    linha('Logradouro', fichaAtual.endereco_logradouro); linha('Número', fichaAtual.endereco_numero);
    linha('Bairro', fichaAtual.endereco_bairro);
    if (fichaAtual.endereco_complemento) linha('Complemento', fichaAtual.endereco_complemento);
    if (fichaAtual.endereco_lote) linha('Lote', fichaAtual.endereco_lote);
    if (fichaAtual.endereco_quadra) linha('Quadra', fichaAtual.endereco_quadra);
    linha('CEP', fichaAtual.cep_atual);
    linha('Cidade / Estado', `${fichaAtual.cidade_atual || '—'} / ${fichaAtual.estado_atual || '—'}`);
    sep();

    titulo('CONTATO DE EMERGÊNCIA');
    linha('Nome', fichaAtual.emerg_nome); linha('Celular', fichaAtual.emerg_cel); linha('Parentesco', fichaAtual.emerg_parentesco);
    sep();

    if (fichaAtual.tem_conjuge === 'sim') {
      titulo('CÔNJUGE / COMPANHEIRO(A)');
      linha('Nome', fichaAtual.conj_nome); linha('CPF', fichaAtual.conj_cpf);
      linha('Nascimento', fichaAtual.conj_nascimento); linha('Nacionalidade', fichaAtual.conj_nacionalidade);
      linha('Profissão', fichaAtual.conj_profissao);
      linha('E-mail', fichaAtual.conj_email); linha('Celular', fichaAtual.conj_celular);
      sep();
    }

    const qtdSocPDF = parseInt(fichaAtual.qtd_socios) || 0;
    if (_ePJ && qtdSocPDF > 0) {
      for (let i = 1; i <= qtdSocPDF; i++) {
        titulo(`SÓCIO #${i}`);
        linha('Nome', fichaAtual[`soc${i}_nome`]); linha('CPF', fichaAtual[`soc${i}_cpf`]);
        linha('Nascimento', fichaAtual[`soc${i}_nascimento`]); linha('Estado civil', fichaAtual[`soc${i}_estado_civil`]);
        linha('Nacionalidade', fichaAtual[`soc${i}_nacionalidade`]);
        linha('Profissão', fichaAtual[`soc${i}_profissao`]); linha('E-mail', fichaAtual[`soc${i}_email`]);
        linha('Celular', fichaAtual[`soc${i}_celular`]);
        linha('Logradouro', fichaAtual[`soc${i}_logradouro`]); linha('Número', fichaAtual[`soc${i}_numero`]);
        linha('Bairro', fichaAtual[`soc${i}_bairro`]);
        if (fichaAtual[`soc${i}_complemento`]) linha('Complemento', fichaAtual[`soc${i}_complemento`]);
        if (fichaAtual[`soc${i}_lote`]) linha('Lote', fichaAtual[`soc${i}_lote`]);
        if (fichaAtual[`soc${i}_quadra`]) linha('Quadra', fichaAtual[`soc${i}_quadra`]);
        linha('CEP', fichaAtual[`soc${i}_cep`]);
        linha('Cidade / UF', `${fichaAtual[`soc${i}_cidade`] || '—'} / ${fichaAtual[`soc${i}_uf`] || '—'}`);
        linha('Emerg. Nome', fichaAtual[`soc${i}_emerg_nome`]);
        linha('Emerg. Celular', fichaAtual[`soc${i}_emerg_cel`]);
        linha('Parentesco', fichaAtual[`soc${i}_emerg_parentesco`]);
        sep();
      }
    }

    const qtd = parseInt(fichaAtual.qtd_locatarios) || 0;
    for (let i = 1; i <= qtd; i++) {
      titulo(`LOCATÁRIO ADICIONAL #${i}`);
      linha('Nome', fichaAtual[`loc${i}_nome`]); linha('CPF', fichaAtual[`loc${i}_cpf`]);
      linha('Nascimento', fichaAtual[`loc${i}_nascimento`]); linha('Estado civil', fichaAtual[`loc${i}_estado_civil`]);
      linha('Nacionalidade', fichaAtual[`loc${i}_nacionalidade`]);
      linha('Profissão', fichaAtual[`loc${i}_profissao`]); linha('E-mail', fichaAtual[`loc${i}_email`]);
      linha('Celular', fichaAtual[`loc${i}_celular`]);
      linha('Logradouro', fichaAtual[`loc${i}_logradouro`]); linha('Número', fichaAtual[`loc${i}_numero`]);
      linha('Bairro', fichaAtual[`loc${i}_bairro`]);
      if (fichaAtual[`loc${i}_complemento`]) linha('Complemento', fichaAtual[`loc${i}_complemento`]);
      if (fichaAtual[`loc${i}_lote`]) linha('Lote', fichaAtual[`loc${i}_lote`]);
      if (fichaAtual[`loc${i}_quadra`]) linha('Quadra', fichaAtual[`loc${i}_quadra`]);
      linha('CEP', fichaAtual[`loc${i}_cep`]);
      linha('Cidade / UF', `${fichaAtual[`loc${i}_cidade`] || '—'} / ${fichaAtual[`loc${i}_uf`] || '—'}`);
      linha('Emerg. Nome', fichaAtual[`loc${i}_emerg_nome`]);
      linha('Emerg. Celular', fichaAtual[`loc${i}_emerg_cel`]);
      linha('Parentesco', fichaAtual[`loc${i}_emerg_parentesco`]);
      sep();
    }

    titulo('VIGÊNCIA DO CONTRATO');
    linha('Início', formatarDataVig(fichaAtual.vigencia_inicio));
    sep();

    titulo('DATA DE VENCIMENTO DO BOLETO');
    linha('Vencimento', fichaAtual.vencimento_boleto);
    sep();

    titulo('ASSINATURA');
    linha('Tipo', fichaAtual.tipo_assinatura === 'digital' ? 'Digital (R$ 29,00 por assinatura)' : 'Física (reconhecimento em cartório)');
    sep();

    const npages = doc.getNumberOfPages();
    for (let p = 1; p <= npages; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setTextColor(140, 140, 140);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} — Pág. ${p}/${npages}`, 105, 292, { align: 'center' });
    }

    doc.save(`ficha_${(fichaAtual.nome || 'locatario').replace(/\s+/g, '_')}_${fichaAtual.id || Date.now()}.pdf`);
  }

  /* ── Vigência do Contrato (admin-only) ───────────────────────────── */
  async function salvarVigencia(fichaId, btn) {
    const container = btn.closest('.vig-container');
    const ini = container.querySelector('.v-ini').value;

    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳';

    try {
      const json = await apiPost({ acao: 'vigencia', id: fichaId, vigencia_inicio: ini });
      if (!json) { btn.textContent = orig; btn.disabled = false; return; }
      if (json.status === 'ok') {
        const f = fichasTodas.find(x => x.id === fichaId);
        if (f) { f.vigencia_inicio = ini; }
        document.querySelectorAll(`.vig-container[data-id="${fichaId}"]`).forEach(ct => {
          const inputIni = ct.querySelector('.v-ini');
          if (inputIni) inputIni.value = ini;
          let textoEl = ct.querySelector('.vig-texto');
          if (ini) {
            const textoFormatado = `📅 Início: ${formatarDataVig(ini)}`;
            if (textoEl) {
              textoEl.textContent = textoFormatado;
              textoEl.classList.add('vig-texto--set');
            } else {
              textoEl = document.createElement('div');
              textoEl.className = 'vig-texto vig-texto--set';
              textoEl.style.marginTop = '6px';
              textoEl.textContent = textoFormatado;
              const salvarBtn = ct.querySelector('.btn-vig-salvar');
              if (salvarBtn) salvarBtn.insertAdjacentElement('beforebegin', textoEl);
              else ct.appendChild(textoEl);
            }
          } else if (textoEl) {
            textoEl.remove();
          }
        });
        btn.textContent = '✅';
      } else {
        btn.textContent = '❌';
        alert(json.message || 'Erro ao salvar vigência.');
      }
    } catch (_) {
      btn.textContent = '❌';
    }
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
  }