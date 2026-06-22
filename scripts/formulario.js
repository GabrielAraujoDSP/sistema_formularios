// ── Configuração ────────────────────────────────────────────
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDm7JeQZqjXNd5ISaXfkt_zrkNFLlDs9bdLKJMlrY4JwA8KNpATfSaRm4mqVHqg70/exec';

  // ── Seleção de tipo de imóvel ────────────────────────────────
  function selecionarTipo(tipo) {
    document.getElementById('campo-tipo-imovel').value = tipo;
    document.getElementById('secao-tipo-imovel').style.display = 'none';
    document.getElementById('aviso-principal').style.display   = 'flex';
    document.getElementById('main-form').style.display         = 'block';
    document.getElementById('footer-form').style.display       = 'block';

    const comercial = tipo === 'comercial';
    const secCom = document.getElementById('secao-campos-comercial');
    secCom.style.display = comercial ? 'block' : 'none';

    // Ativa/desativa required nos campos comerciais
    document.querySelectorAll('input[name="vigencia_contrato"]').forEach(r => {
      r.required = comercial;
    });

    document.getElementById('header-titulo').textContent =
      comercial ? 'Ficha Cadastral de Locatário Comercial'
                : 'Ficha Cadastral de Locatário Residencial';
    document.getElementById('header-sub').textContent =
      'Preencha todos os campos obrigatórios e envie seus documentos';

    // Reset estado PF/PJ para nova seleção de tipo de imóvel
    document.getElementById('campo-tipo-pessoa').value = '';
    ['btn-pf','btn-pj'].forEach(id => {
      document.getElementById(id).style.borderColor = '';
      document.getElementById(id).style.background  = '';
    });
    document.getElementById('secao-dados-pj').style.display            = 'none';
    document.getElementById('secao-locatario-principal').style.display  = 'none';
    document.getElementById('secao-conjuge').style.display              = 'none';
    document.getElementById('container-locatarios-adicionais').innerHTML = '';
    document.getElementById('container-locatarios-adicionais').style.display = 'none';
    document.getElementById('secao-pergunta-locatario').style.display   = 'none';
    document.getElementById('secao-vencimento-boleto').style.display    = 'none';
    document.getElementById('campo-pj-razao-social').required = false;
    document.getElementById('campo-pj-cnpj').required         = false;
    document.querySelectorAll('#secao-dados-pj input[type="file"]').forEach(el => el.required = false);
    document.getElementById('container-socios').innerHTML     = '';
    document.getElementById('container-socios').style.display = 'none';
    document.getElementById('secao-pergunta-socio').style.display = 'none';
    contadorLocatarios = 0;
    contadorSocios     = 0;
  }

  // ── Seleção de tipo de pessoa (PF / PJ) ─────────────────────
  function selecionarTipoPessoa(tipo) {
    document.getElementById('campo-tipo-pessoa').value = tipo;
    const ePJ = tipo === 'pj';

    // Destaque visual do botão selecionado
    document.getElementById('btn-pf').style.borderColor = ePJ ? '' : 'var(--primary)';
    document.getElementById('btn-pf').style.background  = ePJ ? '' : '#f0f7ff';
    document.getElementById('btn-pj').style.borderColor = ePJ ? 'var(--primary)' : '';
    document.getElementById('btn-pj').style.background  = ePJ ? '#f0f7ff' : '';

    // Seção de dados PJ
    document.getElementById('secao-dados-pj').style.display = ePJ ? 'block' : 'none';
    document.getElementById('campo-pj-razao-social').required = ePJ;
    document.getElementById('campo-pj-cnpj').required         = ePJ;
    document.querySelectorAll('#secao-dados-pj input[type="file"]').forEach(el => el.required = ePJ);

    // Locatário Principal sempre visível; título muda conforme tipo
    document.getElementById('secao-locatario-principal').style.display = 'block';
    document.getElementById('titulo-locatario-principal').textContent =
      ePJ ? '👤 Representante Legal (Responsável pela assinatura do contrato)'
          : '👤 Locatário Principal (Responsável financeiro pela locação)';

    // Cônjuge: apenas PF
    document.getElementById('secao-conjuge').style.display = ePJ ? 'none' : 'block';

    const containerLoc = document.getElementById('container-locatarios-adicionais');
    const perguntaLoc  = document.getElementById('secao-pergunta-locatario');

    if (ePJ) {
      // PJ: pergunta de sócios antes de ir para assinatura
      containerLoc.innerHTML      = '';
      containerLoc.style.display  = 'none';
      contadorLocatarios          = 0;
      perguntaLoc.style.display   = 'none';
      document.getElementById('container-socios').innerHTML     = '';
      document.getElementById('container-socios').style.display = 'none';
      contadorSocios = 0;
      document.getElementById('secao-pergunta-socio').style.display   = 'block';
      document.getElementById('secao-vencimento-boleto').style.display = 'none';
      document.getElementById('secao-assinatura').style.display        = 'none';
      document.getElementById('secao-declaracao').style.display        = 'none';
      document.getElementById('btn-enviar-wrap').style.display         = 'none';
    } else {
      // PF: fluxo normal com locatários
      containerLoc.style.display = 'block';
      perguntaLoc.style.display  = 'block';
      document.getElementById('container-socios').innerHTML     = '';
      document.getElementById('container-socios').style.display = 'none';
      contadorSocios = 0;
      document.getElementById('secao-pergunta-socio').style.display  = 'none';
      document.getElementById('secao-assinatura').style.display  = 'none';
      document.getElementById('secao-declaracao').style.display  = 'none';
      document.getElementById('btn-enviar-wrap').style.display   = 'none';
    }
  }

  // ── Máscaras ────────────────────────────────────────────────
  function aplicarMascara(val, tipo) {
    const d = val.replace(/\D/g, '');
    if (tipo === 'cpf') {
      return d.slice(0,3) + (d.length>3?'.':'') + d.slice(3,6) + (d.length>6?'.':'') + d.slice(6,9) + (d.length>9?'-':'') + d.slice(9,11);
    }
    if (tipo === 'tel') {
      if (d.length <= 10)
        return '(' + d.slice(0,2) + (d.length>2?') ':'') + d.slice(2,6) + (d.length>6?'-':'') + d.slice(6,10);
      return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7,11);
    }
    if (tipo === 'cep') return d.slice(0,5) + (d.length>5?'-':'') + d.slice(5,8);
    if (tipo === 'cnpj') return d.slice(0,2)+(d.length>2?'.':'')+d.slice(2,5)+(d.length>5?'.':'')+d.slice(5,8)+(d.length>8?'/':'')+d.slice(8,12)+(d.length>12?'-':'')+d.slice(12,14);
    return val;
  }

  document.addEventListener('input', e => {
    const tipo = e.target.dataset.mask;
    if (!tipo) return;
    e.target.value = aplicarMascara(e.target.value, tipo);
  });

  // Cache de pré-codificação: chave = elemento DOM, valor = Promise<{b64,nome,tipo}>
  const arquivosCache = new WeakMap();

  // ── Upload preview + pré-codificação em background ───────────
  document.addEventListener('change', e => {
    if (e.target.type !== 'file') return;
    const previewId = e.target.dataset.preview;
    const areaId = e.target.dataset.area;
    if (previewId) {
      const el = document.getElementById(previewId);
      if (el) el.textContent = e.target.files[0] ? e.target.files[0].name : 'Nenhum arquivo selecionado';
    }
    if (areaId) {
      const area = document.getElementById(areaId);
      if (area) area.classList.toggle('tem-arquivo', !!e.target.files[0]);
    }
    // Inicia codificação imediatamente em background
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      arquivosCache.set(e.target, fileParaBase64(file).then(b64 => ({ b64, nome: file.name, tipo: file.type })));
    } else {
      arquivosCache.delete(e.target);
    }
  });

  // ── Vaga condicional ─────────────────────────────────────────
  document.querySelectorAll('input[name="tem_vaga"]').forEach(r => {
    r.addEventListener('change', () => {
      const campo = document.getElementById('campo-qtd-vagas');
      const mostrar = r.value === 'sim' && r.checked;
      campo.style.display = mostrar ? 'block' : 'none';
      campo.querySelector('input').required = mostrar;
    });
  });

  // ── Cônjuge condicional ─────────────────────────────────────
  document.querySelectorAll('input[name="tem_conjuge"]').forEach(r => {
    r.addEventListener('change', () => {
      const mostrar = r.value === 'sim' && r.checked;
      document.getElementById('campos-conjuge').style.display = mostrar ? 'block' : 'none';
      document.querySelectorAll('#campos-conjuge input, #campos-conjuge select').forEach(el => el.required = mostrar);
    });
  });

  // ── Locatários adicionais ───────────────────────────────────
  let contadorLocatarios = 0;
  let contadorSocios     = 0;

  const UFs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  // Retorna apenas o conteúdo interno (grid), sem wrapper .bloco-locatario
  function gerarBlocoLocatario(n) {
    const ufOpts = UFs.map(u => `<option>${u}</option>`).join('');
    return `
      <div class="grid g3">
        <div class="span3">
          <label>Nome completo <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_nome" required />
        </div>
        <div>
          <label>CPF <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_cpf" placeholder="000.000.000-00" maxlength="14" data-mask="cpf" required />
        </div>
        <div>
          <label>Nascimento <span class="obrig">*</span></label>
          <input type="date" name="loc${n}_nascimento" required />
        </div>
        <div>
          <label>Estado civil <span class="obrig">*</span></label>
          <select name="loc${n}_estado_civil" required>
            <option value="">Selecione</option>
            <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option>
            <option>Viúvo(a)</option><option>União estável</option>
          </select>
        </div>
        <div>
          <label>Nacionalidade <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_nacionalidade" value="Brasileiro(a)" required />
        </div>
        <div>
          <label>Profissão <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_profissao" required />
        </div>
        <div>
          <label>E-mail <span class="obrig">*</span></label>
          <input type="email" name="loc${n}_email" required />
        </div>
        <div>
          <label>Celular <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_celular" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
        </div>
        <div class="span3">
          <label>Logradouro (Rua / Avenida / Estrada) <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_logradouro" placeholder="Ex: Rua das Flores" required />
        </div>
        <div>
          <label>Número <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_numero" placeholder="Ex: 123" required />
        </div>
        <div>
          <label>Bairro <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_bairro" required />
        </div>
        <div>
          <label>Complemento</label>
          <input type="text" name="loc${n}_complemento" placeholder="Apto, Bloco, Casa…" />
        </div>
        <div>
          <label>Lote</label>
          <input type="text" name="loc${n}_lote" />
        </div>
        <div>
          <label>Quadra</label>
          <input type="text" name="loc${n}_quadra" />
        </div>
        <div>
          <label>CEP <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_cep" placeholder="00000-000" maxlength="9" data-mask="cep" required />
        </div>
        <div>
          <label>Cidade <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_cidade" required />
        </div>
        <div>
          <label>Estado <span class="obrig">*</span></label>
          <select name="loc${n}_uf" required><option value="">UF</option>${ufOpts}</select>
        </div>
        <hr class="separador span3" />
        <div class="span3"><strong style="font-size:.85rem;color:var(--primary)">📞 Contato de Emergência</strong></div>
        <div>
          <label>Nome completo <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_emerg_nome" required />
        </div>
        <div>
          <label>Celular <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_emerg_cel" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
        </div>
        <div>
          <label>Grau de parentesco <span class="obrig">*</span></label>
          <input type="text" name="loc${n}_emerg_parentesco" required />
        </div>
        <hr class="separador span3" />
        <div>
          <label>Documento de identificação (RG/CNH) <span class="obrig">*</span></label>
          <div class="upload-area" id="area-loc${n}-doc">
            <div class="upload-icon">📎</div>
            <div class="upload-label">PDF, JPG ou PNG</div>
            <div class="upload-name" id="nome-loc${n}-doc">Nenhum arquivo selecionado</div>
            <input type="file" name="loc${n}_doc_id" accept=".pdf,.jpg,.jpeg,.png" required
              data-preview="nome-loc${n}-doc" data-area="area-loc${n}-doc" />
          </div>
        </div>
        <div>
          <label>Comprovante de residência <span class="obrig">*</span></label>
          <div class="upload-area" id="area-loc${n}-res">
            <div class="upload-icon">🏠</div>
            <div class="upload-label">PDF, JPG ou PNG</div>
            <div class="upload-name" id="nome-loc${n}-res">Nenhum arquivo selecionado</div>
            <input type="file" name="loc${n}_comp_res" accept=".pdf,.jpg,.jpeg,.png" required
              data-preview="nome-loc${n}-res" data-area="area-loc${n}-res" />
          </div>
        </div>
      </div>`;
  }

  function adicionarLocatario() {
    contadorLocatarios++;
    const n = contadorLocatarios;
    const container = document.getElementById('container-locatarios-adicionais');
    container.style.display = 'block';

    const secao = document.createElement('div');
    secao.className = 'secao';
    secao.innerHTML =
      `<div class="secao-titulo" style="justify-content:space-between;">
        <span>👥 Locatário Adicional #${n}</span>
        <button type="button" onclick="removerLocatario(this)"
          style="background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.4);color:#fff;
                 padding:4px 14px;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:700;
                 flex-shrink:0;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.32)'"
          onmouseout="this.style.background='rgba(255,255,255,.18)'">
          ✕ Remover
        </button>
      </div>` +
      `<div class="secao-corpo">${gerarBlocoLocatario(n)}</div>`;
    container.appendChild(secao);

    // Garante que a pergunta fique sempre após os blocos
    const pergunta = document.getElementById('secao-pergunta-locatario');
    container.after(pergunta);

    secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removerLocatario(btnEl) {
    if (!confirm('Remover este locatário adicional?')) return;
    btnEl.closest('.secao').remove();

    // Re-numera os blocos restantes
    const blocos = document.querySelectorAll('#container-locatarios-adicionais .secao');
    blocos.forEach((bloco, idx) => {
      const n = idx + 1;
      const span = bloco.querySelector('.secao-titulo span');
      if (span) span.textContent = `👥 Locatário Adicional #${n}`;
      bloco.querySelectorAll('[name]').forEach(el => {
        el.name = el.name.replace(/^loc\d+_/, `loc${n}_`);
      });
      bloco.querySelectorAll('[id]').forEach(el => {
        el.id = el.id.replace(/loc\d+-/, `loc${n}-`);
      });
      bloco.querySelectorAll('[data-preview]').forEach(el => {
        el.dataset.preview = el.dataset.preview.replace(/loc\d+-/, `loc${n}-`);
      });
      bloco.querySelectorAll('[data-area]').forEach(el => {
        el.dataset.area = el.dataset.area.replace(/loc\d+-/, `loc${n}-`);
      });
    });

    contadorLocatarios = blocos.length;
  }

  function finalizarLocatarios() {
    document.getElementById('secao-pergunta-locatario').style.display  = 'none';
    document.getElementById('secao-vencimento-boleto').style.display   = 'block';
    document.getElementById('secao-assinatura').style.display          = 'block';
    document.getElementById('secao-declaracao').style.display          = 'block';
    document.getElementById('btn-enviar-wrap').style.display           = 'block';
    document.getElementById('secao-vencimento-boleto').scrollIntoView({ behavior: 'smooth' });
  }

  // ── Sócios adicionais (PJ) ───────────────────────────────────
  function gerarBlocoSocio(n) {
    const ufOpts = UFs.map(u => `<option>${u}</option>`).join('');
    return `
      <div class="grid g3">
        <div class="span3">
          <label>Nome completo <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_nome" required />
        </div>
        <div>
          <label>CPF <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_cpf" placeholder="000.000.000-00" maxlength="14" data-mask="cpf" required />
        </div>
        <div>
          <label>Nascimento <span class="obrig">*</span></label>
          <input type="date" name="soc${n}_nascimento" required />
        </div>
        <div>
          <label>Estado civil <span class="obrig">*</span></label>
          <select name="soc${n}_estado_civil" required>
            <option value="">Selecione</option>
            <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option>
            <option>Viúvo(a)</option><option>União estável</option>
          </select>
        </div>
        <div>
          <label>Nacionalidade <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_nacionalidade" value="Brasileiro(a)" required />
        </div>
        <div>
          <label>Profissão <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_profissao" required />
        </div>
        <div>
          <label>E-mail <span class="obrig">*</span></label>
          <input type="email" name="soc${n}_email" required />
        </div>
        <div>
          <label>Celular <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_celular" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
        </div>
        <div class="span3">
          <label>Logradouro (Rua / Avenida / Estrada) <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_logradouro" placeholder="Ex: Rua das Flores" required />
        </div>
        <div>
          <label>Número <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_numero" placeholder="Ex: 123" required />
        </div>
        <div>
          <label>Bairro <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_bairro" required />
        </div>
        <div>
          <label>Complemento</label>
          <input type="text" name="soc${n}_complemento" placeholder="Apto, Bloco, Casa…" />
        </div>
        <div>
          <label>Lote</label>
          <input type="text" name="soc${n}_lote" />
        </div>
        <div>
          <label>Quadra</label>
          <input type="text" name="soc${n}_quadra" />
        </div>
        <div>
          <label>CEP <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_cep" placeholder="00000-000" maxlength="9" data-mask="cep" required />
        </div>
        <div>
          <label>Cidade <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_cidade" required />
        </div>
        <div>
          <label>Estado <span class="obrig">*</span></label>
          <select name="soc${n}_uf" required><option value="">UF</option>${ufOpts}</select>
        </div>
        <hr class="separador span3" />
        <div class="span3"><strong style="font-size:.85rem;color:var(--primary)">📞 Contato de Emergência</strong></div>
        <div>
          <label>Nome completo <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_emerg_nome" required />
        </div>
        <div>
          <label>Celular <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_emerg_cel" placeholder="(00) 00000-0000" maxlength="15" data-mask="tel" required />
        </div>
        <div>
          <label>Grau de parentesco <span class="obrig">*</span></label>
          <input type="text" name="soc${n}_emerg_parentesco" required />
        </div>
        <hr class="separador span3" />
        <div>
          <label>Documento de identificação (RG/CNH) <span class="obrig">*</span></label>
          <div class="upload-area" id="area-soc${n}-doc">
            <div class="upload-icon">📎</div>
            <div class="upload-label">PDF, JPG ou PNG</div>
            <div class="upload-name" id="nome-soc${n}-doc">Nenhum arquivo selecionado</div>
            <input type="file" name="soc${n}_doc_id" accept=".pdf,.jpg,.jpeg,.png" required
              data-preview="nome-soc${n}-doc" data-area="area-soc${n}-doc" />
          </div>
        </div>
        <div>
          <label>Comprovante de residência <span class="obrig">*</span></label>
          <div class="upload-area" id="area-soc${n}-res">
            <div class="upload-icon">🏠</div>
            <div class="upload-label">PDF, JPG ou PNG</div>
            <div class="upload-name" id="nome-soc${n}-res">Nenhum arquivo selecionado</div>
            <input type="file" name="soc${n}_comp_res" accept=".pdf,.jpg,.jpeg,.png" required
              data-preview="nome-soc${n}-res" data-area="area-soc${n}-res" />
          </div>
        </div>
      </div>`;
  }

  function adicionarSocio() {
    contadorSocios++;
    const n = contadorSocios;
    const container = document.getElementById('container-socios');
    container.style.display = 'block';

    const secao = document.createElement('div');
    secao.className = 'secao';
    secao.innerHTML =
      `<div class="secao-titulo" style="justify-content:space-between;">
        <span>🤝 Sócio #${n}</span>
        <button type="button" onclick="removerSocio(this)"
          style="background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.4);color:#fff;
                 padding:4px 14px;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:700;
                 flex-shrink:0;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.32)'"
          onmouseout="this.style.background='rgba(255,255,255,.18)'">
          ✕ Remover
        </button>
      </div>` +
      `<div class="secao-corpo">${gerarBlocoSocio(n)}</div>`;
    container.appendChild(secao);

    const pergunta = document.getElementById('secao-pergunta-socio');
    container.after(pergunta);

    secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removerSocio(btnEl) {
    if (!confirm('Remover este sócio?')) return;
    btnEl.closest('.secao').remove();

    const blocos = document.querySelectorAll('#container-socios .secao');
    blocos.forEach((bloco, idx) => {
      const n = idx + 1;
      const span = bloco.querySelector('.secao-titulo span');
      if (span) span.textContent = `🤝 Sócio #${n}`;
      bloco.querySelectorAll('[name]').forEach(el => {
        el.name = el.name.replace(/^soc\d+_/, `soc${n}_`);
      });
      bloco.querySelectorAll('[id]').forEach(el => {
        el.id = el.id.replace(/soc\d+-/, `soc${n}-`);
      });
      bloco.querySelectorAll('[data-preview]').forEach(el => {
        el.dataset.preview = el.dataset.preview.replace(/soc\d+-/, `soc${n}-`);
      });
      bloco.querySelectorAll('[data-area]').forEach(el => {
        el.dataset.area = el.dataset.area.replace(/soc\d+-/, `soc${n}-`);
      });
    });

    contadorSocios = blocos.length;
  }

  function finalizarSocios() {
    document.getElementById('secao-pergunta-socio').style.display    = 'none';
    document.getElementById('secao-vencimento-boleto').style.display  = 'block';
    document.getElementById('secao-assinatura').style.display         = 'block';
    document.getElementById('secao-declaracao').style.display         = 'block';
    document.getElementById('btn-enviar-wrap').style.display          = 'block';
    document.getElementById('secao-vencimento-boleto').scrollIntoView({ behavior: 'smooth' });
  }

  // ── Converter arquivo para base64 ────────────────────────────
  function fileParaBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Envio do formulário ──────────────────────────────────────
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

    const btn = document.getElementById('btn-enviar');
    const statusDiv = document.getElementById('status-envio');
    btn.disabled = true;
    statusDiv.className = 'enviando';
    statusDiv.innerHTML = '<div class="spinner"></div><span>Enviando ficha, aguarde… (isso pode levar alguns segundos)</span>';

    try {
      const dados = {};

      // Campos de texto/select/radio/checkbox (checkboxes múltiplos agrupados)
      const formData = new FormData(this);
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        if (key === 'tipo_garantia') {
          dados[key] = dados[key] ? dados[key] + ', ' + value : value;
        } else {
          dados[key] = value;
        }
      }

      if (!dados.tipo_garantia) {
        alert('Selecione ao menos uma garantia aceita.');
        btn.disabled = false;
        statusDiv.className = '';
        return;
      }

      dados.qtd_locatarios = contadorLocatarios;
      dados.qtd_socios     = contadorSocios;
      dados.form_key       = 'LOCACAO_RES_2025';

      // Usa cache de pré-codificação; fallback para codificação na hora se necessário
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

      // Enviar como JSON com Content-Type text/plain (evita CORS preflight no Apps Script)
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(dados)
      });

      const textoResposta = await res.text();
      let json;
      try {
        json = JSON.parse(textoResposta);
      } catch (_) {
        throw new Error(
          'O Apps Script retornou uma resposta inesperada (não é JSON). ' +
          'Verifique: 1) se a URL está correta no código, 2) se o script foi publicado como "Qualquer pessoa", ' +
          '3) se o runtime V8 está ativado no projeto (Configurações do projeto → Runtime).'
        );
      }
      if (json.status === 'ok') {
        document.getElementById('num-protocolo').textContent = json.protocolo || '—';
        document.getElementById('overlay-sucesso').classList.add('ativo');
        this.reset();
        document.getElementById('container-locatarios-adicionais').innerHTML = '';
        contadorLocatarios = 0;
        document.getElementById('secao-vencimento-boleto').style.display = 'none';
        document.getElementById('secao-assinatura').style.display = 'none';
        document.getElementById('secao-declaracao').style.display = 'none';
        document.getElementById('btn-enviar-wrap').style.display = 'none';
        statusDiv.className = '';
        statusDiv.textContent = '';
        // Volta ao seletor de tipo
        document.getElementById('main-form').style.display         = 'none';
        document.getElementById('aviso-principal').style.display   = 'none';
        document.getElementById('footer-form').style.display       = 'none';
        document.getElementById('secao-tipo-imovel').style.display = 'flex';
        document.getElementById('secao-campos-comercial').style.display = 'none';
        document.getElementById('campo-tipo-imovel').value = '';
        document.getElementById('header-titulo').textContent = 'Ficha Cadastral de Locatário';
        document.getElementById('header-sub').textContent   = 'Selecione o tipo de imóvel para começar';
      } else {
        throw new Error(json.message || 'Erro desconhecido');
      }
    } catch (err) {
      statusDiv.className = 'erro-msg';
      statusDiv.textContent = '❌ Erro ao enviar: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });