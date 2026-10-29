const htmlInput = document.getElementById("html-input");
const runAuditButton = document.getElementById("run-audit");
const loadSampleButton = document.getElementById("load-sample");
const clearButton = document.getElementById("clear-html");
const auditMessage = document.getElementById("audit-message");

const issuesList = document.getElementById("issues-list");
const severityFilter = document.getElementById("severity-filter");
const downloadButton = document.getElementById("download-report");

const totalIssuesElement = document.getElementById("total-issues");
const errorCountElement = document.getElementById("error-count");
const warningCountElement = document.getElementById("warning-count");
const passedCountElement = document.getElementById("passed-count");
const findingsCountElement = document.getElementById("findings-count");

const foregroundInput = document.getElementById("foreground");
const backgroundInput = document.getElementById("background");
const foregroundHex = document.getElementById("foreground-hex");
const backgroundHex = document.getElementById("background-hex");
const contrastRatio = document.getElementById("contrast-ratio");
const contrastStatus = document.getElementById("contrast-status");
const normalResult = document.getElementById("normal-result");
const largeResult = document.getElementById("large-result");
const previewCard = document.getElementById("preview-card");
const previewButton = document.getElementById("preview-button");
const contrastMessage = document.getElementById("contrast-message");

document.getElementById("year").textContent = new Date().getFullYear();

const sampleHTML = `<html lang="en">
<head>
  <title>My Example Page</title>
</head>
<body>
  <h1>Welcome to my website</h1>
  <h3>About us</h3>

  <img src="team.jpg">

  <form>
    <input type="text" placeholder="Your name">
    <input type="email" id="email" placeholder="Email address">
    <button type="submit"></button>
  </form>

  <a href="/contact"><img src="contact.png" alt=""></a>
  <a href="/learn" target="_blank">Learn more</a>
</body>
</html>`;

let auditIssues = [];
let auditHasRun = false;
let checksPerformed = 0;

loadSampleButton.addEventListener("click", () => {
  htmlInput.value = sampleHTML;
  setAuditMessage("Sample HTML loaded. Run the audit to see the results.");
  htmlInput.focus();
});

clearButton.addEventListener("click", () => {
  htmlInput.value = "";
  auditIssues = [];
  auditHasRun = false;
  checksPerformed = 0;

  resetAuditResults();
  setAuditMessage("HTML input cleared.");
  htmlInput.focus();
});

function setAuditMessage(message, isError = false) {
  auditMessage.textContent = message;
  auditMessage.classList.toggle("error", isError);
}

function resetAuditResults() {
  totalIssuesElement.textContent = "—";
  errorCountElement.textContent = "—";
  warningCountElement.textContent = "—";
  passedCountElement.textContent = "—";
  findingsCountElement.textContent = "0";
  downloadButton.disabled = true;
  severityFilter.value = "all";

  issuesList.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "empty-results";

  const symbol = document.createElement("span");
  symbol.className = "empty-symbol";
  symbol.textContent = "⌕";
  symbol.setAttribute("aria-hidden", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Your results will appear here";

  const paragraph = document.createElement("p");
  paragraph.textContent =
    "Load the sample HTML or paste your own snippet, then run the audit.";

  empty.append(symbol, heading, paragraph);
  issuesList.append(empty);
}

function addIssue(severity, title, description, code, fix, reference) {
  auditIssues.push({
    severity,
    title,
    description,
    code,
    fix,
    reference
  });
}

function countCheck() {
  checksPerformed += 1;
}

function getAccessibleName(element, doc) {
  const ariaLabel = element.getAttribute("aria-label");

  if (ariaLabel && ariaLabel.trim()) {
    return true;
  }

  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy) {
    const hasLabelText = labelledBy
      .trim()
      .split(/\s+/)
      .some((id) => {
        const target = doc.getElementById(id);
        return target && target.textContent.trim();
      });

    if (hasLabelText) {
      return true;
    }
  }

  if (
    element.tagName === "INPUT" &&
    element.type === "image" &&
    element.getAttribute("alt")?.trim()
  ) {
    return true;
  }

  if (element.tagName === "IMG") {
    return Boolean(element.getAttribute("alt")?.trim());
  }

  if (element.tagName === "AREA") {
    return Boolean(element.getAttribute("alt")?.trim());
  }

  const title = element.getAttribute("title");

  if (title && title.trim()) {
    return true;
  }

  const text = element.textContent.trim();

  if (text) {
    return true;
  }

  // An image-only link can obtain its name from a child image.
  const childImages = element.querySelectorAll("img[alt]");

  if (
    ["A", "BUTTON"].includes(element.tagName) &&
    [...childImages].some((img) => img.getAttribute("alt").trim())
  ) {
    return true;
  }

  return false;
}

