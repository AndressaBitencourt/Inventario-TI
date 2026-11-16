from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator

Money = Annotated[
    Decimal, PlainSerializer(lambda v: f"{Decimal(v):.2f}", return_type=str)
]


def _utc_iso(v: datetime) -> str:
    aware = (
        v.replace(tzinfo=timezone.utc)
        if v.tzinfo is None
        else v.astimezone(timezone.utc)
    )
    return aware.isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[datetime, PlainSerializer(_utc_iso, return_type=str)]


class EquipamentoIn(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    tipo: str = Field(min_length=1, max_length=40)
    numero_patrimonio: str = Field(min_length=1, max_length=40)
    numero_serie: str | None = Field(default=None, max_length=60)
    marca: str = Field(min_length=1, max_length=60)
    modelo: str = Field(min_length=1, max_length=60)
    valor: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)

    @field_validator("nome", "tipo", "numero_patrimonio", "marca", "modelo", mode="after")
    @classmethod
    def _remover_espacos(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("não pode ser só espaços.")
        return valor


class EquipamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: str
    numero_patrimonio: str
    numero_serie: str | None = None
    marca: str
    modelo: str
    valor: Money | None = None
    status: str
    imagem_url: str | None = None
    criado_em: UtcDatetime


class AtribuicaoIn(BaseModel):
    equipamento_id: int
    responsavel_nome: str = Field(min_length=1, max_length=80)
    setor: str = Field(min_length=1, max_length=60)
    observacao: str | None = Field(default=None, max_length=255)


class AtribuicaoOut(BaseModel):
    id: int
    equipamento_id: int
    equipamento_nome: str
    responsavel_nome: str
    setor: str
    observacao: str | None
    data_retirada: UtcDatetime
    data_devolucao: UtcDatetime | None
    ativa: bool


class ManutencaoIn(BaseModel):
    equipamento_id: int
    motivo: str = Field(min_length=1, max_length=255)
    custo: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    observacao: str | None = Field(default=None, max_length=255)


class ManutencaoOut(BaseModel):
    id: int
    equipamento_id: int
    equipamento_nome: str
    motivo: str
    custo: Money | None
    observacao: str | None
    data_inicio: UtcDatetime
    data_fim: UtcDatetime | None
    aberta: bool


class LoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=120)
    senha: str = Field(min_length=1)


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    papel: str


class ResumoPatrimonio(BaseModel):
    total_equipamentos: int
    valor_total: Money
    disponivel: int
    em_uso: int
    manutencao: int
    baixado: int


class EquipamentoPorSetorItem(BaseModel):
    setor: str
    quantidade: int


class EquipamentoPorTipoItem(BaseModel):
    tipo: str
    quantidade: int
