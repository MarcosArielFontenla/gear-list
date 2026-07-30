import axe from "axe-core";

export async function getAccessibilityViolations(container: Element) {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": {
        enabled: false,
      },
    },
  });

  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.flatMap((node) => node.target),
  }));
}
