/** Dados de exemplo (apenas UI) para Conexões — substituir pela API quando existir. */

export const CONNECTION_KINDS = {
  empresa: "Empresa",
  freelancer: "Freelancer",
  user: "Utilizador",
};

export const mockConnections = [
  { id: "c1", kind: "empresa", name: "Vodacom Moçambique", headline: "Telecomunicações · Maputo", mutual: 12 },
  { id: "c2", kind: "freelancer", name: "Ana Macuácua", headline: "Designer UI/UX · Matola", mutual: 8 },
  { id: "c3", kind: "user", name: "Carlos Nhantumbo", headline: "Gestor de projectos · Beira", mutual: 5 },
  { id: "c4", kind: "freelancer", name: "Nelson Chongo", headline: "Desenvolvedor Web · Maputo", mutual: 3 },
];

export const mockRequests = [
  { id: "r1", kind: "empresa", name: "Tecno Soluções, Lda", headline: "Tecnologia · Maputo", mutual: 4 },
  { id: "r2", kind: "user", name: "Marta Sitoe", headline: "Contabilista · Xai-Xai", mutual: 2 },
];

export const mockSuggestions = [
  { id: "s1", kind: "empresa", name: "BCI Banco", headline: "Serviços financeiros · Maputo", mutual: 9 },
  { id: "s2", kind: "freelancer", name: "Jorge Tembe", headline: "Fotógrafo · Maputo", mutual: 6 },
  { id: "s3", kind: "user", name: "Lúcia Mondlane", headline: "Professora · Nampula", mutual: 1 },
  { id: "s4", kind: "freelancer", name: "Paulo Cossa", headline: "Electricista · Matola", mutual: 7 },
];
