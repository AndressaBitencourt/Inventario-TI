from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/relatorios", tags=["relatorios"])


@router.get("/resumo", response_model=schemas.ResumoPatrimonio)
def resumo(
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_admin),
):
    total, valor_total, disponivel, em_uso, manutencao, baixado = (
        crud.resumo_patrimonio(db)
    )
    return schemas.ResumoPatrimonio(
        total_equipamentos=total,
        valor_total=valor_total,
        disponivel=disponivel,
        em_uso=em_uso,
        manutencao=manutencao,
        baixado=baixado,
    )


@router.get("/por-tipo", response_model=list[schemas.EquipamentoPorTipoItem])
def por_tipo(
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_admin),
):
    dados = crud.equipamentos_por_tipo(db)
    return [schemas.EquipamentoPorTipoItem(tipo=t, quantidade=q) for t, q in dados]


@router.get("/por-setor", response_model=list[schemas.EquipamentoPorSetorItem])
def por_setor(
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_admin),
):
    dados = crud.equipamentos_por_setor_em_uso(db)
    return [schemas.EquipamentoPorSetorItem(setor=s, quantidade=q) for s, q in dados]
