let initPromise: Promise<void> | null = null;

/** 浏览器端单次初始化 mermaid（多组件共用） */
export function ensureMermaidInitialized(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = (async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "neutral",
        suppressErrorRendering: true,
      });
    })();
  }
  return initPromise;
}
