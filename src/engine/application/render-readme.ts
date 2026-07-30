import katex from "katex";
import { marked } from "marked";
import "katex/dist/katex.min.css";

export function renderReadme(source: string): string {
  const formulas: string[] = [];
  const protect = (
    expression: string,
    displayMode: boolean,
  ): string => {
    const index = formulas.push(
      katex.renderToString(expression.trim(), {
        displayMode,
        throwOnError: false,
        strict: false,
      }),
    ) - 1;
    return displayMode
      ? `<div data-readme-math="${index}"></div>`
      : `<span data-readme-math="${index}"></span>`;
  };

  const protectedSource = source
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) =>
      protect(expression, true),
    )
    .replace(/\\\((.+?)\\\)/g, (_match, expression: string) =>
      protect(expression, false),
    );
  let html = marked.parse(protectedSource, { async: false }) as string;

  html = html.replace(
    /<(?:div|span) data-readme-math="(\d+)"><\/(?:div|span)>/g,
    (_match, index: string) => formulas[Number(index)] ?? "",
  );
  return html;
}
