"use strict";

const API = "/api";
let arquivoSelecionado = null;
let urlPreviewAtual = null;
let equipamentoDialogAtual = null;
let usuarioAtual = null;
let equipamentosTodos = [];
let statusAtivo = "";
let buscaTexto = "";
let sortCampo = "nome";
let sortDirecao = 1;

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

function abrirFormNovo() {
  $("#form-titulo").textContent = "Novo equipamento";
  $("#form-equipamento").reset();
  $("#preview-imagem").hidden = true;
  arquivoSelecionado = null;
  $("#secao-form").hidden = false;
  $("#secao-form").scrollIntoView({ behavior: "smooth" });
}

function fecharForm() {
  $("#secao-form").hidden = true;
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
  const arquivoParaEnviar = arquivoSelecionado;
  let equipamento;
  try {
    equipamento = await api("/equipamentos", { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    aviso(e.message, "erro");
    return;
  }

  fecharForm();
  await carregarEquipamentos();

  if (!arquivoParaEnviar) {
    aviso("Equipamento cadastrado.", "ok");
    return;
  }
  try {
    await enviarImagem(equipamento.id, arquivoParaEnviar);
    aviso("Equipamento cadastrado.", "ok");
    await carregarEquipamentos();
  } catch (e) {
    aviso(`Equipamento cadastrado, mas a foto não foi enviada: ${e.message}`, "erro");
  }
}

function renderPills() {
  const opcoes = [
    { valor: "", rotulo: "Todos" },
    { valor: "disponivel", rotulo: "Disponível" },
    { valor: "em_uso", rotulo: "Em uso" },
    { valor: "manutencao", rotulo: "Em manutenção" },
    { valor: "baixado", rotulo: "Baixado" },
  ];
  $("#status-pills").innerHTML = opcoes
    .map(
      (op) =>
        `<button type="button" class="pill-filter${op.valor === statusAtivo ? " ativa" : ""}" data-valor="${op.valor}">${op.rotulo}</button>`
    )
    .join("");
  $("#status-pills").querySelectorAll(".pill-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      statusAtivo = btn.dataset.valor;
      renderPills();
      renderLista();
    });
  });
}

