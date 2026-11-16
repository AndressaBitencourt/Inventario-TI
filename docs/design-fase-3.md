# Inventário de TI — Documento de Design

## Fase 3 — Login e perfis + relatórios

- **Data:** 2026-11-16
- Última fase — fecha o projeto com autenticação de verdade e os
  relatórios de patrimônio.

---

## 0. Nota sobre o processo

Diferente do projeto anterior (sistema de pedidos de hamburgueria), que
foi entregue em 3 fases reais, com revisão entre cada uma, esse projeto
foi **construído de ponta a ponta numa tacada só** — a entrega estava
próxima e não dava pra parar pra revisão a cada fase. A divisão em 3
documentos de design (`design-fase-1.md`, `design-fase-2.md` e este) é só
**organizacional**: registra o raciocínio na mesma ordem lógica usada no
projeto anterior (núcleo → ciclo de vida completo → acesso/relatórios),
mas o código das 3 "fases" foi escrito e testado junto, sem checkpoints
intermediários de aprovação.

Isso explica por que o modelo de permissão (quem pode excluir, etc.) já
aparece desenhado desde a Fase 2: as camadas de regra de negócio e de
autenticação foram escritas ao mesmo tempo, mesmo a documentação
separando o "o quê" (Fase 1-2) do "quem pode fazer o quê" (esta fase).

---

## 1. Visão geral

| Parte | Funcionalidade |
| --- | --- |
| Autenticação | Login com papéis **técnico** e **admin**, rotas protegidas |
| Relatórios | Resumo de patrimônio, equipamentos por tipo, equipamentos em uso por setor |

**Papéis:**

- **Técnico** — acesso a tudo que é operação do dia a dia: cadastrar/
  editar equipamento, atribuir, devolver, abrir/finalizar manutenção, dar
  baixa, reativar.
- **Admin** — tudo isso **+** excluir equipamento definitivamente **+**
  relatórios.

Não existe um terceiro papel "cliente" ou "usuário comum" — diferente do
projeto anterior, esse sistema não tem nenhuma parte pública. É uma
ferramenta interna de controle de patrimônio; todo mundo que usa precisa
estar logado.

---

## 2. Modelo de dados

Reaproveita exatamente o mesmo desenho do projeto anterior — sessão em
tabela, não JWT:

### Tabela `usuario`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | int | PK |
| `nome` | str(80) | |
| `email` | str(120) | único, usado pra login |
| `senha_hash` | str(255) | hash bcrypt |
| `papel` | str(20) | `"tecnico"` ou `"admin"` |
| `criado_em` | datetime (UTC) | |

### Tabela `sessao`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `token` | str(64) | PK, UUID4 hex gerado no login |
| `usuario_id` | int | FK → `usuario.id`, `ondelete="CASCADE"` |
| `criado_em` | datetime (UTC) | |
| `expira_em` | datetime (UTC) | `criado_em` + 8h |

---

## 3. Autenticação

Idêntica em desenho ao projeto anterior (`backend/app/auth.py` é o mesmo
módulo, só trocando o nome dos papéis): cookie `sessao_token`
(`HttpOnly`, `SameSite=Lax`, sem `Secure` — mesma limitação conhecida de
rodar em HTTP local), duas dependências do FastAPI
(`usuario_logado`/`usuario_admin`), bcrypt pra hash de senha.

### Rotas protegidas

| Rota | Proteção |
| --- | --- |
| `POST /api/login` | pública |
| `POST /api/logout`, `GET /api/me` | `usuario_logado` |
| `GET/POST/PUT /api/equipamentos`, `POST /{id}/imagem`, `/baixar`, `/reativar` | `usuario_logado` |
| `DELETE /api/equipamentos/{id}` | `usuario_admin` |
| `GET/POST /api/atribuicoes`, `POST /{id}/devolver` | `usuario_logado` |
| `GET/POST /api/manutencoes`, `POST /{id}/finalizar` | `usuario_logado` |
| `GET /api/relatorios/*` | `usuario_admin` |
| `GET /api/health` | pública |

---

## 4. Front-end

Nova página `login.html` — mesmo formulário simples (e-mail + senha) do
projeto anterior, no visual próprio desta aplicação. Cada página protegida
chama `GET /api/me` ao carregar: sem sessão → redireciona pro login; papel
sem permissão pra aquela página (técnico tentando abrir `/relatorios.html`)
→ redireciona pra `/`. O link "Relatórios" no menu só aparece pra quem é
admin; o botão "Excluir" na tabela de equipamentos só aparece pra admin
(a proteção real está na API — isso é só pra não mostrar um botão que vai
dar 403).

---

## 5. Relatórios

### Nova página `relatorios.html` (só admin)

- Cards de resumo: total de equipamentos, valor total do patrimônio,
  contagem por status (disponível/em uso/manutenção/baixado).
- Gráfico de barras: equipamentos por tipo (quantidade cadastrada).
- Gráfico de barras horizontal: equipamentos em uso por setor (conta só
  atribuições **ativas** — mostra a distribuição atual, não histórica).

### Endpoints (`backend/app/routers/relatorios.py`, todos `usuario_admin`)

- `GET /api/relatorios/resumo` → `{total_equipamentos, valor_total,
  disponivel, em_uso, manutencao, baixado}`
- `GET /api/relatorios/por-tipo` → `[{tipo, quantidade}]`
- `GET /api/relatorios/por-setor` → `[{setor, quantidade}]` — setor vem de
  `atribuicao.setor`, não existe no equipamento; por isso esse relatório é
  sempre "quem está usando agora", não um atributo fixo do equipamento.

Gráficos com Chart.js via CDN, mesmo padrão do projeto anterior.

---

## 6. Seed

`backend/app/seed.py` cria um admin (`admin@inventario-ti.com` /
`admin123`) e um técnico (`tecnico@inventario-ti.com` / `tecnico123`) na
primeira execução — credenciais de demonstração, documentadas no README.

---

## 7. Testes

`backend/tests/test_auth.py` cobre login/logout/sessão expirada (mesmo
padrão do projeto anterior). `test_relatorios.py` cobre os três endpoints,
o bloqueio de papel (`403` pra técnico) e sem sessão (`401`). Os fixtures
`client_admin`/`client_tecnico` (`conftest.py`) fazem login de verdade
antes de cada teste que precisa de sessão.

---

## 8. Fora de escopo

- Qualquer tela de gestão de usuários — o único jeito de criar usuário é o
  seed do admin/técnico padrão.
- Recuperação de senha.
- Flag `Secure` no cookie (precisa de HTTPS).
- Relatório histórico de "equipamentos por setor ao longo do tempo" — o
  endpoint `/por-setor` é sempre uma foto do momento atual, não uma série
  temporal (diferente do `faturamento-diario` do projeto anterior, que
  tinha dimensão de tempo porque pedido é um evento pontual; atribuição
  tem duração, então "por setor" é naturalmente um corte do presente).
