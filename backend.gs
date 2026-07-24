/**
 * ═══════════════════════════════════════════════════════════════════
 *  FICHA CADASTRAL DE LOCATÁRIO RESIDENCIAL — Google Apps Script
 * ═══════════════════════════════════════════════════════════════════
 *
 *  COMO PUBLICAR COMO APP DA WEB:
 *  1. Abra o projeto no Google Apps Script (script.google.com)
 *  2. Cole este código inteiro substituindo o conteúdo padrão
 *  3. Clique em "Implantar" → "Nova implantação"
 *  4. Tipo: "App da Web"
 *  5. Executar como: "Eu (seu e-mail)"
 *  6. Quem tem acesso: "Qualquer pessoa"
 *  7. Copie a URL gerada (termina em /exec) e cole nos dois HTMLs
 *
 *  ATENÇÃO: Sempre que alterar o código, crie uma NOVA implantação.
 *
 *  PRIMEIRO USO — CRIAR ADMINISTRADOR INICIAL:
 *  1. Preencha ADMIN_EMAIL e ADMIN_SENHA dentro da função configurarPrimeiroAdmin
 *  2. Menu "Executar" → selecione "configurarPrimeiroAdmin" → clique "Executar"
 *  3. Veja o resultado em Visualizar → Registros (Ctrl+Enter)
 *  4. Apague os valores e substitua pelos placeholders antes de fechar
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Configurações — altere aqui ───────────────────────────────────
var SHEET_ID     = '1dy3gQq8bPE4C8ODpZSf2Hv9x4_Q2-g6SjPDXqrdgygw';
var FOLDER_ID    = '1xHIZomIVqtFTx8OWRNC3ZpoJa9yLjfO-';
var SHEET_NAME   = 'Fichas';
var USUARIOS_ABA = 'Usuarios';

// ── Colunas fixas ─────────────────────────────────────────────────
var COLUNAS_BASE = [
  'id', 'data_envio', 'status',
  'tipo_imovel', 'vigencia_contrato', 'ramo_atividade',
  'tipo_pessoa', 'pj_razao_social', 'pj_cnpj', 'pj_inscricao',
  'corretor', 'codigo_imovel', 'tem_vaga', 'qtd_vagas', 'tipo_garantia',
  'nome', 'cpf', 'nascimento', 'estado_civil', 'nacionalidade', 'profissao', 'email', 'celular',
  'endereco_logradouro', 'endereco_numero', 'endereco_bairro', 'endereco_complemento', 'endereco_lote', 'endereco_quadra',
  'cep_atual', 'cidade_atual', 'estado_atual',
  'emerg_nome', 'emerg_cel', 'emerg_parentesco',
  'tem_conjuge', 'conj_nome', 'conj_cpf', 'conj_nascimento',
  'conj_nacionalidade', 'conj_profissao', 'conj_email', 'conj_celular',
  'qtd_locatarios', 'qtd_socios'
];

var COLUNAS_LOC_SUFIXOS = [
  '_nome', '_cpf', '_nascimento', '_estado_civil',
  '_nacionalidade', '_profissao', '_email', '_celular',
  '_logradouro', '_numero', '_bairro', '_complemento', '_lote', '_quadra', '_cep', '_cidade', '_uf',
  '_emerg_nome', '_emerg_cel', '_emerg_parentesco',
  '_doc_id_url', '_comp_res_url'
];

var COLUNAS_SOC_SUFIXOS = [
  '_nome', '_cpf', '_nascimento', '_estado_civil',
  '_nacionalidade', '_profissao', '_email', '_celular',
  '_logradouro', '_numero', '_bairro', '_complemento', '_lote', '_quadra', '_cep', '_cidade', '_uf',
  '_emerg_nome', '_emerg_cel', '_emerg_parentesco',
  '_doc_id_url', '_comp_res_url'
];

var COLUNAS_FINAL = [
  'doc_identificacao_url', 'comprovante_residencia_url', 'aprovacao_seguro_url',
  'pj_balancete_url', 'pj_contrato_social_url', 'pj_cartao_cnpj_url', 'pj_extrato_simples_url',
  'conj_doc_url',
  'vencimento_boleto', 'tipo_assinatura', 'aceite_declaracao'
];

function obterColunas() {
  var cols = COLUNAS_BASE.slice();
  for (var i = 1; i <= 10; i++) {
    for (var j = 0; j < COLUNAS_LOC_SUFIXOS.length; j++) {
      cols.push('loc' + i + COLUNAS_LOC_SUFIXOS[j]);
    }
  }
  for (var i = 1; i <= 10; i++) {
    for (var j = 0; j < COLUNAS_SOC_SUFIXOS.length; j++) {
      cols.push('soc' + i + COLUNAS_SOC_SUFIXOS[j]);
    }
  }
  for (var k = 0; k < COLUNAS_FINAL.length; k++) {
    cols.push(COLUNAS_FINAL[k]);
  }
  return cols;
}

/* ═══════════════════════════════════════════════════════════════════
   SEGURANÇA — Autenticação e Sessões
   ═══════════════════════════════════════════════════════════════════ */

