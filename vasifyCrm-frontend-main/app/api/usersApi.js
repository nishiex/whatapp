import axiosClient from "./axiosClient"

const usersApi = {
  list: () => axiosClient.get("/auth/users").then((res) => res.data.users),
  create: (payload) =>
    axiosClient.post("/auth/users", payload).then((res) => res.data.user),
  updateStatus: (id, isActive) =>
    axiosClient
      .put(`/auth/users/${id}/status`, { isActive })
      .then((res) => res.data),
}

export default usersApi
