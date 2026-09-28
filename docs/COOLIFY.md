# Publicar o Forms Grupo Urban no Coolify

Este guia prepara a primeira implantação manual do Forms Urban na VPS do Grupo Urban, sem SMTP. O formulário público ficará acessível pela internet; MongoDB e Redis devem permanecer na rede privada do Coolify. Primeiro colocaremos a plataforma no ar, criaremos uma conta administrativa, fecharemos novos cadastros e testaremos com dados fictícios. A configuração de e-mail fica para depois das considerações de Rafael.

## Pré-requisitos

1. O domínio confirmado para a aplicação é `form.grupourban.cloud`. O DNS wildcard da VPS já aponta subdomínios para a VPS e uma consulta em 2026-09-28 confirmou que esse host resolve para ela; confira novamente no hPanel antes do deploy. Não é necessário criar um registro próprio se a resolução continuar correta.
2. A VPS tem espaço para a aplicação. Crie MongoDB e Redis dedicados ao Forms no mesmo servidor Coolify, com volumes persistentes e sem publicar as portas dos bancos; não reutilize o banco de outro produto.
3. Use as URLs/hosts internos indicados pelo Coolify e confirme que o app e os bancos compartilham uma rede Docker acessível.
4. Confirme que o GitHub App `rafastos-urban` pode clonar `rafastos-io/heyform`.
5. O build instala `@urban/design-system` do repositório privado `rafastos-io/Urban-Design-System`. Crie um token Fine-grained com somente leitura de Contents para esse repositório e cadastre-o como segredo de build `GITHUB_TOKEN`.
6. As alterações locais no `Dockerfile` e nos guias precisam estar na branch `next` do fork `origin` para o Coolify compilá-las. Envie somente os arquivos do produto; deixe `AGENTS.md` e `PDF/` fora do commit.

O `Dockerfile` lê `GITHUB_TOKEN` por um BuildKit secret durante `pnpm fetch`; o valor não deve ser usado como argumento de build nem como variável de runtime. No Coolify, habilite **Build**, desabilite **Runtime** e marque **Use Docker Build Secrets**. Builds de preview também precisam do segredo no escopo de build de Preview. O workflow de publicação de imagem é herdado do HeyForm e continua apontando para a imagem `heyform/community-edition`; não publique tags por esse workflow até revisar o destino e configurar o secret de leitura do design system.

Cadastre o token no app Coolify em **Configuration > Environment Variables** como `GITHUB_TOKEN`, com **Build Variable** ligado e **Runtime Variable** desligado; marque **Use Docker Build Secrets** para o build. O token fica disponível às instruções de build, sem integrar a imagem final. Restrinja previews a contribuidores confiáveis, mantenha **Allow Public PR Deployments** desligado e revise alterações no `Dockerfile` antes de disparar preview. Não use um token amplo de conta pessoal.

## Criar os bancos dedicados

No projeto `Forms Urban` e servidor da VPS, crie os recursos **MongoDB** e **Redis** pelo Coolify antes da aplicação. Mantenha o armazenamento persistente padrão e as portas privadas. Copie para o gerenciador de senhas e Coolify apenas os dados necessários; a URI e credenciais não entram neste repositório.

- MongoDB: use a **Internal URL** do recurso para montar `MONGO_URI` com banco `heyform`; preencha `MONGO_USER` e `MONGO_PASSWORD` nos campos separados. O exemplo de URI no painel pode exigir `authSource=admin`; siga o recurso que o Coolify gerar.
- Redis: use o host/porta internos e preencha `REDIS_USERNAME`/`REDIS_PASSWORD` se o recurso habilitar autenticação. Use `REDIS_DB=0`.
- Confirme que app, MongoDB e Redis estão no mesmo servidor/destino e conectados à mesma rede privada. Não use endereço público nem habilite **Public Port**.

## Criar a aplicação

No projeto `Forms Urban`, ambiente `production`, crie uma aplicação **Private Repository (with GitHub App)**:

- Repositório: `rafastos-io/heyform`.
- Branch: `next`.
- Build Pack: **Dockerfile**.
- Base Directory: `/`.
- Dockerfile Location: `/Dockerfile`.
- Ports Exposes: `9157`.
- Domínio: `https://form.grupourban.cloud`.
- Build secret: `GITHUB_TOKEN` conforme os pré-requisitos.

