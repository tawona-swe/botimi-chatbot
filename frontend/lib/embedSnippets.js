// Generates the widget install snippet for a given platform. The "html"
// variant matches the backend's own GET /api/bots/:id/embed output exactly
// (same string, single source of truth for that one) -- the rest are
// templates for platforms whose compilers don't accept a raw <script> tag
// dropped into markup (JSX/SFC frameworks parse it as component code, not
// literal HTML, and Vue/Svelte/Angular silently strip <script> tags found
// inside templates rather than erroring).

export const EMBED_PLATFORMS = [
  { id: "html", label: "HTML / WordPress / Shopify / Webflow" },
  { id: "nextjs", label: "Next.js" },
  { id: "react", label: "React (Vite / CRA)" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "angular", label: "Angular" },
];

function configLiteral({ botId, theme, position, color, icon, hideBranding }) {
  return `{
    apiKey: "${botId}",
    theme: "${theme}",
    position: "${position}",
    color: "${color}",
    icon: "${icon}",
    hideBranding: ${!!hideBranding}
  }`;
}

export function generateSnippet(platform, cfg) {
  const { backendUrl } = cfg;
  const loaderSrc = `${backendUrl}/api/widget/loader.js`;
  const literal = configLiteral(cfg);

  switch (platform) {
    case "nextjs":
      return `import Script from "next/script";

// Add at the end of <body> in app/layout.js (or _document.js for the Pages Router)
<Script
  id="botimi-widget-config"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: \`window.botimiConfig = ${literal};\`,
  }}
/>
<Script src="${loaderSrc}" strategy="afterInteractive" />`;

    case "react":
      return `import { useEffect } from "react";

// Call once, e.g. in your root App component
useEffect(() => {
  window.botimiConfig = ${literal};
  const script = document.createElement("script");
  script.src = "${loaderSrc}";
  script.async = true;
  document.body.appendChild(script);
  return () => document.body.removeChild(script);
}, []);`;

    case "vue":
      return `<script setup>
import { onMounted, onUnmounted } from "vue";

let widgetScript;
onMounted(() => {
  window.botimiConfig = ${literal};
  widgetScript = document.createElement("script");
  widgetScript.src = "${loaderSrc}";
  widgetScript.async = true;
  document.body.appendChild(widgetScript);
});
onUnmounted(() => widgetScript?.remove());
</script>`;

    case "svelte":
      return `<script>
  import { onMount, onDestroy } from "svelte";

  let widgetScript;
  onMount(() => {
    window.botimiConfig = ${literal};
    widgetScript = document.createElement("script");
    widgetScript.src = "${loaderSrc}";
    widgetScript.async = true;
    document.body.appendChild(widgetScript);
  });
  onDestroy(() => widgetScript?.remove());
</script>`;

    case "angular":
      return `// In your root component (e.g. app.component.ts)
import { Component, OnInit, Renderer2 } from "@angular/core";

export class AppComponent implements OnInit {
  constructor(private renderer: Renderer2) {}

  ngOnInit() {
    (window as any).botimiConfig = ${literal};
    const script = this.renderer.createElement("script");
    script.src = "${loaderSrc}";
    script.async = true;
    this.renderer.appendChild(document.body, script);
  }
}`;

    case "html":
    default:
      return `<!-- botimi Chat Widget -->
<script>
  window.botimiConfig = ${literal};
</script>
<script async src="${loaderSrc}"></script>
<!-- End botimi Chat Widget -->`;
  }
}
