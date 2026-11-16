from app import models, schemas


def atribuicao_para_out(atribuicao: models.Atribuicao) -> schemas.AtribuicaoOut:
    return schemas.AtribuicaoOut(
        id=atribuicao.id,
        equipamento_id=atribuicao.equipamento_id,
        equipamento_nome=atribuicao.equipamento_nome,
        responsavel_nome=atribuicao.responsavel_nome,
        setor=atribuicao.setor,
        observacao=atribuicao.observacao,
        data_retirada=atribuicao.data_retirada,
        data_devolucao=atribuicao.data_devolucao,
        ativa=atribuicao.data_devolucao is None,
    )


def manutencao_para_out(manutencao: models.Manutencao) -> schemas.ManutencaoOut:
    return schemas.ManutencaoOut(
        id=manutencao.id,
        equipamento_id=manutencao.equipamento_id,
        equipamento_nome=manutencao.equipamento_nome,
        motivo=manutencao.motivo,
        custo=manutencao.custo,
        observacao=manutencao.observacao,
        data_inicio=manutencao.data_inicio,
        data_fim=manutencao.data_fim,
        aberta=manutencao.data_fim is None,
    )
