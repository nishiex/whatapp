// import axiosClient from "./axiosClient"

// const authApi = {
//   login: (email, password) =>
//     axiosClient.post("/auth/login", { email, password }).then((res) => res.data),
//   verify: () => axiosClient.get("/auth/verify").then((res) => res.data),
// }

// export default authApi


//testing
import axiosClient from "./axiosClient"

// NOTE: No changes needed in this file. It only calls the backend and
// returns res.data — it never touches localStorage directly. Token
// storage happens in axiosClient's interceptor (now reading 'auth_token')
// and wherever the login response is handled (now writing 'auth_token').
const authApi = {
  login: (email, password) =>
    axiosClient.post("/auth/login", { email, password }).then((res) => res.data),
  verify: () => axiosClient.get("/auth/verify").then((res) => res.data),
}

export default authApi