

export enum ReponseCodes {
    /**
     * 请求成功
     */
    SUCCESS = 0,
    /**
     * 用户未登录
     */
    NO_AUTH = 900111,

    /**
     * token 过期
     */
    TOKEN_EXPIRED = 900102,

    /**
     * refresh token 过期
     */
    REFRESH_TOKEN_EXPIRED = 900103,

    NO_POINTS = 500106
}
