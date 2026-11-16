from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models, schemas, uploads
from app.models import utcnow

STATUS_DISPONIVEL = "disponivel"
STATUS_EM_USO = "em_uso"
STATUS_MANUTENCAO = "manutencao"
STATUS_BAIXADO = "baixado"


class RegraNegocioError(Exception):
    def __init__(self, mensagem: str) -> None:
        self.mensagem = mensagem
        super().__init__(mensagem)


# --------------------------------------------------------------- Equipamentos


def listar_equipamentos(
    db: Session, status: str | None = None, tipo: str | None = None
) -> list[models.Equipamento]:
    stmt = select(models.Equipamento).order_by(
        models.Equipamento.tipo, models.Equipamento.nome
    )
    if status:
        stmt = stmt.where(models.Equipamento.status == status)
    if tipo:
        stmt = stmt.where(models.Equipamento.tipo == tipo)
    return list(db.scalars(stmt))


def obter_equipamento(db: Session, equipamento_id: int) -> models.Equipamento | None:
    return db.get(models.Equipamento, equipamento_id)


def _numero_patrimonio_em_uso(
    db: Session, numero: str, ignorar_id: int | None = None
) -> bool:
    stmt = select(models.Equipamento).where(
        models.Equipamento.numero_patrimonio == numero
    )
    if ignorar_id is not None:
        stmt = stmt.where(models.Equipamento.id != ignorar_id)
    return db.scalar(stmt) is not None


def criar_equipamento(
    db: Session, dados: schemas.EquipamentoIn
) -> models.Equipamento:
    if _numero_patrimonio_em_uso(db, dados.numero_patrimonio):
        raise RegraNegocioError(
            f"Já existe um equipamento com o patrimônio '{dados.numero_patrimonio}'."
        )
    equipamento = models.Equipamento(
        nome=dados.nome,
        tipo=dados.tipo,
        numero_patrimonio=dados.numero_patrimonio,
        numero_serie=dados.numero_serie,
        marca=dados.marca,
        modelo=dados.modelo,
        valor=dados.valor,
        status=STATUS_DISPONIVEL,
    )
    db.add(equipamento)
    db.commit()
    db.refresh(equipamento)
    return equipamento


def atualizar_equipamento(
    db: Session, equipamento_id: int, dados: schemas.EquipamentoIn
) -> models.Equipamento | None:
    equipamento = db.get(models.Equipamento, equipamento_id)
    if equipamento is None:
        return None
    if _numero_patrimonio_em_uso(db, dados.numero_patrimonio, ignorar_id=equipamento_id):
        raise RegraNegocioError(
            f"Já existe um equipamento com o patrimônio '{dados.numero_patrimonio}'."
        )
    equipamento.nome = dados.nome
    equipamento.tipo = dados.tipo
    equipamento.numero_patrimonio = dados.numero_patrimonio
    equipamento.numero_serie = dados.numero_serie
    equipamento.marca = dados.marca
    equipamento.modelo = dados.modelo
    equipamento.valor = dados.valor
    db.commit()
    db.refresh(equipamento)
    return equipamento


def excluir_equipamento(db: Session, equipamento_id: int) -> bool:
    equipamento = db.get(models.Equipamento, equipamento_id)
    if equipamento is None:
        return False
    tem_historico = db.scalar(
        select(func.count())
        .select_from(models.Atribuicao)
        .where(models.Atribuicao.equipamento_id == equipamento_id)
    ) or db.scalar(
        select(func.count())
        .select_from(models.Manutencao)
        .where(models.Manutencao.equipamento_id == equipamento_id)
    )
    if tem_historico:
        raise RegraNegocioError(
            "Não é possível excluir — esse equipamento já tem histórico de "
            "atribuição ou manutenção. Dê baixa nele em vez de excluir."
        )
    uploads.remover_arquivo(equipamento.imagem_url)
    db.delete(equipamento)
    db.commit()
    return True


