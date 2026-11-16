from fastapi.testclient import TestClient

EQUIPAMENTO_NOVO = {
    "nome": "Notebook Acer Aspire 5",
    "tipo": "Notebook",
    "numero_patrimonio": "PAT-9000",
    "numero_serie": "SN-ACER-9000",
    "marca": "Acer",
    "modelo": "Aspire 5",
    "valor": "3200.00",
}

_PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
    "53de0000000c4944415408d763f8ffff3f0005fe02fea76cc8a90000000049"
    "454e44ae426082"
)


def test_criar_equipamento_valido(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/equipamentos", json=EQUIPAMENTO_NOVO)
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["nome"] == EQUIPAMENTO_NOVO["nome"]
    assert corpo["status"] == "disponivel"


def test_criar_equipamento_patrimonio_duplicado_400(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/equipamentos", json=EQUIPAMENTO_NOVO)
    resp = client_tecnico.post("/api/equipamentos", json=EQUIPAMENTO_NOVO)
    assert resp.status_code == 400
    assert "PAT-9000" in resp.json()["detail"]


def test_criar_equipamento_sem_nome_422(client_tecnico: TestClient) -> None:
    dados = {**EQUIPAMENTO_NOVO, "nome": ""}
    resp = client_tecnico.post("/api/equipamentos", json=dados)
    assert resp.status_code == 422


def test_listar_equipamentos(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/equipamentos")
    assert resp.status_code == 200
    assert len(resp.json()) == 14


def test_listar_equipamentos_filtra_por_tipo(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/equipamentos?tipo=Monitor")
    assert resp.status_code == 200
    assert all(e["tipo"] == "Monitor" for e in resp.json())
    assert len(resp.json()) == 3


def test_detalhar_equipamento(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/equipamentos/1")
    assert resp.status_code == 200
    assert resp.json()["numero_patrimonio"] == "PAT-0001"


def test_detalhar_equipamento_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.get("/api/equipamentos/999")
    assert resp.status_code == 404


def test_atualizar_equipamento(client_tecnico: TestClient) -> None:
    dados = {**EQUIPAMENTO_NOVO, "nome": "Notebook Acer Aspire 5 (Revisado)"}
    resp = client_tecnico.put("/api/equipamentos/1", json=dados)
    assert resp.status_code == 200
    assert resp.json()["nome"] == "Notebook Acer Aspire 5 (Revisado)"


def test_atualizar_equipamento_inexistente_404(client_tecnico: TestClient) -> None:
    resp = client_tecnico.put("/api/equipamentos/999", json=EQUIPAMENTO_NOVO)
    assert resp.status_code == 404


def test_atualizar_equipamento_patrimonio_duplicado_400(
    client_tecnico: TestClient,
) -> None:
    dados = {**EQUIPAMENTO_NOVO, "numero_patrimonio": "PAT-0002"}
    resp = client_tecnico.put("/api/equipamentos/1", json=dados)
    assert resp.status_code == 400


def test_excluir_equipamento_sem_historico(client_admin: TestClient) -> None:
    criado = client_admin.post("/api/equipamentos", json=EQUIPAMENTO_NOVO).json()
    resp = client_admin.delete(f"/api/equipamentos/{criado['id']}")
    assert resp.status_code == 204


def test_excluir_equipamento_com_historico_bloqueado_400(
    client_admin: TestClient,
) -> None:
    client_admin.post(
        "/api/atribuicoes",
        json={"equipamento_id": 1, "responsavel_nome": "Maria", "setor": "RH"},
    )
    resp = client_admin.delete("/api/equipamentos/1")
    assert resp.status_code == 400
    assert "histórico" in resp.json()["detail"]


def test_excluir_equipamento_sem_permissao_403(client_tecnico: TestClient) -> None:
    criado = client_tecnico.post("/api/equipamentos", json=EQUIPAMENTO_NOVO).json()
    resp = client_tecnico.delete(f"/api/equipamentos/{criado['id']}")
    assert resp.status_code == 403


def test_baixar_equipamento_disponivel(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/equipamentos/1/baixar")
    assert resp.status_code == 200
    assert resp.json()["status"] == "baixado"


def test_baixar_equipamento_em_uso_bloqueado_400(client_tecnico: TestClient) -> None:
    client_tecnico.post(
        "/api/atribuicoes",
        json={"equipamento_id": 1, "responsavel_nome": "Maria", "setor": "RH"},
    )
    resp = client_tecnico.post("/api/equipamentos/1/baixar")
    assert resp.status_code == 400


def test_baixar_equipamento_ja_baixado_400(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/equipamentos/1/baixar")
    resp = client_tecnico.post("/api/equipamentos/1/baixar")
    assert resp.status_code == 400


def test_reativar_equipamento_baixado(client_tecnico: TestClient) -> None:
    client_tecnico.post("/api/equipamentos/1/baixar")
    resp = client_tecnico.post("/api/equipamentos/1/reativar")
    assert resp.status_code == 200
    assert resp.json()["status"] == "disponivel"


def test_reativar_equipamento_nao_baixado_400(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post("/api/equipamentos/1/reativar")
    assert resp.status_code == 400


def test_upload_imagem_equipamento(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post(
        "/api/equipamentos/1/imagem",
        files={"arquivo": ("foto.png", _PNG_1X1, "image/png")},
    )
    assert resp.status_code == 200
    assert resp.json()["imagem_url"].startswith("/uploads/equipamentos/")


def test_upload_imagem_formato_invalido_400(client_tecnico: TestClient) -> None:
    resp = client_tecnico.post(
        "/api/equipamentos/1/imagem",
        files={"arquivo": ("arquivo.txt", b"nao e imagem", "text/plain")},
    )
    assert resp.status_code == 400


def test_listar_equipamentos_sem_sessao_401(client: TestClient) -> None:
    resp = client.get("/api/equipamentos")
    assert resp.status_code == 401
