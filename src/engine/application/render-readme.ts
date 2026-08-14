import katex from "katex";
import { marked } from "marked";
import "katex/dist/katex.min.css";

export function renderReadme(source: string): string {
  const formulas: string[] = [];
  const codeSegments: string[] = [];
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

  const protectCode = (code: string): string => {
    const index = codeSegments.push(code) - 1;
    return `README_CODE_${index}_TOKEN`;
  };

  const protectedCode = source
    .replace(
      /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm,
      (code) => protectCode(code),
    )
    .replace(/(`+)([^\n]*?)\1/g, (code) => protectCode(code));

  const protectedMath = protectedCode
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, expression: string) =>
      protect(expression, true),
    )
    .replace(
      /(^|[^\\$])\$([^$\n]+?)\$(?!\$)/gm,
      (_match, prefix: string, expression: string) =>
        `${prefix}${protect(expression, false)}`,
    );
  const protectedSource = protectedMath.replace(
    /README_CODE_(\d+)_TOKEN/g,
    (_match, index: string) => codeSegments[Number(index)] ?? "",
  );
  let html = marked.parse(protectedSource, { async: false }) as string;

  html = html.replace(
    /<(?:div|span) data-readme-math="(\d+)"><\/(?:div|span)>/g,
    (_match, index: string) => formulas[Number(index)] ?? "",
  );
  return html;
}