O proxy do Coolify encaminha HTTPS para a porta interna `9157`. Não crie um mapeamento de porta pública para o container.

## Variáveis de runtime

Cadastre as variáveis abaixo no grupo **Production** do app. Os valores entre `<...>` são campos a preencher diretamente no Coolify; não os grave neste repositório.

| Variável | Configuração |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_HOMEPAGE_URL` | `https://form.grupourban.cloud` |
| `CORS_ALLOWED_ORIGINS` | `https://form.grupourban.cloud` |
| `TRUST_PROXY` | `1` para o proxy reverso direto do Coolify |
| `MONGO_URI` | URI interna do MongoDB, por exemplo `mongodb://<host>:27017/heyform?authSource=admin` |
| `MONGO_USER` / `MONGO_PASSWORD` | Credenciais próprias do banco; deixe fora da URI |
| `REDIS_HOST` / `REDIS_PORT` | Host interno e porta interna do Redis, normalmente `6379` |
| `REDIS_USERNAME` / `REDIS_PASSWORD` | Credenciais próprias do Redis, se configuradas |
| `REDIS_DB` | `0` |
| `SESSION_KEY` | Segredo aleatório e exclusivo desta instalação |
| `FORM_ENCRYPTION_KEY` | Outro segredo aleatório e exclusivo desta instalação |
| `ENABLE_GOOGLE_FONTS` | `false` |
| `VERIFY_USER_EMAIL` | `false` durante a etapa sem SMTP |
| `APP_DISABLE_REGISTRATION` | `false` durante o primeiro cadastro; depois, mudar para `true` |

**Não configure `SMTP_*` neste deploy.** O padrão de `VERIFY_USER_EMAIL` no servidor é `true`, por isso grave explicitamente `false`; com isso a conta inicial já é verificada e o cadastro não tenta enviar e-mail. Enquanto o SMTP ficar desligado, recuperação de senha por e-mail, convites e alertas/notificações por e-mail não estarão disponíveis. Use uma senha administrativa exclusiva e guarde-a no gerenciador de senhas.

Gere `SESSION_KEY` e `FORM_ENCRYPTION_KEY` separadamente em um gerenciador de senhas ou gerador confiável. Não reutilize valores locais. Preserve ambos entre deploys: trocar `SESSION_KEY` encerra sessões e trocar `FORM_ENCRYPTION_KEY` pode impedir a leitura de dados cifrados existentes.

O hostname do MongoDB e do Redis pode ter um formato diferente do exemplo. Use os endereços internos indicados pelos recursos do Coolify e confirme que os serviços compartilham uma rede Docker acessível pelo app. Se os bancos não exigirem autenticação, não invente valores de usuário ou senha.

## E-mail — etapa posterior

Deixe esta seção para depois dos testes do Forms e das considerações de Rafael. Nesta primeira publicação não escolha nem configure provedor, remetente ou credencial SMTP. As notas abaixo ficam como referência para uma etapa futura.

O SMTP é o canal de saída de e-mails do Forms: verificação e recuperação de conta, convites de equipe, alertas de segurança, exportações e aviso ao responsável do formulário quando chega uma resposta. Esse aviso vai ao e-mail do proprietário do formulário; a confirmação visual que o respondente vê após enviar é configurada no próprio formulário. O SMTP ficará sem configuração nesta primeira implantação.

Rafael já tem uma conta Resend, mas informou que a configuração atual não funciona. Não vamos investigá-la nem alterar e-mail agora. Após a publicação, os testes e as considerações de Rafael, retomaremos o envio e preservaremos os registros MX atuais do domínio raiz; qualquer registro novo será revisado pelo hostname específico que o provedor solicitar.

Quando o e-mail voltar ao escopo, configure o SMTP no Coolify antes de ativar `VERIFY_USER_EMAIL=true`. Os nomes abaixo são os campos usados pelo servidor:

| Variável | Configuração |
| --- | --- |
| `SMTP_FROM` | Nome Forms Grupo Urban e endereço remetente aprovado pelo provedor |
| `SMTP_HOST` | Host SMTP informado pelo provedor |
| `SMTP_PORT` | Porta informada pelo provedor |
| `SMTP_USER` / `SMTP_PASSWORD` | Credenciais SMTP administradas no Coolify |
| `SMTP_SECURE` | `true` para TLS implícito (normalmente porta `465`); `false` para STARTTLS (normalmente `587`) |
| `SMTP_SERVERNAME` | Opcional; nome TLS se o host configurado for um IP ou exigir SNI diferente |
| `SMTP_IGNORE_CERT` | `false`; não desligue a validação de certificado em produção |

