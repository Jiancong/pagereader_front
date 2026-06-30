// 路由：/ 落地页（访客），/workspace 工作区（需登录）
// @author hc @date 2026-06-04

import { createRouter, createWebHistory } from "vue-router";
import { isLoggedIn } from "./api";
import { pushGtmPageView, gtmPageTypeFromRoute } from "./composables/useGtmDataLayer";
import { applyDocumentI18n, normalizeLocale } from "./composables/useAppLocale";
import { i18n } from "./i18n";

const routes = [
  {
    path: "/",
    name: "landing",
    component: () => import("./views/LandingView.vue"),
  },
  {
    path: "/workspace",
    name: "workspace",
    component: () => import("./views/WorkspaceView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/explore",
    name: "explore",
    component: () => import("./views/ExploreView.vue"),
  },
  {
    path: "/explore/project/:projectId",
    name: "project-community",
    component: () => import("./views/ProjectCommunityView.vue"),
  },
  {
    path: "/explore/project/:projectId/read",
    name: "project-reader",
    component: () => import("./views/ProjectReaderView.vue"),
  },
  {
    path: "/play/:projectId",
    name: "project-player",
    component: () => import("./views/ProjectPlayerView.vue"),
  },
  {
    path: "/debug-ppt",
    name: "debug-ppt",
    component: () => import("./views/DebugPptView.vue"),
  },
  {
    path: "/pricing",
    name: "pricing",
    component: () => import("./views/PricingView.vue"),
  },
  {
    path: "/story",
    name: "story",
    component: () => import("./views/StoryView.vue"),
  },
  {
    path: "/about",
    name: "about",
    component: () => import("./views/LegalView.vue"),
    props: { page: "about" },
  },
  {
    path: "/terms",
    name: "terms",
    component: () => import("./views/LegalView.vue"),
    props: { page: "terms" },
  },
  {
    path: "/privacy",
    name: "privacy",
    component: () => import("./views/LegalView.vue"),
    props: { page: "privacy" },
  },
  {
    path: "/contact",
    name: "contact",
    component: () => import("./views/LegalView.vue"),
    props: { page: "contact" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("./views/NotFoundView.vue"),
  },
];

const CHUNK_RELOAD_STORAGE_KEY = "page2top:chunk-reload-target";
const DYNAMIC_IMPORT_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i;

function isDynamicImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return DYNAMIC_IMPORT_ERROR_PATTERN.test(message);
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 80, behavior: "smooth" };
    return { top: 0 };
  },
});

router.onError((error, to) => {
  if (!isDynamicImportError(error) || typeof window === "undefined") return;

  const target = to.fullPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) === target) return;
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, target);
  } catch {
    // Storage can be unavailable in restricted browsing modes; a single reload is still useful.
  }

  window.location.assign(target);
});

router.beforeEach((to) => {
  const logged = isLoggedIn();
  if (to.meta.requiresAuth && !logged) return { name: "landing" };
  // 已登录访问落地页直接进工作区（定价页可单独查看）
  if (to.name === "landing" && logged) return { name: "workspace" };
  return true;
});

router.afterEach((to) => {
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) === to.fullPath) {
        window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
      }
    } catch {
      // Ignore unavailable sessionStorage; it is only used to avoid repeated reloads.
    }
  }

  if (to.name !== "not-found") {
    applyDocumentI18n(normalizeLocale(i18n.global.locale.value));
  }
  pushGtmPageView({
    page_path: to.fullPath,
    page_location: typeof window !== "undefined" ? window.location.href : to.fullPath,
    page_title: typeof document !== "undefined" ? document.title : String(to.name ?? ""),
    page_type: gtmPageTypeFromRoute(to.name, to.fullPath),
  });
});
