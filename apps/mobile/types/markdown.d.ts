// Arquivos .md são inlinados como string pelo babel-plugin-inline-import
// (ver babel.config.js).
declare module "*.md" {
  const content: string
  export default content
}
