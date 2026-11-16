from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Equipamento(Base):
    __tablename__ = "equipamento"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80))
    tipo: Mapped[str] = mapped_column(String(40))
    numero_patrimonio: Mapped[str] = mapped_column(String(40), unique=True)
    numero_serie: Mapped[str | None] = mapped_column(String(60), default=None)
    marca: Mapped[str] = mapped_column(String(60))
    modelo: Mapped[str] = mapped_column(String(60))
    valor: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    status: Mapped[str] = mapped_column(String(20), default="disponivel")
    imagem_url: Mapped[str | None] = mapped_column(String(255), default=None)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    atribuicoes: Mapped[list["Atribuicao"]] = relationship(
        back_populates="equipamento", lazy="selectin"
    )
    manutencoes: Mapped[list["Manutencao"]] = relationship(
        back_populates="equipamento", lazy="selectin"
    )


class Atribuicao(Base):
    __tablename__ = "atribuicao"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipamento_id: Mapped[int] = mapped_column(ForeignKey("equipamento.id"))
    equipamento_nome: Mapped[str] = mapped_column(String(80))
    responsavel_nome: Mapped[str] = mapped_column(String(80))
    setor: Mapped[str] = mapped_column(String(60))
    observacao: Mapped[str | None] = mapped_column(String(255), default=None)
    data_retirada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    data_devolucao: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    equipamento: Mapped["Equipamento"] = relationship(back_populates="atribuicoes")


class Manutencao(Base):
    __tablename__ = "manutencao"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipamento_id: Mapped[int] = mapped_column(ForeignKey("equipamento.id"))
    equipamento_nome: Mapped[str] = mapped_column(String(80))
    motivo: Mapped[str] = mapped_column(String(255))
    custo: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    observacao: Mapped[str | None] = mapped_column(String(255), default=None)
    data_inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    data_fim: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    equipamento: Mapped["Equipamento"] = relationship(back_populates="manutencoes")


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(120), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    papel: Mapped[str] = mapped_column(String(20))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )


class Sessao(Base):
    __tablename__ = "sessao"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
