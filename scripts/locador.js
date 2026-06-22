const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec';

// ── Opções de tipo específico ─────────────────────────────────
const TIPOS_ESP = {
  residencial: [
    { valor: 'Apartamento',        icone: '🏗️' },
    { valor: 'Casa',               icone: '🏠' },
    { valor: 'Casa em condomínio', icone: '🏡' },
    { valor: 'Loft',               icone: '🛋️' },
    { valor: 'Sobrado',            icone: '🏘️' },
    { valor: 'Kitnet',             icone: '🚪' },
    { valor: 'Cobertura',          icone: '🌇' },
    { valor: 'Outros',             icone: '📋' },
  ],
  comercial: [
    { valor: 'Loja',              icone: '🏪' },
    { valor: 'Sala comercial',    icone: '💼' },
    { valor: 'Prédio comercial',  icone: '🏢' },
    { valor: 'Casa comercial',    icone: '🏠' },
    { valor: 'Galpão',            icone: '🏭' },
    { valor: 'Terreno',           icone: '🌿' },
    { valor: 'Outros',            icone: '📋' },
  ],
};

// condo/agua/gas: 'obrigatorio' | 'opcional' | 'none'
// boletoCondo:   'obrigatorio' | 'condicional' | 'none'
const REGRAS_TIPO = {
  'Apartamento':        { condo: 'obrigatorio', agua: 'none',        gas: 'opcional',  boletoCondo: 'obrigatorio'  },
  'Casa':               { condo: 'opcional',    agua: 'obrigatorio',  gas: 'opcional',  boletoCondo: 'condicional'  },
  'Casa em condomínio': { condo: 'obrigatorio', agua: 'obrigatorio',  gas: 'opcional',  boletoCondo: 'obrigatorio'  },
  'Loft':               { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Sobrado':            { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Kitnet':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Cobertura':          { condo: 'obrigatorio', agua: 'none',         gas: 'opcional',  boletoCondo: 'obrigatorio'  },
  'Loja':               { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Sala comercial':     { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Prédio comercial':   { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Casa comercial':     { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Galpão':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
  'Terreno':            { condo: 'none',        agua: 'none',         gas: 'none',      boletoCondo: 'none'         },
  'Outros':             { condo: 'opcional',    agua: 'opcional',     gas: 'opcional',  boletoCondo: 'condicional'  },
};

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

  // Referências comuns
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
    divBolCondo.style.display   = 'none'; // aparece via toggle
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
    if (inputG) inputG.required = false; // sempre opcional
  }

  // Reseta radio de água inclusa
  const aguaNao = document.getElementById('agua-nao');
  if (aguaNao) aguaNao.checked = true;
}

// ── Máscaras ──────────────────────────────────────────────────
function aplicarMascara(val, tipo) {
  const d = val.replace(/\D/g, '');
  if (tipo === 'cpf')
    return d.slice(0,3) + (d.length>3?'.':'') + d.slice(3,6) + (d.length>6?'.':'') + d.slice(6,9) + (d.length>9?'-':'') + d.slice(9,11);
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

// ── Toggle: vaga condicional (locatário compat.) ──────────────
document.querySelectorAll('input[name="tem_vaga"]').forEach(r => {
  r.addEventListener('change', () => {
    const campo   = document.getElementById('campo-qtd-vagas');
    const mostrar = r.value === 'sim' && r.checked;
    if (!campo) return;
    campo.style.display = mostrar ? 'block' : 'none';
    campo.querySelector('input').required = mostrar;
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

    // Valida checkboxes obrigatórios
    if (!dados.tipo_garantia) {
      alert('Selecione ao menos uma garantia aceita.');
      btn.disabled = false;
      statusDiv.className = '';
      return;
    }
    const comercialEnviando = document.getElementById('campo-tipo-imovel').value === 'comercial';
    if (comercialEnviando && !dados.vigencia_contrato) {
      alert('Selecione ao menos uma vigência aceita.');
      btn.disabled = false;
      statusDiv.className = '';
      return;
    }

    dados.qtd_locatarios = 0;
    dados.qtd_socios     = 0;

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
