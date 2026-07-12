import { inject, provide, ref, watch, type InjectionKey, type Ref } from "vue"

export interface AssetsRefreshBus {
  tick: Ref<number>
  trigger: () => void
}

export const ASSETS_REFRESH_KEY: InjectionKey<AssetsRefreshBus> = Symbol("assetsRefresh")

export function provideAssetsRefreshBus(): AssetsRefreshBus {
  const tick = ref(0)
  const bus: AssetsRefreshBus = {
    tick,
    trigger: () => {
      tick.value++
    },
  }
  provide(ASSETS_REFRESH_KEY, bus)
  return bus
}

export function useAssetsRefreshListener(callback: () => void): void {
  const bus = inject(ASSETS_REFRESH_KEY, null)
  if (!bus) return
  watch(
    () => bus.tick.value,
    () => callback(),
  )
}
