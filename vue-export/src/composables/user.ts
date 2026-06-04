import { defineStore } from "pinia";
import { pushGtmEvent } from "~/composables/useGtmDataLayer";

// 与 api/token 共用同一 localStorage key，保证 PptViewer 内请求与主应用同源鉴权
const TOKEN_KEY = "pr_token";

function readToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

interface Store {
  isLogin: boolean;
  token: string;
  userInfo: any;
}

export const useUserStore = defineStore("user", {
  state: (): Store => {
    const token = readToken();
    return {
      isLogin: !!token,
      token,
      userInfo: {},
    };
  },
  actions: {
    login(token: string) {
      this.isLogin = true;
      this.setToken(token);
    },
    logout() {
      pushGtmEvent("logout");
      this.isLogin = false;
      this.userInfo = {};
      this.setToken('');
    },
    setToken(token: string = '') {
      this.token = token;
      if (typeof window !== "undefined") {
        if (token) window.localStorage.setItem(TOKEN_KEY, token);
        else window.localStorage.removeItem(TOKEN_KEY);
      }
    },
    changeUserInfo(payload: any) {
      Object.assign(this.userInfo, payload || {});
    },
    changeUserPoint(point: number) {
      if (point === null || point === undefined) {
        return;
      }
      this.userInfo.totalPoint = point;
    }
  },
});
