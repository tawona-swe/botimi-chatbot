export default function manifest() {
  return {
    name: "botimi — AI Chatbots for Business",
    short_name: "botimi",
    description: "Deploy an AI chatbot trained on your website or documents in minutes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fc",
    theme_color: "#4A1A8A",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
