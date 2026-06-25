import "./globals.css";

export const metadata = {
  title: "Botimi Frontend",
  description: "Next.js frontend for the Botimi multi-vendor AI platform UI"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&family=Geist:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    "on-secondary-container": "#00424e",
                    "secondary-fixed": "#acedff",
                    "surface-variant": "#34343d",
                    "on-primary-fixed-variant": "#2f2ebe",
                    "surface-container": "#1f1f27",
                    "on-primary-fixed": "#07006c",
                    "inverse-surface": "#e4e1ed",
                    "tertiary-container": "#d97721",
                    "on-background": "#e4e1ed",
                    "tertiary-fixed-dim": "#ffb783",
                    "on-primary": "#1000a9",
                    "surface-tint": "#c0c1ff",
                    "secondary": "#4cd7f6",
                    "primary-fixed-dim": "#c0c1ff",
                    "surface-dim": "#13131b",
                    "outline": "#908fa0",
                    "on-error-container": "#ffdad6",
                    "surface-container-lowest": "#0d0d15",
                    "on-secondary-fixed": "#001f26",
                    "surface-bright": "#393841",
                    "on-tertiary": "#4f2500",
                    "on-tertiary-container": "#452000",
                    "on-primary-container": "#0d0096",
                    "secondary-container": "#03b5d3",
                    "error": "#ffb4ab",
                    "primary-container": "#8083ff",
                    "on-tertiary-fixed": "#301400",
                    "on-secondary": "#003640",
                    "tertiary-fixed": "#ffdcc5",
                    "secondary-fixed-dim": "#4cd7f6",
                    "on-surface-variant": "#c7c4d7",
                    "surface-container-high": "#292932",
                    "on-surface": "#e4e1ed",
                    "background": "#13131b",
                    "on-secondary-fixed-variant": "#004e5c",
                    "surface-container-highest": "#34343d",
                    "inverse-primary": "#494bd6",
                    "error-container": "#93000a",
                    "outline-variant": "#464554",
                    "tertiary": "#ffb783",
                    "primary": "#c0c1ff",
                    "on-tertiary-fixed-variant": "#703700",
                    "surface": "#13131b",
                    "on-error": "#690005",
                    "inverse-on-surface": "#303038",
                    "primary-fixed": "#e1e0ff",
                    "surface-container-low": "#1b1b23"
                  },
                  borderRadius: {
                    DEFAULT: "0.5rem",
                    lg: "1rem",
                    xl: "1.5rem",
                    full: "9999px"
                  },
                  spacing: {
                    gutter: "24px",
                    "stack-sm": "8px",
                    "stack-xs": "4px",
                    "margin-mobile": "16px",
                    "stack-lg": "24px",
                    "container-max": "1440px",
                    "stack-xl": "48px",
                    "margin-desktop": "40px",
                    unit: "4px",
                    "stack-md": "16px"
                  },
                  fontFamily: {
                    "label-md": ["Geist"],
                    "headline-lg-mobile": ["Plus Jakarta Sans"],
                    "body-md": ["Inter"],
                    "code-sm": ["Geist"],
                    "headline-lg": ["Plus Jakarta Sans"],
                    "body-lg": ["Inter"],
                    display: ["Plus Jakarta Sans"],
                    "headline-md": ["Plus Jakarta Sans"],
                    "body-sm": ["Inter"]
                  },
                  fontSize: {
                    "label-md": ["14px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
                    "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
                    "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
                    "code-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
                    "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
                    "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
                    display: ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "800" }],
                    "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
                    "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }]
                  }
                }
              }
            };
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
