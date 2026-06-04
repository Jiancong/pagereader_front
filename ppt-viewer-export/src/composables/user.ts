import { defineStore } from "pinia";
import { pushGtmEvent } from "~/composables/useGtmDataLayer";

interface Store {
  isLogin: boolean;
  token: string;
  userInfo: any;
}

export const useUserStore = defineStore("user", {
  state: (): Store => {
    return {
      isLogin: false,
      token: "",
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
  
  //persist定义要做判断，因为localStorage是客户端参数，所以需要加process.client
  persist: process.client && {
    storage: localStorage,
    paths: ["isLogin", "token", "userInfo"],
  },
});
