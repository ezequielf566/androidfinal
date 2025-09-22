LOGIN WHITELIST
================
Este pacote usa validação por whitelist.

Edite o arquivo 'script.js' e altere o array AUTORIZADOS para os Gmails que podem acessar o app.

Exemplo:
const AUTORIZADOS = [
  "cliente1@gmail.com",
  "cliente2@gmail.com"
];

Fluxo:
- Se o e-mail estiver na lista -> abre index.html
- Se não estiver -> mostra '❌ Gmail não encontrado, vá para o checkout!'

A opção 'Lembrar acesso' salva o e-mail localmente, mas NÃO libera acesso se não estiver autorizado.
