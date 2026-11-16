# Roteiro do vídeo — Apresentação do Inventário de TI

Roteiro para gravação de tela, ~5min a 5min30. Fala natural, sem pressa —
os tempos abaixo são só uma referência para não passar do limite.

**A ideia central:** mostrar o ciclo de vida completo de um equipamento —
atribuir pra alguém, devolver, mandar pra manutenção, finalizar, dar baixa
— e a diferença real de permissão entre técnico e admin (não é só duas
telas parecidas: tentar entrar como técnico numa área de admin é
bloqueado de verdade pela API).

## Antes de gravar (checklist)

- [ ] Fechar abas e programas que não vão aparecer no vídeo
- [ ] Deixar só 2 janelas prontas: **navegador** (em branco, sem abrir
      ainda) e **VSCode** com o projeto aberto
- [ ] Apagar `backend/app.db` (ou rodar `docker compose down -v`) antes de
      subir — assim o catálogo aparece com os 14 equipamentos do seed e
      tudo começa "disponível"
- [ ] Ter o terminal do VSCode aberto na pasta do projeto
- [ ] Ter as duas credenciais de demonstração à mão: admin
      (`admin@inventario-ti.com` / `admin123`) e técnico
      (`tecnico@inventario-ti.com` / `tecnico123`) — estão no README
- [ ] Testar o `EXECUTE-AQUI` uma vez antes de gravar, pra garantir que
      sobe sem erro

---

## 0:00 – 0:25 — Abertura

**Tela:** VSCode aberto, mostrando a raiz do projeto.

**Fala:**
> Oi! Esse é o meu Inventário de TI — um sistema de controle de
> equipamentos: notebook, monitor, periférico, licença de software, esse
> tipo de coisa. O sistema controla quem está com cada equipamento, o
> histórico de manutenção, e tem login com dois perfis — técnico e
> admin — além de relatórios de patrimônio.

---

## 0:25 – 0:45 — Subindo o app

**Tela:** terminal do VSCode.

**Ação:** digitar e rodar
```
./EXECUTE-AQUI.sh
```
(ou `EXECUTE-AQUI.bat` se estiver gravando no Windows)

**Fala (enquanto sobe):**
> Sem Docker, sem configuração — o script resolve o ambiente sozinho.

---

## 0:45 – 1:05 — Login

**Tela:** `/login.html`, logar com `tecnico@inventario-ti.com` /
`tecnico123`.

**Fala:**
> Não tem área pública — é uma ferramenta interna, então a primeira tela
> é sempre o login. Vou entrar como técnico primeiro.

---

## 1:05 – 2:30 — Ciclo de vida do equipamento (o núcleo do vídeo)

**Tela:** tela de Equipamentos, com a tabela e os filtros de status no
topo.

**Fala:**
> Essa é a tela principal — o catálogo de equipamentos, já vem com 14
> itens cadastrados. Dá pra filtrar por status aqui em cima: disponível,
> em uso, em manutenção, baixado.

**Ação:** clicar em "Atribuir" num notebook disponível, preencher
responsável + setor na caixa que abre, confirmar.

**Fala:**
> Pra atribuir um equipamento a alguém, só preencher quem está levando e
> o setor — o status muda pra "em uso" na hora.

**Ação:** apontar o badge de status mudando na tabela. Clicar em
"Devolver" no mesmo equipamento.

**Fala:**
> Devolver fecha essa atribuição e libera o equipamento de volta pra
> disponível.

**Ação:** clicar em "Manutenção" num equipamento disponível, preencher
motivo (+ custo opcional), confirmar. Apontar o status virando "Em
manutenção". Clicar em "Finalizar manutenção".

**Fala:**
> O mesmo vale pra manutenção — abre com um motivo, e finalizar devolve
> pra disponível. Dá pra ver o histórico completo de tudo isso na aba
> "Histórico", inclusive os eventos antigos e os ativos.

**Ação:** abrir `/historico.html`, mostrar as duas tabelas (atribuições e
manutenções), com o filtro de "só ativas/abertas".

**Ação:** voltar pra Equipamentos, clicar em "Dar baixa" num equipamento
disponível, confirmar. Mostrar o status "Baixado" e o botão "Reativar"
aparecendo.

**Fala:**
> E quando um equipamento quebra de vez ou é descartado, "dar baixa" tira
> ele de circulação sem apagar o histórico — bem diferente de excluir.

---

## 2:30 – 3:10 — Permissão de verdade (técnico x admin)

**Tela:** menu ☰ do técnico — apontar que só aparece "Equipamentos" e
"Histórico", sem "Relatórios".

**Fala:**
> Repara que o técnico não vê "Relatórios" no menu. Isso não é só eu
> escondendo o link — a API bloqueia de verdade.

**Ação:** tentar excluir um equipamento como técnico (se o botão não
aparecer, comentar isso) ou digitar `/relatorios.html` direto na barra de
endereço.

**Fala:**
> Se eu tentar forçar a URL dos relatórios logado como técnico, a API
> devolve 403 e a tela me manda de volta.

**Ação:** "Sair", logar como admin (`admin@inventario-ti.com` /
`admin123`). Apontar o menu completo (Relatórios aparece agora).

---

## 3:10 – 4:10 — Relatórios

**Tela:** abrir "Relatórios".

**Fala:**
> Como admin, tenho o resumo do patrimônio — total de equipamentos, valor
> total, e a contagem por status — e dois gráficos: quantidade por tipo de
> equipamento, e quantos equipamentos cada setor está usando agora.

**Ação:** apontar os cards de resumo, depois os dois gráficos (barras com
gradiente no card escuro).

---

## 4:10 – 4:45 — Código

**Tela:** VSCode, abrir `backend/app/crud.py`, rolar até `criar_atribuicao`
e `baixar_equipamento`.

**Fala:**
> Por trás, cada ação de status passa pela camada de regra de negócio —
> por exemplo, só dá pra atribuir um equipamento que está "disponível", e
> só dá pra dar baixa se ele não estiver em uso. O FastAPI expõe isso como
> rotas, mas a regra em si não depende do framework.

**Ação (opcional):** abrir `backend/app/routers/equipamentos.py`, apontar
rapidamente a diferença entre as rotas que pedem só login
(`usuario_logado`) e a de excluir, que pede admin (`usuario_admin`).

---

## 4:45 – 5:15 — Testes e fechamento

**Tela:** terminal.

**Ação:** rodar
```
./EXECUTE-AQUI.sh test
```

**Fala:**
> E pra fechar, os testes automatizados — 68 no total, cobrindo o ciclo
> completo de atribuição e manutenção, as regras de bloqueio, e a
> permissão por papel.

**Tela:** parado no resultado `68 passed`.

**Fala:**
> Esse foi o Inventário de TI. Obrigado!

---

## Dicas de gravação

- Fale um pouco mais devagar do que o normal — no vídeo sempre parece
  mais rápido do que parece na hora.
- Se travar numa parte, pausa a gravação, respira e regrava só aquele
  trecho (dá pra cortar depois).
- Não precisa decorar a fala palavra por palavra — usa esse roteiro como
  guia e fala com as suas palavras.
- Se o vídeo ficar longo demais, o trecho de código (4:10–4:45) é o mais
  fácil de cortar sem perder a demonstração funcional.
