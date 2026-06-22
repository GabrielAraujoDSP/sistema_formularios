const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec';

// ── Opções de tipo específico ─────────────────────────────────
const TIPOS_ESP = {
  residencial: [
    { valor: 'Apartamento',       icone: '🏗️' },
    { valor: 'Casa',              icone: '🏠' },
    { valor: 'Casa em condomínio',icone: '🏡' },
    { valor: 'Loft',              icone: '🛋️' },
    { valor: 'Sobrado',           icone: '🏘️' },
    { valor: 'Kitnet',            icone: '🚪' },
    { valor: 'Cobertura',         icone: '🌇' },
    { valor: 'Outros',            icone: '📋' },
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

  // Campos do imóvel: mostra o bloco correto
  document.getElementById('dados-imovel-res').style.display = comercial ? 'none' : 'block';
  document.getElementById('dados-imovel-com').style.display = comercial ? 'block' : 'none';
  document.querySelectorAll('#dados-imovel-res input').forEach(el => { el.required = !comercial; });
  document.querySelectorAll('#dados-imovel-com input[name="imovel_salas"], #dados-imovel-com input[name="imovel_banheiros"], #dados-imovel-com input[name="imovel_vagas"], #dados-imovel-com input[name="imovel_metragem"]').forEach(el => { el.required = comercial; });

  // Título da seção de dados do imóvel
  document.getElementById('titulo-dados-imovel').textContent =
    `${comercial ? '🏢' : '🏠'} Dados do Imóvel — ${tipoEsp}`;

  // Seção de campos comerciais (vigência, ramo, etc.)
  document.getElementById('secao-campos-comercial').style.display = comercial ? 'block' : 'none';
  document.querySelectorAll('input[name="vigencia_contrato"]').forEach(r => { r.required = comercial; });
  const ramo = document.getElementById('campo-ramo-atividade');
  if (ramo) ramo.required = comercial;

  document.getElementById('header-titulo').textContent =
    comercial ? 'Ficha Cadastral de Locador Comercial'
              : 'Ficha Cadastral de Locador Residencial';
  document.getElementById('header-sub').textContent =
    'Preencha todos os campos obrigatórios e envie seus documentos';

  document.getElementById('secao-dados-imovel').scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ── Vaga condicional ──────────────────────────────────────────
document.querySelectorAll('input[name="tem_vaga"]').forEach(r => {
  r.addEventListener('change', () => {
    const campo  = document.getElementById('campo-qtd-vagas');
    const mostrar = r.value === 'sim' && r.checked;
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

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) dados[key] = value;
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

    const res         = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(dados),
    });

    const textoResposta = await res.text();
    let json;
    try {
      json = JSON.parse(textoResposta);
    } catch (_) {
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
