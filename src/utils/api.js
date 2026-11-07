import { logError } from "@/utils/logger";
import { displayMoney, formatMzn, formatSalaryRange, normalizeFeedItem } from "@/utils/formatMoney";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://mabassaapi.up.railway.app";

const REQUEST_TIMEOUT_MS = 15000;

async function parseResponse(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Erro ${response.status}: nao foi possivel comunicar com a API`;
    if (__DEV__) {
      logError("api-response", new Error(Array.isArray(message) ? message[0]?.msg : message), {
        status: response.status,
        url: response.url,
        data,
      });
    }
    throw new Error(Array.isArray(message) ? message[0]?.msg : message);
  }
  return data;
}

export async function apiRequest(path, options = {}, token = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      body:
        options.body && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });
    return parseResponse(response);
  } catch (error) {
    if (__DEV__) {
      logError("api-request", error, { url: `${API_URL}${path}` });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadRequest(path, formData, token = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: formData,
    });
    return parseResponse(response);
  } catch (error) {
    if (__DEV__) {
      logError("upload-request", error, { url: `${API_URL}${path}` });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  async login(payload) {
    const token = await apiRequest("/auth/login", {
      method: "POST",
      body: payload,
    });
    const user = await apiRequest("/auth/me", {}, token.access_token);
    return { accessToken: token.access_token, user };
  },
  async register(payload) {
    await apiRequest("/auth/register", { method: "POST", body: payload });
    return authApi.login({ email: payload.email, password: payload.password });
  },
  me(token) {
    return apiRequest("/auth/me", {}, token);
  },
  updateMe(payload, token) {
    return apiRequest("/auth/me", { method: "PATCH", body: payload }, token);
  },
};

const jobTypeLabels = {
  full_time: "Full-time",
  part_time: "Part-time",
  freelancer: "Freelancer",
  contract: "Contrato",
};

function salaryLabel(job) {
  return formatSalaryRange(job.salary_min, job.salary_max);
}

export function mapJob(job) {
  const company = job.company_user?.company_profile?.company_name || job.company_user?.name;
  return {
    id: job.id,
    companyProfileId: job.company_user?.company_profile?.id,
    companyUserId: job.company_user_id,
    title: job.title,
    company,
    logo: job.company_user?.company_profile?.logo_url || job.company_user?.avatar_url,
    location: [job.city, job.province].filter(Boolean).join(", ") || "Mocambique",
    type: jobTypeLabels[job.job_type] || job.job_type,
    category: job.company_user?.company_profile?.industry || "Geral",
    salary: salaryLabel(job),
    isNew: job.is_featured,
    postedAt: "Recente",
    tags: (job.requirements || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    raw: job,
  };
}

export function mapCompany(company) {
  return {
    id: company.id,
    logo: company.logo_url || company.user?.avatar_url,
    name: company.company_name,
    area: company.industry || "Geral",
    location: [company.city, company.province].filter(Boolean).join(", ") || "Mocambique",
    employees: company.employees_range || "Nao informado",
    openJobs: company.open_jobs || 0,
    description: company.description || company.mission || "Empresa cadastrada no Armutra.",
    raw: company,
  };
}

export function mapFreelancer(profile) {
  const user = profile.user || {};
  return {
    id: profile.id,
    userId: profile.user_id,
    photo: user.avatar_url,
    name: user.name,
    profession: profile.profession || profile.headline || "Freelancer",
    category: profile.category || profile.profession || "Geral",
    rating: profile.rating || 0,
    reviews: profile.total_reviews || 0,
    completedJobs: profile.completed_jobs || 0,
    price:
      displayMoney(profile.price_label) ||
      (profile.hourly_rate != null
        ? formatMzn(profile.hourly_rate, { prefix: "Desde " }) + "/h"
        : "A negociar"),
    available: profile.available,
    tags: (profile.skills || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    raw: profile,
  };
}

export const armutraApi = {
  getFeed: async (type = null) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    params.set("_", String(Date.now()));
    const data = await apiRequest(`/feed?${params.toString()}`);
    return Array.isArray(data) ? data.map(normalizeFeedItem) : data;
  },
  createPost: (payload, token = null) =>
    apiRequest("/posts", { method: "POST", body: payload }, token),
  uploadPostImage: (formData, token = null) => uploadRequest("/uploads/posts", formData, token),
  uploadAvatar: (formData, token = null) => uploadRequest("/uploads/avatars", formData, token),
  createService: (payload, token = null) =>
    apiRequest("/services", { method: "POST", body: payload }, token),
  createJob: (payload, token = null) =>
    apiRequest("/jobs", { method: "POST", body: payload }, token),
  getPost: (postId) => apiRequest(`/posts/${postId}`),
  getService: (serviceId) => apiRequest(`/services/${serviceId}`),
  getJob: (jobId) => apiRequest(`/jobs/${jobId}`),
  requestService: (serviceId, payload, token = null) =>
    apiRequest(`/services/${serviceId}/requests`, { method: "POST", body: payload }, token),
  applyToJob: (jobId, payload, token = null) =>
    apiRequest(`/jobs/${jobId}/applications`, { method: "POST", body: payload }, token),
  createCompanyProfile: (payload, token = null) =>
    apiRequest("/empresas", { method: "POST", body: payload }, token),
  createFreelancerProfile: (payload, token = null) =>
    apiRequest("/freelancers", { method: "POST", body: payload }, token),
  async getJobs() {
    const data = await apiRequest("/jobs");
    return data.map(mapJob);
  },
  async getCompanies() {
    const data = await apiRequest("/empresas");
    return data.map(mapCompany);
  },
  async getFreelancers() {
    const data = await apiRequest("/freelancers");
    return data.map(mapFreelancer);
  },
  getUser: (userId) => apiRequest(`/users/${userId}`),
  getCompany: (companyId) => apiRequest(`/empresas/${companyId}`),
  getFreelancer: (freelancerId) => apiRequest(`/freelancers/${freelancerId}`),
  getUserExperiences: (userId) => apiRequest(`/profiles/${userId}/experiences`),
  getUserAchievements: (userId) => apiRequest(`/profiles/${userId}/achievements`),
  getUserServices: async (userId) => {
    const services = await apiRequest("/services");
    return services.filter((service) => service.owner_user_id === userId);
  },
};