// SHA-256 da senha (nunca armazenamos senhas em texto puro)
function hashSenha(senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// Cria token UUID com TTL de 4 horas no CacheService (servidor)
function criarToken(email, papel) {
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    'tok_' + token,
    JSON.stringify({ email: email, papel: papel }),
    14400 // segundos = 4 horas
  );
  return token;
}

// Verifica token; retorna {email, papel} ou null se inválido/expirado
function verificarToken(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('tok_' + token);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// Invalida token imediatamente (logout)
function invalidarToken(token) {
  if (token) CacheService.getScriptCache().remove('tok_' + token);
}

// Resposta padronizada de acesso negado
function erro401() {
  return resposta({ status: 'auth_error', message: 'Sessão inválida ou expirada. Faça login novamente.' });
}

/* ═══════════════════════════════════════════════════════════════════
   USUÁRIOS — Aba "Usuarios" na planilha
   ═══════════════════════════════════════════════════════════════════ */

function abaUsuarios() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(USUARIOS_ABA);
  if (!sh) {
    sh = ss.insertSheet(USUARIOS_ABA);
    sh.appendRow(['email', 'senha_hash', 'papel', 'criado_em', 'ativo']);
    var hr = sh.getRange(1, 1, 1, 5);
    hr.setBackground('#1a3c6e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(9);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 240);
    sh.setColumnWidth(2, 80);
    sh.setColumnWidth(3, 90);
    sh.setColumnWidth(4, 140);
    sh.setColumnWidth(5, 70);
  }
  return sh;
}

function buscarUsuario(email) {
  var sh   = abaUsuarios();
  var rows = sh.getDataRange().getValues();
  var cab  = rows[0];
  var ci   = cab.indexOf('email');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][ci]).toLowerCase() === String(email).toLowerCase()) {
      var u = {};
      for (var j = 0; j < cab.length; j++) u[cab[j]] = rows[i][j];
      u._row = i + 1;
      return u;
    }
  }
  return null;
}

function totalUsuarios() {
  return Math.max(0, abaUsuarios().getLastRow() - 1);
}

/* ═══════════════════════════════════════════════════════════════════
   CONFIGURAÇÃO INICIAL — Execute UMA VEZ no editor do Apps Script
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Crie o primeiro administrador executando esta função no editor GAS.
 *
 * COMO USAR:
 * 1. Preencha ADMIN_EMAIL e ADMIN_SENHA abaixo com seus dados reais
 * 2. Menu "Executar" → selecione "configurarPrimeiroAdmin" → clique "Executar"
 * 3. Veja o resultado no menu "Execuções" ou em Visualizar → Registros
 * 4. ⚠️ APAGUE os valores e substitua pelos placeholders antes de fechar
 *
 * Só funciona quando não existe nenhum usuário cadastrado.
 */
function configurarPrimeiroAdmin() {
  // ── EDITE AQUI antes de executar ──────────────────────────────────
  var ADMIN_EMAIL = 'COLOQUE_SEU_EMAIL_AQUI';
  var ADMIN_SENHA = 'COLOQUE_SUA_SENHA_AQUI'; // mínimo 8 caracteres
  // ──────────────────────────────────────────────────────────────────

  if (ADMIN_EMAIL === 'COLOQUE_SEU_EMAIL_AQUI' || ADMIN_SENHA === 'COLOQUE_SUA_SENHA_AQUI') {
    Logger.log('❌ Preencha ADMIN_EMAIL e ADMIN_SENHA no código antes de executar.');
    return;
  }
  if (ADMIN_EMAIL.indexOf('@') === -1) {
    Logger.log('❌ E-mail inválido: ' + ADMIN_EMAIL);
    return;
  }
  if (ADMIN_SENHA.length < 8) {
    Logger.log('❌ Senha muito curta — mínimo 8 caracteres.');
    return;
  }
  if (totalUsuarios() > 0) {
    Logger.log('❌ Já existem usuários cadastrados. Use o painel para criar novos usuários.');
    return;
  }

  abaUsuarios().appendRow([
    ADMIN_EMAIL.toLowerCase().trim(),
    hashSenha(ADMIN_SENHA),
    'admin',
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
    true
  ]);

  Logger.log('✅ Administrador criado com sucesso! E-mail: ' + ADMIN_EMAIL);
  Logger.log('⚠️  Agora APAGUE os valores de ADMIN_EMAIL e ADMIN_SENHA do código e salve.');
}