function hasAssociatedLabel(element, doc) {
  const id = element.getAttribute("id");

  if (id) {
    const labels = [...doc.querySelectorAll("label[for]")];

    if (
      labels.some(
        (label) =>
          label.htmlFor === id && label.textContent.trim().length > 0
      )
    ) {
      return true;
    }
  }

  const parentLabel = element.closest("label");

  if (parentLabel && parentLabel.textContent.trim()) {
    return true;
  }

  return getAccessibleName(element, doc);
}

function runAudit() {
  const source = htmlInput.value.trim();

  if (!source) {
    setAuditMessage("Please paste some HTML before running the audit.", true);
    htmlInput.focus();
    return;
  }

  auditIssues = [];
  checksPerformed = 0;
  auditHasRun = false;

  try {
    // Parse the supplied markup in a detached document.
    // Pasted scripts are not executed by DOMParser.
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, "text/html");

    // 1. Document language
    countCheck();

    const htmlElement = doc.documentElement;
    const lang = htmlElement.getAttribute("lang");

    if (!lang || !lang.trim()) {
      addIssue(
        "error",
        "Document language is missing",
        "Assistive technologies may use the wrong pronunciation rules.",
        "<html>",
        'Add an appropriate language attribute, for example: <html lang="en">.',
        "WCAG 3.1.1"
      );
    }

    // 2. Page title
    countCheck();

    if (!doc.querySelector("title")?.textContent.trim()) {
      addIssue(
        "warning",
        "Page title is missing",
        "A descriptive title helps users identify the page in browser tabs and assistive technology.",
        "<head>",
        "Add a meaningful <title>Page name</title> inside the document head.",
        "WCAG 2.4.2"
      );
    }

    // 3. Images need an alt attribute.
    // An empty alt is valid for decorative images.
    doc.querySelectorAll("img").forEach((img) => {
      countCheck();

      if (!img.hasAttribute("alt")) {
        addIssue(
          "error",
          "Image is missing an alt attribute",
          "Screen readers may not have an appropriate text alternative for this image.",
          img.outerHTML,
          'Add descriptive alt text, e.g. <img src="team.jpg" alt="Our team at work">. Use alt="" if the image is decorative.',
          "WCAG 1.1.1"
        );
      }
    });

    // 4. Form controls need an accessible label.
    doc.querySelectorAll("input, select, textarea").forEach((control) => {
      if (
        control.tagName === "INPUT" &&
        ["hidden", "submit", "reset", "button", "image"].includes(control.type)
      ) {
        return;
      }

      countCheck();

      if (!hasAssociatedLabel(control, doc)) {
        addIssue(
          "error",
          "Form control may not have an accessible label",
          "A placeholder alone is not a reliable replacement for a persistent label.",
          control.outerHTML,
          'Add a connected <label for="field-id"> or a suitable aria-label. Ensure the label describes the purpose.',
          "WCAG 1.3.1, 3.3.2, 4.1.2"
        );
      }
    });

    // 5. Buttons need an accessible name.
    doc.querySelectorAll("button").forEach((button) => {
      countCheck();

      if (!getAccessibleName(button, doc)) {
        addIssue(
          "error",
          "Button has no detectable accessible name",
          "A user may not know what this button does when using a screen reader.",
          button.outerHTML,
          'Add descriptive button text, e.g. <button type="button">Save changes</button>, or use aria-label.',
          "WCAG 4.1.2"
        );
      }
    });

    // 6. Links need an accessible name.
    doc.querySelectorAll("a[href], area[href]").forEach((link) => {
      countCheck();

      if (!getAccessibleName(link, doc)) {
        addIssue(
          "error",
          "Link has no detectable accessible name",
          "Users need to understand the purpose of a link.",
          link.outerHTML,
          "Add descriptive link text, or provide a meaningful text alternative for an image link.",
          "WCAG 2.4.4, 4.1.2"
        );
      }
    });

    // 7. Heading levels should not skip levels.
    const headings = [...doc.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    let previousLevel = 0;

    headings.forEach((heading) => {
      const level = Number(heading.tagName.substring(1));
      countCheck();

      if (previousLevel && level > previousLevel + 1) {
        addIssue(
          "warning",
          "Heading level may have been skipped",
          `The heading sequence jumps from H${previousLevel} to H${level}. Review the document outline.`,
          heading.outerHTML,
          "Use a logical heading hierarchy. Choose levels based on structure, not just visual size.",
          "WCAG 1.3.1"
        );
      }

      previousLevel = level;
    });

    // 8. Duplicate IDs can break labels and ARIA references.
    const seenIds = new Set();

    doc.querySelectorAll("[id]").forEach((element) => {
      const id = element.id;
      countCheck();

      if (seenIds.has(id)) {
        addIssue(
          "error",
          "Duplicate ID found",
          `The ID "${id}" appears more than once. Labels and ARIA references may target the wrong element.`,
          element.outerHTML,
          "Give each element a unique ID and update any associated for, href, or ARIA references.",
          "HTML conformance"
        );
      } else {
        seenIds.add(id);
      }
    });

    // 9. New-tab links should communicate the behavior.
    doc.querySelectorAll('a[target="_blank"]').forEach((link) => {
      countCheck();

      addIssue(
        "info",
        "Link opens a new tab",
        "Opening a new tab can surprise some users. Consider informing users when appropriate.",
        link.outerHTML,
        'If a new tab is necessary, explain it in the link text or an accessible description. Modern browsers generally provide implicit noopener behavior for target="_blank".',
        "Usability guidance"
      );
    });

    // 10. Iframes should have a title.
    doc.querySelectorAll("iframe").forEach((iframe) => {
      countCheck();

      if (!iframe.getAttribute("title")?.trim()) {
        addIssue(
          "error",
          "Iframe is missing a title",
          "A title helps users understand the embedded frame's purpose.",
          iframe.outerHTML,
          'Add a descriptive title, e.g. <iframe title="Location map" ...>.',
          "WCAG 4.1.2"
        );
      }
    });

    // 11. Tables with data cells should generally have header cells.
    doc.querySelectorAll("table").forEach((table) => {
      if (table.querySelector("td")) {
        countCheck();

        if (!table.querySelector("th")) {
          addIssue(
            "warning",
            "Table may be missing header cells",
            "Data tables usually need appropriate row or column headers.",
            table.outerHTML,
            "Use <th> for appropriate headers. For complex tables, add suitable scope or header associations.",
            "WCAG 1.3.1"
          );
        }
      }
    });

    // 12. ARIA references should resolve to an element.
    doc.querySelectorAll("[aria-labelledby], [aria-describedby]").forEach((element) => {
      ["aria-labelledby", "aria-describedby"].forEach((attribute) => {
        const value = element.getAttribute(attribute);

        if (!value) {
          return;
        }

        value.trim().split(/\s+/).forEach((id) => {
          countCheck();

          if (!doc.getElementById(id)) {
            addIssue(
              "warning",
              "ARIA reference points to a missing ID",
              `The ${attribute} attribute refers to "${id}", but no matching ID was found.`,
              element.outerHTML,
              "Check the referenced ID spelling and make sure the referenced element exists.",
              "WCAG 4.1.2"
            );
          }
        });
      });
    });

    auditHasRun = true;
    renderAuditResults();

    const errorCount = auditIssues.filter((item) => item.severity === "error").length;
    const warningCount = auditIssues.filter((item) => item.severity === "warning").length;

    setAuditMessage(
      `Audit complete. Found ${auditIssues.length} potential issue(s), including ${errorCount} error(s) and ${warningCount} warning(s).`
    );
  } catch (error) {
    console.error("Audit error:", error);
    setAuditMessage("The HTML could not be checked. Please review your input and try again.", true);
  }
}

