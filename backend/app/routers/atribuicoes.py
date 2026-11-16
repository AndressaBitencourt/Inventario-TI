from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas, serializers
from app.database import get_db

router = APIRouter(prefix="/api/atribuicoes", tags=["atribuicoes"])


@router.post(
    "", response_model=schemas.AtribuicaoOut, status_code=status.HTTP_201_CREATED
)
def criar(
    dados: schemas.AtribuicaoIn,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        atribuicao = crud.criar_atribuicao(db, dados)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    return serializers.atribuicao_para_out(atribuicao)


@router.get("", response_model=list[schemas.AtribuicaoOut])
def listar(
    somente_ativas: bool = False,
    equipamento_id: int | None = None,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    atribuicoes = crud.listar_atribuicoes(db, somente_ativas, equipamento_id)
    return [serializers.atribuicao_para_out(a) for a in atribuicoes]


@router.get("/{atribuicao_id}", response_model=schemas.AtribuicaoOut)
def detalhar(
    atribuicao_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    atribuicao = crud.obter_atribuicao(db, atribuicao_id)
    if atribuicao is None:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada.")
    return serializers.atribuicao_para_out(atribuicao)


@router.post("/{atribuicao_id}/devolver", response_model=schemas.AtribuicaoOut)
def devolver(
    atribuicao_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        atribuicao = crud.devolver_atribuicao(db, atribuicao_id)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if atribuicao is None:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada.")
    return serializers.atribuicao_para_out(atribuicao)
