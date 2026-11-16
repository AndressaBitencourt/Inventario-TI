from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import auth, crud, models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/equipamentos", tags=["equipamentos"])


@router.get("", response_model=list[schemas.EquipamentoOut])
def listar(
    status_filtro: str | None = None,
    tipo: str | None = None,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
) -> list[models.Equipamento]:
    return crud.listar_equipamentos(db, status_filtro, tipo)


@router.get("/{equipamento_id}", response_model=schemas.EquipamentoOut)
def detalhar(
    equipamento_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    equipamento = crud.obter_equipamento(db, equipamento_id)
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return equipamento


@router.post(
    "", response_model=schemas.EquipamentoOut, status_code=status.HTTP_201_CREATED
)
def criar(
    dados: schemas.EquipamentoIn,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        return crud.criar_equipamento(db, dados)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro


@router.put("/{equipamento_id}", response_model=schemas.EquipamentoOut)
def atualizar(
    equipamento_id: int,
    dados: schemas.EquipamentoIn,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        equipamento = crud.atualizar_equipamento(db, equipamento_id, dados)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return equipamento


@router.delete("/{equipamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    equipamento_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_admin),
):
    try:
        encontrou = crud.excluir_equipamento(db, equipamento_id)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if not encontrou:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")


@router.post("/{equipamento_id}/imagem", response_model=schemas.EquipamentoOut)
async def enviar_imagem(
    equipamento_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        equipamento = await crud.salvar_imagem_equipamento(db, equipamento_id, arquivo)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return equipamento


@router.post("/{equipamento_id}/baixar", response_model=schemas.EquipamentoOut)
def baixar(
    equipamento_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        equipamento = crud.baixar_equipamento(db, equipamento_id)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return equipamento


@router.post("/{equipamento_id}/reativar", response_model=schemas.EquipamentoOut)
def reativar(
    equipamento_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(auth.usuario_logado),
):
    try:
        equipamento = crud.reativar_equipamento(db, equipamento_id)
    except crud.RegraNegocioError as erro:
        raise HTTPException(status_code=400, detail=erro.mensagem) from erro
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return equipamento