function renderAuditResults() {
  const errors = auditIssues.filter((item) => item.severity === "error").length;
  const warnings = auditIssues.filter((item) => item.severity === "warning").length;

  totalIssuesElement.textContent = auditIssues.length;
  errorCountElement.textContent = errors;
  warningCountElement.textContent = warnings;
  passedCountElement.textContent = Math.max(0, checksPerformed - auditIssues.length);
  findingsCountElement.textContent = auditIssues.length;

  downloadButton.disabled = false;

  renderIssues();
}

function renderIssues() {
  issuesList.replaceChildren();

  const selectedSeverity = severityFilter.value;
  const visibleIssues = auditIssues.filter((item) => {
    return selectedSeverity === "all" || item.severity === selectedSeverity;
  });

  if (visibleIssues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-results";

    const symbol = document.createElement("span");
    symbol.className = "empty-symbol";
    symbol.textContent = "✓";
    symbol.setAttribute("aria-hidden", "true");

    const heading = document.createElement("h3");
    heading.textContent =
      auditIssues.length === 0 ? "No issues detected by these checks" : "No matching findings";

    const paragraph = document.createElement("p");
    paragraph.textContent =
      auditIssues.length === 0
        ? "Great start! This does not guarantee that the HTML is fully accessible."
        : "Try selecting a different severity filter.";

    empty.append(symbol, heading, paragraph);
    issuesList.append(empty);
    return;
  }

  visibleIssues.forEach((issue) => {
    const card = document.createElement("article");
    card.className = "issue-card";

    const top = document.createElement("div");
    top.className = "issue-top";

    const textArea = document.createElement("div");

    const title = document.createElement("h4");
    title.className = "issue-title";
    title.textContent = issue.title;

    const description = document.createElement("p");
    description.className = "issue-description";
    description.textContent = issue.description;

    textArea.append(title, description);

    const badge = document.createElement("span");
    badge.className = `severity ${issue.severity}`;
    badge.textContent = issue.severity;

    top.append(textArea, badge);

    const code = document.createElement("pre");
    code.className = "issue-code";
    code.textContent = issue.code;

    const fix = document.createElement("p");
    fix.className = "issue-fix";

    const fixLabel = document.createElement("strong");
    fixLabel.textContent = "Suggested fix: ";

    fix.append(fixLabel, document.createTextNode(issue.fix));

    const reference = document.createElement("span");
    reference.className = "issue-reference";
    reference.textContent = `Reference: ${issue.reference}`;

    card.append(top, code, fix, reference);
    issuesList.append(card);
  });
}

