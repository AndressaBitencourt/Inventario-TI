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

function linkEquipamento(id, nome) {
  return `<a href="/equipamento-detalhe.html?id=${id}">${esc(nome)}</a>`;
}

async function carregarAtribuicoes() {
  const somenteAtivas = $("#filtro-atribuicoes-ativas").checked;
  const atribuicoes = await api(`/atribuicoes?somente_ativas=${somenteAtivas}`);
  const tbody = $("#lista-atribuicoes");
  tbody.innerHTML = "";
  $("#atribuicoes-vazio").hidden = atribuicoes.length > 0;
  for (const a of atribuicoes) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${linkEquipamento(a.equipamento_id, a.equipamento_nome)}</td>
      <td>${esc(a.responsavel_nome)}</td>
      <td>${esc(a.setor)}</td>
      <td>${dataHora(a.data_retirada)}</td>
      <td>${a.ativa ? '<span class="badge-status badge-em_uso">Ativa</span>' : dataHora(a.data_devolucao)}</td>
      <td></td>`;
    if (a.ativa) {
      const bDevolver = document.createElement("button");
      bDevolver.textContent = "Devolver";
      bDevolver.addEventListener("click", async () => {
        try {
          await api(`/atribuicoes/${a.id}/devolver`, { method: "POST" });
          aviso("Equipamento devolvido.", "ok");
          await carregarAtribuicoes();
        } catch (e) {
          aviso(e.message, "erro");
        }
      });
      tr.lastElementChild.appendChild(bDevolver);
    }
    tbody.appendChild(tr);
  }
}

async function carregarManutencoes() {
  const somenteAbertas = $("#filtro-manutencoes-abertas").checked;
  const manutencoes = await api(`/manutencoes?somente_abertas=${somenteAbertas}`);
  const tbody = $("#lista-manutencoes");
  tbody.innerHTML = "";
  $("#manutencoes-vazio").hidden = manutencoes.length > 0;
  for (const m of manutencoes) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${linkEquipamento(m.equipamento_id, m.equipamento_nome)}</td>
      <td>${esc(m.motivo)}</td>
      <td>${brl(m.custo)}</td>
      <td>${dataHora(m.data_inicio)}</td>
      <td>${m.aberta ? '<span class="badge-status badge-manutencao">Aberta</span>' : dataHora(m.data_fim)}</td>
      <td></td>`;
    if (m.aberta) {
      const bFinalizar = document.createElement("button");
      bFinalizar.textContent = "Finalizar";
      bFinalizar.addEventListener("click", async () => {
        try {
          await api(`/manutencoes/${m.id}/finalizar`, { method: "POST" });
          aviso("Manutenção finalizada.", "ok");
          await carregarManutencoes();
        } catch (e) {
          aviso(e.message, "erro");
        }
      });
      tr.lastElementChild.appendChild(bFinalizar);
    }
    tbody.appendChild(tr);
  }
}

$("#filtro-atribuicoes-ativas").addEventListener("change", carregarAtribuicoes);
$("#filtro-manutencoes-abertas").addEventListener("change", carregarManutencoes);

(async function iniciar() {
  const usuario = await verificarSessao();
  if (!usuario) return;
  aplicarUsuarioNaSidebar(usuario);
  try {
    await carregarAtribuicoes();
    await carregarManutencoes();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
