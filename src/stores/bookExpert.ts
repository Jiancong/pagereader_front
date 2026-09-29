// 书籍专家（Book Expert）状态：列表、激活专家、蒸馏进度
// @author hc @date 2026-09-29

import { defineStore } from "pinia"
import {
  listExperts,
  publishExpert,
  deleteExpert,
} from "@/api/bookExpert"
import type { BookExpertSummary } from "@/api/types"

export type DistillPhase = "idle" | "running" | "done" | "error"

interface BookExpertState {
  experts: BookExpertSummary[]
  loadingList: boolean
  listError: string | null
  activeExpert: BookExpertSummary | null
  distill: {
    phase: DistillPhase
    error: string | null
    lastCreatedExpertId: string | null
  }
}

export const useBookExpertStore = defineStore("book-expert", {
  state: (): BookExpertState => ({
    experts: [],
    loadingList: false,
    listError: null,
    activeExpert: null,
    distill: {
      phase: "idle",
      error: null,
      lastCreatedExpertId: null,
    },
  }),
  getters: {
    myExperts: (state): BookExpertSummary[] =>
      state.experts.filter(
        (e) => e.visibility === "private" && e.owner_user_id === state.activeExpert?.owner_user_id,
      ),
    publicExperts: (state): BookExpertSummary[] =>
      state.experts.filter((e) => e.visibility === "public"),
    isActive: (state): boolean => state.activeExpert !== null,
  },
  actions: {
    async fetchExperts(userId: string) {
      if (!userId) return
      this.loadingList = true
      this.listError = null
      try {
        const res = await listExperts(userId)
        this.experts = res?.experts ?? []
      } catch (e: unknown) {
        this.listError = e instanceof Error ? e.message : "加载专家失败"
        this.experts = []
      } finally {
        this.loadingList = false
      }
    },

    selectExpert(expert: BookExpertSummary | null) {
      this.activeExpert = expert
    },

    clearActiveExpert() {
      this.activeExpert = null
    },

    upsertExpert(expert: BookExpertSummary) {
      const idx = this.experts.findIndex((e) => e.expert_id === expert.expert_id)
      if (idx >= 0) this.experts[idx] = { ...this.experts[idx], ...expert }
      else this.experts.unshift(expert)
    },

    removeExpert(expertId: string) {
      this.experts = this.experts.filter((e) => e.expert_id !== expertId)
      if (this.activeExpert?.expert_id === expertId) this.activeExpert = null
    },

    async publishExpert(expertId: string, userId: string, makePublic: boolean) {
      const res = await publishExpert(expertId, {
        userId,
        public: makePublic,
      })
      const updated: BookExpertSummary | undefined = this.experts.find(
        (e) => e.expert_id === expertId,
      )
      if (updated) {
        updated.visibility = res.visibility
        if (this.activeExpert?.expert_id === expertId) {
          this.activeExpert = { ...this.activeExpert, visibility: res.visibility }
        }
      }
      return res
    },

    async deleteExpert(expertId: string, userId: string) {
      await deleteExpert(expertId, userId)
      this.removeExpert(expertId)
    },

    startDistill() {
      this.distill.phase = "running"
      this.distill.error = null
      this.distill.lastCreatedExpertId = null
    },

    onDistillSuccess(expert: BookExpertSummary) {
      this.distill.phase = "done"
      this.distill.lastCreatedExpertId = expert.expert_id
      this.upsertExpert(expert)
    },

    onDistillError(message: string) {
      this.distill.phase = "error"
      this.distill.error = message
    },

    resetDistill() {
      this.distill.phase = "idle"
      this.distill.error = null
      this.distill.lastCreatedExpertId = null
    },
  },
})
