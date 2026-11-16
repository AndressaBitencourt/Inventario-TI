from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas, serializers
from app.database import get_db

router = APIRouter(prefix="/api/manutencoes", tags=["manutencoes"])


@router.post(
    "", response_model=schemas.ManutencaoOut, status_code=status.HTTP_201_CREATED
)
def criar(
    dados: schemas.ManutencaoIn,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        manutencao = crud.criar_manutencao(db, dados)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    return serializers.manutencao_para_out(manutencao)


@router.get("", response_model=list[schemas.ManutencaoOut])
def listar(
    somente_abertas: bool = False,
    equipamento_id: int | None = None,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    manutencoes = crud.listar_manutencoes(db, somente_abertas, equipamento_id)
    return [serializers.manutencao_para_out(m) for m in manutencoes]


@router.get("/{manutencao_id}", response_model=schemas.ManutencaoOut)
def detalhar(
    manutencao_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    manutencao = crud.obter_manutencao(db, manutencao_id)
    if manutencao is None:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")
    return serializers.manutencao_para_out(manutencao)


@router.post("/{manutencao_id}/finalizar", response_model=schemas.ManutencaoOut)
def finalizar(
    manutencao_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        manutencao = crud.finalizar_manutencao(db, manutencao_id)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if manutencao is None:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")
    return serializers.manutencao_para_out(manutencao)