async def salvar_imagem_equipamento(
    db: Session, equipamento_id: int, arquivo
) -> models.Equipamento | None:
    equipamento = db.get(models.Equipamento, equipamento_id)
    if equipamento is None:
        return None
    extensao = uploads.extensao_valida(arquivo.filename or "")
    if extensao is None:
        raise RegraNegocioError(
            "Formato de imagem não suportado. Use JPG, PNG ou WEBP."
        )
    conteudo = await arquivo.read()
    if len(conteudo) > uploads.TAMANHO_MAXIMO_BYTES:
        raise RegraNegocioError("Imagem muito grande — o limite é 5 MB.")
    uploads.remover_arquivo(equipamento.imagem_url)
    equipamento.imagem_url = uploads.salvar_arquivo(equipamento_id, extensao, conteudo)
    db.commit()
    db.refresh(equipamento)
    return equipamento


def baixar_equipamento(db: Session, equipamento_id: int) -> models.Equipamento | None:
    equipamento = db.get(models.Equipamento, equipamento_id)
    if equipamento is None:
        return None
    if equipamento.status == STATUS_EM_USO:
        raise RegraNegocioError(
            "Esse equipamento está em uso — devolva a atribuição antes de dar baixa."
        )
    if equipamento.status == STATUS_BAIXADO:
        raise RegraNegocioError("Esse equipamento já está baixado.")
    equipamento.status = STATUS_BAIXADO
    db.commit()
    db.refresh(equipamento)
    return equipamento


def reativar_equipamento(db: Session, equipamento_id: int) -> models.Equipamento | None:
    equipamento = db.get(models.Equipamento, equipamento_id)
    if equipamento is None:
        return None
    if equipamento.status != STATUS_BAIXADO:
        raise RegraNegocioError("Esse equipamento não está baixado.")
    equipamento.status = STATUS_DISPONIVEL
    db.commit()
    db.refresh(equipamento)
    return equipamento


# ---------------------------------------------------------------- Atribuicoes


def criar_atribuicao(db: Session, dados: schemas.AtribuicaoIn) -> models.Atribuicao:
    equipamento = db.get(models.Equipamento, dados.equipamento_id)
    if equipamento is None:
        raise RegraNegocioError(f"Equipamento {dados.equipamento_id} não existe.")
    if equipamento.status != STATUS_DISPONIVEL:
        raise RegraNegocioError(
            f"Equipamento '{equipamento.nome}' não está disponível para atribuição."
        )
    atribuicao = models.Atribuicao(
        equipamento_id=equipamento.id,
        equipamento_nome=equipamento.nome,
        responsavel_nome=dados.responsavel_nome,
        setor=dados.setor,
        observacao=dados.observacao,
    )
    equipamento.status = STATUS_EM_USO
    db.add(atribuicao)
    db.commit()
    db.refresh(atribuicao)
    return atribuicao


def listar_atribuicoes(
    db: Session,
    somente_ativas: bool = False,
    equipamento_id: int | None = None,
) -> list[models.Atribuicao]:
    stmt = select(models.Atribuicao).order_by(models.Atribuicao.data_retirada.desc())
    if somente_ativas:
        stmt = stmt.where(models.Atribuicao.data_devolucao.is_(None))
    if equipamento_id is not None:
        stmt = stmt.where(models.Atribuicao.equipamento_id == equipamento_id)
    return list(db.scalars(stmt))


def obter_atribuicao(db: Session, atribuicao_id: int) -> models.Atribuicao | None:
    return db.get(models.Atribuicao, atribuicao_id)


def devolver_atribuicao(db: Session, atribuicao_id: int) -> models.Atribuicao | None:
    atribuicao = db.get(models.Atribuicao, atribuicao_id)
    if atribuicao is None:
        return None
    if atribuicao.data_devolucao is not None:
        raise RegraNegocioError("Essa atribuição já foi devolvida.")
    atribuicao.data_devolucao = utcnow()
    equipamento = db.get(models.Equipamento, atribuicao.equipamento_id)
    if equipamento is not None:
        equipamento.status = STATUS_DISPONIVEL
    db.commit()
    db.refresh(atribuicao)
    return atribuicao