function atualizarListaTipos() {
  const tipos = [...new Set(equipamentosTodos.map((e) => e.tipo))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  $("#tipos-lista").innerHTML = tipos.map((t) => `<option value="${esc(t)}"></option>`).join("");
}

function abrirDialogAtribuir(equipamento) {
  equipamentoDialogAtual = equipamento.id;
  $("#atribuir-equipamento-nome").textContent = `${equipamento.nome} — patrimônio ${equipamento.numero_patrimonio}`;
  $("#form-atribuir").reset();
  $("#dialog-atribuir").showModal();
}

function abrirDialogManutencao(equipamento) {
  equipamentoDialogAtual = equipamento.id;
  $("#manutencao-equipamento-nome").textContent = `${equipamento.nome} — patrimônio ${equipamento.numero_patrimonio}`;
  $("#form-manutencao").reset();
  $("#dialog-manutencao").showModal();
}

async function acaoDevolver(equipamentoId) {
  try {
    const ativas = await api(`/atribuicoes?somente_ativas=true&equipamento_id=${equipamentoId}`);
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
    const abertas = await api(`/manutencoes?somente_abertas=true&equipamento_id=${equipamentoId}`);
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

function acaoRapida(eq) {
  if (eq.status === "disponivel") {
    return [
      { texto: "Atribuir", classe: "", fn: () => abrirDialogAtribuir(eq) },
      { texto: "Manutenção", classe: "secundario", fn: () => abrirDialogManutencao(eq) },
      { texto: "Dar baixa", classe: "perigo", fn: () => acaoBaixar(eq.id, eq.nome) },
    ];
  }
  if (eq.status === "em_uso") return [{ texto: "Devolver", classe: "", fn: () => acaoDevolver(eq.id) }];
  if (eq.status === "manutencao")
    return [{ texto: "Finalizar manutenção", classe: "", fn: () => acaoFinalizarManutencao(eq.id) }];
  if (eq.status === "baixado") return [{ texto: "Reativar", classe: "", fn: () => acaoReativar(eq.id) }];
  return [];
}

function aplicarFiltrosOrdenacao() {
  const termo = buscaTexto.trim().toLowerCase();
  let lista = equipamentosTodos.filter((e) => {
    if (statusAtivo && e.status !== statusAtivo) return false;
    if (!termo) return true;
    return (
      e.nome.toLowerCase().includes(termo) ||
      e.numero_patrimonio.toLowerCase().includes(termo) ||
      e.marca.toLowerCase().includes(termo) ||
      e.modelo.toLowerCase().includes(termo)
    );
  });
  lista.sort((a, b) => {
    let va = a[sortCampo];
    let vb = b[sortCampo];
    if (sortCampo === "valor") {
      va = Number(va ?? 0);
      vb = Number(vb ?? 0);
    } else {
      va = String(va ?? "").toLowerCase();
      vb = String(vb ?? "").toLowerCase();
    }
    if (va < vb) return -1 * sortDirecao;
    if (va > vb) return 1 * sortDirecao;
    return 0;
  });
  return lista;
}

function renderLista() {
  const lista = aplicarFiltrosOrdenacao();
  const tbody = $("#lista-equipamentos");
  tbody.innerHTML = "";
  $("#equipamentos-vazio").hidden = lista.length > 0;

  document.querySelectorAll(".data-table th.sortavel").forEach((th) => {
    th.querySelector(".seta-ordem")?.remove();
    if (th.dataset.campo === sortCampo) {
      const seta = document.createElement("span");
      seta.className = "seta-ordem";
      seta.textContent = sortDirecao === 1 ? "▲" : "▼";
      th.appendChild(seta);
    }
  });

  for (const eq of lista) {
    const tr = document.createElement("tr");
    tr.className = "clicavel";
    const foto = eq.imagem_url || "/images/placeholder.svg";
    tr.innerHTML = `
      <td><img class="thumb" src="${esc(foto)}" alt="${esc(eq.nome)}" /></td>
      <td>${esc(eq.nome)}</td>
      <td>${esc(eq.numero_patrimonio)}</td>
      <td>${esc(eq.tipo)}</td>
      <td>${esc(eq.marca)} / ${esc(eq.modelo)}</td>
      <td>${brl(eq.valor)}</td>
      <td><span class="badge-status badge-${eq.status}">${STATUS_LABELS[eq.status]}</span></td>
      <td></td>`;
    tr.addEventListener("click", () => {
      window.location.href = `/equipamento-detalhe.html?id=${eq.id}`;
    });
    const acoesTd = tr.lastElementChild;
    acoesTd.className = "acoes-tabela";
    for (const acao of acaoRapida(eq)) {
      const btn = document.createElement("button");
      btn.textContent = acao.texto;
      if (acao.classe) btn.className = acao.classe;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        acao.fn();
      });
      acoesTd.appendChild(btn);
    }
    tbody.appendChild(tr);
  }
}

async function carregarEquipamentos() {
  equipamentosTodos = await api("/equipamentos");
  atualizarListaTipos();
  renderLista();
}

document.querySelectorAll(".data-table th.sortavel").forEach((th) => {
  th.addEventListener("click", () => {
    const campo = th.dataset.campo;
    if (sortCampo === campo) sortDirecao *= -1;
    else {
      sortCampo = campo;
      sortDirecao = 1;
    }
    renderLista();
  });
});

$("#busca").addEventListener("input", (e) => {
  buscaTexto = e.target.value;
  renderLista();
});

$("#btn-novo").addEventListener("click", abrirFormNovo);
$("#form-equipamento").addEventListener("submit", submeter);
$("#btn-cancelar").addEventListener("click", fecharForm);
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

(async function iniciar() {
  const usuario = await verificarSessao();
  if (!usuario) return;
  aplicarUsuarioNaSidebar(usuario);
  try {
    await carregarEquipamentos();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
