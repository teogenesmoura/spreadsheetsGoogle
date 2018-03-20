# Visualização de dados com Google Spreadsheets

[![npm](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://www.npmjs.com/package/npm) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/your/your-project/blob/master/LICENSE)

![Spreadsheet](https://i.imgur.com/1nWhycw.png)

Este repositório compõe projeto de pesquisa com foco empírico nas eleições brasileiras de 2018 do grupo de pesquisa [Resocie](http://resocie.org) do [Instituto de Ciência Política - IPOL](http://ipol.unb.br/) com o apoio técnico do [Departamento de Computação - CIC](http://www.cic.unb.br/) da [Universidade de Brasília - UnB](http://unb.br).

O projeto consiste na coleta sistemática de informações quantitativas da plataforma Twitter com o objetivo de subsidiar a análise do comportamento político de alguns atores da cena eleitoral durante o período de campanha. Além de seu objetivo finalístico para a coleta de dados, o projeto tem também por intuito servir de material de estudo dos alunos da disciplina Engenharia de Software do Departamento de Ciência da Computação da UnB no 1º semestre de 2018. 

As instruções a seguir trazem orientações para aqueles que quiserem contribuir com a iniciativa.

## Instalação

O primeiro passo para executar o código deste repositório consiste em clona-lo localmente.

```shell
git clone https://github.com/teogenesmoura/spreadsheetsGoogle.git
```

Logo após, precisamos instalar as dependências do projeto. No seu terminal, 
digite o seguinte comando:

```shell
npm install
```

Após a instalação das dependências e a escrita do arquivo de credenciais (visite a seção "Prerequisitos"), execute o projeto com:

```shell
node index.js
```

O projeto estará rodando em 

```shell
http://localhost:3000
```

## Desenvolvimento

### Ferramentas
Este projeto usa principalmente, mas não exclusivamente:

Javascript ES6

Node JS

Express js

googleapis

Chart JS

### Prerequisitos

Note que este projeto utiliza a biblioteca [chartjs-node](https://github.com/vmpowerio/chartjs-node), que requer a instalação da biblioteca Cairo previamente no seu sistema. Mais informações podem ser encontradas no link anterior.

Para que o programa execute, é necessária a obtenção da chave de autenticação da API do Google. Deverá, então, ser criado um arquivo chamado "credentials.json" na pasta raíz do projeto, cujo conteúdo se assemelha ao seguinte:

```javascript
{
  "web":{
  "client_id":"SEU_CLIENT_ID",
  "project_id":"SEU_ID_DE_PROJETO",
  "auth_uri":"https://accounts.google.com/o/oauth2/auth",
  "token_uri":"https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
  "client_secret":"SUA_CHAVE_DE_CLIENTE",
    "redirect_uris": [
      "http://localhost:3000"
    ]
  }
}
```

Para conseguir as credenciais *client_id* e *client_secret*, acesse o [Console de Desenvolvedores](https://console.developer.google.com/). Selecione o seu projeto, clique em *APIs & auth* e em seguida em *credentials*. 
Mais informações de como funciona a autenticação em Oauth2 das APIs do Google podem ser encontradas no seguinte link:

[Google API Node JS Client](https://github.com/google/google-api-nodejs-client#authorizing-and-authenticating)


## Versionamento

Sugere-se usar o [SemVer](http://semver.org/) para o versionamento do código.
A versão atual é 1.0.0


## Testes

O projeto utiliza a biblioteca [Jest](https://facebook.github.io/jest/) para executar testes. O seguinte comando roda os testes de caso implementados:

```shell
npm test
```

## Guia de estilo

O código conta com duas camadas de estilo: A provida pelo comando
*"use strict"* do próprio Javascript e a biblioteca [Eslint](https://eslint.org/), com as configurações presentes no arquivo *".eslintrc.js"* para manter boas práticas de programação. 

Para executar o eslint, instale globalmente a biblioteca com:

```shell
npm install eslint --save-dev
```

Então, execute o linter com o seguinte comando:

```shell
eslint controllers/spreadsheets.js
```

Este comando analisará somente o arquivo *"controllers/spreadsheet.js"*. Para analisar toda a pasta, use o seguinte comando:

```shell
eslint ./
```

## Documentação

Este projeto usa a biblioteca [JSDoc](https://github.com/jsdoc3/jsdoc) para gerar a documentação automaticamente. 

Para instalar globalmente o JSDoc, execute o seguinte comando:

```shell
npm install -g jsdoc
```

Para instalar localmente,

```shell
npm install --save-dev jsdoc
```

A documentação corrente do projeto já está presente na pasta */docs*, bastando que se abra o arquivo *index.html* para acessar a documentação do projeto.

Para gerar a documentação de um arquivo, execute o seguinte comando:

```shell
jsdoc index.js -d docs
```

Este comando gerará a documentação para o arquivo index.js na pasta */docs*.

## ToDo

Este é apenas um esqueleto de projeto para que o grupo comece a trabalhar. Resta ainda muito trabalho a ser feito. Algumas ideias: 

* Implementar mais casos de teste unitário
* Implementar testes de comportamento (BDD)
* Gerar mais de um gráfico
* Incluir mecanismo de logging
* Expandir quantidade dos dados utilizados
* Pesar o custo de gerar gráficos server-side e verificar se vale a pena fazê-lo no cliente
* Implementar mecanismo para automatização da coleta recorrente dos dados
* Persistir dados coletados em base estruturada
* Disponibilizar uma API publica para que leigos possam gerar visualizações interessantes

## Licença

Código disponível sob [Licença MIT](LICENSE)