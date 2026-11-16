# Inventário de TI — Documento de Design

## Fase 2 — Manutenção, baixa, foto e identidade visual

- **Data:** 2026-11-16
- Continuação direta da Fase 1 (ver `docs/design-fase-1.md`) — aqui entra
  o resto do ciclo de vida do equipamento e a parte visual.

---

## 1. Visão geral

A Fase 1 cobriu dois dos quatro estados do equipamento (`disponivel` e
`em_uso`). Essa fase fecha o ciclo de vida completo:

```
disponivel --[atribuir]--> em_uso --[devolver]--> disponivel
disponivel --[enviar p/ manutenção]--> manutencao --[finalizar]--> disponivel
disponivel --[dar baixa]--> baixado --[reativar]--> disponivel
manutencao --[dar baixa]--> baixado
```

Também entram: exclusão passa a ser **admin-only** (preparando a Fase 3,
onde o papel existe de verdade), foto do equipamento, e uma identidade
visual própria — paleta e tipografia de TI/corporativo, diferente do
projeto anterior.

---

## 2. Modelo de dados — tabela `manutencao`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | int | PK |
| `equipamento_id` | FK → `equipamento.id` | |
| `equipamento_nome` | str(80) | snapshot, mesmo padrão de `atribuicao.equipamento_nome` |
| `motivo` | str(255) | |
| `custo` | Decimal(10,2)? | custo estimado/realizado, opcional |
| `observacao` | str(255)? | opcional |
| `data_inicio` | datetime (UTC) | |
| `data_fim` | datetime (UTC)? | `null` = manutenção aberta |

Mesma estrutura de "evento com início/fim" que `atribuicao` — intencional,
pra manter o projeto consistente: os dois são registros históricos de algo
que acontece com um equipamento, com um campo de fechamento opcional que
define se estão "ativos"/"abertos".

---

## 3. Regras de negócio novas

- **Manutenção:** só é possível abrir se o equipamento estiver
  `disponivel` (não dá pra mandar pra manutenção um equipamento que está
  com alguém — precisa devolver primeiro). Abrir manutenção muda o status
  pra `manutencao`; finalizar devolve pra `disponivel`.
- **Dar baixa:** bloqueado se o equipamento estiver `em_uso` (precisa
  devolver antes). Permitido a partir de `disponivel` ou `manutencao`
  (equipamento que quebrou de vez durante o conserto). Vira `baixado`.
- **Reativar:** só a partir de `baixado`, volta pra `disponivel`.
- **Exclusão (`DELETE /api/equipamentos/{id}`)** passa a exigir papel
  admin — e continua bloqueada se o equipamento tiver qualquer atribuição
  ou manutenção no histórico (ver Fase 1). Na prática, um equipamento
  usado de verdade nunca é excluído — ele é **baixado**, que preserva o
  histórico.

---

## 4. Foto do equipamento

Mesmo padrão do projeto anterior (upload de produto): endpoint separado
`POST /api/equipamentos/{id}/imagem`, formatos aceitos JPG/PNG/WEBP,
limite de 5 MB, arquivo salvo em `backend/uploads/equipamentos/` e servido
em `/uploads/equipamentos/<nome>`. Upload é um segundo passo depois de
salvar os dados do equipamento — assim dá pra trocar só a foto sem
reenviar o resto do cadastro.

---

## 5. Identidade visual

Paleta e tipografia próprias, para não parecer uma cópia do projeto
anterior:

- **Cores:** azul-marinho escuro (`#1B2A4A`) no header, azul vívido
  (`#2F6FE0`) como destaque — tom "software corporativo de TI" em vez da
  paleta quente da hamburgueria.
- **Tipografia:** Space Grotesk (títulos) + Inter (texto) — geométrica e
  técnica, em vez da serifada usada antes.
- **Badges de status:** cada status do equipamento (`disponível`, `em
  uso`, `em manutenção`, `baixado`) tem uma cor própria na tabela, pra dar
  pra escanear o estado de todos os equipamentos rapidamente.

---

## 6. Front-end

`app.js` ganha os botões condicionais por status na tabela de
equipamentos — o conjunto de ações muda conforme o `status` da linha:

| Status | Ações disponíveis |
| --- | --- |
| `disponivel` | Atribuir, Manutenção, Dar baixa |
| `em_uso` | Devolver |
| `manutencao` | Finalizar manutenção |
| `baixado` | Reativar |

(Editar fica disponível em qualquer status; Excluir só aparece no menu se
o usuário logado for admin — depende da Fase 3.)

---

## 7. Testes

`backend/tests/test_manutencoes.py` cobre o ciclo abrir → finalizar →
reabrir, e os bloqueios (equipamento em uso não pode entrar em
manutenção, manutenção já finalizada não finaliza de novo). Testes de
`baixar`/`reativar` entraram em `test_equipamentos.py`, junto com o
teste de permissão da exclusão (`403` pra quem não é admin).

---

## 8. Fora de escopo

- Login e sessão de verdade — a regra de "exclusão é admin-only" desenhada
  aqui pressupõe o papel que só é formalizado (login, sessão, tela) na
  Fase 3 (ver nota sobre o processo em `docs/design-fase-3.md`).
- Relatórios.
