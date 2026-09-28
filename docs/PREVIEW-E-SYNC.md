# Previews e sincronização do Forms Urban

## Preview de pull request

O Coolify cria um container de preview separado da aplicação de produção e remove o preview automático quando o pull request é fechado ou integrado. Isso não isola bancos externos nem arquivos enviados: a separação precisa ser configurada.

1. Em **Configuration > Advanced > Deployment**, habilite **Preview Deployments**.
2. Confirme que o GitHub App da VPS tem permissão para pull requests e recebe eventos de pull request.
3. Use o template de domínio `form-pr-{{pr_id}}.grupourban.cloud`; confirme o wildcard DNS e o certificado HTTPS antes de divulgar o endereço.
4. Deixe **Allow Public PR Deployments** desligado. Builds de preview executam o Dockerfile do pull request e precisam do BuildKit secret `GITHUB_TOKEN` para obter o design system privado; revise alterações ao Dockerfile e aceite previews apenas de contribuidores confiáveis.
5. Configure o grupo **Preview Deployment Environment Variables** separadamente de Production. Variáveis de preview são compartilhadas pelos previews daquele app, então não as trate como configuração única por pull request.

Variáveis mínimas do preview:

Como o grupo de Preview é compartilhado entre os PRs, valide que `$COOLIFY_URL` muda para a URL do preview atual. Se não resolver dinamicamente, mantenha só um preview ativo por vez e atualize manualmente `APP_HOMEPAGE_URL` e `CORS_ALLOWED_ORIGINS` antes de testar cada PR.

| Variável | Configuração de preview |
| --- | --- |
| `APP_HOMEPAGE_URL` | Use `$COOLIFY_URL` se esta versão do Coolify resolver a URL própria de cada preview; confirme o valor no container antes do primeiro teste |
| `CORS_ALLOWED_ORIGINS` | A mesma URL resolvida para `APP_HOMEPAGE_URL` |
| `MONGO_URI`, `MONGO_USER`, `MONGO_PASSWORD` | Banco MongoDB de teste, separado de Production |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_DB` | Redis de teste separado de Production |
| `SESSION_KEY`, `FORM_ENCRYPTION_KEY` | Segredos exclusivos de Preview, estáveis entre redeploys de preview |
| `APP_DISABLE_REGISTRATION` | Preferencialmente `true`; use um acesso de revisão controlado |
| `VERIFY_USER_EMAIL` | `false` se não houver um SMTP de sandbox |
| `SMTP_*` | Nunca reutilize credenciais de Production; use um sandbox se algum teste precisar enviar e-mail |

O domínio do preview é acessível pela internet se não houver uma camada de acesso adicional. Desligar previews públicos impede contribuidores externos de dispararem builds; isso, por si só, não protege a URL da aplicação. Até existir uma barreira de acesso validada, não abra cadastros públicos nem coloque dados reais no preview.

Cada boot roda `migrate:seed`. Se vários PRs compartilharem o mesmo banco de teste, os dados e as migrações também serão compartilhados; execute um preview por vez ou crie recursos de banco isolados quando precisar de concorrência. O volume de uploads e qualquer storage externo também devem ser de teste. Excluir um preview não apaga automaticamente dados guardados em serviços externos; remova os dados de teste ao encerrar a rodada.

## Sincronização de código

O deploy não sincroniza automaticamente o fork com o HeyForm original. Para incorporar atualizações do `upstream`, busque e revise os commits primeiro:

```powershell
git fetch upstream
git log --oneline next..upstream/next
```

Integre apenas as mudanças necessárias em uma branch de trabalho, execute as verificações do projeto e envie a branch ao fork `origin` para revisão em pull request. Depois de integrar ao `next`, faça o deploy manual no Coolify. Nunca envie commits diretamente para `upstream`.

## Sincronizações de dados

O Forms não tem neste momento um worker de sincronização externa ou uma tarefa agendada a desligar no preview. Não adicione `SYNC_DESLIGADO` sem implementar primeiro um fluxo de sync que precise dessa guarda. O servidor usa Redis para filas internas; por isso o Redis de Preview deve ser isolado do Redis de produção, mesmo sem tarefa de sincronização periódica.

## Ciclo de validação

1. Abra ou atualize um pull request feito por pessoa autorizada.
2. Confirme que o Coolify criou um preview com domínio HTTPS e variáveis de Preview.
3. Confira `/health` e `/health/ready`, depois teste os fluxos previstos no pull request.
4. Não use respostas, contas, e-mails ou uploads de produção.
5. Ao integrar ou fechar o pull request, confirme a remoção do container automático e limpe dados persistentes de teste quando necessário.

## Referências

- [Coolify: Preview Deployments](https://coolify.io/docs/applications/deployments/preview-deployments)
- [Coolify: variáveis de ambiente](https://coolify.io/docs/applications/configuration/environment-variables)
- [Coolify: GitHub Preview Deployments](https://coolify.io/docs/applications/sources/github/preview-deploy)
