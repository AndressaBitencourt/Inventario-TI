"use strict";

const API = "/api";
let graficoTipo = null;
let graficoSetor = null;

const $ = (sel) => document.querySelector(sel);

function aviso(msg, tipo) {
  const el = $("#aviso");
  el.textContent = msg;
  el.className = "aviso " + tipo;
  el.hidden = false;
  if (tipo === "ok") setTimeout(() => (el.hidden = true), 3000);
}

function brl(valorStr) {
  const n = Number(valorStr || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  $("#btn-sair").addEventListener("click", async () => {
    await fetch(`${API}/logout`, { method: "POST" });
    window.location.href = "/login.html";
  });
}

async function fetchJson(caminho) {
  const resp = await fetch(caminho);
  if (!resp.ok) throw new Error("Falha ao carregar relatório.");
  return resp.json();
}

async function carregarResumo() {
  const r = await fetchJson(`${API}/relatorios/resumo`);
  $("#resumo-total").textContent = r.total_equipamentos;
  $("#resumo-valor").textContent = brl(r.valor_total);
  $("#resumo-disponivel").textContent = r.disponivel;
  $("#resumo-em-uso").textContent = r.em_uso;
  $("#resumo-manutencao").textContent = r.manutencao;
  $("#resumo-baixado").textContent = r.baixado;
}

const PALETA = [
  "#5AA7E0", "#4FB6A8", "#8C6FD1", "#E8A94E", "#E8574B",
  "#C2D34E", "#E06BA8", "#6FD1A5", "#D97B4F", "#7F8FB5",
];

async function carregarGraficoTipo() {
  const dados = await fetchJson(`${API}/relatorios/por-tipo`);
  const ctx = $("#grafico-tipo");
  if (graficoTipo) graficoTipo.destroy();
  graficoTipo = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dados.map((d) => d.tipo),
      datasets: [
        {
          label: "Quantidade",
          data: dados.map((d) => d.quantidade),
          backgroundColor: (contexto) => {
            const { chartArea, ctx: canvasCtx } = contexto.chart;
            if (!chartArea) return "#1B6EC2";
            const gradiente = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradiente.addColorStop(0, "#5AA7E0");
            gradiente.addColorStop(1, "#1B6EC2");
            return gradiente;
          },
          borderRadius: 6,
          maxBarThickness: 46,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#c8d2e4" } },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          ticks: { color: "#c8d2e4", stepSize: 1 },
        },
      },
    },
  });
}

async function carregarGraficoSetor() {
  const dados = await fetchJson(`${API}/relatorios/por-setor`);
  const ctx = $("#grafico-setor");
  if (graficoSetor) graficoSetor.destroy();
  graficoSetor = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dados.map((d) => d.setor),
      datasets: [
        {
          label: "Em uso",
          data: dados.map((d) => d.quantidade),
          backgroundColor: dados.map((_, i) => PALETA[i % PALETA.length]),
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          ticks: { color: "#c8d2e4", stepSize: 1 },
        },
        y: { grid: { display: false }, ticks: { color: "#c8d2e4" } },
      },
    },
  });
}

(async function iniciar() {
  const usuario = await verificarSessao("admin");
  if (!usuario) return;
  aplicarUsuarioNaSidebar(usuario);
  try {
    await carregarResumo();
    await carregarGraficoTipo();
    await carregarGraficoSetor();
  } catch (e) {
    aviso("Falha ao carregar dados: " + e.message, "erro");
  }
})();
