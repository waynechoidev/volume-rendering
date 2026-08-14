import { describe, expect, it } from "vitest";

import { renderReadme } from "@/engine/application/render-readme";

describe("renderReadme", () => {
  it("renders dollar-delimited inline and display math", () => {
    const html = renderReadme(
      "Inline $x^2$ math.\n\n$$\\int_0^1 x\\,dx$$",
    );

    expect(html).toContain("katex");
    expect(html).toContain("katex-display");
    expect(html).not.toContain("$x^2$");
  });

  it("does not interpret dollar signs inside Markdown code", () => {
    const html = renderReadme(
      "`$inline_code$`\n\n```wgsl\nlet value = \"$fenced_code$\";\n```",
    );

    expect(html).toContain("$inline_code$");
    expect(html).toContain("$fenced_code$");
    expect(html.match(/katex/g)).toBeNull();
  });
});
