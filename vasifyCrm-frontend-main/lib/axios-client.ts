
import axios from "axios"

const axiosClient = axios.create({

  baseURL: "https://crm-api.vasifytech.com/api",
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default axiosClient