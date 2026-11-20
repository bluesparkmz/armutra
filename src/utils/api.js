import { logError } from "@/utils/logger";
import { displayMoney, formatSalaryRange, normalizeFeedItem } from "@/utils/formatMoney";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://armutra.up.railway.app";

const REQUEST_TIMEOUT_MS = 15000;

async function parseResponse(response, options = {}) {
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
    if (__DEV__ && !options.silent && !(response.status === 404 && options.silent404)) {
      logError("api-response", textMessage, {
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
    return parseResponse(response, options);
  } catch (error) {
    if (__DEV__ && !options.silent && !/not found|404|aborted/i.test(error?.message || "")) {
      logError("api-request", error?.message || error, { url: `${API_URL}${path}` });
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
    const email = String(payload.email || "").trim().toLowerCase();
    const created = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: nome,
        nome,
        email,
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
    if (created?.access_token) return sessionFromToken(created);
    const token = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password: senha, senha },
    });
    return sessionFromToken(token);
  },
  async me(token) {
    const me = await apiRequest("/auth/me", {}, token);
    const full = await apiRequest(`/users/${me.id}`, {}, token);
    return mapUser({ ...full, is_admin: me.is_admin });
  },
  async updateMe(payload, token) {
    const name = payload.nome || payload.name;
    const avatar = payload.foto_perfil || payload.avatar_url || null;
    const place = splitLocation(payload.localizacao || joinLocation(payload));
    const liveBody = {};
    if (name) liveBody.name = name;
    if (payload.bio !== undefined) liveBody.bio = payload.bio;
    if (payload.phone !== undefined) liveBody.phone = payload.phone;
    if (avatar) liveBody.avatar_url = avatar;
    if (payload.province || place.province) liveBody.province = payload.province || place.province;
    if (payload.city || place.city) liveBody.city = payload.city || place.city;

    try {
      const updated = await apiRequest("/auth/me", { method: "PATCH", body: liveBody }, token);
      await syncPublicProfile(payload, token, updated?.id);
      const mapped = mapUser(updated);
      const profession = payload.candidato?.habilidades?.[0];
      if (profession) mapped.profession = profession;
      if (payload.empresa?.website) mapped.website = payload.empresa.website;
      return mapped;
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }

    const body = {};
    if (name) body.nome = name;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (avatar) {
      body.foto_perfil = avatar.startsWith(API_URL) ? avatar.slice(API_URL.length) : avatar;
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
    let admin = updated?.is_admin;
    try {
      const me = await apiRequest("/auth/me", {}, token);
      admin = me?.is_admin;
    } catch {
      admin = updated?.is_admin;
    }
    return mapUser({ ...updated, is_admin: admin });
  },
  async changePassword({ senha_atual, senha_nova }, token) {
    try {
      await apiRequest(
        "/auth/change-password",
        {
          method: "POST",
          body: {
            current_password: senha_atual,
            new_password: senha_nova,
          },
        },
        token
      );
      return true;
    } catch (error) {
      if (!/not found|não encontrado|nao encontrado/i.test(error?.message || "")) throw error;
    }
    await apiRequest(
      "/users/update",
      { method: "PUT", body: { senha_atual, senha_nova } },
      token
    );
    return true;
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
    image: mediaUrl(
      job.image_url ||
        job.image ||
        (Array.isArray(job.imagens) ? job.imagens[0] : null) ||
        job.empresa_foto ||
        companyUser.avatar_url
    ),
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
  const userId = company.id || user.id || company.user_id;
  return {
    id: userId,
    logo: mediaUrl(
      company.logo_url ||
        company.avatar_url ||
        user.avatar_url ||
        user.foto_perfil ||
        company.foto_perfil
    ),
    name:
      company.company_name ||
      empresa.nome_empresa ||
      company.name ||
      company.nome ||
      user.name ||
      user.nome ||
      "Empresa",
    area: company.industry || company.area || "Empresa",
    location:
      company.localizacao ||
      company.location ||
      [company.city || user.city, company.province || user.province].filter(Boolean).join(", ") ||
      "Moçambique",
    employees: company.employees_range || null,
    openJobs: company.open_jobs || 0,
    description:
      company.description ||
      empresa.descricao ||
      company.bio ||
      user.bio ||
      "Empresa cadastrada no Armutra.",
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

function isMissingRoute(error) {
  return /not found|não encontrado|nao encontrado/i.test(error?.message || "");
}

async function syncPublicProfile(payload, token, userId) {
  if (!token || !userId) return;
  try {
    if (payload.empresa) {
      const rows = await apiRequest("/empresas?limit=100", {}, token);
      const mine = (Array.isArray(rows) ? rows : []).find(
        (row) => String(row.user_id || row.user?.id) === String(userId)
      );
      if (mine?.id) {
        const empresa = payload.empresa;
        await apiRequest(
          `/empresas/${mine.id}`,
          {
            method: "PATCH",
            body: {
              company_name: empresa.nome_empresa || empresa.company_name || undefined,
              website: empresa.website,
              description: empresa.descricao || empresa.description || undefined,
            },
          },
          token
        );
      }
    }
    if (payload.candidato) {
      const rows = await apiRequest("/freelancers?limit=100", {}, token);
      const mine = (Array.isArray(rows) ? rows : []).find(
        (row) => String(row.user_id || row.user?.id) === String(userId)
      );
      const skills = payload.candidato.habilidades || [];
      if (mine?.id) {
        await apiRequest(
          `/freelancers/${mine.id}`,
          {
            method: "PATCH",
            body: {
              profession: skills[0] || undefined,
              skills: skills.length ? skills.join(", ") : undefined,
              bio: payload.candidato.experiencia || payload.bio || undefined,
              portfolio_url: payload.website || undefined,
            },
          },
          token
        );
      }
    }
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
  }
}

function uploadedFileUrl(data) {
  if (!data) return null;
  if (typeof data === "string") return data;
  return data.image_url || data.url || data.avatar_url || data.file_url || data.path || null;
}

async function uploadImage(paths, formData, token) {
  let lastError = null;
  for (const path of paths) {
    try {
      const data = await uploadRequest(path, formData, token);
      return { ...(data && typeof data === "object" ? data : {}), image_url: uploadedFileUrl(data) };
    } catch (error) {
      lastError = error;
      if (!isMissingRoute(error)) throw error;
    }
  }
  throw lastError;
}

function socialType(type) {
  if (type === "servico" || type === "service") return "service";
  if (type === "vaga" || type === "job") return "job";
  return "post";
}

function mapComment(item) {
  const user = item.user || {};
  return {
    ...item,
    conteudo: item.conteudo || item.content || "",
    autor_nome: item.autor_nome || user.nome || user.name || "Utilizador",
    criado_em: item.criado_em || item.created_at,
  };
}

async function likeTarget(targetId, token, extra = {}) {
  const targetType = socialType(extra.targetType);
  if (extra.userId) {
    try {
      return await apiRequest(
        "/social/likes",
        {
          method: "POST",
          body: { user_id: extra.userId, target_type: targetType, target_id: targetId },
        },
        token
      );
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }
  }
  try {
    return await apiRequest(`/like/${targetId}`, { method: "POST" }, token);
  } catch (error) {
    if (/já curtiu|ja curtiu|already/i.test(error?.message || "")) return { ok: true, liked: true };
    throw error;
  }
}

async function commentTarget(targetId, content, token, extra = {}) {
  const targetType = socialType(extra.targetType);
  if (extra.userId) {
    try {
      const created = await apiRequest(
        "/social/comments",
        {
          method: "POST",
          body: {
            user_id: extra.userId,
            target_type: targetType,
            target_id: targetId,
            content,
          },
        },
        token
      );
      return mapComment(created || {});
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }
  }
  const created = await apiRequest(
    `/comment/${targetId}`,
    { method: "POST", body: { conteudo: content } },
    token
  );
  return mapComment(created || { conteudo: content });
}

async function listComments(targetId, targetType = "post") {
  const type = socialType(targetType);
  try {
    const data = await apiRequest(
      `/social/comments?target_type=${encodeURIComponent(type)}&target_id=${encodeURIComponent(targetId)}`
    );
    return (Array.isArray(data) ? data : []).map(mapComment);
  } catch (error) {
    if (!isMissingRoute(error)) throw error;
  }
  if (type !== "post") return [];
  try {
    const data = await apiRequest(`/posts/${targetId}/comments`);
    return (Array.isArray(data) ? data : []).map(mapComment);
  } catch (error) {
    if (isMissingRoute(error)) return [];
    throw error;
  }
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

export function mapApplication(item) {
  if (!item) return item;
  const applicant = item.applicant || {};
  const job = item.job || {};
  const rawStatus = String(item.status || item.estado || "pendente").toLowerCase();
  const estadoMap = {
    pending: "pendente",
    accepted: "aceite",
    rejected: "recusada",
    pendente: "pendente",
    aceite: "aceite",
    recusada: "recusada",
  };
  const estado = estadoMap[rawStatus] || "pendente";

  return {
    id: item.id,
    job_id: item.job_id || job.id,
    candidato_user_id: item.applicant_user_id || applicant.id,
    candidato_nome: applicant.name || applicant.nome || item.candidato_nome || "Candidato",
    candidato_foto: applicant.avatar_url || applicant.foto_perfil || item.candidato_foto,
    vaga_titulo: job.title || job.titulo || item.vaga_titulo || "Vaga",
    job_image: mediaUrl(
      job.image_url ||
        job.image ||
        (Array.isArray(job.imagens) ? job.imagens[0] : null) ||
        job.company_user?.avatar_url ||
        item.job_image ||
        item.empresa_foto ||
        null
    ),
    empresa_nome:
      job.company_user?.company_profile?.company_name ||
      job.company_user?.name ||
      item.empresa_nome ||
      null,
    mensagem: item.cover_message || item.mensagem || item.message || "",
    cv_url: item.resume_url || item.cv_url || null,
    estado,
    status: estado,
    criado_em: item.created_at || item.criado_em,
    raw: item,
  };
}

function mapNotification(item) {
  if (!item) return null;
  const data = typeof item.data === "object" && item.data !== null ? item.data : {};
  const isRead = Boolean(item.read_at || item.lida);
  const tipo = item.type || item.tipo || "geral";
  return {
    id: item.id,
    user_id: item.user_id,
    tipo,
    type: tipo,
    titulo: item.title || item.titulo || "Notificação",
    title: item.title || item.titulo || "Notificação",
    mensagem: item.message || item.mensagem || "",
    message: item.message || item.mensagem || "",
    lida: isRead,
    read_at: item.read_at,
    criado_em: item.created_at || item.criado_em,
    created_at: item.created_at || item.criado_em,
    time: item.time,
    actor_id: data.actor_id || data.user_id || item.actor_id,
    ref_id: data.ref_id || data.conversation_id || data.job_id || item.ref_id,
    data,
    raw: item,
  };
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
  uploadPostImage: (formData, token = null) =>
    uploadImage(["/uploads/posts", "/uploads/images"], formData, token),
  uploadServiceImage: (formData, token = null) =>
    uploadImage(["/uploads/services", "/uploads/images"], formData, token),
  uploadAvatar: (formData, token = null) =>
    uploadImage(["/uploads/avatars", "/uploads/images"], formData, token),
  uploadDocument: async (formData, token = null) => {
    // Upload CV/document to backend; returns { document_url }
    try {
      const data = await uploadRequest("/uploads/applications", formData, token);
      return { ...(data && typeof data === "object" ? data : {}), document_url: data?.document_url || data?.url || data?.file_url || null };
    } catch (err) {
      if (isMissingRoute(err)) {
        // fallback path
        const data = await uploadRequest("/uploads/documents", formData, token);
        return { ...(data && typeof data === "object" ? data : {}), document_url: data?.document_url || data?.url || data?.file_url || null };
      }
      throw err;
    }
  },
  createService: (payload, token = null) =>
    apiRequest("/services", { method: "POST", body: payload }, token),
  createJob: (payload, token = null) =>
    apiRequest("/jobs", { method: "POST", body: payload }, token),
  getMyPosts: async (userId) => {
    if (!userId) return [];
    const params = new URLSearchParams({
      author_id: String(userId),
      user_id: String(userId),
      limit: "40",
    });
    const data = await apiRequest(`/posts?${params.toString()}`);
    const rows = Array.isArray(data) ? data : [];
    return rows
      .filter((post) => {
        const owner = post.author_id || post.user_id || post.autor?.id || post.author?.id;
        return !owner || String(owner) === String(userId);
      })
      .map((post) => {
        const mapped = mapPost(post);
        return {
          id: mapped.id,
          title: mapped.title || mapped.content || "Publicação",
          image: mapped.image,
          type: mapped.type || "post",
        };
      });
  },
  getPost: (postId) => apiRequest(`/posts/${postId}`),
  getService: (serviceId) => apiRequest(`/services/${serviceId}`),
  getJob: (jobId) => apiRequest(`/jobs/${jobId}`),
  getComments: (targetId, targetType = "post") => listComments(targetId, targetType),
  likePost: (targetId, token, extra = {}) => likeTarget(targetId, token, extra),
  commentPost: (targetId, conteudo, token, extra = {}) =>
    commentTarget(targetId, conteudo, token, extra),
  sharePost: (postId, token) => apiRequest(`/share/${postId}`, { method: "POST" }, token),
  applyToJob: async (jobId, payload, token = null) => {
    const msg = payload?.cover_message || payload?.mensagem || payload?.message || "";
    const resume = payload?.resume_url || payload?.cv_url || null;
    const body = {
      cover_message: msg,
      mensagem: msg,
      resume_url: resume,
      cv_url: resume,
    };
    try {
      return await apiRequest(`/jobs/${jobId}/applications`, { method: "POST", body }, token);
    } catch (err) {
      if (/not found|404|não encontrado/i.test(err?.message || "")) {
        return await apiRequest(`/jobs/${jobId}/apply`, { method: "POST", body }, token);
      }
      throw err;
    }
  },
  getMyJobs: async (token, userId = null) => {
    try {
      const data = await apiRequest("/jobs/mine", { silent: true }, token);
      return (Array.isArray(data) ? data : []).map(mapJob);
    } catch {
      if (userId) {
        return armutraApi.getJobsByCompany(userId);
      }
      return [];
    }
  },
  getJobsByCompany: async (userId) => {
    if (!userId) return [];
    try {
      const params = new URLSearchParams({
        company_user_id: String(userId),
        empresa_user_id: String(userId),
        limit: "50",
      });
      const data = await apiRequest(`/jobs?${params.toString()}`, { silent: true });
      const rows = Array.isArray(data) ? data : [];
      return rows
        .filter((job) => {
          const owner = job.company_user_id || job.empresa_user_id;
          return !owner || String(owner) === String(userId);
        })
        .map(mapJob);
    } catch {
      return [];
    }
  },
  updateJob: (jobId, payload, token) =>
    apiRequest(`/jobs/${jobId}`, { method: "PATCH", body: payload }, token),
  deleteJob: (jobId, token) => apiRequest(`/jobs/${jobId}`, { method: "DELETE" }, token),
  getJobApplications: async (jobId, token) => {
    try {
      const data = await apiRequest(`/jobs/${jobId}/applications`, { silent: true }, token);
      return (Array.isArray(data) ? data : []).map(mapApplication);
    } catch {
      return [];
    }
  },
  updateApplication: async (jobId, applicationId, estado, token) => {
    const statusMap = {
      aceite: "accepted",
      accepted: "accepted",
      recusada: "rejected",
      rejected: "rejected",
      pendente: "pending",
      pending: "pending",
    };
    const body = {
      status: statusMap[estado] || estado,
      estado,
    };
    try {
      return await apiRequest(`/jobs/applications/${applicationId}/status`, { method: "PATCH", body }, token);
    } catch {
      return await apiRequest(`/jobs/${jobId}/applications/${applicationId}`, { method: "PATCH", body }, token);
    }
  },
  getMyApplications: async (token, userId = null) => {
    try {
      const data = await apiRequest("/jobs/applications/mine", { silent: true }, token);
      return (Array.isArray(data) ? data : []).map(mapApplication);
    } catch {
      if (userId) {
        try {
          const fallback = await apiRequest(`/jobs/user/${userId}/applications`, { silent: true }, token);
          return (Array.isArray(fallback) ? fallback : []).map(mapApplication);
        } catch {
          return [];
        }
      }
      return [];
    }
  },
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
  sendMessage: async (payload, token) => {
    const content = payload.conteudo || payload.content || "";
    const recipientId = payload.destinatario_user_id || payload.recipient_id;
    const convId = payload.conversation_id;

    if (convId) {
      try {
        const msg = await apiRequest(
          `/chat/conversations/${convId}/messages`,
          { method: "POST", body: { content } },
          token
        );
        return { conversation_id: convId, message: msg };
      } catch {}
    }

    try {
      return await apiRequest(
        "/messages",
        { method: "POST", body: { destinatario_user_id: recipientId, conteudo: content } },
        token
      );
    } catch {}

    if (recipientId) {
      const conv = await apiRequest(
        "/chat/conversations",
        { method: "POST", body: { participant_id: recipientId } },
        token
      );
      const msg = await apiRequest(
        `/chat/conversations/${conv.id}/messages`,
        { method: "POST", body: { content } },
        token
      );
      return { conversation_id: conv.id, message: msg };
    }
  },
  getConversations: async (token, myUserId = null) => {
    try {
      const data = await apiRequest("/chat/conversations", { silent: true }, token);
      if (Array.isArray(data)) {
        return data.map((c) => {
          const other = c.participant_one_id === myUserId ? c.participant_two : c.participant_one;
          return {
            id: c.id,
            outro_user_id: other?.id,
            outro_nome: other?.name || "Utilizador",
            outro_foto: other?.avatar_url,
            ultima_mensagem: c.last_message?.content || "",
            unread_count: c.unread_count || 0,
            updated_at: c.updated_at,
          };
        });
      }
    } catch {}
    try {
      const fallback = await apiRequest("/messages", { silent: true }, token);
      return Array.isArray(fallback) ? fallback : [];
    } catch {
      return [];
    }
  },
  getMessages: async (conversationId, token) => {
    if (!conversationId) return { conversation_id: null, messages: [] };
    try {
      const data = await apiRequest(`/chat/conversations/${conversationId}/messages`, { silent: true }, token);
      if (Array.isArray(data)) {
        return {
          conversation_id: conversationId,
          messages: data.map((m) => ({
            id: m.id,
            sender_id: m.sender_id,
            conteudo: m.content,
            created_at: m.created_at,
          })),
        };
      }
    } catch {}
    try {
      const fallback = await apiRequest(`/messages/${conversationId}`, { silent: true }, token);
      return fallback || { conversation_id: conversationId, messages: [] };
    } catch {
      return { conversation_id: conversationId, messages: [] };
    }
  },
  searchUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search || params.q) query.set("search", params.search || params.q);
    if (params.user_type) query.set("user_type", params.user_type);
    query.set("limit", String(params.limit || 30));
    try {
      const users = await apiRequest(`/users?${query.toString()}`, { silent: true });
      if (Array.isArray(users)) return users.map(mapUser);
    } catch {}
    try {
      const users = await apiRequest(`/search/users?${query.toString()}`, { silent: true });
      if (Array.isArray(users)) return users.map(mapUser);
    } catch {}
    return [];
  },
  async getJobs() {
    const data = await apiRequest("/jobs");
    return data.map(mapJob);
  },
  async getCompanies() {
    try {
      const data = await apiRequest("/empresas?limit=50", { silent: true });
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapCompany);
      }
    } catch {}

    try {
      const users = await apiRequest("/users?user_type=empresa&limit=50", { silent: true });
      if (Array.isArray(users) && users.length > 0) {
        return users.map(mapCompany);
      }
    } catch {}

    return [];
  },
  async getFreelancers() {
    try {
      const data = await apiRequest("/freelancers?limit=50", { silent: true });
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapFreelancer);
      }
    } catch {}

    try {
      const users = await apiRequest("/users?user_type=freelancer&limit=50", { silent: true });
      if (Array.isArray(users) && users.length > 0) {
        return users.map(mapFreelancer);
      }
    } catch {}

    return [];
  },
  getUser: (userId) => apiRequest(`/users/${userId}`),
  // Conexões (seguir para manter de perto)
  getConnectionCounts: async (userId) => {
    if (!userId) return { seguidores: 0, a_seguir: 0 };
    try {
      return await apiRequest(`/connections/${userId}/counts`, { silent: true });
    } catch {
      return { seguidores: 0, a_seguir: 0 };
    }
  },
  getConnectionStatus: async (userId, token) => {
    if (!userId || !token) return null;
    try {
      return await apiRequest(`/connections/${userId}/status`, { silent: true }, token);
    } catch {
      return null;
    }
  },
  followUser: async (userId, token) => {
    const data = await apiRequest(`/connections/${userId}`, { method: "POST" }, token);
    return data;
  },
  unfollowUser: async (userId, token) => {
    const data = await apiRequest(`/connections/${userId}`, { method: "DELETE" }, token);
    return data;
  },
  getFollowing: async (token) => {
    try {
      return await apiRequest("/connections/following", { silent: true }, token);
    } catch {
      return [];
    }
  },
  getFollowers: async (token) => {
    try {
      return await apiRequest("/connections/followers", { silent: true }, token);
    } catch {
      return [];
    }
  },
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
  getNotifications: async (token) => {
    try {
      const data = await apiRequest("/notifications", {}, token);
      return Array.isArray(data) ? data.map(mapNotification).filter(Boolean) : [];
    } catch {
      return [];
    }
  },
  getUnreadNotificationCount: async (token) => {
    if (!token) return { nao_lidas: 0, unread_count: 0 };
    try {
      return await apiRequest("/notifications/unread-count", { silent: true }, token);
    } catch {
      try {
        const notifs = await apiRequest("/notifications?limit=50", { silent: true }, token);
        const unread = Array.isArray(notifs)
          ? notifs.filter((n) => !n.read_at && !n.lida).length
          : 0;
        return { nao_lidas: unread, unread_count: unread };
      } catch {
        return { nao_lidas: 0, unread_count: 0 };
      }
    }
  },
  markNotificationRead: async (id, token) => {
    try {
      return await apiRequest(`/notifications/${id}/read`, { method: "PATCH" }, token);
    } catch {
      return await apiRequest(`/notifications/${id}/read`, { method: "POST" }, token);
    }
  },
  markAllNotificationsRead: async (token) => {
    try {
      return await apiRequest("/notifications/mark-all-read", { method: "POST" }, token);
    } catch {
      return await apiRequest("/notifications/read-all", { method: "POST" }, token);
    }
  },
  getCompany: (companyId) => apiRequest(`/users/${companyId}`),
  getFreelancer: (freelancerId) => apiRequest(`/users/${freelancerId}`),
  getUserServices: async (userId) => {
    const services = await apiRequest("/services");
    return services.filter((service) => service.user_id === userId);
  },
};
