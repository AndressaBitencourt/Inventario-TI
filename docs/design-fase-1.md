# Inventário de TI — Documento de Design

## Fase 1 — Catálogo de equipamentos + atribuição/devolução

- **Data:** 2026-11-16
- **Nota:** o projeto inteiro foi construído numa tacada só (ver
  `docs/design-fase-3.md`, seção "Nota sobre o processo"), mas a
  documentação fica dividida em 3 fases, no mesmo formato do projeto
  anterior (sistema de pedidos de hamburgueria), pra registrar o raciocínio
  por trás de cada parte.

---

## 1. Visão geral

A entidade central do sistema é o **equipamento** — o item de TI que
precisa ser controlado (notebook, monitor, periférico, licença de
software, etc.). A operação do dia a dia gira em torno de saber **quem
está com cada equipamento agora**, então a segunda entidade central é a
**atribuição**: o registro de que um equipamento foi entregue a um
responsável, e quando ele volta.

Essa fase cobre o CRUD de equipamento e o fluxo de atribuir/devolver — o
equivalente, nesse projeto, ao CRUD de pedidos da Fase 1 do projeto
anterior.

---

## 2. Modelo de dados

### Tabela `equipamento`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | int | PK |
| `nome` | str(80) | |
| `tipo` | str(40) | categoria livre (Notebook, Monitor, Periférico...) |
| `numero_patrimonio` | str(40) | único — é a etiqueta/tag do ativo |
| `numero_serie` | str(60)? | opcional |
| `marca` / `modelo` | str(60) | |
| `valor` | Decimal(10,2)? | valor de aquisição, opcional |
| `status` | str(20) | `disponivel` \| `em_uso` \| `manutencao` \| `baixado` — ver seção 3 |
| `criado_em` | datetime (UTC) | |

`status` **não é editável diretamente** pelo formulário de cadastro/edição
— só muda através das ações de atribuir, devolver, dar baixa, reativar, e
(Fase 2) enviar/finalizar manutenção. Isso evita estados inconsistentes
(ex: marcar manualmente "disponível" um equipamento que na verdade está
com alguém).

### Tabela `atribuicao`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | int | PK |
| `equipamento_id` | FK → `equipamento.id` | |
| `equipamento_nome` | str(80) | snapshot do nome no momento da atribuição |
| `responsavel_nome` | str(80) | texto livre — sem cadastro de colaborador |
| `setor` | str(60) | texto livre |
| `observacao` | str(255)? | opcional |
| `data_retirada` | datetime (UTC) | definida na criação |
| `data_devolucao` | datetime (UTC)? | `null` = ainda em posse (atribuição ativa) |

**Decisão de escopo — responsável é texto livre.** Criar um cadastro
completo de colaborador (nome, setor, cargo, matrícula) deixaria a Fase 1
bem maior sem agregar ao núcleo do projeto, que é controlar o
*equipamento*, não gerenciar RH. Funciona como `cliente_nome` funcionava
no projeto anterior: digita na hora, sem cadastro prévio.

`equipamento_nome` é um snapshot (como `produto_nome` em `item_pedido` no
projeto anterior) — se o nome do equipamento for editado depois, o
histórico de atribuições antigas continua mostrando o nome de quando a
atribuição foi feita.

---

## 3. Regra de negócio central — ciclo de vida do `status`

```
disponivel  --[POST /atribuicoes]-->  em_uso
em_uso      --[POST /atribuicoes/{id}/devolver]-->  disponivel
```

- Só é possível criar uma atribuição se o equipamento estiver
  `disponivel`. Tentar atribuir um equipamento `em_uso`, `manutencao` ou
  `baixado` retorna `400`.
- Criar a atribuição muda o equipamento pra `em_uso` **no mesmo commit**
  (sem passo intermediário) — ver `crud.criar_atribuicao`.
- Devolver (`data_devolucao = agora`) libera o equipamento de volta pra
  `disponivel`.
- Um equipamento com atribuição ativa não pode ser excluído nem ter outra
  atribuição criada — só devolvido.

Os estados `manutencao` e `baixado` entram na Fase 2.

---

## 4. API (`backend/app/routers/equipamentos.py`, `atribuicoes.py`)

| Rota | O que faz |
| --- | --- |
| `GET /api/equipamentos` | lista, com filtro opcional `status_filtro`/`tipo` |
| `GET /api/equipamentos/{id}` | detalhe |
| `POST /api/equipamentos` | cria (status inicial sempre `disponivel`) |
| `PUT /api/equipamentos/{id}` | edita dados cadastrais (não mexe em status) |
| `DELETE /api/equipamentos/{id}` | exclui — bloqueado se tiver qualquer histórico (atribuição ou manutenção) |
| `POST /api/atribuicoes` | cria atribuição (atribui) |
| `GET /api/atribuicoes` | lista, com filtro `somente_ativas`/`equipamento_id` |
| `GET /api/atribuicoes/{id}` | detalhe |
| `POST /api/atribuicoes/{id}/devolver` | devolve (fecha a atribuição ativa) |

Essa fase ainda não tem login — todas as rotas estão abertas. A proteção
entra na Fase 3.

---

## 5. Front-end

Uma página só (`index.html` + `app.js`), igual ao padrão da Fase 1 do
projeto anterior: formulário de cadastro de equipamento no topo, e a
tabela de equipamentos embaixo, com um botão de ação por linha
(**Atribuir**, quando disponível, ou **Devolver**, quando em uso). A ação
de atribuir abre uma caixa de diálogo nativa do HTML (`<dialog>`) com
responsável + setor, em vez de uma segunda página — mantém o fluxo rápido
sem sair da lista.

---

## 6. Seed

`backend/app/seed.py` cria 14 equipamentos de catálogo (notebooks,
desktops, monitores, periféricos, impressora, equipamentos de rede e uma
licença de software) na primeira execução — todos `disponivel`, igual ao
cardápio inicial do projeto anterior. Atribuições começam vazias; são
criadas de verdade usando o sistema.

---

## 7. Testes

`backend/tests/test_equipamentos.py` e `test_atribuicoes.py` cobrem: CRUD
válido e inválido (patrimônio duplicado, campos obrigatórios), bloqueio de
exclusão com histórico, o ciclo completo atribuir → devolver → atribuir de
novo, e os casos de erro (equipamento inexistente, já em uso, atribuição já
devolvida).

---

## 8. Fora de escopo (fica pra Fase 2 ou 3)

- Manutenção (registro de equipamento quebrado/em conserto).
- Foto do equipamento.
- Dar baixa / reativar.
- Login, perfis e relatórios.
- Cadastro de colaborador (decisão permanente — ver seção 2).
