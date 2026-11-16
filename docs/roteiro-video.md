# Roteiro do vídeo — Apresentação do Inventário de TI

Roteiro para gravação de tela, ~5min30 a 6min. Fala natural, sem pressa —
os tempos abaixo são só uma referência para não passar do limite.

**A ideia central:** mostrar o ciclo de vida completo de um equipamento —
atribuir pra alguém, devolver, mandar pra manutenção, finalizar, dar baixa
— tudo reunido na aba **Atividade** da página do equipamento, como uma
linha do tempo única. E a diferença real de permissão entre técnico e
admin: não é só duas telas parecidas, a API bloqueia de verdade.

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
> tipo de coisa. Fiz a interface inspirada em plataformas corporativas de
> ITSM, tipo ServiceNow — sidebar fixa, dashboard, página de registro por
> equipamento. Tem login com dois perfis — técnico e admin — e relatórios
> de patrimônio.

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

## 1:05 – 1:35 — Dashboard

**Tela:** redireciona pro dashboard — sidebar à esquerda, cards de KPI,
manutenções abertas e atividade recente.

**Fala:**
> Essa é a tela inicial: quantos equipamentos tenho, quantos estão em
> cada status, manutenções em aberto, e um feed com a atividade mais
> recente do inventário inteiro — tudo isso sem precisar entrar em cada
> equipamento.

---

## 1:35 – 3:00 — Ciclo de vida do equipamento (o núcleo do vídeo)

**Tela:** clicar em "Equipamentos" na sidebar.

**Fala:**
> Aqui é a lista completa — 14 itens do seed. Dá pra buscar por nome ou
> patrimônio, filtrar por status com esses filtros, e ordenar clicando no
> cabeçalho da coluna.

**Ação:** clicar em "Atribuir" num notebook disponível, preencher
responsável + setor na caixa que abre, confirmar. Apontar o badge mudando
pra "Em uso".

**Fala:**
> Pra atribuir, só preencher quem está levando e o setor — o status muda
> na hora.

**Ação:** clicar no **nome** desse equipamento pra abrir a página de
registro dele.

**Fala:**
> E clicando no equipamento, entro na página de registro dele — com abas:
> Detalhes, Atribuições, Manutenções e Atividade.

**Ação:** clicar na aba "Atividade".

**Fala:**
> Essa aba é o destaque: junta todo o histórico desse equipamento numa
> linha do tempo só — quando foi cadastrado, quem pegou, quando devolveu,
> toda manutenção. Isso aqui é montado só com os dados que já existem, sem
> precisar de uma tabela de auditoria nova no banco.

**Ação:** clicar em "Devolver" no botão de ação no topo da página.
Apontar o novo evento aparecendo na Atividade.

**Ação:** clicar em "Manutenção", preencher motivo (+ custo opcional),
confirmar. Mostrar o status virando "Em manutenção" e o evento na
Atividade. Clicar em "Finalizar manutenção".

**Fala:**
> O mesmo ciclo vale pra manutenção — abre com um motivo, finalizar
> devolve o equipamento pra disponível, e cada passo fica registrado
> aqui.

**Ação:** clicar em "Dar baixa", confirmar. Mostrar o status "Baixado" e
o botão "Reativar" no lugar das outras ações.

**Fala:**
> Dar baixa tira o equipamento de circulação sem apagar o histórico —
> bem diferente de excluir, que é definitivo.

---

## 3:00 – 3:25 — Histórico cruzado

**Tela:** clicar em "Histórico" na sidebar.

**Fala:**
> Essa página mostra atribuições e manutenções de **todos** os
> equipamentos juntos, com filtro de só ativas/abertas — útil pra ver o
> que está em aberto no inventário inteiro, sem entrar equipamento por
> equipamento.

---

## 3:25 – 4:00 — Permissão de verdade (técnico x admin)

**Tela:** apontar a sidebar do técnico — só "Dashboard", "Equipamentos" e
"Histórico", sem "Relatórios".

**Fala:**
> O técnico não vê "Relatórios" na sidebar. Isso não é só eu escondendo o
> link — a API bloqueia de verdade.

**Ação:** digitar `/relatorios.html` direto na barra de endereço, logado
como técnico.

**Fala:**
> Se eu forçar a URL, a API devolve 403 e a tela me manda de volta pro
> dashboard.

**Ação:** "Sair", logar como admin (`admin@inventario-ti.com` /
`admin123`). Apontar a sidebar completa (Relatórios aparece agora).

---

## 4:00 – 4:45 — Relatórios

**Tela:** clicar em "Relatórios".

**Fala:**
> Como admin, tenho o resumo do patrimônio — total de equipamentos, valor
> total, contagem por status — e dois gráficos: quantidade por tipo de
> equipamento, e quantos equipamentos cada setor está usando agora.

**Ação:** apontar os cards de KPI, depois os dois gráficos.

---

## 4:45 – 5:20 — Código

**Tela:** VSCode, abrir `backend/app/crud.py`, rolar até `criar_atribuicao`
e `baixar_equipamento`.

**Fala:**
> Por trás, cada ação de status passa pela camada de regra de negócio —
> só dá pra atribuir um equipamento disponível, só dá pra dar baixa se ele
> não estiver em uso. O FastAPI expõe isso como rotas, mas a regra em si
> não depende do framework.

**Ação (opcional):** abrir `frontend/equipamento-detalhe.js`, rolar até
`renderAtividade`, apontar que a timeline é só front-end combinando os
mesmos endpoints de atribuições e manutenções.

---

## 5:20 – 5:45 — Testes e fechamento

**Tela:** terminal.

**Ação:** rodar
```
./EXECUTE-AQUI.sh test
```

**Fala:**
> E pra fechar, os testes automatizados — 70 no total, cobrindo o ciclo
> completo de atribuição e manutenção, as regras de bloqueio, e a
> permissão por papel.

**Tela:** parado no resultado `70 passed`.

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
- Se o vídeo ficar longo demais, o trecho de código (4:45–5:20) é o mais
  fácil de cortar sem perder a demonstração funcional.