runAuditButton.addEventListener("click", runAudit);
severityFilter.addEventListener("change", renderIssues);

downloadButton.addEventListener("click", () => {
  if (!auditHasRun) {
    return;
  }

  const lines = [
    "AccessiCheck Accessibility Audit Report",
    `Generated: ${new Date().toLocaleString()}`,
    `Potential issues: ${auditIssues.length}`,
    `Errors: ${auditIssues.filter((item) => item.severity === "error").length}`,
    `Warnings: ${auditIssues.filter((item) => item.severity === "warning").length}`,
    `Checks with no issue detected: ${Math.max(0, checksPerformed - auditIssues.length)}`,
    "",
    "IMPORTANT: This report is not a WCAG certification.",
    "Automated checks cannot detect every accessibility problem.",
    "",
    "FINDINGS",
    "========",
    ""
  ];

  if (auditIssues.length === 0) {
    lines.push("No issues were detected by the checks in this tool.");
  }

  auditIssues.forEach((issue, index) => {
    lines.push(
      `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`,
      `Description: ${issue.description}`,
      `HTML: ${issue.code}`,
      `Suggested fix: ${issue.fix}`,
      `Reference: ${issue.reference}`,
      ""
    );
  });

  const report = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(report);
  const link = document.createElement("a");

  link.href = url;
  link.download = "accessicheck-audit-report.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// ---------------- COLOR CONTRAST CHECKER ----------------

function normalizeHex(value) {
  let hex = value.trim();

  if (!hex.startsWith("#")) {
    hex = `#${hex}`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = "#" + hex.slice(1).split("").map((char) => char + char).join("");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return hex.toUpperCase();
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);

  if (!normalized) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

function linearizeColor(channel) {
  const value = channel / 255;

  if (value <= 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return null;
  }

  const red = linearizeColor(rgb.r);
  const green = linearizeColor(rgb.g);
  const blue = linearizeColor(rgb.b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function calculateContrast(foreground, background) {
  const first = getRelativeLuminance(foreground);
  const second = getRelativeLuminance(background);

  if (first === null || second === null) {
    return null;
  }

  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

function setContrastMessage(message, isError = false) {
  contrastMessage.textContent = message;
  contrastMessage.classList.toggle("error", isError);
}

function updateContrast() {
  const foreground = normalizeHex(foregroundHex.value);
  const background = normalizeHex(backgroundHex.value);

  if (!foreground || !background) {
    contrastRatio.textContent = "—";
    contrastStatus.textContent = "Invalid color";
    contrastStatus.classList.add("fail");

    normalResult.textContent = "Check color";
    largeResult.textContent = "Check color";
    normalResult.className = "fail-text";
    largeResult.className = "fail-text";

    return;
  }

  foregroundHex.value = foreground;
  backgroundHex.value = background;

  foregroundInput.value = foreground;
  backgroundInput.value = background;

  previewCard.style.color = foreground;
  previewCard.style.backgroundColor = background;

  const ratio = calculateContrast(foreground, background);

  contrastRatio.textContent = `${ratio.toFixed(2)}:1`;

  const passesNormal = ratio >= 4.5;
  const passesLarge = ratio >= 3;

  contrastStatus.textContent = passesNormal
    ? "AA normal text: Pass"
    : "AA normal text: Fail";

  contrastStatus.classList.toggle("fail", !passesNormal);

  normalResult.textContent = passesNormal ? "PASS" : "FAIL";
  normalResult.className = passesNormal ? "pass" : "fail-text";

  largeResult.textContent = passesLarge ? "PASS" : "FAIL";
  largeResult.className = passesLarge ? "pass" : "fail-text";

  setContrastMessage(
    "Contrast results updated. Evaluate the full component and surrounding design too."
  );
}

foregroundInput.addEventListener("input", () => {
  foregroundHex.value = foregroundInput.value.toUpperCase();
  updateContrast();
});

backgroundInput.addEventListener("input", () => {
  backgroundHex.value = backgroundInput.value.toUpperCase();
  updateContrast();
});

foregroundHex.addEventListener("change", () => {
  const normalized = normalizeHex(foregroundHex.value);

  if (!normalized) {
    setContrastMessage("Enter a valid hex color, such as #25233A.", true);
    return;
  }

  foregroundHex.value = normalized;
  foregroundInput.value = normalized;
  updateContrast();
});

backgroundHex.addEventListener("change", () => {
  const normalized = normalizeHex(backgroundHex.value);

  if (!normalized) {
    setContrastMessage("Enter a valid hex color, such as #FFFFFF.", true);
    return;
  }

  backgroundHex.value = normalized;
  backgroundInput.value = normalized;
  updateContrast();
});

document.getElementById("swap-colors").addEventListener("click", () => {
  const oldForeground = foregroundHex.value;
  foregroundHex.value = backgroundHex.value;
  backgroundHex.value = oldForeground;
  updateContrast();
});

updateContrast();