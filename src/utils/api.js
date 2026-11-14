import { logError } from "@/utils/logger";
import { displayMoney, formatSalaryRange, normalizeFeedItem } from "@/utils/formatMoney";

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
    const textMessage = Array.isArray(message)
      ? message
          .map((item) => {
            const field = Array.isArray(item?.loc)
              ? item.loc.filter((part) => part !== "body").join(".")
              : "";
            return field ? `${field}: ${item?.msg || "campo inválido"}` : item?.msg;
          })
          .filter(Boolean)
          .join(". ")
      : message;
    if (__DEV__) {
      logError("api-response", new Error(textMessage), {
        status: response.status,
        url: response.url,
        data,
      });
    }
    throw new Error(textMessage);
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
      method: options.method || "GET",
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

export function mediaUrl(uri) {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function splitLocation(localizacao) {
  const text = String(localizacao || "").trim();
  if (!text) return { city: "", province: "" };
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], province: parts.slice(1).join(", ") };
  return { city: "", province: text };
}

function joinLocation(payload) {
  if (payload.localizacao) return payload.localizacao;
  return [payload.city, payload.province].filter(Boolean).join(", ");
}

export function mapUser(user) {
  if (!user) return user;
  const nome = user.nome || user.name || "";
  const tipo = user.tipo || user.user_type || "candidato";
  const localizacao = user.localizacao || joinLocation(user) || "";
  const place = splitLocation(localizacao);
  const foto = mediaUrl(user.foto_perfil || user.avatar_url);
  return {
    ...user,
    id: user.id,
    nome,
    name: nome,
    email: user.email,
    tipo,
    user_type: tipo,
    foto_perfil: foto,
    avatar_url: foto,
    bio: user.bio || null,
    localizacao,
    location: localizacao || "Moçambique",
    province: place.province,
    city: place.city,
    website: user.empresa?.website || user.website || null,
    profession: user.candidato?.habilidades?.[0] || user.profession || null,
    is_admin: !!user.is_admin,
  };
}

async function sessionFromToken(token) {
  const me = await apiRequest("/auth/me", {}, token.access_token);
  let full = me;
  if (me?.id) {
    try {
      full = await apiRequest(`/users/${me.id}`, {}, token.access_token);
    } catch {
      full = me;
    }
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    user: mapUser({ ...me, ...full, is_admin: me.is_admin }),
  };
}

export const authApi = {
  async login(payload) {
    const senha = payload.senha || payload.password;
    const token = await apiRequest("/auth/login", {
      method: "POST",
      body: {
        email: String(payload.email || "").trim().toLowerCase(),
        password: senha,
        senha,
      },
    });
    return sessionFromToken(token);
  },
  async register(payload) {
    const tipo = payload.tipo === "empresa" || payload.user_type === "empresa" ? "empresa" : "candidato";
    const nome = payload.nome || payload.name;
    const senha = payload.senha || payload.password;
    const token = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: nome,
        nome,
        email: String(payload.email || "").trim().toLowerCase(),
        password: senha,
        senha,
        user_type: tipo === "empresa" ? "empresa" : "freelancer",
        tipo,
        phone: payload.phone || null,
        province: payload.province || null,
        city: payload.city || null,
        localizacao: joinLocation(payload) || "Moçambique",
        bio: payload.bio || null,
        ...(tipo === "empresa"
          ? { empresa: { nome_empresa: payload.company_name || nome } }
          : {
              candidato: {
                habilidades: payload.habilidades || [],
                experiencia: payload.experiencia || null,
              },
            }),
      },
    });
    return sessionFromToken(token);
  },
  async me(token) {
    const me = await apiRequest("/auth/me", {}, token);
    const full = await apiRequest(`/users/${me.id}`, {}, token);
    return mapUser({ ...full, is_admin: me.is_admin });
  },
  async updateMe(payload, token) {
    const body = {};
    if (payload.nome || payload.name) body.nome = payload.nome || payload.name;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.foto_perfil || payload.avatar_url) {
      const foto = payload.foto_perfil || payload.avatar_url;
      body.foto_perfil = foto.startsWith(API_URL) ? foto.slice(API_URL.length) : foto;
    }
    const localizacao = joinLocation(payload);
    if (localizacao) body.localizacao = localizacao;
    if (payload.empresa) body.empresa = payload.empresa;
    if (payload.candidato) body.candidato = payload.candidato;
    if (payload.senha_nova) {
      body.senha_atual = payload.senha_atual;
      body.senha_nova = payload.senha_nova;
    }
    const updated = await apiRequest("/users/update", { method: "PUT", body }, token);
    const me = await apiRequest("/auth/me", {}, token);
    return mapUser({ ...updated, is_admin: me.is_admin });
  },
};

