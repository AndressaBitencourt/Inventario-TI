"use strict";

const API = "/api";

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

function renderKpis(equipamentos) {
  const contagem = { disponivel: 0, em_uso: 0, manutencao: 0, baixado: 0 };
  for (const e of equipamentos) contagem[e.status] = (contagem[e.status] ?? 0) + 1;
  const cards = [
    { label: "Total de equipamentos", valor: equipamentos.length, classe: "" },
    { label: "Disponíveis", valor: contagem.disponivel, classe: "ok" },
    { label: "Em uso", valor: contagem.em_uso, classe: "" },
    { label: "Em manutenção", valor: contagem.manutencao, classe: "warn" },
    { label: "Baixados", valor: contagem.baixado, classe: "off" },
  ];
  $("#kpis").innerHTML = cards
    .map(
      (c) => `
      <div class="kpi-card ${c.classe}">
        <small>${esc(c.label)}</small>
        <strong>${c.valor}</strong>
      </div>`
    )
    .join("");
}

async function carregarManutencoesAbertas() {
  const manutencoes = await api("/manutencoes?somente_abertas=true");
  const tbody = $("#lista-manutencoes-abertas");
  tbody.innerHTML = "";
  $("#manutencoes-vazio").hidden = manutencoes.length > 0;
  for (const m of manutencoes) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(m.equipamento_nome)}</td>
      <td>${esc(m.motivo)}</td>
      <td>${dataHora(m.data_inicio)}</td>
      <td></td>`;
    const bFinalizar = document.createElement("button");
    bFinalizar.textContent = "Finalizar";
    bFinalizar.className = "secundario";
    bFinalizar.addEventListener("click", async () => {
      try {
        await api(`/manutencoes/${m.id}/finalizar`, { method: "POST" });
        aviso("Manutenção finalizada.", "ok");
        await carregarManutencoesAbertas();
      } catch (e) {
        aviso(e.message, "erro");
      }
    });
    tr.lastElementChild.appendChild(bFinalizar);
    tbody.appendChild(tr);
  }
}

async function carregarAtividadeRecente() {
  const [atribuicoes, manutencoes] = await Promise.all([
    api("/atribuicoes"),
    api("/manutencoes"),
  ]);

  const eventos = [];
  for (const a of atribuicoes) {
    eventos.push({
      data: a.data_retirada,
      icone: "A",
      classe: "atribuicao",
      texto: `<strong>${esc(a.equipamento_nome)}</strong> foi atribuído a ${esc(a.responsavel_nome)} (${esc(a.setor)})`,
    });
    if (a.data_devolucao) {
      eventos.push({
        data: a.data_devolucao,
        icone: "D",
        classe: "devolucao",
        texto: `<strong>${esc(a.equipamento_nome)}</strong> foi devolvido por ${esc(a.responsavel_nome)}`,
      });
    }
  }
  for (const m of manutencoes) {
    eventos.push({
      data: m.data_inicio,
      icone: "M",
      classe: "manutencao",
      texto: `Manutenção aberta em <strong>${esc(m.equipamento_nome)}</strong> — ${esc(m.motivo)}`,
    });
    if (m.data_fim) {
      eventos.push({
        data: m.data_fim,
        icone: "✓",
        classe: "devolucao",
        texto: `Manutenção finalizada em <strong>${esc(m.equipamento_nome)}</strong>`,
      });
    }
  }

  eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
  const recentes = eventos.slice(0, 10);

  const feed = $("#atividade-recente");
  $("#atividade-vazia").hidden = recentes.length > 0;
  feed.innerHTML = recentes
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

(async function iniciar() {
  const usuario = await verificarSessao();
  if (!usuario) return;
  aplicarUsuarioNaSidebar(usuario);
  try {
    const equipamentos = await api("/equipamentos");
    renderKpis(equipamentos);
    await carregarManutencoesAbertas();
    await carregarAtividadeRecente();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
