# Elencos e inscrições por categoria

## Modelo canônico

- `teams`: seleção/equipe.
- `athletes`: identidade do atleta, gênero e equipe-base.
- `athlete_registrations`: vínculo do atleta com uma categoria e perfil LetzPlay.

Um atleta pode estar em várias categorias, mas não deve ganhar linhas duplicadas em `athletes` por isso.

## Cadastro ou correção

1. Pesquise nome exato e variações antes de criar atleta.
2. Confirme a equipe e as inscrições existentes.
3. Quando o atleta não existir, insira em `athletes` com gênero confirmado pela fonte; não infira gênero se houver ambiguidade.
4. Faça `upsert` em `athlete_registrations` pelo par `(athlete_id, category_name)`.
5. Atualize `team_id`, `team_name`, perfil LetzPlay e `updated_at` no conflito.
6. Preserve outras categorias já vinculadas ao mesmo atleta.

Use URLs de membro/perfil fornecidas como referência. Links de cobrança, telefone e camiseta não pertencem ao seletor do capitão e não devem ser persistidos sem pedido específico.

## Regra do app do capitão

Para um confronto, monte as opções somente com inscrições que satisfaçam:

```text
registration.team_id == captain.team_id
registration.category_name == match.category_name
registration.athlete_id == athlete.id
```

Nunca inclua atletas sem inscrição na categoria e nunca retorne o elenco completo quando houver poucos atletas.

## Validação

- Liste os atletas resultantes da equipe/categoria com gênero e perfil.
- Confirme que não há nomes duplicados nem IDs de outra equipe.
- Conte femininos e masculinos segundo a necessidade da escalação.
- Informe categorias com menos atletas do que o formato exige; não complete com atletas de outra categoria.