Crie uma credencial SMTP separada, restrita ao envio, ative MFA na conta do provedor e guarde a credencial somente nas variáveis de runtime do Coolify. Nunca a envie pelo chat nem a copie para `.env`, documentação, logs ou CENTRAL. Use credenciais diferentes em Preview e Production. Como o aviso de envio leva as respostas completas do formulário no corpo do e-mail, limite os campos a dados adequados para e-mail e considere a retenção e localização dos dados no serviço escolhido. Depois de publicar os registros pedidos pelo provedor, envie uma mensagem para uma caixa controlada pelo Grupo Urban e confira autenticação SPF/DKIM/DMARC, recebimento e remetente; só então ative `VERIFY_USER_EMAIL=true` e teste cadastro e recuperação de senha. Para SMTP, a combinação porta/TLS deve seguir a orientação do provedor.

## Saúde e arquivos enviados

Em **Configuration > Healthcheck**, escolha **HTTP**, método `GET`, host `localhost`, porta `9157` e path `/health/ready`. Configure intervalo `30s`, timeout `5s`, retries `3` e start period `180s` para acomodar a primeira inicialização e as migrações. A rota só retorna sucesso quando MongoDB e Redis respondem; a imagem instala `curl` para o healthcheck configurado no Coolify. Coolify executa o teste de dentro do container e precisa de `curl` ou `wget` na imagem final.

Em **Configuration > Persistent Storage**, adicione um volume com Destination Path:

```text
/app/packages/server/static/upload
```

Esse é o diretório de uploads. Os volumes dos bancos também precisam ser persistentes. Volume não substitui backup: configure e teste backups do banco e dos uploads antes de guardar respostas reais.

## Primeiro deploy e validação

1. Salve configuração de banco, domínio, build secret, variáveis e armazenamento persistente. Confirme que nenhum segredo foi cadastrado como argumento de build ou `SMTP_*`.
2. Faça **Deploy** manualmente e acompanhe os logs. Se o build falhar ao instalar `Urban-Design-System`, revise o token e o uso de Docker BuildKit secrets sem imprimir o token.
3. Aguarde **Healthy** e abra `https://form.grupourban.cloud/health` e `https://form.grupourban.cloud/health/ready`.
4. Crie a conta administrativa com `APP_DISABLE_REGISTRATION=false` e `VERIFY_USER_EMAIL=false`; o login deve acontecer sem envio de e-mail.
5. Mude `APP_DISABLE_REGISTRATION=true` e redeploye imediatamente. Isso fecha novos cadastros da plataforma; os formulários públicos ainda podem receber respostas.
6. Com dados fictícios, teste login, criação/publicação de formulário, resposta anônima, persistência da resposta no painel, upload e visualização em desktop/celular. Faça um redeploy de teste e confirme que respostas e uploads continuam presentes.
7. Se algo falhar, pare nos logs e healthchecks, corrija antes de usar dados reais. Configure e teste backup de MongoDB e uploads antes de migrar formulários reais ou ligar tracking de campanhas Meta.

## Operação

O `prestart` executa `migrate:seed` em cada boot. Preserve volumes e segredos entre deploys. A branch de produção é `next`; qualquer atualização de código deve entrar pelo fork `origin`, nunca por push ao `upstream`. A implantação inicial é manual. Configure auto deploy somente depois de confirmar o comportamento operacional e a separação entre Production e Preview.

## Referências

- [Coolify: Dockerfile](https://coolify.io/docs/applications/builds/dockerfile)
- [Coolify: variáveis de ambiente](https://coolify.io/docs/applications/configuration/environment-variables)
- [Coolify: healthchecks](https://coolify.io/docs/applications/configuration/health-checks)
- [Coolify: armazenamento persistente](https://coolify.io/docs/applications/configuration/persistent-storage)
- [Docker: build secrets](https://docs.docker.com/build/building/secrets/)
- [Nodemailer: SMTP e TLS](https://nodemailer.com/smtp)
