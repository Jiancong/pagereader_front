// 路由：/ 落地页（访客），/workspace 工作区（需登录）
// @author hc @date 2026-06-04

import { createRouter, createWebHistory } from "vue-router";
import { isLoggedIn } from "./api";
import { pushGtmPageView } from "./composables/useGtmDataLayer";

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
  pushGtmPageView({
    page_path: to.fullPath,
    page_location: typeof window !== "undefined" ? window.location.href : to.fullPath,
    page_title: typeof document !== "undefined" ? document.title : String(to.name ?? ""),
  });
});