function postedLabel(value) {
  if (!value) return "Recente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recente";
  return date.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" });
}

export function mapJob(job) {
  const companyUser = job.company_user || {};
  const title = job.titulo || job.title || "Vaga";
  const location =
    job.localizacao || [job.city, job.province].filter(Boolean).join(", ") || "Moçambique";
  const salary =
    displayMoney(job.salario) ||
    job.salario ||
    (job.salary_min != null || job.salary_max != null
      ? formatSalaryRange(job.salary_min, job.salary_max)
      : "A negociar");
  return {
    id: job.id,
    source: "job",
    companyProfileId: null,
    companyUserId: job.empresa_user_id || job.company_user_id,
    title,
    titulo: title,
    company: job.empresa_nome || companyUser.name || "Empresa",
    logo: mediaUrl(job.empresa_foto || companyUser.avatar_url),
    location,
    localizacao: location,
    type: "Vaga",
    category: job.category || "Geral",
    salary,
    salario: salary,
    isNew: !!job.impulsionado || !!job.boosted,
    postedAt: postedLabel(job.criado_em || job.created_at),
    tags: String(job.requisitos || job.requirements || "")
      .split(/[,;\n]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag.length < 32)
      .slice(0, 4),
    description: job.descricao || job.description || "",
    raw: job,
  };
}

function mapServiceCard(service) {
  const preco = service.preco ?? service.price;
  return {
    ...service,
    titulo: service.titulo || service.title || "Serviço",
    descricao: service.descricao || service.description || "",
    preco,
    categoria: service.categoria || service.category || "",
  };
}

export function mapCompany(company) {
  const empresa = company.empresa || {};
  const user = company.user || {};
  const isUser = !!company.nome || !!company.tipo || !!company.user_type;
  const userId = isUser ? company.id : user.id || company.user_id || company.id;
  return {
    id: userId,
    logo: mediaUrl(company.logo_url || user.avatar_url || user.foto_perfil || company.foto_perfil),
    name: company.company_name || empresa.nome_empresa || company.nome || user.name || user.nome || "Empresa",
    area: company.industry || "Empresa",
    location:
      company.localizacao ||
      [company.city || user.city, company.province || user.province].filter(Boolean).join(", ") ||
      "Moçambique",
    employees: company.employees_range || null,
    openJobs: company.open_jobs || 0,
    description:
      company.description || empresa.descricao || company.bio || user.bio || "Empresa cadastrada no Armutra.",
    raw: company,
  };
}

