# Ficha Cadastral de Locatário — Francisco Egito Imóveis

Sistema de cadastro de locatários composto por três páginas públicas/administrativas e um backend rodando inteiramente no Google Apps Script. Nenhum servidor próprio é necessário.

---

## Nota sobre a arquitetura

Isso não é bem uma stack — é uma solução funcional montada com o que é gratuito e rápido de colocar no ar. HTML estático na Vercel chamando um Google Apps Script que grava em planilha e salva arquivos no Drive. Ninguém usa isso em produção de verdade, e eu sei disso.

A decisão foi intencional: a demanda aqui é baixa (poucas fichas por dia, sem picos), o custo precisa ser zero e o tempo de desenvolvimento precisava ser curto. Para esse contexto, aguenta bem e não há razão prática para complicar.

Se o volume crescer a ponto de o Apps Script engasgar (lentidão, limite de execução, fila de envios), a migração natural seria:

| Camada | Hoje | Migração gratuita |
|---|---|---|
| Frontend | HTML/CSS/JS estático — Vercel | Mantém igual |
| API / backend | Google Apps Script | Vercel Serverless Functions (Node.js) — já está na Vercel |
| Banco de dados | Google Sheets | Supabase — PostgreSQL, tier gratuito (500 MB, 50 k linhas) |
| Armazenamento de arquivos | Google Drive via Base64 | Supabase Storage — tier gratuito (1 GB) |
| Autenticação | Token UUID no CacheService do Apps Script | Supabase Auth, ou JWT verificado nas Serverless Functions |

A vantagem dessa migração é que o frontend não muda quase nada — só a `APPS_SCRIPT_URL` vira uma rota da própria Vercel (`/api/fichas`), e o envio de arquivos passa a ser multipart direto ao Supabase Storage em vez de Base64 no corpo do JSON, o que resolve também o limite de tamanho de payload.

---

## Estrutura de arquivos

```
/
├── index.html            Redireciona automaticamente para formulario.html
├── formulario.html       Formulário público preenchido pelo inquilino
├── painel.html           Painel administrativo (login, cards, kanban)
├── dashboard.html        Dashboard analítico com gráficos e exportação
├── teste.html            Página de testes — envia payloads reais ao backend
├── backend.gs            Google Apps Script (toda a lógica de servidor)
├── favicon-simbolo.png   Ícone da aba do navegador (símbolo da logo)
│
├── styles/
│   ├── formulario.css
│   ├── painel.css
│   └── dashboard.css
│
├── scripts/
│   ├── formulario.js
│   ├── painel.js
│   └── dashboard.js
│
└── assets/
    └── logo-francisco-egito.png
```

O CSS e o JS de cada página vivem em arquivos separados (`styles/` e `scripts/`). Os HTMLs são praticamente só estrutura — referenciam os externos via `<link>` e `<script src>`.

---

## Como funciona

### Formulário (`formulario.html`)

O inquilino preenche a ficha e faz upload dos documentos. Tudo acontece no browser:

1. O usuário escolhe o tipo de imóvel (residencial ou comercial) e o tipo de pessoa (PF ou PJ).
2. Os campos exibidos mudam de acordo com a escolha: campos de empresa aparecem para PJ, campos de cônjuge são condicionais, locatários adicionais são gerados dinamicamente.
3. Ao enviar, cada arquivo é lido via `FileReader` e convertido para Base64.
4. Um único objeto JSON com todos os campos e arquivos em Base64 é enviado via `fetch` com `Content-Type: text/plain` — esse tipo evita o preflight de CORS que o Apps Script não consegue responder.
5. O backend retorna um número de protocolo e o formulário exibe a tela de confirmação.

### Painel administrativo (`painel.html`)

Acesso por senha. Após o login, o token de sessão fica em `sessionStorage` e é enviado em todas as requisições subsequentes.

- Cards das fichas com status: Nova, Em análise, Concluída, Reprovada, Arquivada.
- Busca por nome, CPF ou código do imóvel.
- Filtro por status e por corretor.
- Modal com todos os dados da ficha, links para os documentos no Drive e botões para mudar status, editar campos ou excluir.
- Geração de PDF da ficha via jsPDF.
- Botão de acesso ao dashboard.

### Dashboard (`dashboard.html`)

Acessível a partir do painel (sessão compartilhada via `sessionStorage`) ou diretamente com login.

- Filtros por equipe, corretor, período e código do imóvel.
- Gráficos: distribuição por status, fichas por corretor, evolução mensal, tipo de garantia, tipo de assinatura.
- Exportação para PDF (A4 paisagem) e planilha `.xlsx`.

### Página de testes (`teste.html`)

Exclusiva para desenvolvimento. Contém seis cenários prontos (residencial PF simples, com cônjuge, com locatário adicional, PJ com sócio, comercial PF, comercial PJ) e dois modos de estresse: envio simultâneo de todos os cenários e rajada de cinco fichas no mesmo milissegundo. Arquivos são substituídos por um PNG de 1×1 pixel em Base64 embutido.

