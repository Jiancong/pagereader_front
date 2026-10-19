/**
 * 卡片字号自适应（DOM 测量）。
 *
 * cardTypography.ts 只按字符数估字号，不知道每张卡在固定行高
 * （grid-auto-rows: minmax(0,1fr)）网格里实际分到多高，长文会被 overflow 裁掉。
 * 渲染后逐卡收缩 --ppt-card-fit，直到标题/正文都放进卡片。
 */

const FIT_MIN = 0.55;
const FIT_STEP = 0.93;
const MAX_STEPS = 12;

function overflowing(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  return el.scrollHeight > el.clientHeight + 1;
}

export function fitCardTypography(root: HTMLElement | null | undefined): void {
  if (!root) return;
  const cards = root.querySelectorAll<HTMLElement>(".ppt-brutalist-card.ppt-card-typography");
  for (const card of cards) {
    card.style.setProperty("--ppt-card-fit", "1");
    const title = card.querySelector<HTMLElement>("h3");
    const body = card.querySelector<HTMLElement>(".ppt-brutalist-card-body");
    // body 为 flex:1 时卡片自身不会溢出，要分别量标题/正文；body 定高自动时靠卡片本身判断
    const over = overflowing(card) || overflowing(title) || overflowing(body);
    if (!over) continue;

    let fit = 1;
    for (let i = 0; i < MAX_STEPS; i++) {
      fit *= FIT_STEP;
      if (fit <= FIT_MIN) {
        card.style.setProperty("--ppt-card-fit", FIT_MIN.toFixed(3));
        break;
      }
      card.style.setProperty("--ppt-card-fit", fit.toFixed(3));
      if (!(overflowing(card) || overflowing(title) || overflowing(body))) break;
    }
  }
}
