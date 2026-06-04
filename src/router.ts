// 路由：/ 落地页（访客），/workspace 工作区（需登录）
// @author hc @date 2026-06-04

import { createRouter, createWebHistory } from "vue-router";
import { isLoggedIn } from "./api";

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
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const logged = isLoggedIn();
  if (to.meta.requiresAuth && !logged) return { name: "landing" };
  // 已登录访问落地页直接进工作区
  if (to.name === "landing" && logged) return { name: "workspace" };
  return true;
});
