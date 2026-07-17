import ReactMarkdown from "react-markdown";

/**
 * Renderiza os .md de políticas (packages/policies) com o tema do painel.
 *
 * O mapeamento é explícito porque o projeto não usa @tailwindcss/typography —
 * cobre o subconjunto de markdown que os textos legais usam (títulos,
 * parágrafos, listas, ênfase, links). Ver packages/policies/README.md.
 */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 mb-3 text-lg font-semibold tracking-tight text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 mb-2 text-base font-semibold text-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-xs text-muted-foreground/80">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="font-medium text-primary underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-8 border-border" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
