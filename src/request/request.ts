import { ReponseCodes } from "./response-codes";
import { set, merge } from "lodash-es";
import { useUserStore } from "~/composables/user"; // 确保 useUserStore 已导入
import { getApiContextHeaders } from "~/utils/apiRequestContext";

// 动态获取 baseURL，优先使用 runtimeConfig（客户端/服务端均可用），
// 回退到 process.env.API_URL（仅服务端 Node.js 可用），最后使用默认值。
const getBaseURL = (): string => {
  // Vite 环境：读取 VITE_API_URL（浏览器直连后端 host，不含 /api2）
  const raw = (import.meta.env.VITE_API_URL as string) || "";
  // 去掉末尾 /，避免与以 / 开头的 path 拼成 https://host//api/...（Spring Firewall 会拒绝）
  return raw.replace(/\/+$/, "");
};

/** 拼接 base 与 path，避免出现 https://host//api/...（Spring StrictHttpFirewall 会拒绝含 // 的 URL） */
function resolveRequestUrl(base: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) {
    return pathOrUrl;
  }
  const b = base.replace(/\/+$/, "");
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${b}${p}`;
}

// 添加一个服务端可用的请求函数，不依赖于 userStore
export const serverRequest = (
  url: string,
  init?: RequestInit | undefined,
  token?: string, // 可选的token参数
  customResolve?: Function | null
) => {
  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  if (init && init.body instanceof FormData) {
    // @ts-ignore
    delete headers["content-type"];
  }

  // 如果提供了token，则添加到请求头
  if (token) {
    Object.assign(headers, {
      Authorization: token,
    });
  }

  Object.assign(headers, getApiContextHeaders());

  const originOptions: RequestInit = { headers };
  const raw = init || {};
  const { signal, ...rest } = raw as RequestInit;
  const options: RequestInit = merge(originOptions, rest);
  if (signal) options.signal = signal;

  const reqUrl = resolveRequestUrl(getBaseURL(), url);

  // 添加日志输出，检查请求参数
  console.log('Server Request URL:', reqUrl);
  console.log('Server Request Options:', options);
  console.log('Server Request Headers:', headers);
  console.log('Server Request Body:', options.body);
  
  return fetch(reqUrl, options)
    .then(async (res) => {
      if (!customResolve) return res.json();
      return customResolve(res);
    })
    .then((res: any) => {
      const { code, data, message } = res;

      /**
       * code 非 0 即错误，但在服务端我们只返回结果，不抛出异常
       */
      return res;
    })
    .catch((error: any) => {
      console.error('Server request error:', error);
      // 返回一个标准错误对象
      return {
        code: 500,
        message: error.message || 'Server request failed',
        data: null
      };
    });
};    

export const request = <T = unknown>(
  url: string,
  init?: RequestInit | undefined,
  customResolve?: Function | null
): Promise<T> => {
  const userStore = useUserStore();
  const headers: HeadersInit = { // 使用 HeadersInit 类型
    "content-type": "application/json",
  };

  if (init && init.body instanceof FormData) {
    // @ts-ignore
    delete headers["content-type"];
  }

  if (userStore.token) {
    Object.assign(headers, {
      Authorization: userStore.token,
    });
  }

  Object.assign(headers, getApiContextHeaders());

  const originOptions: RequestInit = { headers };
  const raw = init || {};
  const { signal, ...rest } = raw as RequestInit;
  const options: RequestInit = merge(originOptions, rest);
  if (signal) options.signal = signal;

  const reqUrl = resolveRequestUrl(getBaseURL(), url);

  // 添加日志输出，检查请求参数
  console.log('Request URL:', reqUrl);
  console.log('Request Options:', options);
  console.log('Request Body:', options.body); // 专门检查 body 属性
  
  return fetch(reqUrl, options)
    .then(async (res) => {
      if (!customResolve) return res.json();
      return customResolve(res);
    })
    .then((res: any) => {
      const { code, data, message } = res;

      // 只在严重错误（如未登录、token过期）时抛出，其余业务错误直接返回
      switch (code) {
        case ReponseCodes.TOKEN_EXPIRED: {
          return request(url, init);
        }
        case ReponseCodes.NO_AUTH:
        case ReponseCodes.REFRESH_TOKEN_EXPIRED: {
          userStore.logout();
          throw res;
        }
        default: {
          // 不抛出业务错误，直接返回
          return res;
        }
      }
    })
    .catch((error: any) => {
      // 网络错误或fetch异常
      console.error('Request error:', error);
      return {
        code: 500,
        message: error.message || 'Request failed',
        data: null
      };
    }) as Promise<T>;
};
