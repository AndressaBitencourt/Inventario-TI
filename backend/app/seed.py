from decimal import Decimal

import bcrypt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models

EQUIPAMENTOS_INICIAIS: list[dict] = [
    {"nome": "Notebook Dell Latitude 5420", "tipo": "Notebook", "marca": "Dell",
     "modelo": "Latitude 5420", "numero_patrimonio": "PAT-0001",
     "numero_serie": "SN-DL5420-001", "valor": Decimal("4800.00")},
    {"nome": "Notebook Dell Latitude 5420", "tipo": "Notebook", "marca": "Dell",
     "modelo": "Latitude 5420", "numero_patrimonio": "PAT-0002",
     "numero_serie": "SN-DL5420-002", "valor": Decimal("4800.00")},
    {"nome": "Notebook Lenovo ThinkPad T14", "tipo": "Notebook", "marca": "Lenovo",
     "modelo": "ThinkPad T14", "numero_patrimonio": "PAT-0003",
     "numero_serie": "SN-TPT14-001", "valor": Decimal("5200.00")},
    {"nome": "Desktop Dell OptiPlex 3080", "tipo": "Desktop", "marca": "Dell",
     "modelo": "OptiPlex 3080", "numero_patrimonio": "PAT-0004",
     "numero_serie": "SN-OPX3080-001", "valor": Decimal("3600.00")},
    {"nome": "Desktop Dell OptiPlex 3080", "tipo": "Desktop", "marca": "Dell",
     "modelo": "OptiPlex 3080", "numero_patrimonio": "PAT-0005",
     "numero_serie": "SN-OPX3080-002", "valor": Decimal("3600.00")},
    {"nome": "Monitor LG 24' Full HD", "tipo": "Monitor", "marca": "LG",
     "modelo": "24ML600", "numero_patrimonio": "PAT-0006",
     "numero_serie": "SN-LG24-001", "valor": Decimal("900.00")},
    {"nome": "Monitor LG 24' Full HD", "tipo": "Monitor", "marca": "LG",
     "modelo": "24ML600", "numero_patrimonio": "PAT-0007",
     "numero_serie": "SN-LG24-002", "valor": Decimal("900.00")},
    {"nome": "Monitor Samsung 27' Curvo", "tipo": "Monitor", "marca": "Samsung",
     "modelo": "C27F390", "numero_patrimonio": "PAT-0008",
     "numero_serie": "SN-SMC27-001", "valor": Decimal("1350.00")},
    {"nome": "Teclado Logitech K120", "tipo": "Periférico", "marca": "Logitech",
     "modelo": "K120", "numero_patrimonio": "PAT-0009",
     "numero_serie": None, "valor": Decimal("80.00")},
    {"nome": "Mouse Logitech M100", "tipo": "Periférico", "marca": "Logitech",
     "modelo": "M100", "numero_patrimonio": "PAT-0010",
     "numero_serie": None, "valor": Decimal("45.00")},
    {"nome": "Impressora HP LaserJet M107w", "tipo": "Impressora", "marca": "HP",
     "modelo": "LaserJet M107w", "numero_patrimonio": "PAT-0011",
     "numero_serie": "SN-HPM107-001", "valor": Decimal("1100.00")},
    {"nome": "Roteador TP-Link Archer C6", "tipo": "Rede", "marca": "TP-Link",
     "modelo": "Archer C6", "numero_patrimonio": "PAT-0012",
     "numero_serie": "SN-TPC6-001", "valor": Decimal("320.00")},
    {"nome": "Switch TP-Link 24 portas", "tipo": "Rede", "marca": "TP-Link",
     "modelo": "TL-SG1024", "numero_patrimonio": "PAT-0013",
     "numero_serie": "SN-TPSG24-001", "valor": Decimal("780.00")},
    {"nome": "Licença Microsoft Office 365", "tipo": "Licença de Software",
     "marca": "Microsoft", "modelo": "Office 365 Business", "numero_patrimonio": "PAT-0014",
     "numero_serie": None, "valor": Decimal("450.00")},
]


def seed_equipamentos(db: Session) -> int:
    ja_existem = db.scalar(select(func.count()).select_from(models.Equipamento))
    if ja_existem:
        return 0
    db.add_all(models.Equipamento(**item) for item in EQUIPAMENTOS_INICIAIS)
    db.commit()
    return len(EQUIPAMENTOS_INICIAIS)


ADMIN_PADRAO_EMAIL = "admin@inventario-ti.com"
ADMIN_PADRAO_SENHA = "admin123"  # credencial de demonstracao, ver README

TECNICO_PADRAO_EMAIL = "tecnico@inventario-ti.com"
TECNICO_PADRAO_SENHA = "tecnico123"  # credencial de demonstracao, ver README


def seed_usuarios(db: Session) -> int:
    ja_existem = db.scalar(select(func.count()).select_from(models.Usuario))
    if ja_existem:
        return 0
    admin = models.Usuario(
        nome="Administrador",
        email=ADMIN_PADRAO_EMAIL,
        senha_hash=bcrypt.hashpw(
            ADMIN_PADRAO_SENHA.encode(), bcrypt.gensalt()
        ).decode(),
        papel="admin",
    )
    tecnico = models.Usuario(
        nome="Técnico",
        email=TECNICO_PADRAO_EMAIL,
        senha_hash=bcrypt.hashpw(
            TECNICO_PADRAO_SENHA.encode(), bcrypt.gensalt()
        ).decode(),
        papel="tecnico",
    )
    db.add_all([admin, tecnico])
    db.commit()
    return 2
