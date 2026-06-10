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

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 80, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const logged = isLoggedIn();
  if (to.meta.requiresAuth && !logged) return { name: "landing" };
  // 已登录访问落地页直接进工作区（定价页可单独查看）
  if (to.name === "landing" && logged) return { name: "workspace" };
  return true;
});

router.afterEach((to) => {
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