/* ═══════════════════════════════════════════════════════════════════
   doPost — recebe ficha, login, ações autenticadas
   ═══════════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return resposta({ status: 'erro', message: 'Nenhum dado recebido.' });
    }

    var dados = JSON.parse(e.postData.contents);
    var acao  = String(dados.acao || '');

    /* ── Login (público) ─────────────────────────────────────────── */
    if (acao === 'login') {
      var emailLogin = String(dados.email || '').toLowerCase().trim();
      var senhaLogin = String(dados.senha || '');
      if (!emailLogin || !senhaLogin) {
        return resposta({ status: 'erro', message: 'E-mail e senha obrigatórios.' });
      }
      var usuario = buscarUsuario(emailLogin);
      if (!usuario || !(usuario.ativo === true || usuario.ativo === 'TRUE') ||
          usuario.senha_hash !== hashSenha(senhaLogin)) {
        // Resposta genérica — não revela se o e-mail existe
        return resposta({ status: 'auth_error', message: 'E-mail ou senha incorretos.' });
      }
      var token = criarToken(emailLogin, usuario.papel);
      return resposta({ status: 'ok', token: token, papel: usuario.papel, email: emailLogin });
    }

    /* ── Logout (requer token válido) ────────────────────────────── */
    if (acao === 'logout') {
      invalidarToken(dados.token || '');
      return resposta({ status: 'ok' });
    }

    /* ── Criar usuário (requer token admin) ──────────────────────── */
    if (acao === 'criar_usuario') {
      var sessC = verificarToken(dados.token || '');
      if (!sessC || sessC.papel !== 'admin') return erro401();

      var novoEmail = String(dados.novo_email || '').toLowerCase().trim();
      var novaSenha = String(dados.nova_senha || '');
      var novoPapel = dados.novo_papel === 'admin' ? 'admin' : 'usuario';

      if (!novoEmail || novoEmail.indexOf('@') === -1) {
        return resposta({ status: 'erro', message: 'E-mail inválido.' });
      }
      if (!novaSenha || novaSenha.length < 6) {
        return resposta({ status: 'erro', message: 'Senha deve ter no mínimo 6 caracteres.' });
      }
      var lockCU = LockService.getScriptLock();
      lockCU.waitLock(15000);
      try {
        if (buscarUsuario(novoEmail)) {
          return resposta({ status: 'erro', message: 'E-mail já cadastrado.' });
        }
        abaUsuarios().appendRow([
          novoEmail,
          hashSenha(novaSenha),
          novoPapel,
          Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
          true
        ]);
      } finally {
        lockCU.releaseLock();
      }
      return resposta({ status: 'ok' });
    }

    /* ── Atualizar usuário (requer token admin) ───────────────────── */
    if (acao === 'atualizar_usuario') {
      var sessA = verificarToken(dados.token || '');
      if (!sessA || sessA.papel !== 'admin') return erro401();

      var emailAlvo = String(dados.email_alvo || '').toLowerCase().trim();
      var alvo = buscarUsuario(emailAlvo);
      if (!alvo) return resposta({ status: 'erro', message: 'Usuário não encontrado.' });

      // Impede que o admin se auto-desative
      if (emailAlvo === sessA.email && dados.ativo === false) {
        return resposta({ status: 'erro', message: 'Você não pode desativar sua própria conta.' });
      }

      var lockAU = LockService.getScriptLock();
      lockAU.waitLock(15000);
      try {
        var shU   = abaUsuarios();
        var cabU  = shU.getRange(1, 1, 1, shU.getLastColumn()).getValues()[0];

        if (dados.nova_senha && String(dados.nova_senha).length >= 6) {
          var colHash = cabU.indexOf('senha_hash');
          shU.getRange(alvo._row, colHash + 1).setValue(hashSenha(String(dados.nova_senha)));
        }
        if (dados.novo_papel !== undefined) {
          var colPapel = cabU.indexOf('papel');
          shU.getRange(alvo._row, colPapel + 1).setValue(dados.novo_papel === 'admin' ? 'admin' : 'usuario');
        }
        if (dados.ativo !== undefined) {
          var colAtivo = cabU.indexOf('ativo');
          shU.getRange(alvo._row, colAtivo + 1).setValue(dados.ativo === true || dados.ativo === 'true');
        }
      } finally {
        lockAU.releaseLock();
      }
      return resposta({ status: 'ok' });
    }

    /* ── Editar ficha (requer token admin) ───────────────────────── */
    if (acao === 'editar') {
      var sessE = verificarToken(dados.token || '');
      if (!sessE || sessE.papel !== 'admin') return erro401();

      var idEdit  = dados.id   || '';
      var novos   = dados.dados || {};
      if (!idEdit) return resposta({ status: 'erro', message: 'ID obrigatório para edição.' });

      var lockEd = LockService.getScriptLock();
      lockEd.waitLock(15000);
      try {
        var sheetEd = obterOuCriarAba();
        var dadosEd = sheetEd.getDataRange().getValues();
        var cabEd   = dadosEd[0];
        var colIdEd = cabEd.indexOf('id');

        for (var re = 1; re < dadosEd.length; re++) {
          if (dadosEd[re][colIdEd] === idEdit) {
            for (var ce = 0; ce < cabEd.length; ce++) {
              var campoEd = cabEd[ce];
              if (campoEd === 'id' || campoEd === 'data_envio' || campoEd === 'status') continue;
              if (novos[campoEd] !== undefined) {
                sheetEd.getRange(re + 1, ce + 1).setValue(novos[campoEd]);
              }
            }
            marcarRevisao();
            return resposta({ status: 'ok' });
          }
        }
        return resposta({ status: 'erro', message: 'ID não encontrado para edição.' });
      } finally {
        lockEd.releaseLock();
      }
    }

    /* ── Vigência do Contrato (requer token admin) ──────────────── */
    if (acao === 'vigencia') {
      var sessVig = verificarToken(dados.token || '');
      if (!sessVig || sessVig.papel !== 'admin') return erro401();

      var idVig  = dados.id              || '';
      var inicio = dados.vigencia_inicio || '';
      if (!idVig) return resposta({ status: 'erro', message: 'Parâmetro id obrigatório.' });

      var lockVig = LockService.getScriptLock();
      lockVig.waitLock(15000);
      try {
        var shVig = obterOuCriarAba();
        var hdrs  = shVig.getRange(1, 1, 1, shVig.getLastColumn()).getValues()[0];
        var colId = hdrs.indexOf('id');

        var colIni = hdrs.indexOf('vigencia_inicio');
        if (colIni === -1) {
          shVig.getRange(1, hdrs.length + 1).setValue('vigencia_inicio');
          hdrs   = shVig.getRange(1, 1, 1, shVig.getLastColumn()).getValues()[0];
          colIni = hdrs.indexOf('vigencia_inicio');
        }

        var dadosVig = shVig.getDataRange().getValues();
        var rowVig   = -1;
        for (var rv = 1; rv < dadosVig.length; rv++) {
          if (dadosVig[rv][colId] === idVig) { rowVig = rv + 1; break; }
        }
        if (rowVig === -1) return resposta({ status: 'erro', message: 'ID não encontrado.' });

        shVig.getRange(rowVig, colIni + 1).setNumberFormat('@').setValue(yyyymmddParaBR(inicio));
        marcarRevisao();
        return resposta({ status: 'ok' });
      } finally {
        lockVig.releaseLock();
      }
    }

    /* ── Observação interna (requer token admin) ─────────────────── */
    if (acao === 'observacao') {
      var sessObs = verificarToken(dados.token || '');
      if (!sessObs || sessObs.papel !== 'admin') return erro401();

      var idObs   = dados.id         || '';
      var textoObs = dados.observacao !== undefined ? String(dados.observacao) : '';
      if (!idObs) return resposta({ status: 'erro', message: 'Parâmetro id obrigatório.' });

      var lockObs = LockService.getScriptLock();
      lockObs.waitLock(15000);
      try {
        var shObs   = obterOuCriarAba();
        var hdrsObs = shObs.getRange(1, 1, 1, shObs.getLastColumn()).getValues()[0];
        var colIdObs = hdrsObs.indexOf('id');

        var colObsIdx = hdrsObs.indexOf('observacao');
        if (colObsIdx === -1) {
          shObs.getRange(1, hdrsObs.length + 1).setValue('observacao');
          hdrsObs   = shObs.getRange(1, 1, 1, shObs.getLastColumn()).getValues()[0];
          colObsIdx = hdrsObs.indexOf('observacao');
        }

        var dadosObs = shObs.getDataRange().getValues();
        var rowObs   = -1;
        for (var ro = 1; ro < dadosObs.length; ro++) {
          if (dadosObs[ro][colIdObs] === idObs) { rowObs = ro + 1; break; }
        }
        if (rowObs === -1) return resposta({ status: 'erro', message: 'ID não encontrado.' });

        shObs.getRange(rowObs, colObsIdx + 1).setValue(textoObs);
        marcarRevisao();
        return resposta({ status: 'ok' });
      } finally {
        lockObs.releaseLock();
      }
    }

    /* ── Ping — polling em tempo real (token no corpo) ──────────── */
    if (acao === 'ping') {
      if (!verificarToken(dados.token || '')) return erro401();
      return resposta({ revisao: CacheService.getScriptCache().get('revisao') || '0' });
    }

    /* ── Listar fichas via POST (token no corpo, não na URL) ────── */
    if (acao === 'listar') {
      if (!verificarToken(dados.token || '')) return erro401();
      var shL    = obterOuCriarAba();
      var dadosL = shL.getDataRange().getValues();
      if (dadosL.length <= 1) return resposta({ fichas: [] });
      var cabL   = dadosL[0];
      var fichas = [];
      for (var rL = 1; rL < dadosL.length; rL++) {
        var objL = {};
        for (var cL = 0; cL < cabL.length; cL++) objL[cabL[cL]] = dadosL[rL][cL];
        fichas.push(objL);
      }
      return resposta({ fichas: fichas });
    }

    /* ── Atualizar status via POST (requer token admin) ──────────── */
    if (acao === 'status') {
      var sessSP = verificarToken(dados.token || '');
      if (!sessSP || sessSP.papel !== 'admin') return erro401();

      var idSt  = dados.id     || '';
      var stVal = dados.status || '';
      if (!idSt || !stVal) {
        return resposta({ status: 'erro', message: 'Parâmetros id e status são obrigatórios.' });
      }
      var STATUS_OK = ['nova', 'confeccao', 'concluida', 'reprovada', 'contrato_enviado'];
      if (STATUS_OK.indexOf(stVal) === -1) {
        return resposta({ status: 'erro', message: 'Status inválido.' });
      }

      var lockSt = LockService.getScriptLock();
      lockSt.waitLock(15000);
      try {
        var shSt    = obterOuCriarAba();
        var dadosSt = shSt.getDataRange().getValues();
        var colIdSt = dadosSt[0].indexOf('id');
        var colStSt = dadosSt[0].indexOf('status');
        for (var rowSt = 1; rowSt < dadosSt.length; rowSt++) {
          if (dadosSt[rowSt][colIdSt] === idSt) {
            shSt.getRange(rowSt + 1, colStSt + 1).setValue(stVal);
            marcarRevisao();
            return resposta({ status: 'ok' });
          }
        }
        return resposta({ status: 'erro', message: 'ID não encontrado.' });
      } finally {
        lockSt.releaseLock();
      }
    }

    /* ── Excluir ficha via POST (requer token admin) ─────────────── */
    if (acao === 'excluir') {
      var sessXP = verificarToken(dados.token || '');
      if (!sessXP || sessXP.papel !== 'admin') return erro401();

      var idXP = dados.id || '';
      if (!idXP) return resposta({ status: 'erro', message: 'Parâmetro id obrigatório.' });

      var lockXP = LockService.getScriptLock();
      lockXP.waitLock(15000);
      try {
        var shXP    = obterOuCriarAba();
        var dadosXP = shXP.getDataRange().getValues();
        var colIdXP = dadosXP[0].indexOf('id');
        for (var reXP = 1; reXP < dadosXP.length; reXP++) {
          if (dadosXP[reXP][colIdXP] === idXP) {
            shXP.deleteRow(reXP + 1);
            excluirPastaDrive(idXP);
            marcarRevisao();
            return resposta({ status: 'ok' });
          }
        }
        return resposta({ status: 'erro', message: 'ID não encontrado.' });
      } finally {
        lockXP.releaseLock();
      }
    }

    /* ── Excluir usuário via POST (requer token admin) ──────────── */
    if (acao === 'excluir_usuario') {
      var sessEU = verificarToken(dados.token || '');
      if (!sessEU || sessEU.papel !== 'admin') return erro401();

      var emailDel = String(dados.email_alvo || '').toLowerCase().trim();
      if (!emailDel) return resposta({ status: 'erro', message: 'E-mail obrigatório.' });
      if (emailDel === sessEU.email) {
        return resposta({ status: 'erro', message: 'Você não pode excluir sua própria conta.' });
      }

      var lockEU = LockService.getScriptLock();
      lockEU.waitLock(15000);
      try {
        var shDel   = abaUsuarios();
        var rowsDel = shDel.getDataRange().getValues();
        var colEmlD = rowsDel[0].indexOf('email');
        for (var d = 1; d < rowsDel.length; d++) {
          if (String(rowsDel[d][colEmlD]).toLowerCase() === emailDel) {
            shDel.deleteRow(d + 1);
            return resposta({ status: 'ok' });
          }
        }
        return resposta({ status: 'erro', message: 'Usuário não encontrado.' });
      } finally {
        lockEU.releaseLock();
      }
    }

    /* ── Listar usuários via POST (requer token admin) ───────────── */
    if (acao === 'listar_usuarios') {
      var sessLU2 = verificarToken(dados.token || '');
      if (!sessLU2 || sessLU2.papel !== 'admin') return erro401();

      var shU2   = abaUsuarios();
      var rowsU2 = shU2.getDataRange().getValues();
      var cabU2  = rowsU2[0];
      var lista2 = [];
      for (var iu2 = 1; iu2 < rowsU2.length; iu2++) {
        var uObj2 = {};
        for (var ju2 = 0; ju2 < cabU2.length; ju2++) uObj2[cabU2[ju2]] = rowsU2[iu2][ju2];
        delete uObj2.senha_hash;
        lista2.push(uObj2);
      }
      return resposta({ usuarios: lista2 });
    }

    /* ── Nova ficha (público — formulario.html) ──────────────────── */
    if (dados.form_key !== 'LOCACAO_RES_2025') {
      return resposta({ status: 'erro', message: 'Requisição inválida.' });
    }
    var nomeEnviado = String(dados.nome || '').trim();
    var cpfEnviado  = String(dados.cpf  || '').trim();
    if (!nomeEnviado || nomeEnviado.length < 3 || !cpfEnviado || cpfEnviado.length < 11) {
      return resposta({ status: 'erro', message: 'Dados obrigatórios ausentes.' });
    }

    var protocolo = gerarProtocolo();
    var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

    var pastaRaiz = DriveApp.getFolderById(FOLDER_ID);
    var nomePasta = protocolo + ' — ' + String(dados.nome || 'sem-nome').substring(0, 40);
    var subpasta  = pastaRaiz.createFolder(nomePasta);

    var qtdLoc = parseInt(dados.qtd_locatarios) || 0;
    var qtdSoc = parseInt(dados.qtd_socios)     || 0;
    var camposArquivo = [
      'doc_identificacao', 'comprovante_residencia', 'aprovacao_seguro',
      'pj_balancete', 'pj_contrato_social', 'pj_cartao_cnpj', 'pj_extrato_simples',
      'conj_doc'
    ];
    for (var i = 1; i <= qtdLoc; i++) {
      camposArquivo.push('loc' + i + '_doc_id');
      camposArquivo.push('loc' + i + '_comp_res');
    }
    for (var i = 1; i <= qtdSoc; i++) {
      camposArquivo.push('soc' + i + '_doc_id');
      camposArquivo.push('soc' + i + '_comp_res');
    }

    for (var a = 0; a < camposArquivo.length; a++) {
      var campoArq = camposArquivo[a];
      var b64 = dados[campoArq + '_b64'];
      if (b64) {
        try {
          var nomeArq = dados[campoArq + '_nome'] || campoArq + '.bin';
          var tipoArq = dados[campoArq + '_tipo'] || 'application/octet-stream';
          var bytes   = Utilities.base64Decode(b64);
          var blob    = Utilities.newBlob(bytes, tipoArq, nomeArq);
          var arq     = subpasta.createFile(blob);
          arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          dados[campoArq + '_url'] = arq.getUrl();
        } catch (fileErr) {
          Logger.log('Erro ao salvar ' + campoArq + ': ' + fileErr.message);
        }
      }
      delete dados[campoArq + '_b64'];
      delete dados[campoArq + '_nome'];
      delete dados[campoArq + '_tipo'];
    }

    var colunas = obterColunas();
    var linha   = [];
    for (var c = 0; c < colunas.length; c++) {
      var col = colunas[c];
      if (col === 'id')         { linha.push(protocolo); continue; }
      if (col === 'data_envio') { linha.push(agora);     continue; }
      if (col === 'status')     { linha.push('nova');    continue; }
      linha.push(dados[col] !== undefined ? dados[col] : '');
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(30000); // aguarda até 30s na fila antes de desistir
    try {
      var fichaSheet = obterOuCriarAba();
      fichaSheet.appendRow(linha);

      // Persiste destinacao_pj_tipo e destinacao_pj_ref como colunas dinâmicas,
      // igual a vigencia_inicio e observacao — sem alterar o schema fixo.
      if (dados.destinacao_pj_tipo || dados.destinacao_pj_ref) {
        var lastRow = fichaSheet.getLastRow();
        var hdrs    = fichaSheet.getRange(1, 1, 1, fichaSheet.getLastColumn()).getValues()[0];

        var colDest = hdrs.indexOf('destinacao_pj_tipo');
        if (colDest === -1) {
          colDest = hdrs.length;
          fichaSheet.getRange(1, colDest + 1).setValue('destinacao_pj_tipo');
          hdrs.push('destinacao_pj_tipo');
        }

        var colRef = hdrs.indexOf('destinacao_pj_ref');
        if (colRef === -1) {
          colRef = hdrs.length;
          fichaSheet.getRange(1, colRef + 1).setValue('destinacao_pj_ref');
        }

        fichaSheet.getRange(lastRow, colDest + 1).setValue(dados.destinacao_pj_tipo || '');
        fichaSheet.getRange(lastRow, colRef  + 1).setValue(dados.destinacao_pj_ref  || '');
      }
    } finally {
      lock.releaseLock();
    }
    marcarRevisao();
    return resposta({ status: 'ok', protocolo: protocolo });

  } catch (err) {
    Logger.log('Erro doPost: ' + err.message + '\n' + (err.stack || ''));
    return resposta({ status: 'erro', message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   doGet — listar/status/excluir/dashboard (todos requerem token)
   ═══════════════════════════════════════════════════════════════════ */

function doGet(e) {
  try {
    var acao  = (e && e.parameter && e.parameter.acao)  ? e.parameter.acao  : 'listar';
    var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';

    /* ── Listar fichas ───────────────────────────────────────────── */
    if (acao === 'listar') {
      if (!verificarToken(token)) return erro401();

      var sheet = obterOuCriarAba();
      var dados = sheet.getDataRange().getValues();
      if (dados.length <= 1) return resposta({ fichas: [] });

      var cabecalho = dados[0];
      var fichas    = [];
      for (var r = 1; r < dados.length; r++) {
        var obj = {};
        for (var c = 0; c < cabecalho.length; c++) {
          obj[cabecalho[c]] = dados[r][c];
        }
        fichas.push(obj);
      }
      return resposta({ fichas: fichas });
    }

    /* ── Atualizar status ────────────────────────────────────────── */
    if (acao === 'status') {
      var sessS = verificarToken(token);
      if (!sessS || sessS.papel !== 'admin') return erro401();

      var id     = e.parameter.id     || '';
      var status = e.parameter.status || '';
      if (!id || !status) {
        return resposta({ status: 'erro', message: 'Parâmetros id e status são obrigatórios.' });
      }

      var sheet2 = obterOuCriarAba();
      var dados2 = sheet2.getDataRange().getValues();
      var colId  = dados2[0].indexOf('id');
      var colSt  = dados2[0].indexOf('status');

      for (var row = 1; row < dados2.length; row++) {
        if (dados2[row][colId] === id) {
          sheet2.getRange(row + 1, colSt + 1).setValue(status);
          return resposta({ status: 'ok' });
        }
      }
      return resposta({ status: 'erro', message: 'ID não encontrado.' });
    }

    /* ── Excluir ficha ───────────────────────────────────────────── */
    if (acao === 'excluir') {
      var sessX = verificarToken(token);
      if (!sessX || sessX.papel !== 'admin') return erro401();

      var idExcl = e.parameter.id || '';
      if (!idExcl) return resposta({ status: 'erro', message: 'Parâmetro id obrigatório.' });

      var sheetE = obterOuCriarAba();
      var dadosE = sheetE.getDataRange().getValues();
      var colIdE = dadosE[0].indexOf('id');

      for (var re = 1; re < dadosE.length; re++) {
        if (dadosE[re][colIdE] === idExcl) {
          sheetE.deleteRow(re + 1);
          excluirPastaDrive(idExcl);
          return resposta({ status: 'ok' });
        }
      }
      return resposta({ status: 'erro', message: 'ID não encontrado.' });
    }

    /* ── Dashboard ───────────────────────────────────────────────── */
    if (acao === 'dashboard') {
      if (!verificarToken(token)) return erro401();

      var sheetD = obterOuCriarAba();
      var dadosD = sheetD.getDataRange().getValues();
      if (dadosD.length <= 1) return resposta({ fichas: [], agregados: {} });

      var cabD    = dadosD[0];
      var fichasD = [];

      for (var rd = 1; rd < dadosD.length; rd++) {
        var objD = {};
        for (var cd = 0; cd < cabD.length; cd++) {
          objD[cabD[cd]] = dadosD[rd][cd];
        }
        fichasD.push(objD);
      }

      var puxarTudo = (e.parameter.puxar_tudo || '') === '1';
      if (!puxarTudo) {
        var deStr      = e.parameter.de      || '';
        var ateStr     = e.parameter.ate     || '';
        var corretores = e.parameter.corretor ? e.parameter.corretor.split(',') : [];
        var codImovel  = (e.parameter.codigo_imovel || '').toLowerCase();

        fichasD = fichasD.filter(function(f) {
          if (deStr || ateStr) {
            var dataFicha = parseDateGS(String(f.data_envio || ''));
            if (deStr) {
              var de = new Date(deStr); de.setHours(0, 0, 0, 0);
              if (!dataFicha || dataFicha < de) return false;
            }
            if (ateStr) {
              var ate = new Date(ateStr); ate.setHours(23, 59, 59, 999);
              if (!dataFicha || dataFicha > ate) return false;
            }
          }
          if (corretores.length > 0 && corretores[0] !== '') {
            if (corretores.indexOf(String(f.corretor || '')) === -1) return false;
          }
          if (codImovel) {
            if (String(f.codigo_imovel || '').toLowerCase().indexOf(codImovel) === -1) return false;
          }
          return true;
        });
      }

      var agg = { porStatus: {}, porCorretor: {}, porGarantia: {}, porAssinatura: {}, porMes: {} };
      for (var fa = 0; fa < fichasD.length; fa++) {
        var fi = fichasD[fa];
        var st = String(fi.status       || 'nova');
        var co = String(fi.corretor     || '—');
        var ga = String(fi.tipo_garantia || '—');
        var as = String(fi.tipo_assinatura || '—');
        var dm = mesAno(String(fi.data_envio || ''));
        agg.porStatus[st]     = (agg.porStatus[st]     || 0) + 1;
        agg.porCorretor[co]   = (agg.porCorretor[co]   || 0) + 1;
        agg.porGarantia[ga]   = (agg.porGarantia[ga]   || 0) + 1;
        agg.porAssinatura[as] = (agg.porAssinatura[as] || 0) + 1;
        if (dm) agg.porMes[dm] = (agg.porMes[dm] || 0) + 1;
      }

      return resposta({ fichas: fichasD, agregados: agg });
    }

    /* ── Listar usuários (requer token admin) ────────────────────── */
    if (acao === 'listar_usuarios') {
      var sessLU = verificarToken(token);
      if (!sessLU || sessLU.papel !== 'admin') return erro401();

      var shU  = abaUsuarios();
      var rowsU = shU.getDataRange().getValues();
      var cabU  = rowsU[0];
      var lista = [];
      for (var iu = 1; iu < rowsU.length; iu++) {
        var uObj = {};
        for (var ju = 0; ju < cabU.length; ju++) uObj[cabU[ju]] = rowsU[iu][ju];
        delete uObj.senha_hash; // nunca retornar hash ao cliente
        lista.push(uObj);
      }
      return resposta({ usuarios: lista });
    }

    return resposta({ status: 'erro', message: 'Ação inválida: ' + acao });

  } catch (err) {
    Logger.log('Erro doGet: ' + err.message);
    return resposta({ status: 'erro', message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function marcarRevisao() {
  CacheService.getScriptCache().put('revisao', new Date().getTime().toString(), 21600);
}

function excluirPastaDrive(protocolo) {
  try {
    var raiz = DriveApp.getFolderById(FOLDER_ID);
    var it   = raiz.searchFolders('title contains "' + protocolo + '"');
    while (it.hasNext()) {
      it.next().setTrashed(true);
    }
  } catch (e) {
    Logger.log('Aviso ao excluir pasta do Drive [' + protocolo + ']: ' + e.message);
  }
}

function gerarProtocolo() {
  var ts   = new Date().getTime().toString(36).toUpperCase();
  var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return 'LC-' + ts + '-' + rand;
}

function obterOuCriarAba() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var sheet   = ss.getSheetByName(SHEET_NAME);
  var colunas = obterColunas();

  if (!sheet) return criarAba(ss, colunas);

  var ultimaCol   = sheet.getLastColumn();
  var headerAtual = ultimaCol > 0
    ? sheet.getRange(1, 1, 1, ultimaCol).getValues()[0]
    : [];

  var schemaOk = (headerAtual.length >= colunas.length &&
                  headerAtual[0] === colunas[0] &&
                  headerAtual[8] === colunas[8]);

  if (!schemaOk) {
    var nomeBackup = SHEET_NAME + '_backup_' + new Date().getTime();
    sheet.setName(nomeBackup);
    return criarAba(ss, colunas);
  }
  return sheet;
}

function criarAba(ss, colunas) {
  var sheet = ss.insertSheet(SHEET_NAME);
  sheet.appendRow(colunas);
  var hr = sheet.getRange(1, 1, 1, colunas.length);
  hr.setBackground('#1a3c6e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(9);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(9, 200);
  return sheet;
}

function yyyymmddParaBR(s) {
  if (!s) return '';
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s);
}

function parseDateGS(str) {
  var m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
}

function mesAno(str) {
  var m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return m[2] + '/' + m[3];
}

function resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
