/**
 * GTM dataLayer 推送（全站不加载直连 gtag.js，GA 仅在 GTM 容器内配置）。
 *
 * 是的：每个要在 GA4 里看到的自定义事件，都需在 GTM 里为该 `event` 名称建「自定义事件」触发器，
 * 并挂 GA4 事件代码（或 Google 代码：事件），把 dataLayer 字段映射为 GA4 事件参数。
 *
 * GTM 后台配置要点：
 * 0. SPA 浏览：`plugins/gtm-ga4-pageview.client.ts` 推送 `page_view`（含 page_location / page_path / page_title）。
 * 1. 触发器 →「自定义事件」，事件名称与下表 `event` 完全一致。
 * 2. 代码 → GA4 事件，映射参数（如 `method`、`currency`、`value`、`items`、`transaction_id`）。
 * 3. 推荐事件：`login`、`sign_up`、`begin_checkout`、`add_payment_info`、`purchase` 可在 GA4 标为关键事件。
 *
 * 本仓库会 push 的事件名（供 GTM 一次性配齐）：
 * - page_view（插件）
 * - login, sign_up（登录页）
 * - logout（任意登出入口 → user store）
 * - auth_cta_click（顶栏注册/登录按钮）
 * - begin_checkout, add_payment_info, purchase（会员中心订阅）
 * - pricing_subscribe_intent（独立定价页点击订阅）
 * - nav_task_list_click, nav_collect_click（用户面板）
 * - ximeng_home_click（ximeng 首页）
 * - landing_page_view, quick_task_click, user_signup_complete（增长漏斗）
 * - workspace_first_open, agent_dialog_start, content_generation_complete
 * - canvas_enter, content_export
 * - project_share_open, project_share_link_copy, project_share_platform_click
 * - referral_popup_show, referral_share_click, referral_signup, referral_activated
 * - create_wechat_payment, wechat_payment_success, create_paypal_payment, create_paypal_payment_success（积分充值等）
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function pushGtmDataLayerObject(obj: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
}

/** 推送 GA4 常用 `page_view`（供 GTM 自定义事件触发器 → GA4 事件） */
export function pushGtmPageView(overrides?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const page_location =
    typeof overrides?.page_location === "string"
      ? (overrides.page_location as string)
      : window.location.href;
  const page_path =
    typeof overrides?.page_path === "string"
      ? (overrides.page_path as string)
      : `${window.location.pathname || ""}${window.location.search || ""}`;
  const page_title =
    typeof overrides?.page_title === "string"
      ? (overrides.page_title as string)
      : typeof document !== "undefined"
        ? document.title
        : "";
  const rest = { ...(overrides || {}) };
  delete rest.page_location;
  delete rest.page_path;
  delete rest.page_title;
  pushGtmDataLayerObject({
    event: "page_view",
    page_location,
    page_path,
    page_title,
    ...rest,
  });
}

/** 推送 GTM 自定义事件：`dataLayer.push({ event, ...params })` */
export function pushGtmEvent(
  event: string,
  params?: Record<string, unknown>
): void {
  pushGtmDataLayerObject(
    params && Object.keys(params).length
      ? { event, ...params }
      : { event }
  );
}

export type GtmEcommerceItem = {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
};

/** GA4 `begin_checkout`（需在 GTM 映射为 GA4 事件名 begin_checkout） */
export function pushGtmBeginCheckout(params: {
  value: number;
  currency?: string;
  items: GtmEcommerceItem[];
}): void {
  pushGtmEvent("begin_checkout", {
    currency: params.currency ?? "USD",
    value: params.value,
    items: params.items,
  });
}

/** GA4 `add_payment_info` */
export function pushGtmAddPaymentInfo(params: {
  payment_type: string;
  value?: number;
  currency?: string;
  items?: GtmEcommerceItem[];
}): void {
  pushGtmEvent("add_payment_info", {
    payment_type: params.payment_type,
    ...(params.value != null ? { value: params.value } : {}),
    ...(params.currency ? { currency: params.currency } : {}),
    ...(params.items?.length ? { items: params.items } : {}),
  });
}

/** GA4 `purchase` */
export function pushGtmPurchase(params: {
  transaction_id: string;
  value: number;
  currency?: string;
  items: GtmEcommerceItem[];
  payment_type?: string;
}): void {
  pushGtmEvent("purchase", {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: params.currency ?? "USD",
    items: params.items,
    ...(params.payment_type ? { payment_type: params.payment_type } : {}),
  });
}
