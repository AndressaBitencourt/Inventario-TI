from fastapi.testclient import TestClient

ATRIBUICAO_VALIDA = {
    "equipamento_id": 1,
    "responsavel_nome": "Maria Souza",
    "setor": "Financeiro",
    "observacao": "Uso em home office",
}


def test_criar_atribuicao_valida(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA)
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["equipamento_id"] == 1
    assert corpo["equipamento_nome"] == "Notebook Dell Latitude 5420"
    assert corpo["ativa"] is True
    assert corpo["data_devolucao"] is None


def test_criar_atribuicao_marca_equipamento_em_uso(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA)
    equipamento = client_tecnico.get("/api/equipamentos/1").json()
    assert equipamento["status"] == "em_uso"


def test_criar_atribuicao_equipamento_inexistente_400(client_tecnico: TestClient) -> None:
    dados = {**ATRIBUICAO_VALIDA, "equipamento_id": 999}
    resp = client_tecnico.post("/api/atribuicoes", json=dados)
    assert resp.status_code == 400


def test_criar_atribuicao_equipamento_ja_em_uso_400(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA)
    resp = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA)
    assert resp.status_code == 400
    assert "disponível" in resp.json()["detail"]


def test_criar_atribuicao_sem_responsavel_422(client_tecnico: TestClient) -> None:
    dados = {**ATRIBUICAO_VALIDA, "responsavel_nome": ""}
    resp = client_tecnico.post("/api/atribuicoes", json=dados)
    assert resp.status_code == 422


def test_listar_atribuicoes(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA)
    resp = client_tecnico.get("/api/atribuicoes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_listar_atribuicoes_somente_ativas(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    resp = client_tecnico.get("/api/atribuicoes?somente_ativas=true")
    assert resp.status_code == 200
    assert resp.json() == []


def test_detalhar_atribuicao(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    resp = client_tecnico.get(f"/api/atribuicoes/{criada['id']}")
    assert resp.status_code == 200
    assert resp.json()["responsavel_nome"] == "Maria Souza"


def test_detalhar_atribuicao_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/atribuicoes/999")
    assert resp.status_code == 404


def test_devolver_atribuicao(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    resp = client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["ativa"] is False
    assert corpo["data_devolucao"] is not None


def test_devolver_atribuicao_libera_equipamento(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    equipamento = client_tecnico.get("/api/equipamentos/1").json()
    assert equipamento["status"] == "disponivel"


def test_devolver_atribuicao_ja_devolvida_400(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    resp = client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    assert resp.status_code == 400


def test_devolver_atribuicao_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/atribuicoes/999/devolver")
    assert resp.status_code == 404


def test_equipamento_pode_ser_atribuido_de_novo_apos_devolucao(
    client_tecnico: TestClient,
) -> None:
    criada = client_tecnico.post("/api/atribuicoes", json=ATRIBUICAO_VALIDA).json()
    client_tecnico.post(f"/api/atribuicoes/{criada['id']}/devolver")
    resp = client_tecnico.post(
        "/api/atribuicoes",
        json={**ATRIBUICAO_VALIDA, "responsavel_nome": "João Pedro"},
    )
    assert resp.status_code == 201


def test_listar_atribuicoes_sem_sessao_401(client: TestClient) -> None:
    resp = client.get("/api/atribuicoes")
    assert resp.status_code == 401
