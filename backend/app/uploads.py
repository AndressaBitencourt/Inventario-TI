import os
from pathlib import Path
from uuid import uuid4

_DEFAULT_UPLOADS_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_ROOT = Path(os.environ.get("UPLOADS_DIR", str(_DEFAULT_UPLOADS_ROOT)))
EQUIPAMENTOS_DIR = UPLOADS_ROOT / "equipamentos"
EQUIPAMENTOS_DIR.mkdir(parents=True, exist_ok=True)

EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB


def extensao_valida(nome_arquivo: str) -> str | None:
    ext = Path(nome_arquivo).suffix.lower()
    return ext if ext in EXTENSOES_PERMITIDAS else None


def salvar_arquivo(equipamento_id: int, extensao: str, conteudo: bytes) -> str:
    nome = f"{equipamento_id}-{uuid4().hex[:8]}{extensao}"
    (EQUIPAMENTOS_DIR / nome).write_bytes(conteudo)
    return f"/uploads/equipamentos/{nome}"


def remover_arquivo(imagem_url: str | None) -> None:
    if not imagem_url or not imagem_url.startswith("/uploads/equipamentos/"):
        return
    (EQUIPAMENTOS_DIR / Path(imagem_url).name).unlink(missing_ok=True)