export function mapFreelancer(profile) {
  const user = profile.user || profile;
  const candidato = profile.candidato || user.candidato || {};
  const skills = Array.isArray(candidato.habilidades)
    ? candidato.habilidades
    : String(profile.skills || candidato.habilidades || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
  const userId = user.id || profile.user_id || profile.id;
  return {
    id: userId,
    userId,
    photo: mediaUrl(user.foto_perfil || user.avatar_url || profile.avatar_url),
    name: user.nome || user.name || profile.nome || profile.name || "Freelancer",
    profession: profile.profession || profile.headline || skills[0] || "Freelancer",
    category: profile.category || skills[0] || "Geral",
    rating: profile.rating || 0,
    reviews: profile.total_reviews || 0,
    completedJobs: profile.completed_jobs || 0,
    price: profile.price_label || (profile.hourly_rate ? `${profile.hourly_rate} MZN` : "A negociar"),
    available: profile.available !== false,
    location:
      [user.city || profile.city, user.province || profile.province].filter(Boolean).join(", ") ||
      user.localizacao ||
      profile.localizacao ||
      "",
    tags: skills,
    raw: profile,
  };
}

const POST_TYPE = { vaga: "vaga", servico: "servico", geral: "post" };

export function mapPost(post) {
  const autor = post.autor || (post.author && typeof post.author === "object" ? post.author : {});
  const authorName = typeof post.author === "string" ? post.author : autor.nome || autor.name || "";
  const image = mediaUrl(
    post.image_url || post.image || (Array.isArray(post.imagens) ? post.imagens[0] : null)
  );
  const rawType = post.tipo_post || post.type;
  const type = POST_TYPE[rawType] || (rawType === "vaga" || rawType === "servico" ? rawType : "post");
  const text = post.descricao || post.content || "";
  const userId = post.user_id || post.author_id || autor.id;
  return {
    id: post.id,
    source: "post",
    postId: post.id,
    jobId: post.job_id,
    serviceId: post.service_id,
    type,
    title: post.titulo || post.title || text,
    content: text,
    description: text,
    author: authorName,
    company: authorName,
    avatar: mediaUrl(autor.foto_perfil || autor.avatar_url),
    role: autor.tipo === "empresa" || autor.user_type === "empresa" ? "Empresa" : "Candidato",
    user_id: userId,
    profile_type: "user",
    profile_id: userId,
    location: post.localizacao || [autor.city, autor.province].filter(Boolean).join(", "),
    salary: displayMoney(post.salario) || post.salario,
    price: displayMoney(post.salario || post.price) || post.salario || post.price,
    image,
    likes: post.likes_count || post.likes || 0,
    comments: post.comments_count || post.comments || 0,
    shares: post.shares_count || post.shares || 0,
    postedAt: post.postedAt || postedLabel(post.criado_em || post.created_at),
    impulsionado: !!post.impulsionado || !!post.boosted,
    raw: post,
  };
}

const PURPOSE_LABEL = {
  plan: "Plano",
  ad: "Anúncio",
  boost: "Impulso",
  payment: "Pagamento",
};

export function paymentStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["success", "paid", "completed", "confirmed", "succeeded"].includes(value)) return "success";
  if (["failed", "failure", "cancelled", "canceled", "error", "expired"].includes(value)) return "failed";
  return "pending";
}

function mapBillingPayment(payment) {
  return {
    id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency || "MZN",
    status: paymentStatus(payment.status),
    error: payment.failure_reason || payment.error || null,
    reference: payment.reference || null,
    msisdn: payment.msisdn || "",
    description: payment.description || PURPOSE_LABEL[payment.purpose] || "Pagamento",
    purpose: payment.purpose,
    criado_em: payment.created_at || payment.criado_em,
  };
}

function mapFeedItem(item) {
  const type = item.type || "post";
  const authorName =
    typeof item.author === "string" ? item.author : item.author?.name || item.author?.nome || "";
  const companyName =
    typeof item.company === "string" ? item.company : item.company?.name || authorName;
  return normalizeFeedItem({
    ...item,
    type,
    postId: item.postId || (type === "post" ? item.id : undefined),
    avatar: mediaUrl(item.avatar || item.avatar_url),
    image: mediaUrl(item.image || item.image_url),
    author: authorName || companyName,
    company: companyName || authorName,
    title: item.title || item.content || "",
    content: item.content || item.description || "",
    description: item.description || item.content || "",
    likes: item.likes ?? item.likes_count ?? 0,
    comments: item.comments ?? item.comments_count ?? 0,
    profile_id: item.profile_id || item.user_id || null,
    user_id: item.user_id || null,
  });
}

function mapUserAsCompanyCard(company) {
  const card = mapCompany(company);
  return {
    id: card.id,
    source: "user",
    type: "empresa",
    title: card.name,
    company: card.name,
    description: card.description,
    avatar: card.logo,
    location: card.location,
    profile_type: "user",
    profile_id: card.id,
    user_id: card.id,
    postedAt: postedLabel(company.criado_em || company.created_at || company.user?.created_at),
  };
}

