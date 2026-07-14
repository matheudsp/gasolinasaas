/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Importa arquivos .md como string no bundle — usado pelas telas de
      // políticas (Termos de Uso, Privacidade...). Editar o .md e recarregar
      // o Metro atualiza o conteúdo (às vezes exige `expo start -c`).
      ["inline-import", { extensions: [".md"] }],
    ],
  }
}
