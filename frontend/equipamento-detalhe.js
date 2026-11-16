"use strict";

const API = "/api";
const EQUIPAMENTO_ID = new URLSearchParams(window.location.search).get("id");

let usuarioAtual = null;
let equipamentoAtual = null;
let arquivoSelecionado = null;
let urlPreviewAtual = null;

const STATUS_LABELS = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Em manutenção",
  baixado: "Baixado",
};

const $ = (sel) => document.querySelector(sel);

function aviso(msg, tipo) {
  const el = $("#aviso");
  el.textContent = msg;
  el.className = "aviso " + tipo;
  el.hidden = false;
  if (tipo === "ok") setTimeout(() => (el.hidden = true), 3000);
}

function brl(valorStr) {
  if (valorStr === null || valorStr === undefined) return "—";
  const n = Number(valorStr);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function dataHora(iso) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2);
  return letras.toUpperCase();
}

async function verificarSessao(papelExigido) {
  const resp = await fetch(`${API}/me`);
  if (resp.status === 401) {
    window.location.href = "/login.html";
    return null;
  }
  const usuario = await resp.json();
  if (papelExigido && usuario.papel !== papelExigido) {
    window.location.href = "/";
    return null;
  }
  return usuario;
}

function aplicarUsuarioNaSidebar(usuario) {
  usuarioAtual = usuario;
  $("#usuario-nome").textContent = usuario.nome;
  $("#usuario-papel").textContent = usuario.papel;
  $("#avatar-iniciais").textContent = iniciais(usuario.nome);
  const linkRelatorios = $("#link-relatorios");
  if (linkRelatorios) linkRelatorios.hidden = usuario.papel !== "admin";
  $("#btn-sair").addEventListener("click", async () => {
    await fetch(`${API}/logout`, { method: "POST" });
    window.location.href = "/login.html";
  });
}

async function api(caminho, opcoes) {
  const resp = await fetch(API + caminho, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (resp.status === 204) return null;
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detalhe = corpo.detail;
    const msg = Array.isArray(detalhe)
      ? detalhe.map((d) => d.msg).join("; ")
      : detalhe || "Erro inesperado.";
    throw new Error(msg);
  }
  return corpo;
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("ativa"));
      document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
      btn.classList.add("ativa");
      $(`#tab-${btn.dataset.tab}`).hidden = false;
    });
  });
}

function renderHeader(eq) {
  $("#pagina-titulo").textContent = eq.nome;
  $("#eq-nome").textContent = eq.nome;
  $("#eq-status-badge").className = `badge-status badge-${eq.status}`;
  $("#eq-status-badge").textContent = STATUS_LABELS[eq.status];
  $("#eq-meta").textContent = `Patrimônio ${eq.numero_patrimonio} · ${eq.marca} ${eq.modelo} · cadastrado em ${dataHora(eq.criado_em)}`;

  const acoesEl = $("#eq-acoes");
  acoesEl.innerHTML = "";
  const addBtn = (texto, classe, fn) => {
    const btn = document.createElement("button");
    btn.textContent = texto;
    if (classe) btn.className = classe;
    btn.addEventListener("click", fn);
    acoesEl.appendChild(btn);
  };

  if (eq.status === "disponivel") {
    addBtn("Atribuir", "", () => $("#dialog-atribuir").showModal());
    addBtn("Manutenção", "secundario", () => $("#dialog-manutencao").showModal());
    addBtn("Dar baixa", "perigo", acaoBaixar);
  } else if (eq.status === "em_uso") {
    addBtn("Devolver", "", acaoDevolver);
  } else if (eq.status === "manutencao") {
    addBtn("Finalizar manutenção", "", acaoFinalizarManutencao);
  } else if (eq.status === "baixado") {
    addBtn("Reativar", "", acaoReativar);
  }
  addBtn("Editar", "secundario", abrirEdicao);
  if (usuarioAtual && usuarioAtual.papel === "admin") {
    addBtn("Excluir", "perigo", acaoExcluir);
  }
}

function renderDetalhes(eq) {
  const campos = [
    ["Tipo", esc(eq.tipo)],
    ["Número de série", esc(eq.numero_serie || "—")],
    ["Marca", esc(eq.marca)],
    ["Modelo", esc(eq.modelo)],
    ["Valor de aquisição", brl(eq.valor)],
    ["Status", STATUS_LABELS[eq.status]],
  ];
  const foto = eq.imagem_url
    ? `<img src="${esc(eq.imagem_url)}" alt="${esc(eq.nome)}" class="preview-img" style="margin-bottom:16px" />`
    : "";
  $("#detalhes-visualizacao").innerHTML =
    foto +
    campos
      .map(([label, valor]) => `<div class="campo-item"><small>${esc(label)}</small><strong>${valor}</strong></div>`)
      .join("");
}

