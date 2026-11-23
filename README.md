# Diário do Prato

Diário de refeições em português, numa página HTML única, sem etapa de build.

## O que o app faz

- **Diário do dia:** meta diária de calorias, anel com o total do dia, barras de proteína, carboidrato e gordura, lista de refeições e gráfico dos últimos 7 dias.
- **Adicionar comida de três jeitos:**
  - **Foto do prato:** o Claude identifica os alimentos, estima as porções e liga cada item à Tabela TACO.
  - **Código de barras:** leitura pela câmera (BarcodeDetector do navegador ou ZXing) e busca numa cópia local do Open Food Facts. Se o produto não estiver lá, você fotografa a tabela nutricional e o Claude lê os valores.
  - **Busca na Tabela TACO:** 597 alimentos com valores por 100 g.
- **Receitas:** ingredientes com medidas caseiras (xícara, colher, unidade), calorias da receita inteira e por porção, e adição de porções às refeições.

## Onde ele funciona

A versão completa é o artifact no Claude, onde o app usa os recursos do Claude (`window.claude.use("sample" | "db" | "user")`) para analisar fotos e guardar os dados na sua conta.

Fora do Claude (por exemplo, no GitHub Pages ou num servidor local), a análise de fotos usa o Gemini quando você está logado e a chave está configurada (veja abaixo); sem login no Supabase, não há análise de fotos. A busca na TACO, o código de barras (lido pela câmera ou digitado) e o cálculo manual de receitas continuam funcionando. Onde os dados ficam depende do `config.js`:

- **Com `config.js` (padrão deste repositório):** o app pede login com e-mail e senha e guarda tudo num banco **Supabase** (Postgres). O diário fica igual em qualquer aparelho em que você entrar.
- **Sem `config.js`:** o app entra em **modo local**, e os registros ficam só no navegador (`localStorage`).

### Análise de fotos fora do Claude (Gemini)

Com login, a versão do GitHub Pages analisa a foto do prato, o rótulo e a receita escrita com o **Gemini**, do Google. O app envia a foto para a função `analisar` do Supabase ([`supabase/functions/analisar/index.ts`](supabase/functions/analisar/index.ts)). A função confere o login e chama a API do Gemini com a chave guardada no servidor, que nunca aparece no site.

Configuração (uma vez):
1. Crie uma chave em [aistudio.google.com](https://aistudio.google.com/apikey).
2. No painel do Supabase, em **Edge Functions → Secrets**, crie o secret `GEMINI_API_KEY` com essa chave.
3. Opcional: o secret `GEMINI_MODEL` troca o modelo (o padrão é `gemini-flash-latest`).

Sem a chave, o app avisa que a análise ainda não foi configurada.

### Banco de dados (Supabase)

Tabelas no schema `public`, todas com RLS (Row Level Security). Cada conta só lê e altera as linhas com o próprio `user_id`, e visitantes sem login não acessam nada:

| tabela     | conteúdo                                                                 |
|------------|--------------------------------------------------------------------------|
| `meals`    | refeições: data, tipo, prato, kcal, macros, itens (jsonb) e miniatura    |
| `recipes`  | receitas: ingredientes (jsonb), porções, peso pronto, preparo, foto      |
| `products` | produtos lidos do rótulo, por código de barras                           |
| `settings` | meta diária de calorias                                                  |

A chave que está no `config.js` é a *publishable key* do Supabase. Ela foi feita para ficar no navegador e pode ser pública, porque quem protege os dados é o login junto com o RLS. Nunca coloque a *secret key* (ou `service_role`) neste repositório.

Para testar localmente:

```bash
python3 -m http.server 8000
```

e abra <http://localhost:8000>. Abrir o arquivo direto (`file://`) não funciona, porque o navegador bloqueia o carregamento dos arquivos de dados.

## Estrutura

```
index.html                    o app inteiro (HTML, CSS e JavaScript)
config.js                     endereço e chave pública do Supabase (apague para usar o modo local)
img/*.png                     ilustrações em giz pastel oleoso desenhadas pela autora (fundo transparente)
data/taco.json                Tabela TACO: 597 linhas
                              [id, nome, categoria, kcal, proteína, carbo, gordura, fibra, sódio_mg] por 100 g
data/off/00.json … 99.json    Open Food Facts (≈29,5 mil produtos vendidos no Brasil),
                              divididos pelos 2 últimos dígitos do código de barras:
                              código → [nome, marca, kcal, p, c, g, porção_g, porção_desc] por 100 g
data/LICENSE-tabela_taco.txt  licença MIT da conversão da TACO
```

## Fontes e licenças

- **Tabela TACO**, 4ª edição revisada e ampliada (NEPA/Unicamp). Convertida para JSON pelo projeto [marcelosanto/tabela_taco](https://github.com/marcelosanto/tabela_taco), licença MIT. Cópia da licença em [`data/LICENSE-tabela_taco.txt`](data/LICENSE-tabela_taco.txt).
- **Open Food Facts** ([openfoodfacts.org](https://world.openfoodfacts.org)): cópia de novembro de 2026 dos produtos com `en:brazil` em `countries_tags`. Base de dados sob a [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/); conteúdo dos registros sob a [Database Contents License](https://opendatacommons.org/licenses/dbcl/1-0/). Os arquivos em `data/off/` são uma base derivada e seguem a ODbL.
- **ZXing** ([zxing-js/library](https://github.com/zxing-js/library), Apache 2.0): leitura de código de barras, carregado do jsDelivr quando o navegador não tem `BarcodeDetector`.
- **supabase-js** ([supabase/supabase-js](https://github.com/supabase/supabase-js), MIT): carregado do jsDelivr só quando o `config.js` existe.
- Fontes tipográficas Montserrat e Caveat Brush, via Google Fonts (SIL Open Font License).
- **Ilustrações** (`img/`): desenhadas pela autora do projeto. Todos os direitos reservados; não estão cobertas por nenhuma licença aberta.

## Aviso

As calorias e os macronutrientes são **estimativas**. Porções, óleo e molhos estimados por foto podem variar bastante, e os dados de produtos vêm de uma base colaborativa. O app não substitui a orientação de um nutricionista.
