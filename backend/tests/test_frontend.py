from fastapi.testclient import TestClient


def test_raiz_serve_o_dashboard(client: TestClient) -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Dashboard" in resp.text
    assert "dashboard.js" in resp.text


def test_equipamentos_serve_a_pagina(client: TestClient) -> None:
    resp = client.get("/equipamentos.html")
    assert resp.status_code == 200
    assert "Equipamentos" in resp.text
    assert "equipamentos.js" in resp.text


def test_equipamento_detalhe_serve_a_pagina(client: TestClient) -> None:
    resp = client.get("/equipamento-detalhe.html")
    assert resp.status_code == 200
    assert "equipamento-detalhe.js" in resp.text


def test_login_serve_a_pagina(client: TestClient) -> None:
    resp = client.get("/login.html")
    assert resp.status_code == 200
    assert "Entrar" in resp.text
    assert "login.js" in resp.text


def test_historico_serve_a_pagina(client: TestClient) -> None:
    resp = client.get("/historico.html")
    assert resp.status_code == 200
    assert "Histórico" in resp.text
    assert "historico.js" in resp.text


def test_relatorios_serve_a_pagina(client: TestClient) -> None:
    resp = client.get("/relatorios.html")
    assert resp.status_code == 200
    assert "Relatórios" in resp.text
    assert "relatorios.js" in resp.text


def test_placeholder_de_imagem_e_servido(client: TestClient) -> None:
    resp = client.get("/images/placeholder.svg")
    assert resp.status_code == 200
    assert "<svg" in resp.text
