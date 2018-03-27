module.exports = {
    "env": {
        "node": true,
        "browser": false,
        "commonjs": true,
        "jest": true,
        "es6": true
    },
    "extends": [
      "eslint:recommended",
      "airbnb-base"
    ],
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2017,
    },
    "rules": {
        "no-console": "off",
        "indent": [
            "error",
            "tab"
        ],
        "no-tabs": 0,
        "prefer-destructuring": 0,
        "no-param-reassign": 0,
        "no-use-before-define": 0,
        "object-shorthand": 0,
        "arrow-body-style": [
            1,
            "always"
        ],
        "space-before-function-paren": [
          2,
          {
            "anonymous": "always",
            "named": "never"
          }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};