function abrirEdicao() {
  const eq = equipamentoAtual;
  $("#edit-nome").value = eq.nome;
  $("#edit-tipo").value = eq.tipo;
  $("#edit-numero_patrimonio").value = eq.numero_patrimonio;
  $("#edit-numero_serie").value = eq.numero_serie ?? "";
  $("#edit-marca").value = eq.marca;
  $("#edit-modelo").value = eq.modelo;
  $("#edit-valor").value = eq.valor ?? "";
  const preview = $("#edit-preview-imagem");
  if (eq.imagem_url) {
    preview.src = eq.imagem_url;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
  arquivoSelecionado = null;
  $("#detalhes-visualizacao").hidden = true;
  $("#form-editar").hidden = false;
}

function fecharEdicao() {
  $("#form-editar").hidden = true;
  $("#detalhes-visualizacao").hidden = false;
}

async function enviarImagem(equipamentoId, arquivo) {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  const resp = await fetch(`${API}/equipamentos/${equipamentoId}/imagem`, { method: "POST", body: dados });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detalhe = corpo.detail;
    const msg = Array.isArray(detalhe) ? detalhe.map((d) => d.msg).join("; ") : detalhe || "Falha ao enviar a imagem.";
    throw new Error(msg);
  }
  return corpo;
}

