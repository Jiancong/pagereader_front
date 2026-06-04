import { request, serverRequest } from "./request";

interface GenerateModelImageParams {
  [prop: string]: any;
}


const URL_ADDR_HTTP = "http://104.237.1.210:6099"
const getApiUrl = (): string => {
  const raw = (import.meta.env.VITE_API_URL as string) || "";
  return raw.replace(/\/+$/, "");
};

/**
 * 调AI接口生成图片
 */
export const generateModelImage = (params: GenerateModelImageParams) => {
  return request(`/api2/userModel/gen/image`, {
    method: "post",
    body: JSON.stringify(params),
  });
};

export const generateModelImageEnhance = async (url: string) => {
  // const file = await getFileFromUrl(url);
  const formData = new FormData();
  formData.append("fileUrl", url);

  return request(`/api2/userModel/image_enhance`, {
    method: "post",
    body: formData,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

/**
 * chatgpt生成midjourney提示词
 */
export const gptTranslate = async (prompt: string) => {
  return fetch(getApiUrl() + `/chatgpt?prompt=${prompt}`, {
    method: "get",
  }).then((res) => res.text());
};

// 直接翻译
export const gptTranslate2 = async (prompt: string) => {
  return fetch(getApiUrl() + `/chatgpt2?prompt=${prompt}`, {
    method: "get",
  }).then((res) => res.text());
};

async function getFileFromUrl(url: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const filename = getFilenameFromUrl(url);
    return new File([blob], filename);
  } catch (error) {
    console.error("Error fetching file from URL:", error);
    return null;
  }
}

function getFilenameFromUrl(url: string) {
  const lastSlashIndex = url.lastIndexOf("/");
  return url.substring(lastSlashIndex + 1);
}

// Points

export const createUserProductPointRecord = async(
  userId: string, 
  productType: string,
  token: string,
) => {
  // 检查是否在服务器端环境
  const isServer = typeof window === 'undefined';
  try {
    // 在服务器端使用直接的API调用而不是通过store
    if (isServer) {
      console.log(`服务器端调用扣点API，用户ID: ${userId}, 产品类型: ${productType}`);
      
      const result = await serverRequest("/api2/aiService/createUserProductPointRecord", {
        method: "post",
        body: JSON.stringify({
          userId: userId,
          productType: productType,
        }),
      }, token);
      
      console.log('服务器端扣点API返回结果:', result);
      return result;
    } else {
      // 客户端环境，返回一个默认成功结果
      return {
        code: 0,
        message: '客户端环境，跳过扣点',
        data: { totalPoint: 999 }
      };
    }
  } catch (error) {
    console.error('创建用户产品点数记录失败:', error);
    return {
      code: 500,
      message: '创建用户产品点数记录失败',
      data: null
    };
  }
};
