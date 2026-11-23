// Conexão com o Supabase, usada quando o app roda fora do Claude (ex.: GitHub Pages).
// A chave abaixo é a "publishable key": ela é feita para ficar no navegador e pode ser pública.
// Quem protege os dados é o login e as regras de RLS do banco (cada conta só vê os próprios registros).
// Apague este arquivo para voltar ao modo local (dados só no navegador).
window.DIARIO_SUPABASE = {
  url: "https://ymhhcignngbsrobwiyzo.supabase.co",
  key: "sb_publishable_nK-X1pyTQ4YIygQiqyMu6A_bmuIrGpN"
};
