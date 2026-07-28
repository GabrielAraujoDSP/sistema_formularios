const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec';

// ── Carregar corretores dinamicamente ─────────────────────────
async function carregarCorretores() {
  const sel = document.getElementById('select-corretor');
  if (!sel) return;
  sel.disabled = true;
  sel.innerHTML = '<option value="">⏳ Carregando corretores...</option>';
  try {
    const res  = await fetch(APPS_SCRIPT_URL + '?acao=listarCorretores');
    const json = await res.json();
    const corretores = json.corretores || [];
    if (corretores.length === 0) {
      sel.innerHTML = '<option value="">Selecione o corretor</option>';
      sel.disabled = false;
      return;
    }
    const grupos = {};
    corretores.forEach(c => {
      if (!grupos[c.equipe]) grupos[c.equipe] = [];
      grupos[c.equipe].push(c.nome);
    });
    let html = '<option value="">Selecione o corretor</option>';
    Object.keys(grupos).sort().forEach(eq => {
      html += `<optgroup label="${eq}">`;
      grupos[eq].sort().forEach(nome => { html += `<option>${nome}</option>`; });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
  } catch (_) {
    sel.innerHTML = '<option value="">Selecione o corretor</option>';
  } finally {
    sel.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => { carregarCorretores(); });

// ── Ícones SVG por tipo de imóvel ─────────────────────────────
const ICONES = {
  Apartamento:          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="1"/><rect x="7" y="5" width="3" height="3"/><rect x="14" y="5" width="3" height="3"/><rect x="7" y="10" width="3" height="3"/><rect x="14" y="10" width="3" height="3"/><rect x="7" y="15" width="3" height="3"/><rect x="14" y="15" width="3" height="3"/><path d="M10 22v-4h4v4"/></svg>`,
  Casa:                 `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,12 12,3 21,12"/><path d="M5 12v9h14v-9"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/><path d="M10 21v-5h4v5"/></svg>`,
  'Casa em condomínio': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,11 12,5 18,11"/><path d="M8 11v7h8v-7"/><path d="M11 18v-4h2v4"/><path d="M1 20h22"/><line x1="2" y1="20" x2="2" y2="17"/><line x1="5" y1="20" x2="5" y2="17"/><line x1="2" y1="17" x2="5" y2="17"/><line x1="19" y1="20" x2="19" y2="17"/><line x1="22" y1="20" x2="22" y2="17"/><line x1="19" y1="17" x2="22" y2="17"/></svg>`,
  Loft:                 `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="1"/><path d="M2 14h13"/><path d="M15 14V3"/><path d="M11 14L15 3"/><path d="M8 14v7"/></svg>`,
  Sobrado:              `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,11 12,4 20,11"/><rect x="6" y="11" width="12" height="5"/><rect x="4" y="16" width="16" height="5"/><path d="M10 21v-3h4v3"/><rect x="8" y="12" width="2.5" height="2.5"/><rect x="13.5" y="12" width="2.5" height="2.5"/></svg>`,
  Kitnet:               `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="1"/><path d="M10 22v-7h4v7"/><path d="M10 15h4"/><circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="9" x2="13" y2="9"/></svg>`,
  Cobertura:            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="1"/><line x1="2" y1="10" x2="22" y2="10"/><rect x="8" y="3" width="8" height="7"/><line x1="8" y1="7" x2="16" y2="7"/><rect x="10" y="14" width="4" height="7"/></svg>`,
  Loja:                 `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 8l2-5h14l2 5z"/><line x1="1" y1="8" x2="23" y2="8"/><rect x="6" y="11" width="5" height="4"/><rect x="13" y="11" width="5" height="4"/><path d="M10 21v-5h4v5"/></svg>`,
  'Sala comercial':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M3 10h18"/><rect x="9" y="7" width="6" height="3"/><path d="M8 22v-6h8v6"/><line x1="3" y1="22" x2="21" y2="22"/></svg>`,
  'Prédio comercial':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="1"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="14" x2="22" y2="14"/><rect x="5" y="3" width="3" height="4"/><rect x="11" y="3" width="3" height="4"/><rect x="17" y="3" width="3" height="4"/><rect x="5" y="9" width="3" height="4"/><rect x="17" y="9" width="3" height="4"/><rect x="5" y="15" width="3" height="4"/><rect x="17" y="15" width="3" height="4"/><rect x="10" y="15" width="5" height="7"/></svg>`,
  'Casa comercial':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,12 12,3 21,12"/><path d="M5 12v9h14v-9"/><rect x="7" y="13" width="10" height="5"/><path d="M10 21v-4h4v4"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  Galpão:               `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 20V9l11-6 11 6v11H1z"/><line x1="1" y1="20" x2="23" y2="20"/><line x1="7" y1="20" x2="7" y2="9.5"/><line x1="17" y1="20" x2="17" y2="9.5"/><rect x="9" y="13" width="6" height="7"/></svg>`,
  Terreno:              `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" stroke-dasharray="3,2"/><circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="18" r="1.5" fill="currentColor" stroke="none"/><path d="M3 18l5-4 4 3 5-5 4 2"/></svg>`,
  Outros:               `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,
};

// ── Opções de tipo específico ─────────────────────────────────
const TIPOS_ESP = {
  residencial: [
    { valor: 'Apartamento',        icone: ICONES['Apartamento'] },
    { valor: 'Casa',               icone: ICONES['Casa'] },
    { valor: 'Casa em condomínio', icone: ICONES['Casa em condomínio'] },
    { valor: 'Loft',               icone: ICONES['Loft'] },
    { valor: 'Sobrado',            icone: ICONES['Sobrado'] },
    { valor: 'Kitnet',             icone: ICONES['Kitnet'] },
    { valor: 'Cobertura',          icone: ICONES['Cobertura'] },
    { valor: 'Outros',             icone: ICONES['Outros'] },
  ],
  comercial: [
    { valor: 'Loja',              icone: ICONES['Loja'] },
    { valor: 'Sala comercial',    icone: ICONES['Sala comercial'] },
    { valor: 'Prédio comercial',  icone: ICONES['Prédio comercial'] },
    { valor: 'Casa comercial',    icone: ICONES['Casa comercial'] },
    { valor: 'Galpão',            icone: ICONES['Galpão'] },
    { valor: 'Terreno',           icone: ICONES['Terreno'] },
    { valor: 'Outros',            icone: ICONES['Outros'] },
  ],
};

// condo/agua/gas:  'obrigatorio' | 'opcional' | 'none'
// boletoCondo:     'obrigatorio' | 'condicional' | 'none'
// complemento:     'obrigatorio' | 'opcional'
// loteQuadra:      true | false  (exibe campos lote e quadra)
const REGRAS_TIPO = {
  'Apartamento':        { condo: 'obrigatorio', agua: 'none',        gas: 'opcional',  boletoCondo: 'obrigatorio', complemento: 'obrigatorio', loteQuadra: false },
  'Casa':               { condo: 'opcional',    agua: 'obrigatorio',  gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: true  },
  'Casa em condomínio': { condo: 'obrigatorio', agua: 'obrigatorio',  gas: 'opcional',  boletoCondo: 'obrigatorio', complemento: 'obrigatorio', loteQuadra: false },
  'Loft':               { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'obrigatorio', loteQuadra: false },
  'Sobrado':            { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'obrigatorio', loteQuadra: false },
  'Kitnet':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: true  },
  'Cobertura':          { condo: 'obrigatorio', agua: 'none',         gas: 'opcional',  boletoCondo: 'obrigatorio', complemento: 'obrigatorio', loteQuadra: false },
  'Loja':               { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'obrigatorio', loteQuadra: false },
  'Sala comercial':     { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'obrigatorio', loteQuadra: false },
  'Prédio comercial':   { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: false },
  'Casa comercial':     { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: false },
  'Galpão':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: false },
  'Terreno':            { condo: 'none',        agua: 'none',         gas: 'none',      boletoCondo: 'none',        complemento: 'opcional',    loteQuadra: false },
  'Outros':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional', complemento: 'opcional',    loteQuadra: false },
};

// ── Campos obrigatórios do locador PF ────────────────────────
const CAMPOS_LOCADOR_PF_OBRIG = new Set([
  'nome', 'cpf', 'nascimento', 'estado_civil', 'nacionalidade', 'profissao',
  'email', 'celular', 'endereco_logradouro', 'endereco_numero', 'endereco_bairro',
  'cep_atual', 'cidade_atual', 'estado_atual',
  'emerg_nome', 'emerg_cel', 'emerg_parentesco',
  'doc_identificacao', 'comprovante_residencia',
]);

// ── Campos obrigatórios do locador PJ ────────────────────────
const CAMPOS_LOCADOR_PJ_OBRIG = new Set([
  'pj_razao_social', 'pj_cnpj', 'pj_email', 'pj_celular',
  'pj_logradouro', 'pj_numero', 'pj_bairro', 'pj_cep', 'pj_cidade', 'pj_estado',
  'pj_rep_nome', 'pj_rep_cpf', 'pj_rep_nascimento',
  'pj_rep_estado_civil', 'pj_rep_nacionalidade', 'pj_rep_profissao',
  'pj_rep_email', 'pj_rep_celular',
  'pj_rep_logradouro', 'pj_rep_numero', 'pj_rep_bairro',
  'pj_rep_cep', 'pj_rep_cidade', 'pj_rep_estado',
  'pj_rep_emerg_nome', 'pj_rep_emerg_cel', 'pj_rep_emerg_parentesco',
  'pj_contrato_social', 'pj_doc_representante', 'pj_rep_comp_residencia',
]);

// ── Campos obrigatórios do terceiro PF ───────────────────────
const CAMPOS_TERC_PF_OBRIG = new Set([
  'terc_nome', 'terc_cpf', 'terc_email', 'terc_cel',
  'terc_logradouro', 'terc_numero', 'terc_bairro',
  'terc_cep', 'terc_cidade', 'terc_estado', 'terc_doc',
]);

// ── Campos obrigatórios do terceiro PJ ───────────────────────
const CAMPOS_TERC_PJ_OBRIG = new Set([
  'terc_pj_razao_social', 'terc_pj_cnpj', 'terc_pj_email', 'terc_pj_cel',
  'terc_pj_logradouro', 'terc_pj_numero', 'terc_pj_bairro',
  'terc_pj_cep', 'terc_pj_cidade', 'terc_pj_estado',
  'terc_pj_contrato_social', 'terc_pj_doc_rep',
  'terc_pj_rep_nome', 'terc_pj_rep_cpf', 'terc_pj_rep_email', 'terc_pj_rep_cel',
  'terc_pj_rep_logradouro', 'terc_pj_rep_numero', 'terc_pj_rep_bairro',
  'terc_pj_rep_cep', 'terc_pj_rep_cidade', 'terc_pj_rep_estado',
]);

// ── Estado dos locadores adicionais ─────────────────────────
let contadorLocadores = 0;
let conjugeAdicionado  = false;

// ── Passo 1: Residencial ou Comercial ────────────────────────
function selecionarTipo(tipo) {
  document.getElementById('campo-tipo-imovel').value = tipo;
  document.getElementById('secao-tipo-imovel').style.display     = 'none';
  document.getElementById('secao-tipo-especifico').style.display = 'flex';

  document.getElementById('titulo-tipo-esp').textContent =
    tipo === 'residencial' ? 'Qual é o tipo de imóvel residencial?'
                           : 'Qual é o tipo de imóvel comercial?';

  const container = document.getElementById('btns-tipo-esp');
  container.innerHTML = TIPOS_ESP[tipo].map(t =>
    `<button type="button" class="btn-tipo btn-tipo-sm" onclick="selecionarTipoEspecifico('${t.valor}')">
      <span class="tipo-icon">${t.icone}</span>
      <span class="tipo-label">${t.valor}</span>
    </button>`
  ).join('');
}

function voltarTipoImovel() {
  document.getElementById('secao-tipo-especifico').style.display = 'none';
  document.getElementById('secao-tipo-imovel').style.display     = 'flex';
  document.getElementById('campo-tipo-imovel').value = '';
}

// ── Passo 2: Tipo específico ──────────────────────────────────
function selecionarTipoEspecifico(tipoEsp) {
  document.getElementById('campo-tipo-especifico').value = tipoEsp;
  document.getElementById('secao-tipo-especifico').style.display = 'none';
  document.getElementById('aviso-principal').style.display       = 'flex';
  document.getElementById('main-form').style.display             = 'block';
  document.getElementById('footer-form').style.display           = 'block';

  const tipoGeral = document.getElementById('campo-tipo-imovel').value;
  const comercial = tipoGeral === 'comercial';

  // Campos básicos: bloco residencial vs comercial
  document.getElementById('dados-imovel-res').style.display = comercial ? 'none' : 'block';
  document.getElementById('dados-imovel-com').style.display = comercial ? 'block' : 'none';
  document.querySelectorAll('#dados-imovel-res input').forEach(el => { el.required = !comercial; });
  document.querySelectorAll(
    '#dados-imovel-com input[name="imovel_salas"], #dados-imovel-com input[name="imovel_banheiros"], ' +
    '#dados-imovel-com input[name="imovel_vagas"], #dados-imovel-com input[name="imovel_metragem"]'
  ).forEach(el => { el.required = comercial; });

  // Seção de campos exclusivamente comerciais
  document.getElementById('secao-campos-comercial').style.display = comercial ? 'block' : 'none';

  // Regras condicionais por tipo de imóvel
  aplicarRegrasTipo(tipoEsp);

  document.getElementById('titulo-dados-imovel').textContent =
    `${comercial ? '🏢' : '🏠'} Dados do Imóvel — ${tipoEsp}`;
  document.getElementById('header-titulo').textContent =
    comercial ? 'Ficha Cadastral de Locador Comercial'
              : 'Ficha Cadastral de Locador Residencial';
  document.getElementById('header-sub').textContent =
    'Preencha todos os campos obrigatórios e envie seus documentos';

  document.getElementById('secao-dados-imovel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Regras condicionais por tipo de imóvel ───────────────────
function aplicarRegrasTipo(tipoEsp) {
  const regra = REGRAS_TIPO[tipoEsp] || REGRAS_TIPO['Outros'];

  const blocoCondoInfo = document.getElementById('campos-condo-info');
  const blocoToggle    = document.getElementById('bloco-condo-toggle');
  const divValCondo    = document.getElementById('campo-valor-condo');
  const inputNomeCondo = document.getElementById('campo-nome-condo');
  const inputValCondo  = divValCondo.querySelector('input');

  const divBolCondo   = document.getElementById('campo-boleto-condo');
  const labelBolCondo = document.getElementById('label-boleto-condo');
  const inputBolCondo = divBolCondo.querySelector('input[type=file]');

  const divAgua   = document.getElementById('campo-conta-agua');
  const labelAgua = document.getElementById('label-conta-agua');
  const inputAgua = divAgua.querySelector('input[type=file]');

  const divGas = document.getElementById('campo-conta-gas');

  // ─ Condomínio ─────────────────────────────────────────────
  if (regra.condo === 'obrigatorio') {
    blocoToggle.style.display       = 'none';
    blocoCondoInfo.style.display    = 'block';
    divValCondo.style.display       = 'block';
    inputNomeCondo.required         = true;
    inputValCondo.required          = true;
    document.querySelector('input[name="imovel_tem_condo"][value="sim"]').checked = true;
  } else if (regra.condo === 'opcional') {
    blocoToggle.style.display       = 'block';
    blocoCondoInfo.style.display    = 'none';
    divValCondo.style.display       = 'none';
    inputNomeCondo.required         = false;
    inputValCondo.required          = false;
    document.querySelector('input[name="imovel_tem_condo"][value="nao"]').checked = true;
  } else {
    blocoToggle.style.display       = 'none';
    blocoCondoInfo.style.display    = 'none';
    divValCondo.style.display       = 'none';
    inputNomeCondo.required         = false;
    inputValCondo.required          = false;
  }

  // ─ Boleto de condomínio ───────────────────────────────────
  if (regra.boletoCondo === 'obrigatorio') {
    divBolCondo.style.display   = 'block';
    labelBolCondo.innerHTML     = 'Boleto do condomínio atualizado <span class="obrig">*</span>';
    inputBolCondo.required      = true;
  } else if (regra.boletoCondo === 'condicional') {
    divBolCondo.style.display   = 'none';
    labelBolCondo.textContent   = 'Boleto do condomínio atualizado';
    inputBolCondo.required      = false;
  } else {
    divBolCondo.style.display   = 'none';
    inputBolCondo.required      = false;
  }

  // ─ Conta de água ──────────────────────────────────────────
  if (regra.agua === 'obrigatorio') {
    divAgua.style.display  = 'block';
    labelAgua.innerHTML    = 'Conta de água <span class="obrig">*</span>';
    inputAgua.required     = true;
  } else if (regra.agua === 'opcional') {
    divAgua.style.display  = 'block';
    labelAgua.textContent  = 'Conta de água';
    inputAgua.required     = false;
  } else {
    divAgua.style.display  = 'none';
    inputAgua.required     = false;
  }

  // ─ Conta de gás ───────────────────────────────────────────
  if (divGas) {
    divGas.style.display = (regra.gas === 'none') ? 'none' : 'block';
    const inputG = divGas.querySelector('input[type=file]');
    if (inputG) inputG.required = false;
  }

  // ─ Complemento do imóvel ──────────────────────────────────
  const labelCompl = document.getElementById('label-imovel-complemento');
  const inputCompl = document.getElementById('input-imovel-complemento');
  if (regra.complemento === 'obrigatorio') {
    labelCompl.innerHTML = 'Complemento <span class="obrig">*</span>';
    inputCompl.required  = true;
  } else {
    labelCompl.textContent = 'Complemento';
    inputCompl.required    = false;
  }

  // ─ Lote e Quadra ──────────────────────────────────────────
  const divLote   = document.getElementById('campo-imovel-lote');
  const divQuadra = document.getElementById('campo-imovel-quadra');
  divLote.style.display   = regra.loteQuadra ? 'block' : 'none';
  divQuadra.style.display = regra.loteQuadra ? 'block' : 'none';

  const aguaNao = document.getElementById('agua-nao');
  if (aguaNao) aguaNao.checked = true;
}

// ── Seleção PF / PJ do locador ───────────────────────────────
function selecionarTipoLocador(tipo) {
  document.getElementById('campo-tipo-locador').value = tipo;

  const secaoPf = document.getElementById('secao-locador');
  const secaoPj = document.getElementById('secao-locador-pj');

  document.getElementById('btn-locador-pf').classList.toggle('ativo', tipo === 'pf');
  document.getElementById('btn-locador-pj').classList.toggle('ativo', tipo === 'pj');

  // Reseta locadores adicionais ao trocar de tipo
  document.getElementById('container-locadores-adicionais').innerHTML = '';
  document.getElementById('secao-pergunta-locador').style.display = 'none';
  contadorLocadores = 0;
  conjugeAdicionado  = false;

  if (tipo === 'pf') {
    secaoPf.style.display = 'block';
    secaoPj.style.display = 'none';
    secaoPf.querySelectorAll('input, select').forEach(el => {
      el.required = CAMPOS_LOCADOR_PF_OBRIG.has(el.name);
    });
    secaoPj.querySelectorAll('input, select').forEach(el => { el.required = false; });
    mostrarPerguntaLocador();
  } else {
    secaoPj.style.display = 'block';
    secaoPf.style.display = 'none';
    secaoPj.querySelectorAll('input, select').forEach(el => {
      el.required = CAMPOS_LOCADOR_PJ_OBRIG.has(el.name);
    });
    secaoPf.querySelectorAll('input, select').forEach(el => { el.required = false; });
  }

  ['secao-bancario', 'secao-mobilia', 'secao-assinatura', 'secao-declaracao', 'btn-enviar-wrap'].forEach(id => {
    document.getElementById(id).style.display = 'block';
  });

  const target = tipo === 'pf' ? secaoPf : secaoPj;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Loop de proprietários adicionais ────────────────────────
function mostrarPerguntaLocador() {
  const secao = document.getElementById('secao-pergunta-locador');
  const texto = document.getElementById('texto-pergunta-locador');
  const btns  = document.getElementById('btns-pergunta-locador');

  secao.style.display = 'block';

  if (contadorLocadores === 0 && !conjugeAdicionado) {
    texto.textContent = 'Há cônjuge, companheiro(a) ou outro proprietário no contrato?';
    btns.innerHTML = `
      <button type="button" class="btn-nao" onclick="finalizarLocadores()">✘ Não há outro proprietário</button>
      <button type="button" class="btn-sim" onclick="adicionarLocador('conjuge')">💑 Cônjuge / Companheiro(a)</button>
      <button type="button" class="btn-sim" onclick="adicionarLocador('adicional')">👤 Proprietário Adicional</button>`;
  } else {
    texto.textContent = 'Há outro proprietário no contrato?';
    btns.innerHTML = `
      <button type="button" class="btn-nao" onclick="finalizarLocadores()">✘ Não há outro proprietário</button>
      <button type="button" class="btn-sim" onclick="adicionarLocador('adicional')">👤 Proprietário Adicional</button>`;
  }
}

function adicionarLocador(tipo) {
  contadorLocadores++;
  if (tipo === 'conjuge') conjugeAdicionado = true;

  const container = document.getElementById('container-locadores-adicionais');
  container.insertAdjacentHTML('beforeend', gerarSecaoLocadorAdicional(contadorLocadores, tipo));

  mostrarPerguntaLocador();

  const novaSecao = document.getElementById(`secao-locador-ad-${contadorLocadores}`);
  if (novaSecao) novaSecao.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function finalizarLocadores() {
  document.getElementById('secao-pergunta-locador').style.display = 'none';
}

function gerarSecaoLocadorAdicional(indice, tipo) {
  const tipoLabel = tipo === 'conjuge' ? 'Cônjuge / Companheiro(a)' : 'Proprietário Adicional';
  const icone     = tipo === 'conjuge' ? '💑' : '👤';
  const p         = `loc${indice}`;

  return `
<div class="secao" id="secao-locador-ad-${indice}">
  <input type="hidden" name="${p}_tipo" value="${tipo}" />
  <div class="secao-titulo">${icone} ${tipoLabel}</div>
  <div class="secao-corpo">
    <div class="grid g3">
      <div class="span3">
        <label>Nome completo <span class="obrig">*</span></label>
        <input type="text" name="${p}_nome" required />
      </div>
      <div>
        <label>CPF <span class="obrig">*</span></label>
        <input type="text" name="${p}_cpf" placeholder="000.000.000-00" maxlength="14" data-mask="cpf" required />
      </div>
      <div>
        <label>Data de nascimento <span class="obrig">*</span></label>
        <input type="date" name="${p}_nascimento" required />
      </div>
      <div>
        <label>Estado civil <span class="obrig">*</span></label>
        <select name="${p}_estado_civil" required>
          <option value="">Selecione</option>
          <option>Solteiro(a)</option><option>Casado(a)</option>
          <option>Divorciado(a)</option><option>Viúvo(a)</option><option>União estável</option>
        </select>
      </div>
      <div>
        <label>Nacionalidade <span class="obrig">*</span></label>
        <input type="text" name="${p}_nacionalidade" value="Brasileiro(a)" required />
      </div>
      <div>
        <label>Profissão <span class="obrig">*</span></label>
        <input type="text" name="${p}_profissao" required />
      </div>
      <div>
        <label>E-mail <span class="obrig">*</span></label>
        <input type="email" name="${p}_email" required />
      </div>
      <div>
        <label>Celular / WhatsApp <span class="obrig">*</span></label>
        <input type="text" name="${p}_celular" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
      </div>

      <hr class="separador span3" />

      <div class="span3">
        <label>Logradouro (Rua / Avenida / Estrada) <span class="obrig">*</span></label>
        <input type="text" name="${p}_logradouro" placeholder="Ex: Rua das Flores" required />
      </div>
      <div>
        <label>Número <span class="obrig">*</span></label>
        <input type="text" name="${p}_numero" placeholder="Ex: 123" required />
      </div>
      <div>
        <label>Bairro <span class="obrig">*</span></label>
        <input type="text" name="${p}_bairro" required />
      </div>
      <div>
        <label>Complemento</label>
        <input type="text" name="${p}_complemento" placeholder="Apto, Bloco, Casa…" />
      </div>
      <div>
        <label>Lote</label>
        <input type="text" name="${p}_lote" placeholder="Se houver" />
      </div>
      <div>
        <label>Quadra</label>
        <input type="text" name="${p}_quadra" placeholder="Se houver" />
      </div>
      <div>
        <label>CEP <span class="obrig">*</span></label>
        <input type="text" name="${p}_cep" placeholder="00000-000" maxlength="9" data-mask="cep" required />
      </div>
      <div>
        <label>Cidade <span class="obrig">*</span></label>
        <input type="text" name="${p}_cidade" required />
      </div>
      <div>
        <label>Estado <span class="obrig">*</span></label>
        <select name="${p}_estado" required>
          <option value="">UF</option>
          <option>AC</option><option>AL</option><option>AM</option><option>AP</option>
          <option>BA</option><option>CE</option><option>DF</option><option>ES</option>
          <option>GO</option><option>MA</option><option>MG</option><option>MS</option>
          <option>MT</option><option>PA</option><option>PB</option><option>PE</option>
          <option>PI</option><option>PR</option><option>RJ</option><option>RN</option>
          <option>RO</option><option>RR</option><option>RS</option><option>SC</option>
          <option>SE</option><option>SP</option><option>TO</option>
        </select>
      </div>

      <hr class="separador span3" />
      <div class="span3"><strong style="font-size:.88rem;color:var(--primary)">📞 Contato de Emergência</strong></div>

      <div>
        <label>Nome completo <span class="obrig">*</span></label>
        <input type="text" name="${p}_emerg_nome" required />
      </div>
      <div>
        <label>Celular <span class="obrig">*</span></label>
        <input type="text" name="${p}_emerg_cel" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
      </div>
      <div>
        <label>Grau de parentesco <span class="obrig">*</span></label>
        <input type="text" name="${p}_emerg_parentesco" placeholder="Ex: Mãe, Pai, Irmão…" required />
      </div>

      <hr class="separador span3" />
      <div class="span3"><strong style="font-size:.88rem;color:var(--primary)">📄 Documentos</strong></div>

      <div>
        <label>Documento de identificação (RG ou CNH) <span class="obrig">*</span></label>
        <div class="upload-area" id="area-${p}-doc-id">
          <div class="upload-icon">📎</div>
          <div class="upload-label">PDF, JPG ou PNG — máx. 10 MB</div>
          <div class="upload-name" id="nome-${p}-doc-id">Nenhum arquivo selecionado</div>
          <input type="file" name="${p}_doc_identificacao" accept=".pdf,.jpg,.jpeg,.png" required
            data-preview="nome-${p}-doc-id" data-area="area-${p}-doc-id" />
        </div>
      </div>
      ${tipo !== 'conjuge' ? `<div>
        <label>Comprovante de residência <span class="obrig">*</span></label>
        <div class="upload-area" id="area-${p}-comp-res">
          <div class="upload-icon">🏠</div>
          <div class="upload-label">PDF, JPG ou PNG — máx. 10 MB</div>
          <div class="upload-name" id="nome-${p}-comp-res">Nenhum arquivo selecionado</div>
          <input type="file" name="${p}_comprovante_residencia" accept=".pdf,.jpg,.jpeg,.png" required
            data-preview="nome-${p}-comp-res" data-area="area-${p}-comp-res" />
        </div>
      </div>` : ''}
    </div>
  </div>
</div>`;
}

// ── Seleção PF / PJ do terceiro beneficiário ─────────────────
function selecionarTipoTerceiro(tipo) {
  const pfDiv = document.getElementById('dados-terc-pf');
  const pjDiv = document.getElementById('dados-terc-pj');
  const btnPf = document.getElementById('btn-terc-pf');
  const btnPj = document.getElementById('btn-terc-pj');

  btnPf.classList.toggle('ativo', tipo === 'pf');
  btnPj.classList.toggle('ativo', tipo === 'pj');

  [pfDiv, pjDiv].forEach(div => {
    div.querySelectorAll('input, select').forEach(el => { el.required = false; });
    div.style.display = 'none';
  });

  if (tipo === 'pf') {
    pfDiv.style.display = 'block';
    pfDiv.querySelectorAll('input, select').forEach(el => {
      el.required = CAMPOS_TERC_PF_OBRIG.has(el.name);
    });
  } else {
    pjDiv.style.display = 'block';
    pjDiv.querySelectorAll('input, select').forEach(el => {
      el.required = CAMPOS_TERC_PJ_OBRIG.has(el.name);
    });
  }
}

// ── Máscaras ──────────────────────────────────────────────────
function aplicarMascara(val, tipo) {
  const d = val.replace(/\D/g, '');
  if (tipo === 'cpf')
    return d.slice(0,3) + (d.length>3?'.':'') + d.slice(3,6) + (d.length>6?'.':'') + d.slice(6,9) + (d.length>9?'-':'') + d.slice(9,11);
  if (tipo === 'cnpj')
    return d.slice(0,2) + (d.length>2?'.':'') + d.slice(2,5) + (d.length>5?'.':'') + d.slice(5,8) + (d.length>8?'/':'') + d.slice(8,12) + (d.length>12?'-':'') + d.slice(12,14);
  if (tipo === 'tel') {
    if (d.length <= 10)
      return '(' + d.slice(0,2) + (d.length>2?') ':'') + d.slice(2,6) + (d.length>6?'-':'') + d.slice(6,10);
    return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7,11);
  }
  if (tipo === 'cep') return d.slice(0,5) + (d.length>5?'-':'') + d.slice(5,8);
  return val;
}

document.addEventListener('input', e => {
  const tipo = e.target.dataset.mask;
  if (!tipo) return;
  e.target.value = aplicarMascara(e.target.value, tipo);
});

// ── Upload: preview + pré-codificação ────────────────────────
const arquivosCache = new WeakMap();

document.addEventListener('change', e => {
  if (e.target.type !== 'file') return;
  const previewId = e.target.dataset.preview;
  const areaId    = e.target.dataset.area;
  if (previewId) {
    const el = document.getElementById(previewId);
    if (el) el.textContent = e.target.files[0] ? e.target.files[0].name : 'Nenhum arquivo selecionado';
  }
  if (areaId) {
    const area = document.getElementById(areaId);
    if (area) area.classList.toggle('tem-arquivo', !!e.target.files[0]);
  }
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    arquivosCache.set(e.target, fileParaBase64(file).then(b64 => ({ b64, nome: file.name, tipo: file.type })));
  } else {
    arquivosCache.delete(e.target);
  }
});

// ── Toggle: controle remoto ───────────────────────────────────
document.querySelectorAll('input[name="imovel_tem_controle"]').forEach(r => {
  r.addEventListener('change', () => {
    const mostrar = r.value === 'sim' && r.checked;
    const campos  = document.getElementById('campos-controle');
    campos.style.display = mostrar ? 'block' : 'none';
    campos.querySelector('input[name="imovel_qtd_controles"]').required  = mostrar;
    campos.querySelector('input[name="imovel_foto_controles"]').required = mostrar;
  });
});

// ── Toggle: condomínio opcional ───────────────────────────────
document.querySelectorAll('input[name="imovel_tem_condo"]').forEach(r => {
  r.addEventListener('change', () => {
    const temCondo = r.value === 'sim' && r.checked;
    const tipoEsp  = document.getElementById('campo-tipo-especifico').value;
    const regra    = REGRAS_TIPO[tipoEsp] || REGRAS_TIPO['Outros'];
    if (regra.condo !== 'opcional') return;

    const blocoInfo  = document.getElementById('campos-condo-info');
    const divValCond = document.getElementById('campo-valor-condo');
    const inputNome  = document.getElementById('campo-nome-condo');
    const divBol     = document.getElementById('campo-boleto-condo');
    const inputBol   = divBol.querySelector('input[type=file]');

    blocoInfo.style.display  = temCondo ? 'block' : 'none';
    divValCond.style.display = temCondo ? 'block' : 'none';
    inputNome.required       = temCondo;
    divValCond.querySelector('input').required = temCondo;

    if (regra.boletoCondo === 'condicional') {
      divBol.style.display = temCondo ? 'block' : 'none';
      inputBol.required    = false;
    }

    if (!temCondo) {
      const aguaNao = document.getElementById('agua-nao');
      if (aguaNao) aguaNao.checked = true;
    }
  });
});

// ── Toggle: vaga condicional ──────────────────────────────────
document.querySelectorAll('input[name="tem_vaga"]').forEach(r => {
  r.addEventListener('change', () => {
    const campo   = document.getElementById('campo-qtd-vagas');
    const mostrar = r.value === 'sim' && r.checked;
    if (!campo) return;
    campo.style.display = mostrar ? 'block' : 'none';
    campo.querySelector('input').required = mostrar;
  });
});

// ── Toggle: mobília ──────────────────────────────────────────
document.querySelectorAll('input[name="mobiliado"]').forEach(r => {
  r.addEventListener('change', () => {
    const sim    = r.value === 'sim' && r.checked;
    const campos = document.getElementById('campos-mobilia');
    const area   = document.getElementById('campo-descricao-mobilia');
    campos.style.display = sim ? 'block' : 'none';
    area.required        = sim;
  });
});

// ── Toggle: repasse para terceiro ────────────────────────────
document.querySelectorAll('input[name="repasse_destinatario"]').forEach(r => {
  r.addEventListener('change', () => {
    const terceiro = r.value === 'terceiro' && r.checked;
    const bloco    = document.getElementById('bloco-terceiro');
    bloco.style.display = terceiro ? 'block' : 'none';

    if (!terceiro) {
      bloco.querySelectorAll('input, select').forEach(el => { el.required = false; });
      document.getElementById('dados-terc-pf').style.display = 'none';
      document.getElementById('dados-terc-pj').style.display = 'none';
      document.getElementById('btn-terc-pf').classList.remove('ativo');
      document.getElementById('btn-terc-pj').classList.remove('ativo');
    }
  });
});

// ── Converter arquivo para base64 ────────────────────────────
function fileParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Envio do formulário ───────────────────────────────────────
document.getElementById('form-ficha').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!document.getElementById('aceite-declaracao').checked) {
    alert('Por favor, leia e aceite a declaração final antes de enviar.');
    return;
  }

  const tipoAssinatura = document.querySelector('input[name="tipo_assinatura"]:checked');
  if (!tipoAssinatura) {
    alert('Por favor, escolha o tipo de assinatura.');
    return;
  }

  const btn       = document.getElementById('btn-enviar');
  const statusDiv = document.getElementById('status-envio');
  btn.disabled    = true;
  statusDiv.className = 'enviando';
  statusDiv.innerHTML = '<div class="spinner"></div><span>Enviando ficha, aguarde… (isso pode levar alguns segundos)</span>';

  try {
    const comercialEnviando = document.getElementById('campo-tipo-imovel').value === 'comercial';

    // Desabilita o bloco oculto para evitar que campos com nome duplicado
    // (imovel_salas, imovel_banheiros, etc.) sobrescrevam os valores preenchidos
    const blocoOculto = document.getElementById(comercialEnviando ? 'dados-imovel-res' : 'dados-imovel-com');
    blocoOculto.querySelectorAll('input, select').forEach(el => { el.disabled = true; });

    const dados    = {};
    const formData = new FormData(this);
    const multiKeys = new Set(['tipo_garantia', 'vigencia_contrato']);

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      if (multiKeys.has(key)) {
        dados[key] = dados[key] ? dados[key] + ', ' + value : value;
      } else {
        dados[key] = value;
      }
    }

    blocoOculto.querySelectorAll('input, select').forEach(el => { el.disabled = false; });

    // Valida garantias (obrigatório para todos) e vigência (apenas comercial)
    if (!dados.tipo_garantia) {
      alert('Selecione ao menos uma garantia aceita.');
      btn.disabled = false;
      statusDiv.className = '';
      return;
    }
    if (comercialEnviando && !dados.vigencia_contrato) {
      alert('Selecione ao menos uma vigência aceita.');
      btn.disabled = false;
      statusDiv.className = '';
      return;
    }

    dados.qtd_locatarios              = 0;
    dados.qtd_socios                  = 0;
    dados.qtd_locadores_adicionais    = contadorLocadores;

    const fileInputs = [...this.querySelectorAll('input[type=file]')].filter(i => i.files && i.files[0]);
    await Promise.all(fileInputs.map(async input => {
      const cached = arquivosCache.get(input);
      const result = cached
        ? await cached
        : { b64: await fileParaBase64(input.files[0]), nome: input.files[0].name, tipo: input.files[0].type };
      dados[input.name + '_b64']  = result.b64;
      dados[input.name + '_nome'] = result.nome;
      dados[input.name + '_tipo'] = result.tipo;
    }));

    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(dados),
    });

    const textoResposta = await res.text();
    let json;
    try { json = JSON.parse(textoResposta); }
    catch (_) {
      throw new Error(
        'O Apps Script retornou uma resposta inesperada (não é JSON). ' +
        'Verifique se a URL está correta e se o script foi publicado como "Qualquer pessoa".'
      );
    }

    if (json.status === 'ok') {
      document.getElementById('num-protocolo').textContent = json.protocolo || '—';
      document.getElementById('overlay-sucesso').classList.add('ativo');
      this.reset();
      statusDiv.className = '';
      statusDiv.textContent = '';

      // Volta ao passo 1
      document.getElementById('main-form').style.display              = 'none';
      document.getElementById('aviso-principal').style.display        = 'none';
      document.getElementById('footer-form').style.display            = 'none';
      document.getElementById('secao-tipo-especifico').style.display  = 'none';
      document.getElementById('secao-tipo-imovel').style.display      = 'flex';
      document.getElementById('secao-campos-comercial').style.display = 'none';
      document.getElementById('campo-tipo-imovel').value              = '';
      document.getElementById('campo-tipo-especifico').value          = '';
      document.getElementById('header-titulo').textContent            = 'Ficha Cadastral de Locador';
      document.getElementById('header-sub').textContent               = 'Selecione o tipo de imóvel para começar';

      // Reseta condicionais de imóvel
      document.getElementById('campos-controle').style.display        = 'none';
      document.getElementById('campos-condo-info').style.display      = 'none';
      document.getElementById('bloco-condo-toggle').style.display     = 'none';
      document.getElementById('campo-valor-condo').style.display      = 'none';
      document.getElementById('campo-boleto-condo').style.display     = 'none';
      document.getElementById('campo-conta-agua').style.display       = 'none';

      // Reseta seleção PF/PJ do locador
      document.getElementById('secao-locador').style.display    = 'none';
      document.getElementById('secao-locador-pj').style.display = 'none';
      document.getElementById('secao-bancario').style.display   = 'none';
      document.getElementById('secao-mobilia').style.display    = 'none';
      document.getElementById('campos-mobilia').style.display   = 'none';
      document.getElementById('campo-descricao-mobilia').required = false;
      document.getElementById('secao-assinatura').style.display = 'none';
      document.getElementById('secao-declaracao').style.display = 'none';
      document.getElementById('btn-enviar-wrap').style.display  = 'none';
      document.getElementById('campo-tipo-locador').value       = '';
      document.getElementById('btn-locador-pf').classList.remove('ativo');
      document.getElementById('btn-locador-pj').classList.remove('ativo');
      // Reseta locadores adicionais
      document.getElementById('container-locadores-adicionais').innerHTML = '';
      document.getElementById('secao-pergunta-locador').style.display     = 'none';
      contadorLocadores = 0;
      conjugeAdicionado  = false;

      // Reseta bloco terceiro
      const blocoTerc = document.getElementById('bloco-terceiro');
      blocoTerc.style.display = 'none';
      blocoTerc.querySelectorAll('input, select').forEach(el => { el.required = false; });
      document.getElementById('dados-terc-pf').style.display = 'none';
      document.getElementById('dados-terc-pj').style.display = 'none';
      document.getElementById('btn-terc-pf').classList.remove('ativo');
      document.getElementById('btn-terc-pj').classList.remove('ativo');
    } else {
      throw new Error(json.message || 'Erro desconhecido');
    }
  } catch (err) {
    statusDiv.className   = 'erro-msg';
    statusDiv.textContent = '❌ Erro ao enviar: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

function copiarProtocolo() {
  const texto = document.getElementById('num-protocolo').textContent.trim();
  const btn   = document.getElementById('btn-copiar-protocolo');
  navigator.clipboard.writeText(texto).then(() => {
    btn.textContent = '✔ Copiado!';
    setTimeout(() => { btn.innerHTML = '📋 Copiar protocolo'; }, 2000);
  });
}