# ---------------------------------------------------------------- Manutencoes


def criar_manutencao(db: Session, dados: schemas.ManutencaoIn) -> models.Manutencao:
    equipamento = db.get(models.Equipamento, dados.equipamento_id)
    if equipamento is None:
        raise RegraNegocioError(f"Equipamento {dados.equipamento_id} não existe.")
    if equipamento.status != STATUS_DISPONIVEL:
        raise RegraNegocioError(
            f"Equipamento '{equipamento.nome}' precisa estar disponível para "
            "entrar em manutenção."
        )
    manutencao = models.Manutencao(
        equipamento_id=equipamento.id,
        equipamento_nome=equipamento.nome,
        motivo=dados.motivo,
        custo=dados.custo,
        observacao=dados.observacao,
    )
    equipamento.status = STATUS_MANUTENCAO
    db.add(manutencao)
    db.commit()
    db.refresh(manutencao)
    return manutencao


def listar_manutencoes(
    db: Session,
    somente_abertas: bool = False,
    equipamento_id: int | None = None,
) -> list[models.Manutencao]:
    stmt = select(models.Manutencao).order_by(models.Manutencao.data_inicio.desc())
    if somente_abertas:
        stmt = stmt.where(models.Manutencao.data_fim.is_(None))
    if equipamento_id is not None:
        stmt = stmt.where(models.Manutencao.equipamento_id == equipamento_id)
    return list(db.scalars(stmt))


def obter_manutencao(db: Session, manutencao_id: int) -> models.Manutencao | None:
    return db.get(models.Manutencao, manutencao_id)


def finalizar_manutencao(db: Session, manutencao_id: int) -> models.Manutencao | None:
    manutencao = db.get(models.Manutencao, manutencao_id)
    if manutencao is None:
        return None
    if manutencao.data_fim is not None:
        raise RegraNegocioError("Essa manutenção já foi finalizada.")
    manutencao.data_fim = utcnow()
    equipamento = db.get(models.Equipamento, manutencao.equipamento_id)
    if equipamento is not None:
        equipamento.status = STATUS_DISPONIVEL
    db.commit()
    db.refresh(manutencao)
    return manutencao


# ----------------------------------------------------------------- Relatorios


def resumo_patrimonio(
    db: Session,
) -> tuple[int, Decimal, int, int, int, int]:
    equipamentos = list(db.scalars(select(models.Equipamento)))
    total = len(equipamentos)
    valor_total = sum(
        (Decimal(e.valor) for e in equipamentos if e.valor is not None), Decimal("0")
    )
    disponivel = sum(1 for e in equipamentos if e.status == STATUS_DISPONIVEL)
    em_uso = sum(1 for e in equipamentos if e.status == STATUS_EM_USO)
    manutencao = sum(1 for e in equipamentos if e.status == STATUS_MANUTENCAO)
    baixado = sum(1 for e in equipamentos if e.status == STATUS_BAIXADO)
    return total, valor_total, disponivel, em_uso, manutencao, baixado


def equipamentos_por_tipo(db: Session) -> list[tuple[str, int]]:
    stmt = (
        select(models.Equipamento.tipo, func.count())
        .group_by(models.Equipamento.tipo)
        .order_by(func.count().desc())
    )
    return list(db.execute(stmt).all())


def equipamentos_por_setor_em_uso(db: Session) -> list[tuple[str, int]]:
    stmt = (
        select(models.Atribuicao.setor, func.count())
        .where(models.Atribuicao.data_devolucao.is_(None))
        .group_by(models.Atribuicao.setor)
        .order_by(func.count().desc())
    )
    return list(db.execute(stmt).all())
