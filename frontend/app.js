"use strict";

const API = "/api";
let editandoId = null;
let arquivoSelecionado = null;
let urlPreviewAtual = null;
let equipamentoDialogAtual = null;
let statusAtivo = "";
let usuarioAtual = null;

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

function initMenu() {
  const btn = $("#btn-menu");
  const menu = $("#menu-nav");
  btn.addEventListener("click", () => {
    const vaiAbrir = menu.hidden;
    menu.hidden = !vaiAbrir;
    btn.setAttribute("aria-expanded", String(vaiAbrir));
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
  });
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

function aplicarUsuarioNoMenu(usuario) {
  usuarioAtual = usuario;
  $("#usuario-nome").textContent = usuario.nome;
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

function entrarModoEdicao(equipamento) {
  editandoId = equipamento.id;
  arquivoSelecionado = null;
  $("#imagem").value = "";
  $("#form-titulo").textContent = `Editar equipamento #${equipamento.id}`;
  $("#btn-salvar").textContent = "Salvar alterações";
  $("#btn-cancelar").hidden = false;
  $("#nome").value = equipamento.nome;
  $("#tipo").value = equipamento.tipo;
  $("#numero_patrimonio").value = equipamento.numero_patrimonio;
  $("#numero_serie").value = equipamento.numero_serie ?? "";
  $("#marca").value = equipamento.marca;
  $("#modelo").value = equipamento.modelo;
  $("#valor").value = equipamento.valor ?? "";
  const preview = $("#preview-imagem");
  if (equipamento.imagem_url) {
    preview.src = equipamento.imagem_url;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
  $("#secao-form").scrollIntoView({ behavior: "smooth" });
}

function sairModoEdicao() {
  editandoId = null;
  arquivoSelecionado = null;
  $("#form-titulo").textContent = "Novo equipamento";
  $("#btn-salvar").textContent = "Salvar equipamento";
  $("#btn-cancelar").hidden = true;
  $("#form-equipamento").reset();
  $("#preview-imagem").hidden = true;
}

async function enviarImagem(equipamentoId, arquivo) {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  const resp = await fetch(`${API}/equipamentos/${equipamentoId}/imagem`, {
    method: "POST",
    body: dados,
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detalhe = corpo.detail;
    const msg = Array.isArray(detalhe)
      ? detalhe.map((d) => d.msg).join("; ")
      : detalhe || "Falha ao enviar a imagem.";
    throw new Error(msg);
  }
  return corpo;
}

async function submeter(evento) {
  evento.preventDefault();
  const payload = {
    nome: $("#nome").value.trim(),
    tipo: $("#tipo").value.trim(),
    numero_patrimonio: $("#numero_patrimonio").value.trim(),
    numero_serie: $("#numero_serie").value.trim() || null,
    marca: $("#marca").value.trim(),
    modelo: $("#modelo").value.trim(),
    valor: $("#valor").value || null,
  };
  const estavaEditando = Boolean(editandoId);
  const arquivoParaEnviar = arquivoSelecionado;
  let equipamento;
  try {
    if (editandoId) {
      equipamento = await api(`/equipamentos/${editandoId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      equipamento = await api("/equipamentos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  } catch (e) {
    aviso(e.message, "erro");
    return;
  }

  sairModoEdicao();
  await carregarEquipamentos();

  if (!arquivoParaEnviar) {
    aviso(estavaEditando ? "Equipamento atualizado." : "Equipamento cadastrado.", "ok");
    return;
  }

  try {
    await enviarImagem(equipamento.id, arquivoParaEnviar);
    aviso(estavaEditando ? "Equipamento atualizado." : "Equipamento cadastrado.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(
      `Equipamento ${estavaEditando ? "atualizado" : "cadastrado"}, mas a foto não foi enviada: ${e.message}`,
      "erro"
    );
  }
}

function renderStatusTabs() {
  const opcoes = [
    { valor: "", rotulo: "Todos" },
    { valor: "disponivel", rotulo: "Disponível" },
    { valor: "em_uso", rotulo: "Em uso" },
    { valor: "manutencao", rotulo: "Em manutenção" },
    { valor: "baixado", rotulo: "Baixado" },
  ];
  const tabs = $("#status-tabs");
  tabs.innerHTML = "";
  for (const op of opcoes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "categoria-tab" + (op.valor === statusAtivo ? " ativa" : "");
    btn.textContent = op.rotulo;
    btn.addEventListener("click", () => {
      statusAtivo = op.valor;
      renderStatusTabs();
      carregarEquipamentos();
    });
    tabs.appendChild(btn);
  }
}

function atualizarListaTipos(equipamentos) {
  const tipos = [...new Set(equipamentos.map((e) => e.tipo))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  $("#tipos-lista").innerHTML = tipos
    .map((t) => `<option value="${esc(t)}"></option>`)
    .join("");
}

function abrirDialogAtribuir(equipamento) {
  equipamentoDialogAtual = equipamento.id;
  $("#atribuir-equipamento-nome").textContent =
    `${equipamento.nome} — patrimônio ${equipamento.numero_patrimonio}`;
  $("#form-atribuir").reset();
  $("#dialog-atribuir").showModal();
}

function abrirDialogManutencao(equipamento) {
  equipamentoDialogAtual = equipamento.id;
  $("#manutencao-equipamento-nome").textContent =
    `${equipamento.nome} — patrimônio ${equipamento.numero_patrimonio}`;
  $("#form-manutencao").reset();
  $("#dialog-manutencao").showModal();
}

async function acaoDevolver(equipamentoId) {
  try {
    const ativas = await api(
      `/atribuicoes?somente_ativas=true&equipamento_id=${equipamentoId}`
    );
    if (ativas.length === 0) {
      aviso("Não foi encontrada uma atribuição ativa para devolver.", "erro");
      return;
    }
    await api(`/atribuicoes/${ativas[0].id}/devolver`, { method: "POST" });
    aviso("Equipamento devolvido.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoFinalizarManutencao(equipamentoId) {
  try {
    const abertas = await api(
      `/manutencoes?somente_abertas=true&equipamento_id=${equipamentoId}`
    );
    if (abertas.length === 0) {
      aviso("Não foi encontrada uma manutenção aberta para finalizar.", "erro");
      return;
    }
    await api(`/manutencoes/${abertas[0].id}/finalizar`, { method: "POST" });
    aviso("Manutenção finalizada.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoBaixar(equipamentoId, nome) {
  if (!confirm(`Dar baixa em "${nome}"? Essa ação marca o equipamento como baixado.`)) return;
  try {
    await api(`/equipamentos/${equipamentoId}/baixar`, { method: "POST" });
    aviso("Equipamento baixado.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoReativar(equipamentoId) {
  try {
    await api(`/equipamentos/${equipamentoId}/reativar`, { method: "POST" });
    aviso("Equipamento reativado.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

async function acaoExcluir(equipamentoId, nome) {
  if (!confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await api(`/equipamentos/${equipamentoId}`, { method: "DELETE" });
    aviso("Equipamento excluído.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

function renderTabela(equipamentos) {
  const tbody = $("#lista-equipamentos");
  tbody.innerHTML = "";
  $("#equipamentos-vazio").hidden = equipamentos.length > 0;
  for (const eq of equipamentos) {
    const tr = document.createElement("tr");
    const foto = eq.imagem_url || "/images/placeholder.svg";
    tr.innerHTML = `
      <td><img class="thumb" src="${esc(foto)}" alt="${esc(eq.nome)}" /></td>
      <td>${esc(eq.nome)}<br /><small>${esc(eq.marca)} ${esc(eq.modelo)}</small></td>
      <td>${esc(eq.numero_patrimonio)}</td>
      <td>${esc(eq.marca)} / ${esc(eq.modelo)}</td>
      <td>${brl(eq.valor)}</td>
      <td><span class="badge-status badge-${eq.status}">${STATUS_LABELS[eq.status]}</span></td>
      <td></td>`;
    const acoes = tr.lastElementChild;

    if (eq.status === "disponivel") {
      const bAtribuir = document.createElement("button");
      bAtribuir.textContent = "Atribuir";
      bAtribuir.addEventListener("click", () => abrirDialogAtribuir(eq));
      acoes.appendChild(bAtribuir);

      const bManutencao = document.createElement("button");
      bManutencao.textContent = "Manutenção";
      bManutencao.className = "secundario";
      bManutencao.addEventListener("click", () => abrirDialogManutencao(eq));
      acoes.appendChild(bManutencao);

      const bBaixar = document.createElement("button");
      bBaixar.textContent = "Dar baixa";
      bBaixar.className = "perigo";
      bBaixar.addEventListener("click", () => acaoBaixar(eq.id, eq.nome));
      acoes.appendChild(bBaixar);
    } else if (eq.status === "em_uso") {
      const bDevolver = document.createElement("button");
      bDevolver.textContent = "Devolver";
      bDevolver.addEventListener("click", () => acaoDevolver(eq.id));
      acoes.appendChild(bDevolver);
    } else if (eq.status === "manutencao") {
      const bFinalizar = document.createElement("button");
      bFinalizar.textContent = "Finalizar manutenção";
      bFinalizar.addEventListener("click", () => acaoFinalizarManutencao(eq.id));
      acoes.appendChild(bFinalizar);
    } else if (eq.status === "baixado") {
      const bReativar = document.createElement("button");
      bReativar.textContent = "Reativar";
      bReativar.addEventListener("click", () => acaoReativar(eq.id));
      acoes.appendChild(bReativar);
    }

    const bEditar = document.createElement("button");
    bEditar.textContent = "Editar";
    bEditar.className = "secundario";
    bEditar.addEventListener("click", () => entrarModoEdicao(eq));
    acoes.appendChild(bEditar);

    if (usuarioAtual && usuarioAtual.papel === "admin") {
      const bExcluir = document.createElement("button");
      bExcluir.textContent = "Excluir";
      bExcluir.className = "perigo";
      bExcluir.addEventListener("click", () => acaoExcluir(eq.id, eq.nome));
      acoes.appendChild(bExcluir);
    }

    tbody.appendChild(tr);
  }
}

async function carregarEquipamentos() {
  const query = statusAtivo ? `?status_filtro=${encodeURIComponent(statusAtivo)}` : "";
  const equipamentos = await api(`/equipamentos${query}`);
  const todos = statusAtivo ? await api("/equipamentos") : equipamentos;
  atualizarListaTipos(todos);
  renderTabela(equipamentos);
}

$("#form-equipamento").addEventListener("submit", submeter);
$("#btn-cancelar").addEventListener("click", sairModoEdicao);
$("#imagem").addEventListener("change", (e) => {
  const arquivo = e.target.files[0] ?? null;
  arquivoSelecionado = arquivo;
  const preview = $("#preview-imagem");
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
        equipamento_id: equipamentoDialogAtual,
        responsavel_nome: $("#atribuir-responsavel").value.trim(),
        setor: $("#atribuir-setor").value.trim(),
        observacao: $("#atribuir-observacao").value.trim() || null,
      }),
    });
    $("#dialog-atribuir").close();
    aviso("Equipamento atribuído.", "ok");
    await carregarEquipamentos();
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
        equipamento_id: equipamentoDialogAtual,
        motivo: $("#manutencao-motivo").value.trim(),
        custo: $("#manutencao-custo").value || null,
        observacao: $("#manutencao-observacao").value.trim() || null,
      }),
    });
    $("#dialog-manutencao").close();
    aviso("Equipamento enviado para manutenção.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(e.message, "erro");
  }
});
$("#btn-cancelar-manutencao").addEventListener("click", () => $("#dialog-manutencao").close());

initMenu();
renderStatusTabs();

(async function iniciar() {
  const usuario = await verificarSessao();
  if (!usuario) return;
  aplicarUsuarioNoMenu(usuario);
  try {
    await carregarEquipamentos();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