---

## Backend (`backend.gs`)

Roda no Google Apps Script publicado como App da Web. Não há banco de dados próprio — tudo vai para uma planilha do Google Sheets e os arquivos para uma pasta no Google Drive.

### Principais endpoints

| Ação | Método | O que faz |
|---|---|---|
| envio de ficha | POST (sem `acao`) | Salva a ficha na planilha, sobe os arquivos no Drive, retorna protocolo |
| `acao=login` | POST | Valida e-mail e senha (hash SHA-256), cria token de sessão |
| `acao=logout` | POST | Invalida o token imediatamente |
| `acao=listar` | GET | Retorna todas as fichas (requer token) |
| `acao=status` | GET | Atualiza o status de uma ficha pelo `id` |
| `acao=editar` | POST | Atualiza campos específicos de uma ficha |
| `acao=excluir` | GET | Remove a linha da planilha pelo `id` |
| `acao=dashboard` | GET | Retorna fichas filtradas + agregados para os gráficos |

### Segurança

- Senhas armazenadas como hash SHA-256 na aba `Usuarios` da planilha — nunca em texto puro.
- Login gera um token UUID armazenado no `CacheService` do Apps Script com TTL de 4 horas.
- Todas as ações administrativas validam o token antes de executar. Sem token válido, retornam `auth_error`.
- O formulário público (`doPost` sem `acao`) não exige token — é intencionalmente aberto para que inquilinos possam enviar.

### Estrutura da planilha

Cada ficha ocupa uma linha. As colunas são fixas e pré-definidas em `COLUNAS_BASE`, expandidas dinamicamente para até 10 locatários adicionais (`loc1_*` … `loc10_*`) e até 10 sócios (`soc1_*` … `soc10_*`). Arquivos não ficam na planilha — ficam no Drive, e a planilha guarda apenas as URLs.

---

## Configuração inicial

### 1. Planilha no Google Sheets

1. Crie uma planilha em [sheets.google.com](https://sheets.google.com).
2. Copie o ID da URL:
   ```
   https://docs.google.com/spreadsheets/d/<<ID>>/edit
   ```
3. Cole em `backend.gs`:
   ```javascript
   var SHEET_ID = 'cole_aqui';
   ```

### 2. Pasta no Google Drive

1. Crie uma pasta em [drive.google.com](https://drive.google.com).
2. Copie o ID da URL da pasta:
   ```
   https://drive.google.com/drive/folders/<<ID>>
   ```
3. Cole em `backend.gs`:
   ```javascript
   var FOLDER_ID = 'cole_aqui';
   ```

### 3. Publicar o Apps Script

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto.
2. Cole o conteúdo de `backend.gs`.
3. Clique em **Implantar → Nova implantação**.
4. Tipo: `App da Web` / Executar como: `Eu` / Acesso: `Qualquer pessoa`.
5. Copie a URL gerada (termina em `/exec`).

> Para atualizar o backend depois: edite a implantação existente, selecione "Nova versão" e reimplante. Não crie uma nova implantação a menos que queira trocar a URL.

### 4. Criar o primeiro administrador

No editor do Apps Script, abra a função `configurarPrimeiroAdmin`, preencha o e-mail e a senha, execute a função pelo menu **Executar**, e então apague os valores antes de fechar.

### 5. Colar a URL nos arquivos

Substitua `APPS_SCRIPT_URL` nos três arquivos que fazem requisições:

```javascript
// formulario.js, painel.js, dashboard.js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
```

### 6. Configurar as equipes (dashboard)

Em `scripts/dashboard.js`, ajuste a constante `EQUIPES` com os nomes dos corretores exatamente como aparecem no formulário (incluindo acentos):

```javascript
const EQUIPES = {
  'Equipe A': ['Nome Um', 'Nome Dois'],
  'Equipe B': ['Nome Três'],
};
```

---

## Deploy (Vercel)

O repositório está conectado à Vercel com deploy automático. Qualquer push na branch `main` do GitHub atualiza o site em produção automaticamente — não é necessário nenhum passo manual.

URLs resultantes:
- `https://seusite.vercel.app/` — formulário (inquilinos)
- `https://seusite.vercel.app/painel.html` — painel administrativo
- `https://seusite.vercel.app/dashboard.html` — dashboard

---

## Limites e observações técnicas

- Tamanho máximo por arquivo enviado: aproximadamente 7 MB. O payload total (todos os arquivos em Base64 + dados) não deve ultrapassar 40 MB por envio.
- O `Content-Type: text/plain` é intencional — o Google Apps Script não responde ao preflight CORS de `application/json`, então o JSON é enviado como texto puro e parseado no `doPost`.
- O Apps Script cria a aba `Fichas` automaticamente com cabeçalho formatado se ela ainda não existir.
- Tokens de sessão expiram após 4 horas. O painel exibe a tela de login novamente quando isso acontece.
