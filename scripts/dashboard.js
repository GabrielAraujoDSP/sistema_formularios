// ── Configuração ─────────────────────────────────────────
  function endpoint() { return 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec'; }
  function getToken() { return sessionStorage.getItem('admin_token') || ''; }

  // Mapeamento de equipe → corretores (ajuste conforme necessário)
  const EQUIPES = {
    'São Gonçalo': ['Gabriel Araújo', 'Mariana', 'Edvaldo', 'Carlos', 'Marilea'],
    'Niterói':     ['Gabriel Araújo', 'Gabriel Medeiros', 'Michel Alves', 'Lívia Cordeiro', 'Victor Sutter', 'Aline Alves', 'Fernando Macedo'],
  };

  // Lookup inverso: corretor → equipe
  const CORRETOR_EQUIPE = {};
  Object.entries(EQUIPES).forEach(([eq, cors]) => cors.forEach(c => { CORRETOR_EQUIPE[c] = eq; }));

  const STATUS_LABELS = {
    nova: 'Novo', reprovada: 'Pendência', concluida: 'Aprovado',
    confeccao: 'Confecção de Contrato', contrato_enviado: 'Contrato Enviado',
  };

  const COR_STATUS = {
    nova: '#d97706', reprovada: '#dc2626', concluida: '#059669',
    confeccao: '#2563eb', contrato_enviado: '#7c3aed',
  };

  // ── Autenticação ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (getToken()) { mostrarApp(); }
  });

  function mostrarApp() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    iniciar();
  }

  async function fazerLogin() {
    const email  = document.getElementById('login-email').value.trim().toLowerCase();
    const senha  = document.getElementById('login-senha').value;
    const erroEl = document.getElementById('erro-login');
    const btn    = document.getElementById('btn-entrar');
    erroEl.style.display = 'none';

    if (!email || !senha) {
      erroEl.textContent = 'Preencha e-mail e senha.';
      erroEl.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = 'Verificando…';
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
      erroEl.textContent = 'Erro de conexão.';
      erroEl.style.display = 'block';
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('login-senha');
    const e = document.getElementById('login-email');
    if (s) s.addEventListener('keydown', ev => { if (ev.key === 'Enter') fazerLogin(); });
    if (e) e.addEventListener('keydown', ev => { if (ev.key === 'Enter') s && s.focus(); });
  });

  // ── Dados ─────────────────────────────────────────────────
  let fichasTodas    = [];
  let fichasFiltro   = [];
  let graficos       = {};

  async function iniciar() {
    document.getElementById('relatorio-wrap').style.display = 'block';
    try {
      const res  = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ acao: 'listar', token: getToken() })
      });
      const json = await res.json();
      if (json.status === 'auth_error') {
        sessionStorage.removeItem('admin_token');
        document.getElementById('app').style.display = 'none';
        document.getElementById('tela-login').style.display = 'flex';
        return;
      }
      fichasTodas = json.fichas || [];
      popularCorretores();
      aplicarFiltros();
    } catch (err) {
      document.getElementById('tabela-body').innerHTML =
        `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--danger)">
          ⚠️ Erro ao carregar dados: ${esc(err.message)}
        </td></tr>`;
    }
  }

  // ── Popula o dropdown de corretores a partir das fichas ──
  function popularCorretores() {
    const menu = document.getElementById('corretor-menu');

    // Remove itens anteriores (mantém apenas "Todos")
    menu.querySelectorAll('.chk-cor, .corretor-grupo-label, .corretor-item:not(:first-child)')
        .forEach(el => el.remove());

    // Agrupa corretores presentes nas fichas por equipe
    const porEquipe = {};
    fichasTodas.forEach(f => {
      const c = (f.corretor || '').trim();
      if (!c) return;
      const eq = CORRETOR_EQUIPE[c] || 'Outros';
      if (!porEquipe[eq]) porEquipe[eq] = new Set();
      porEquipe[eq].add(c);
    });

    // Renderiza agrupado: primeiro as equipes conhecidas na ordem do EQUIPES, depois "Outros"
    const ordemEquipes = [...Object.keys(EQUIPES), 'Outros'].filter(eq => porEquipe[eq]);
    ordemEquipes.forEach(eq => {
      const header = document.createElement('div');
      header.className = 'corretor-grupo-label';
      header.textContent = eq;
      menu.appendChild(header);

      [...porEquipe[eq]].sort().forEach(cor => {
        const uid = 'chk-' + cor.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const div = document.createElement('div');
        div.className = 'corretor-item';
        div.innerHTML =
          `<input type="checkbox" class="chk-cor" id="${uid}" value="${cor.replace(/"/g, '&quot;')}" onchange="onCorretorChange()" />` +
          `<label for="${uid}" style="cursor:pointer">${cor}</label>`;
        menu.appendChild(div);
      });
    });
  }

  // ── Filtros ───────────────────────────────────────────────
  function onPuxarTudoChange() {
    const puxar = document.getElementById('f-puxar-tudo').checked;
    ['f-equipe','f-de','f-ate','f-codigo'].forEach(id => {
      document.getElementById(id).disabled = puxar;
    });
    document.getElementById('corretor-trigger').classList.toggle('disabled', puxar);
  }

  function onEquipeChange() {
    const equipe = document.getElementById('f-equipe').value;
    if (!equipe) return;
    const equipeCorretores = EQUIPES[equipe] || [];
    document.querySelectorAll('.chk-cor').forEach(chk => {
      chk.checked = equipeCorretores.includes(chk.value);
    });
    atualizarLabelCorretores();
    document.getElementById('cor-todos').checked = false;
  }

  function toggleCorretores() {
    if (document.getElementById('corretor-trigger').classList.contains('disabled')) return;
    document.getElementById('corretor-menu').classList.toggle('aberto');
  }

  document.addEventListener('click', e => {
    const dd = document.getElementById('corretor-dropdown');
    if (!dd.contains(e.target)) document.getElementById('corretor-menu').classList.remove('aberto');
  });

  function toggleTodosCorretores(chk) {
    document.querySelectorAll('.chk-cor').forEach(c => { c.checked = false; });
    atualizarLabelCorretores();
  }

  function onCorretorChange() {
    document.getElementById('cor-todos').checked = false;
    atualizarLabelCorretores();
    // Limpa filtro de equipe ao mudar corretor manualmente
    document.getElementById('f-equipe').value = '';
  }

  function atualizarLabelCorretores() {
    const selecionados = corretoresSelecionados();
    const label = document.getElementById('corretor-label');
    if (selecionados.length === 0) { label.textContent = 'Todos'; document.getElementById('cor-todos').checked = true; }
    else if (selecionados.length === 1) label.textContent = selecionados[0];
    else label.textContent = `${selecionados.length} selecionados`;
  }

  function corretoresSelecionados() {
    return Array.from(document.querySelectorAll('.chk-cor:checked')).map(c => c.value);
  }

  function limparFiltros() {
    document.getElementById('f-equipe').value = '';
    document.getElementById('f-de').value = '';
    document.getElementById('f-ate').value = '';
    document.getElementById('f-codigo').value = '';
    document.getElementById('f-puxar-tudo').checked = false;
    document.querySelectorAll('.chk-cor').forEach(c => c.checked = false);
    document.getElementById('cor-todos').checked = true;
    document.getElementById('corretor-label').textContent = 'Todos';
    ['f-equipe','f-de','f-ate','f-codigo'].forEach(id => { document.getElementById(id).disabled = false; });
    document.getElementById('corretor-trigger').classList.remove('disabled');
    aplicarFiltros();
  }

  function aplicarFiltros() {
    const puxarTudo = document.getElementById('f-puxar-tudo').checked;
    if (puxarTudo) { fichasFiltro = fichasTodas.slice(); renderTudo(); return; }

    const deStr     = document.getElementById('f-de').value;
    const ateStr    = document.getElementById('f-ate').value;
    const corretor  = corretoresSelecionados();
    const codImovel = document.getElementById('f-codigo').value.trim().toLowerCase();

    fichasFiltro = fichasTodas.filter(f => {
      if (deStr || ateStr) {
        const d = parseDateBR(f.data_envio);
        if (deStr && (!d || d < new Date(deStr + 'T00:00:00'))) return false;
        if (ateStr && (!d || d > new Date(ateStr + 'T23:59:59'))) return false;
      }
      if (corretor.length > 0 && !corretor.includes(f.corretor)) return false;
      if (codImovel && !(f.codigo_imovel || '').toLowerCase().includes(codImovel)) return false;
      return true;
    });

    renderTudo();
  }

  // ── Render geral ──────────────────────────────────────────
  function renderTudo() {
    atualizarStats();
    renderGraficos();
    renderTabela();
  }

  function atualizarStats() {
    const st = {};
    fichasFiltro.forEach(f => { const s = f.status || 'nova'; st[s] = (st[s] || 0) + 1; });
    document.getElementById('s-total').textContent             = fichasFiltro.length;
    document.getElementById('s-nova').textContent              = st.nova             || 0;
    document.getElementById('s-reprovada').textContent         = st.reprovada        || 0;
    document.getElementById('s-concluida').textContent         = st.concluida        || 0;
    document.getElementById('s-confeccao').textContent         = st.confeccao        || 0;
    document.getElementById('s-contrato-enviado').textContent  = st.contrato_enviado || 0;
  }

  // ── Gráficos ──────────────────────────────────────────────
  function renderGraficos() {
    const agg = agregar(fichasFiltro);
    criarOuAtualizar('grafico-status',    graficoStatus(agg));
    criarOuAtualizar('grafico-corretor',  graficoCorretor(agg));
    criarOuAtualizar('grafico-mes',       graficoMes(agg));
    criarOuAtualizar('grafico-garantia',  graficoGarantia(agg));
    criarOuAtualizar('grafico-assinatura',graficoAssinatura(agg));
  }

  function agregar(lista) {
    const porStatus = {}, porCorretor = {}, porGarantia = {}, porAssinatura = {}, porMes = {};
    lista.forEach(f => {
      const st = f.status || 'nova';
      const co = f.corretor || '—';
      const ga = f.tipo_garantia || '—';
      const as = f.tipo_assinatura === 'digital' ? 'Digital' : f.tipo_assinatura === 'fisica' ? 'Física' : '—';
      const dm = mesAnoBR(f.data_envio);
      porStatus[st]     = (porStatus[st]     || 0) + 1;
      porCorretor[co]   = (porCorretor[co]   || 0) + 1;
      porGarantia[ga]   = (porGarantia[ga]   || 0) + 1;
      porAssinatura[as] = (porAssinatura[as] || 0) + 1;
      if (dm) porMes[dm] = (porMes[dm] || 0) + 1;
    });
    return { porStatus, porCorretor, porGarantia, porAssinatura, porMes };
  }

  function graficoStatus(agg) {
    const ordem = ['nova','reprovada','concluida','confeccao','contrato_enviado'];
    const labels = ordem.map(k => STATUS_LABELS[k]);
    const data   = ordem.map(k => agg.porStatus[k] || 0);
    const cores  = ordem.map(k => COR_STATUS[k]);
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: cores, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }
    };
  }

  function graficoCorretor(agg) {
    const entries = Object.entries(agg.porCorretor).sort((a,b) => b[1]-a[1]);
    return {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ label: 'Fichas', data: entries.map(e => e[1]),
          backgroundColor: '#8C1C1C99', borderColor: '#8C1C1C', borderWidth: 1.5, borderRadius: 5 }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  y: { ticks: { font: { size: 11 } } } } }
    };
  }

  function graficoMes(agg) {
    const sorted = Object.entries(agg.porMes).sort((a,b) => {
      const [ma,ya] = a[0].split('/').map(Number);
      const [mb,yb] = b[0].split('/').map(Number);
      return ya !== yb ? ya-yb : ma-mb;
    });
    return {
      type: 'line',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{ label: 'Fichas enviadas', data: sorted.map(e => e[1]),
          borderColor: '#059669', backgroundColor: '#05966920',
          pointBackgroundColor: '#059669', tension: 0.3, fill: true, pointRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { font: { size: 11 } } }, y: { beginAtZero: true, ticks: { font: { size: 11 }, stepSize: 1 } } } }
    };
  }

  function graficoGarantia(agg) {
    const entries = Object.entries(agg.porGarantia);
    return {
      type: 'pie',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ data: entries.map(e => e[1]),
          backgroundColor: ['#7c3aed99','#d97706aa','#059669aa','#2563eb99'],
          borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
    };
  }

  function graficoAssinatura(agg) {
    const entries = Object.entries(agg.porAssinatura);
    return {
      type: 'bar',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ label: 'Fichas', data: entries.map(e => e[1]),
          backgroundColor: ['#d97706aa','#2563eb99','#64748b99'],
          borderColor: ['#d97706','#2563eb','#64748b'], borderWidth: 1.5, borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
                  x: { ticks: { font: { size: 11 } } } } }
    };
  }

  function criarOuAtualizar(id, config) {
    if (graficos[id]) { graficos[id].destroy(); }
    const ctx = document.getElementById(id);
    if (!ctx) return;
    graficos[id] = new Chart(ctx, config);
  }

  // ── Tabela ────────────────────────────────────────────────
  function renderTabela() {
    document.getElementById('tabela-count').textContent = `${fichasFiltro.length} ficha(s)`;
    const tbody = document.getElementById('tabela-body');
    if (!fichasFiltro.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">
        Nenhuma ficha encontrada com esses filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = fichasFiltro.map(f => {
      const st = f.status || 'nova';
      const tipoAs = f.tipo_assinatura === 'digital' ? '💻 Digital' : f.tipo_assinatura === 'fisica' ? '🖨️ Física' : '—';
      return `<tr>
        <td><strong>${esc(f.id||'—')}</strong></td>
        <td>${esc(f.data_envio||'—')}</td>
        <td><span class="badge-st ${st}">${STATUS_LABELS[st]||st}</span></td>
        <td>${esc(f.nome||'—')}</td>
        <td>${esc(f.cpf||'—')}</td>
        <td>${esc(f.corretor||'—')}</td>
        <td>${esc(f.codigo_imovel||'—')}</td>
        <td>${esc(f.tipo_garantia||'—')}</td>
        <td>${tipoAs}</td>
      </tr>`;
    }).join('');
  }

  // ── Menu Relatório ────────────────────────────────────────
  function toggleMenuRelatorio() {
    document.getElementById('relatorio-menu').classList.toggle('aberto');
  }
  document.addEventListener('click', e => {
    const wrap = document.getElementById('relatorio-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('relatorio-menu').classList.remove('aberto');
    }
  });

  // ── Exportar XLSX ─────────────────────────────────────────
  function exportarXLSX() {
    document.getElementById('relatorio-menu').classList.remove('aberto');
    if (!fichasFiltro.length) { alert('Nenhuma ficha no filtro atual.'); return; }

    const colunas = ['id','data_envio','status','tipo_imovel','vigencia_contrato','ramo_atividade',
      'tipo_pessoa','pj_razao_social','pj_cnpj','pj_inscricao',
      'nome','cpf','nascimento','estado_civil',
      'profissao','email','celular','corretor','codigo_imovel','tipo_garantia',
      'tipo_assinatura','endereco_logradouro','endereco_numero','endereco_bairro','endereco_complemento','endereco_lote','endereco_quadra','cep_atual','cidade_atual','estado_atual',
      'emerg_nome','emerg_cel','emerg_parentesco'];

    const rows = fichasFiltro.map(f => {
      const row = {};
      colunas.forEach(c => { row[c] = f[c] || ''; });
      row['status'] = STATUS_LABELS[f.status] || f.status || '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: colunas });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichas');
    const data = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    XLSX.writeFile(wb, `fichas_dashboard_${data}.xlsx`);
  }

  // ── Exportar PDF ──────────────────────────────────────────
  function exportarPDF() {
    document.getElementById('relatorio-menu').classList.remove('aberto');
    if (!fichasFiltro.length) { alert('Nenhuma ficha no filtro atual.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const data = new Date().toLocaleString('pt-BR');
    const W = 277, L = 10;

    // Cabeçalho
    doc.setFillColor(140,28,28);
    doc.rect(0,0,297,20,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(12); doc.setFont(undefined,'bold');
    doc.text('Dashboard — Fichas Cadastrais de Locação', W/2+10, 9, { align:'center' });
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text(`Gerado em: ${data}   |   Total: ${fichasFiltro.length} fichas`, W/2+10, 16, { align:'center' });
    doc.setTextColor(0,0,0);

    // Resumo por status
    const st = {};
    fichasFiltro.forEach(f => { const s = f.status||'nova'; st[s]=(st[s]||0)+1; });
    doc.setFontSize(9); doc.setFont(undefined,'bold');
    doc.text('Resumo:', L, 28);
    doc.setFont(undefined,'normal');
    let xSt = L + 20;
    Object.entries(STATUS_LABELS).forEach(([k,v]) => {
      doc.text(`${v}: ${st[k]||0}`, xSt, 28);
      xSt += 44;
    });

    // Tabela
    const head = [['Protocolo','Data','Status','Nome','CPF','Corretor','Imóvel','Garantia','Assinatura']];
    const body = fichasFiltro.map(f => [
      f.id||'—', f.data_envio||'—',
      STATUS_LABELS[f.status]||f.status||'—',
      f.nome||'—', f.cpf||'—', f.corretor||'—',
      f.codigo_imovel||'—', f.tipo_garantia||'—',
      f.tipo_assinatura==='digital'?'Digital':f.tipo_assinatura==='fisica'?'Física':'—'
    ]);

    doc.autoTable({
      head, body, startY: 34, margin: { left: L, right: L },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [140,28,28], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [250,248,248] },
      didDrawPage: (d) => {
        doc.setFontSize(7); doc.setTextColor(140,140,140);
        doc.text(`Pág. ${d.pageNumber}`, 287, 205, { align:'right' });
        doc.setTextColor(0,0,0);
      }
    });

    const dataFile = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    doc.save(`dashboard_fichas_${dataFile}.pdf`);
  }

  // ── Helpers ───────────────────────────────────────────────
  function esc(t) {
    return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function parseDateBR(str) {
    if (!str) return null;
    const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]));
  }

  function mesAnoBR(str) {
    const m = String(str||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return m[2] + '/' + m[3];
  }