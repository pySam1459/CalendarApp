module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: "standard",
  rules: {
    semi: [2, "always"],
    quotes: ["error", "double"],
    indent: "off"
  },
  parserOptions: {
    ecmaVersion: 12
  }
};
