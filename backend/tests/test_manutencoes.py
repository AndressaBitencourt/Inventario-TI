from fastapi.testclient import TestClient

MANUTENCAO_VALIDA = {
    "equipamento_id": 1,
    "motivo": "Tela com defeito",
    "custo": "150.00",
    "observacao": "Troca de tela solicitada",
}


def test_criar_manutencao_valida(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA)
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["equipamento_id"] == 1
    assert corpo["aberta"] is True
    assert corpo["data_fim"] is None


def test_criar_manutencao_marca_equipamento_em_manutencao(
    client_tecnico: TestClient,
) -> None:
    client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA)
    equipamento = client_tecnico.get("/api/equipamentos/1").json()
    assert equipamento["status"] == "manutencao"


def test_criar_manutencao_equipamento_inexistente_400(client_tecnico: TestClient) -> None:
    dados = {**MANUTENCAO_VALIDA, "equipamento_id": 999}
    resp = client_tecnico.post("/api/manutencoes", json=dados)
    assert resp.status_code == 400


def test_criar_manutencao_equipamento_em_uso_400(client_tecnico: TestClient) -> None:
    client_tecnico.post(
        "/api/atribuicoes",
        json={"equipamento_id": 1, "responsavel_nome": "Maria", "setor": "RH"},
    )
    resp = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA)
    assert resp.status_code == 400


def test_criar_manutencao_sem_motivo_422(client_tecnico: TestClient) -> None:
    dados = {**MANUTENCAO_VALIDA, "motivo": ""}
    resp = client_tecnico.post("/api/manutencoes", json=dados)
    assert resp.status_code == 422


def test_listar_manutencoes(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA)
    resp = client_tecnico.get("/api/manutencoes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_listar_manutencoes_somente_abertas(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA).json()
    client_tecnico.post(f"/api/manutencoes/{criada['id']}/finalizar")
    resp = client_tecnico.get("/api/manutencoes?somente_abertas=true")
    assert resp.status_code == 200
    assert resp.json() == []


def test_detalhar_manutencao(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA).json()
    resp = client_tecnico.get(f"/api/manutencoes/{criada['id']}")
    assert resp.status_code == 200
    assert resp.json()["motivo"] == "Tela com defeito"


def test_detalhar_manutencao_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/manutencoes/999")
    assert resp.status_code == 404


def test_finalizar_manutencao(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA).json()
    resp = client_tecnico.post(f"/api/manutencoes/{criada['id']}/finalizar")
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["aberta"] is False
    assert corpo["data_fim"] is not None


def test_finalizar_manutencao_libera_equipamento(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA).json()
    client_tecnico.post(f"/api/manutencoes/{criada['id']}/finalizar")
    equipamento = client_tecnico.get("/api/equipamentos/1").json()
    assert equipamento["status"] == "disponivel"


def test_finalizar_manutencao_ja_finalizada_400(client_tecnico: TestClient) -> None:
    criada = client_tecnico.post("/api/manutencoes", json=MANUTENCAO_VALIDA).json()
    client_tecnico.post(f"/api/manutencoes/{criada['id']}/finalizar")
    resp = client_tecnico.post(f"/api/manutencoes/{criada['id']}/finalizar")
    assert resp.status_code == 400


def test_finalizar_manutencao_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/manutencoes/999/finalizar")
    assert resp.status_code == 404


def test_listar_manutencoes_sem_sessao_401(client: TestClient) -> None:
    resp = client.get("/api/manutencoes")
    assert resp.status_code == 401
