from fastapi.testclient import TestClient


def test_resumo_patrimonio(client_admin: TestClient) -> None:
    resp = client_admin.get("/api/relatorios/resumo")
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["total_equipamentos"] == 14
    assert corpo["disponivel"] == 14
    assert corpo["em_uso"] == 0


def test_resumo_patrimonio_reflete_atribuicao(client_admin: TestClient) -> None:
    client_admin.post(
        "/api/atribuicoes",
        json={"equipamento_id": 1, "responsavel_nome": "Maria", "setor": "RH"},
    )
    resp = client_admin.get("/api/relatorios/resumo")
    corpo = resp.json()
    assert corpo["em_uso"] == 1
    assert corpo["disponivel"] == 13


def test_por_tipo(client_admin: TestClient) -> None:
    resp = client_admin.get("/api/relatorios/por-tipo")
    assert resp.status_code == 200
    tipos = {item["tipo"]: item["quantidade"] for item in resp.json()}
    assert tipos["Notebook"] == 3
    assert tipos["Monitor"] == 3


def test_por_setor_conta_so_atribuicoes_ativas(client_admin: TestClient) -> None:
    criada = client_admin.post(
        "/api/atribuicoes",
        json={"equipamento_id": 1, "responsavel_nome": "Maria", "setor": "RH"},
    ).json()
    client_admin.post(
        "/api/atribuicoes",
        json={"equipamento_id": 2, "responsavel_nome": "João", "setor": "RH"},
    )
    resp = client_admin.get("/api/relatorios/por-setor")
    setores = {item["setor"]: item["quantidade"] for item in resp.json()}
    assert setores["RH"] == 2

    client_admin.post(f"/api/atribuicoes/{criada['id']}/devolver")
    resp2 = client_admin.get("/api/relatorios/por-setor")
    setores2 = {item["setor"]: item["quantidade"] for item in resp2.json()}
    assert setores2["RH"] == 1


def test_relatorios_sem_permissao_403(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/relatorios/resumo")
    assert resp.status_code == 403


def test_relatorios_sem_sessao_401(client: TestClient) -> None:
    resp = client.get("/api/relatorios/resumo")
    assert resp.status_code == 401
