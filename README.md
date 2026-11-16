# Inventário de TI

Sistema de controle de inventário de equipamentos de TI — cadastro de
equipamentos, atribuição e devolução (quem está com cada equipamento),
registro de manutenção, login com perfis (técnico/admin) e relatórios.

Esse projeto foi construído de ponta a ponta de uma vez só (sem pausar
entre entregas), mas a documentação está organizada em 3 fases — a mesma
estrutura usada no projeto anterior (sistema de pedidos de hamburgueria) —
pra deixar claro o raciocínio por trás de cada parte do sistema. Ver
`docs/design-fase-1.md`, `docs/design-fase-2.md` e `docs/design-fase-3.md`.

## Tecnologias que usei

- Back-end: Python 3.12 + FastAPI
- Banco: SQLite (arquivo `app.db`) via SQLAlchemy
- Front-end: HTML + CSS + JavaScript puro (sem build)
- Testes: pytest
- Empacotamento: Docker + docker-compose

## Como rodar

> **Login padrão:** e-mail `admin@inventario-ti.com`, senha `admin123`
> (perfil admin) — criado automaticamente na primeira execução. Também
> existe um login de demonstração com perfil técnico: e-mail
> `tecnico@inventario-ti.com`, senha `tecnico123`. São só credenciais de
> demonstração.

### Opção mais fácil — script pronto

Um script que acha o Python (instala sozinho se faltar), cria o ambiente
virtual, instala as dependências e sobe o app. Não precisa de Docker.

- macOS / Linux: `./EXECUTE-AQUI.sh`
- Windows: dê dois cliques em `EXECUTE-AQUI.bat` (ou rode no terminal)

Para rodar os testes em vez do servidor: `./EXECUTE-AQUI.sh test` (ou
`EXECUTE-AQUI.bat test`).

### Opção A — Docker (funciona igual em macOS e Windows)

Pré-requisito: Docker Desktop instalado e aberto.

```
docker compose up --build
```

Depois é só acessar:
- App: http://localhost:8000
- API (Swagger): http://localhost:8000/docs

Os dados ficam salvos no volume `db-data` mesmo parando o container. Para
zerar os dados: `docker compose down -v`.

### Opção B — Sem Docker

Pré-requisito: Python 3.12+.

```
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Acesse http://localhost:8000. O arquivo `backend/app.db` é criado sozinho
na primeira execução e já vem populado com 14 equipamentos de catálogo.

## Rodar os testes

```
cd backend
pip install -r requirements.txt
pytest -v
```

## Estrutura

- `backend/app/` — API FastAPI (models, schemas, crud, serializers, routers)
- `backend/tests/` — testes automatizados
- `frontend/` — páginas servidas pelo próprio back-end: dashboard
  (`index.html`), lista de equipamentos (`equipamentos.html`), registro de
  um equipamento com abas — detalhes/atribuições/manutenções/atividade
  (`equipamento-detalhe.html`), histórico cruzado de atribuições e
  manutenções (`historico.html`), login (`login.html`) e relatórios
  (`relatorios.html`)
- `docs/` — design de cada fase

## Visual

Interface inspirada em plataformas de ITSM/ITAM corporativas (ServiceNow,
OCS Inventory): sidebar fixa com navegação, dashboard inicial com KPIs e
atividade recente, e uma página de registro por equipamento com abas —
incluindo uma aba de **Atividade**, que junta o histórico de atribuições e
manutenções numa linha do tempo única. Ver a nota em
`docs/design-fase-2.md`, seção 5.

## Papéis

- **Técnico** — cadastra/edita equipamento, atribui, devolve, registra e
  finaliza manutenção, dá baixa e reativa equipamento.
- **Admin** — tudo isso **+** excluir equipamento definitivamente **+**
  relatórios.

## Roadmap

| Fase | O que entra |
| --- | --- |
| 1 | Catálogo de equipamentos (CRUD) + atribuição/devolução |
| 2 | Edição/baixa completa, manutenção, foto do equipamento, identidade visual |
| 3 | Login com perfis (técnico/admin) + relatórios |