async function salvarEdicao(evento) {
  evento.preventDefault();
  const payload = {
    nome: $("#edit-nome").value.trim(),
    tipo: $("#edit-tipo").value.trim(),
    numero_patrimonio: $("#edit-numero_patrimonio").value.trim(),
    numero_serie: $("#edit-numero_serie").value.trim() || null,
    marca: $("#edit-marca").value.trim(),
    modelo: $("#edit-modelo").value.trim(),
    valor: $("#edit-valor").value || null,
  };
  try {
    await api(`/equipamentos/${EQUIPAMENTO_ID}`, { method: "PUT", body: JSON.stringify(payload) });
    if (arquivoSelecionado) await enviarImagem(EQUIPAMENTO_ID, arquivoSelecionado);
    fecharEdicao();
    aviso("Equipamento atualizado.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoDevolver() {
  try {
    const ativas = await api(`/atribuicoes?somente_ativas=true&equipamento_id=${EQUIPAMENTO_ID}`);
    if (ativas.length === 0) return;
    await api(`/atribuicoes/${ativas[0].id}/devolver`, { method: "POST" });
    aviso("Equipamento devolvido.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoFinalizarManutencao() {
  try {
    const abertas = await api(`/manutencoes?somente_abertas=true&equipamento_id=${EQUIPAMENTO_ID}`);
    if (abertas.length === 0) return;
    await api(`/manutencoes/${abertas[0].id}/finalizar`, { method: "POST" });
    aviso("Manutenção finalizada.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoBaixar() {
  if (!confirm(`Dar baixa em "${equipamentoAtual.nome}"?`)) return;
  try {
    await api(`/equipamentos/${EQUIPAMENTO_ID}/baixar`, { method: "POST" });
    aviso("Equipamento baixado.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoReativar() {
  try {
    await api(`/equipamentos/${EQUIPAMENTO_ID}/reativar`, { method: "POST" });
    aviso("Equipamento reativado.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoExcluir() {
  if (!confirm(`Excluir "${equipamentoAtual.nome}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await api(`/equipamentos/${EQUIPAMENTO_ID}`, { method: "DELETE" });
    aviso("Equipamento excluído.", "ok");
    window.location.href = "/equipamentos.html";
  } catch (e) {
    aviso(e.message, "erro");
  }
}

function renderAtribuicoes(lista) {
  const tbody = $("#lista-atribuicoes");
  tbody.innerHTML = "";
  $("#atribuicoes-vazio").hidden = lista.length > 0;
  for (const a of lista) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(a.responsavel_nome)}</td>
      <td>${esc(a.setor)}</td>
      <td>${dataHora(a.data_retirada)}</td>
      <td>${a.ativa ? '<span class="badge-status badge-em_uso">Ativa</span>' : dataHora(a.data_devolucao)}</td>
      <td></td>`;
    if (a.ativa) {
      const btn = document.createElement("button");
      btn.textContent = "Devolver";
      btn.addEventListener("click", acaoDevolver);
      tr.lastElementChild.appendChild(btn);
    }
    tbody.appendChild(tr);
  }
}

function renderManutencoes(lista) {
  const tbody = $("#lista-manutencoes");
  tbody.innerHTML = "";
  $("#manutencoes-vazio").hidden = lista.length > 0;
  for (const m of lista) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(m.motivo)}</td>
      <td>${brl(m.custo)}</td>
      <td>${dataHora(m.data_inicio)}</td>
      <td>${m.aberta ? '<span class="badge-status badge-manutencao">Aberta</span>' : dataHora(m.data_fim)}</td>
      <td></td>`;
    if (m.aberta) {
      const btn = document.createElement("button");
      btn.textContent = "Finalizar";
      btn.addEventListener("click", acaoFinalizarManutencao);
      tr.lastElementChild.appendChild(btn);
    }
    tbody.appendChild(tr);
  }
}

function renderAtividade(eq, atribuicoes, manutencoes) {
  const eventos = [
    { data: eq.criado_em, icone: "+", classe: "criacao", texto: `<strong>${esc(eq.nome)}</strong> foi cadastrado no inventário` },
  ];
  for (const a of atribuicoes) {
    eventos.push({
      data: a.data_retirada,
      icone: "A",
      classe: "atribuicao",
      texto: `Atribuído a ${esc(a.responsavel_nome)} (${esc(a.setor)})`,
    });
    if (a.data_devolucao) {
      eventos.push({
        data: a.data_devolucao,
        icone: "D",
        classe: "devolucao",
        texto: `Devolvido por ${esc(a.responsavel_nome)}`,
      });
    }
  }
  for (const m of manutencoes) {
    eventos.push({ data: m.data_inicio, icone: "M", classe: "manutencao", texto: `Manutenção aberta — ${esc(m.motivo)}` });
    if (m.data_fim) {
      eventos.push({ data: m.data_fim, icone: "✓", classe: "devolucao", texto: "Manutenção finalizada" });
    }
  }
  eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
  $("#atividade-feed").innerHTML = eventos
    .map(
      (ev) => `
      <div class="activity-item">
        <div class="activity-dot ${ev.classe}">${ev.icone}</div>
        <div class="activity-texto">${ev.texto}</div>
        <div class="activity-tempo">${dataHora(ev.data)}</div>
      </div>`
    )
    .join("");
}

async function carregarTudo() {
  const [eq, atribuicoes, manutencoes] = await Promise.all([
    api(`/equipamentos/${EQUIPAMENTO_ID}`),
    api(`/atribuicoes?equipamento_id=${EQUIPAMENTO_ID}`),
    api(`/manutencoes?equipamento_id=${EQUIPAMENTO_ID}`),
  ]);
  equipamentoAtual = eq;
  fecharEdicao();
  renderHeader(eq);
  renderDetalhes(eq);
  renderAtribuicoes(atribuicoes);
  renderManutencoes(manutencoes);
  renderAtividade(eq, atribuicoes, manutencoes);
}

initTabs();
$("#form-editar").addEventListener("submit", salvarEdicao);
$("#btn-cancelar-edicao").addEventListener("click", fecharEdicao);
$("#edit-imagem").addEventListener("change", (e) => {
  const arquivo = e.target.files[0] ?? null;
  arquivoSelecionado = arquivo;
  const preview = $("#edit-preview-imagem");
  if (urlPreviewAtual) {
    URL.revokeObjectURL(urlPreviewAtual);
    urlPreviewAtual = null;
  }
  if (arquivo) {
    urlPreviewAtual = URL.createObjectURL(arquivo);
    preview.src = urlPreviewAtual;
    preview.hidden = false;
  } else {
    preview.hidden = true;
    preview.removeAttribute("src");
  }
});

$("#form-atribuir").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    await api("/atribuicoes", {
      method: "POST",
      body: JSON.stringify({
        equipamento_id: Number(EQUIPAMENTO_ID),
        responsavel_nome: $("#atribuir-responsavel").value.trim(),
        setor: $("#atribuir-setor").value.trim(),
        observacao: $("#atribuir-observacao").value.trim() || null,
      }),
    });
    $("#dialog-atribuir").close();
    $("#form-atribuir").reset();
    aviso("Equipamento atribuído.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
});
$("#btn-cancelar-atribuir").addEventListener("click", () => $("#dialog-atribuir").close());

$("#form-manutencao").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    await api("/manutencoes", {
      method: "POST",
      body: JSON.stringify({
        equipamento_id: Number(EQUIPAMENTO_ID),
        motivo: $("#manutencao-motivo").value.trim(),
        custo: $("#manutencao-custo").value || null,
        observacao: $("#manutencao-observacao").value.trim() || null,
      }),
    });
    $("#dialog-manutencao").close();
    $("#form-manutencao").reset();
    aviso("Equipamento enviado para manutenção.", "ok");
    await carregarTudo();
  } catch (e) {
    aviso(e.message, "erro");
  }
});
$("#btn-cancelar-manutencao").addEventListener("click", () => $("#dialog-manutencao").close());

(async function iniciar() {
  if (!EQUIPAMENTO_ID) {
    window.location.href = "/equipamentos.html";
    return;
  }
  const usuario = await verificarSessao();
  if (!usuario) return;
  aplicarUsuarioNaSidebar(usuario);
  try {
    await carregarTudo();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