async function loadDirectory(...paths) {
  let lastError = null;
  for (const path of paths) {
    try {
      const data = await apiRequest(path);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Não foi possível carregar a lista.");
}

export const armutraApi = {
  getFeed: async (type = null) => {
    const params = new URLSearchParams();
    params.set("limit", "40");
    if (type === "post" || type === "vaga" || type === "servico" || type === "empresa") {
      params.set("type", type);
    }
    try {
      const data = await apiRequest(`/feed?${params.toString()}`);
      if (Array.isArray(data)) return data.map(mapFeedItem);
    } catch {
      // A API local ainda lista publicações em /posts.
    }
    if (type === "empresa") {
      const rows = await loadDirectory("/empresas?limit=40", "/search/users?tipo=empresa&limit=40");
      return rows.map(mapUserAsCompanyCard);
    }
    const tipo = type === "post" ? "geral" : type === "vaga" || type === "servico" ? type : null;
    const local = new URLSearchParams();
    if (tipo) local.set("tipo", tipo);
    local.set("limit", "40");
    const data = await apiRequest(`/posts?${local.toString()}`);
    return Array.isArray(data) ? data.map((item) => normalizeFeedItem(mapPost(item))) : [];
  },
  createPost: (payload, token = null) =>
    apiRequest("/posts", { method: "POST", body: payload }, token),
  uploadPostImage: (formData, token = null) => uploadRequest("/uploads/images", formData, token),
  uploadAvatar: (formData, token = null) => uploadRequest("/uploads/images", formData, token),
  createService: (payload, token = null) =>
    apiRequest("/services", { method: "POST", body: payload }, token),
  createJob: (payload, token = null) =>
    apiRequest("/jobs", { method: "POST", body: payload }, token),
  getPost: (postId) => apiRequest(`/posts/${postId}`),
  getService: (serviceId) => apiRequest(`/services/${serviceId}`),
  getJob: (jobId) => apiRequest(`/jobs/${jobId}`),
  getComments: (postId) => apiRequest(`/posts/${postId}/comments`),
  likePost: (postId, token) => apiRequest(`/like/${postId}`, { method: "POST" }, token),
  commentPost: (postId, conteudo, token) =>
    apiRequest(`/comment/${postId}`, { method: "POST", body: { conteudo } }, token),
  sharePost: (postId, token) => apiRequest(`/share/${postId}`, { method: "POST" }, token),
  applyToJob: (jobId, payload, token = null) =>
    apiRequest(
      `/jobs/${jobId}/apply`,
      { method: "POST", body: { mensagem: payload?.mensagem || payload?.message || null } },
      token
    ),
  getMyJobs: (token) => apiRequest("/jobs/mine", {}, token),
  getJobsByCompany: async (userId) => {
    const params = new URLSearchParams({
      company_user_id: String(userId),
      empresa_user_id: String(userId),
      limit: "50",
    });
    const data = await apiRequest(`/jobs?${params.toString()}`);
    const rows = Array.isArray(data) ? data : [];
    return rows
      .filter((job) => {
        const owner = job.company_user_id || job.empresa_user_id;
        return !owner || String(owner) === String(userId);
      })
      .map(mapJob);
  },
  updateJob: (jobId, payload, token) =>
    apiRequest(`/jobs/${jobId}`, { method: "PATCH", body: payload }, token),
  deleteJob: (jobId, token) => apiRequest(`/jobs/${jobId}`, { method: "DELETE" }, token),
  getJobApplications: (jobId, token) => apiRequest(`/jobs/${jobId}/applications`, {}, token),
  updateApplication: (jobId, applicationId, estado, token) =>
    apiRequest(
      `/jobs/${jobId}/applications/${applicationId}`,
      { method: "PATCH", body: { estado } },
      token
    ),
  getMyApplications: (token) => apiRequest("/jobs/applications/mine", {}, token),
  getMyServices: async (userId, token) => {
    if (!userId) return [];
    const params = new URLSearchParams({
      owner_user_id: String(userId),
      user_id: String(userId),
      active_only: "false",
      limit: "50",
    });
    const data = await apiRequest(`/services?${params.toString()}`, {}, token);
    const rows = Array.isArray(data) ? data : [];
    return rows
      .filter((service) => {
        const owner = service.owner_user_id || service.user_id;
        return !owner || String(owner) === String(userId);
      })
      .map(mapServiceCard);
  },
  getServicesByUser: async (userId) => {
    if (!userId) return [];
    const params = new URLSearchParams({
      owner_user_id: String(userId),
      user_id: String(userId),
      limit: "50",
    });
    const data = await apiRequest(`/services?${params.toString()}`);
    const rows = Array.isArray(data) ? data : [];
    return rows
      .filter((service) => {
        const owner = service.owner_user_id || service.user_id;
        return !owner || String(owner) === String(userId);
      })
      .map(mapServiceCard);
  },
  deleteService: (serviceId, token) =>
    apiRequest(`/services/${serviceId}`, { method: "DELETE" }, token),
  sendMessage: (payload, token) =>
    apiRequest("/messages", { method: "POST", body: payload }, token),
  getConversations: (token) => apiRequest("/messages", {}, token),
  getMessages: (conversationId, token) => apiRequest(`/messages/${conversationId}`, {}, token),
  searchUsers: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return apiRequest(`/search/users?${query.toString()}`);
  },
  async getJobs() {
    const data = await apiRequest("/jobs");
    return data.map(mapJob);
  },
  async getCompanies() {
    const data = await loadDirectory("/empresas?limit=50", "/search/users?tipo=empresa&limit=50");
    return data.map(mapCompany);
  },
  async getFreelancers() {
    const data = await loadDirectory(
      "/freelancers?limit=50",
      "/search/users?tipo=freelancer&limit=50",
      "/search/users?tipo=candidato&limit=50"
    );
    return data.map(mapFreelancer);
  },
  getUser: (userId) => apiRequest(`/users/${userId}`),
  // Conexões (seguir para manter de perto)
  getConnectionCounts: async (userId) => {
    try {
      return await apiRequest(`/connections/${userId}/counts`);
    } catch {
      return { seguidores: 0, a_seguir: 0 };
    }
  },
  getConnectionStatus: async (userId, token) => {
    try {
      return await apiRequest(`/connections/${userId}/status`, {}, token);
    } catch {
      return null;
    }
  },
  followUser: (userId, token) =>
    apiRequest(`/connections/${userId}`, { method: "POST" }, token),
  unfollowUser: (userId, token) =>
    apiRequest(`/connections/${userId}`, { method: "DELETE" }, token),
  getFollowing: (token) => apiRequest("/connections/following", {}, token),
  getFollowers: (token) => apiRequest("/connections/followers", {}, token),
  // Pagamentos SkyWallet. As chaves ficam no servidor; o cliente só pede a ordem M-Pesa.
  getPlans: async () => {
    const data = await apiRequest("/plans");
    return Array.isArray(data) ? data.filter((plan) => plan.is_active !== false) : [];
  },
  getBilling: async (token) => {
    const data = await apiRequest("/billing", {}, token);
    return {
      mpesaEnabled: data?.mpesa_enabled !== false,
      payments: (data?.payments || []).map(mapBillingPayment),
      subscriptions: data?.subscriptions || [],
    };
  },
  createMpesaOrder: (payload, token) =>
    apiRequest("/billing/mpesa/order", { method: "POST", body: payload }, token),
  // Anúncios / boost (vaga, serviço ou publicação)
  getAdPlans: () => apiRequest("/ads/plans"),
  getBoostable: (token) => apiRequest("/ads/boostable", {}, token),
  getMyAds: (token) => apiRequest("/ads", {}, token),
  getAd: (adId, token) => apiRequest(`/ads/${adId}`, {}, token),
  createAd: (payload, token) => apiRequest("/ads", { method: "POST", body: payload }, token),
  payAd: (adId, payload, token) =>
    apiRequest(`/ads/${adId}/pay`, { method: "POST", body: payload }, token),
  // Notificações
  getNotifications: (token) => apiRequest("/notifications", {}, token),
  getUnreadNotificationCount: (token) =>
    apiRequest("/notifications/unread-count", {}, token),
  markNotificationRead: (id, token) =>
    apiRequest(`/notifications/${id}/read`, { method: "POST" }, token),
  markAllNotificationsRead: (token) =>
    apiRequest("/notifications/read-all", { method: "POST" }, token),
  getCompany: (companyId) => apiRequest(`/users/${companyId}`),
  getFreelancer: (freelancerId) => apiRequest(`/users/${freelancerId}`),
  getUserServices: async (userId) => {
    const services = await apiRequest("/services");
    return services.filter((service) => service.user_id === userId);
  },
};
