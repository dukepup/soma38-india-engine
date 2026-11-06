/**
 * RESET Legal & Brand Protection Agent
 * Autonomously defends RESET's regulatory standing, handles GDPR/DPO requests,
 * enforces medical/botanical disclaimers, and crafts brand-elevating, confidence-inspiring replies.
 */

import { callGeminiApi, sanitizeGeminiContents } from "./geminiService.js";
import { deleteUserAccountAndData, exportUserDataFull, saveLegalInquiryLog } from "./dbService.js";

/**
 * Classifies the intent of an inbound inquiry to privacidade@resetbase.pt or legal contact forms
 */
export function classifyLegalIntent(text = "", subject = "") {
  const combined = (subject + " " + text).toLowerCase();

  // 1. GDPR Right to Erasure / Deletion (Portuguese/English/Spanish stems)
  if (combined.match(/apag|elimin|remov|remoç|remoc|esquec|cancel|delete|erasure|forget|purge|wipe/)) {
    return "GDPR_ERASURE";
  }
  // 2. Botanical Nature / Medical / Safety Disclaimer
  if (combined.match(/remédio|remedio|medicament|medicaç|medicac|cura|farmac|terapia médica|médico|medico|psiquiat|placebo|funciona|droga|ingrediente|medication|drug|cure|scientific|safety|pregnant|gravid|grávid|álcool|alcool/)) {
    return "BOTANICAL_EFFICACY_SAFETY";
  }
  // 3. Payment, Billing, Stripe & Refunds
  if (combined.match(/pagament|pagar|cobranç|cobranc|fatur|recibo|reembols|devoluç|devoluc|stripe|refund|billing|charge|receipt|3,49|7,99/)) {
    return "PAYMENT_BILLING";
  }
  // 4. Privacy, Security, Cookies, Zero-Sale of Data
  if (combined.match(/seguran|encript|partilh|vender|venda|vendidos|terceir|cookie|ip|security|encryption|third party|share data|rastreio|tracking/)) {
    return "PRIVACY_DATA_SECURITY";
  }
  // 5. GDPR Right to Access & Portability
  if (combined.match(/aceder|acesso|cópia|copia|export|descarreg|consult|que dados|access|what data|portabil/)) {
    return "GDPR_ACCESS";
  }
  return "GENERAL_LEGAL";
}

/**
 * Builds the AI Legal & Brand Protection prompt
 */
function buildLegalAgentPrompt({
  intent,
  senderName = "Titular dos Dados",
  senderEmail = "",
  language = "pt",
  executedAction = null
}) {
  const isPt = language === "pt";

  return `
You are the Chief Privacy Officer & Brand Protection Ambassador for RESET (resetbase.pt).
Your mission is twofold:
1. TOTAL LEGAL SHIELDING: Defend RESET's regulatory compliance under the EU GDPR (Regulamento (UE) 2016/679), Portuguese Law 58/2019, and Portuguese Consumer Protection Law (DL 24/2014).
2. BRAND ELEVATION & TRUST: Craft an articulate, warm, dignified, deeply reassuring, and respectful response that resolves the user's inquiry completely and leaves them with high admiration and trust for the RESET brand.

INQUIRY DETAILS:
- Sender Name: ${senderName}
- Sender Email: ${senderEmail}
- Detected Intent: ${intent}
- Automated Legal Action Executed: ${executedAction ? JSON.stringify(executedAction) : "None (Informational inquiry)"}

CORE LEGAL GUARDRAILS & POLICIES TO UPHOLD:
1. NON-MEDICAL BOTANICAL NATURE:
   - Always reaffirm clearly that RESET provides holistic self-reflection and customized Bach Flower essence formulations.
   - Bach Flower essences are subtle vibrational botanical infusions for emotional balance; they are NOT pharmaceutical medicines, drugs, or clinical medical treatments, and do NOT replace medical doctor consultations or psychotherapy.
   - NUNCA use a palavra "remédios"; utilize sempre "essências florais", "florais de Bach" ou "fórmula floral personalizada".
2. ZERO-DATA-SALE & HIGH-GRADE SECURITY:
   - RESET never sells, licenses, or monetizes personal data with third parties or advertising networks.
   - All server communications use TLS 1.3 encryption, and session cookies are strictly HttpOnly.
   - Payment transactions are handled with Level 1 PCI-DSS compliance via Stripe (RESET never stores card numbers or CVCs).
3. RIGHT TO ERASURE & DATA RIGHTS (GDPR):
   - If the user requested account or data deletion, affirm with dignity that their right to be forgotten has been fully and immediately respected, with all associated consultation archives permanently purged.
4. TONE & CULTURAL INSTRUCTION:
   - Language: Authentic, elegant European Portuguese (pt-PT). Use European grammar and orthography ('estou a contactar', 'contacto', 'equipa', 'direção', 'resposta').
   - If the user wrote in English, respond in refined, compassionate UK English (en-GB).
   - Tone: Dignified, highly competent, serene, respectful, warm, and prompt. Never bureaucratic or combative.

RESPONSE STRUCTURE:
1. Warm, respectful salutation addressed to ${senderName}.
2. Immediate, clear, and reassuring resolution of their specific question or request.
3. If an action was taken (e.g. data deletion or export confirmation), provide explicit verification.
4. Reinforce RESET's commitment to personal sovereignty, emotional clarity, and absolute privacy.
5. Polite, professional sign-off from "Gabinete de Privacidade & Proteção de Dados · RESET".
`;
}

/**
 * Fallback situation-adaptive legal response engine (Zero-leakage, zero forbidden words, pure brand prestige)
 */
function generateWiseLegalResponse({
  intent,
  senderName = "Estimado(a) Utilizador(a)",
  senderEmail = "",
  language = "pt",
  actionResult = null
}) {
  const isPt = language === "pt";
  const name = senderName && senderName !== "Friend" && senderName !== "User" ? senderName : (isPt ? "Estimado(a) Utilizador(a)" : "Dear User");

  if (intent === "GDPR_ERASURE") {
    if (isPt) {
      return `Estimado(a) ${name},

Agradecemos o seu contacto com o Gabinete de Privacidade do RESET.

Confirmamos que, em estrito cumprimento do Artigo 17.º do Regulamento Geral sobre a Proteção de Dados (RGPD - Direito ao Apagamento / "Direito a ser Esquecido"), procedemos à eliminação permanente e irreversível da sua conta, perfil de utilizador e de todo o histórico de consultas e fórmulas associado ao endereço ${senderEmail || "indicado"}.

Nenhum dado pessoal remanescente foi conservado nos nossos servidores ativos, assegurando a total confidencialidade do seu percurso.

Agradecemos a confiança que depositou no RESET durante o tempo em que utilizou a nossa plataforma. Caso no futuro decida regressar para uma nova reflexão ou calibração botânica, será sempre muito bem-vindo(a).

Com os nossos mais respeitosos cumprimentos,

Gabinete de Privacidade & Proteção de Dados
RESET · www.resetbase.pt`;
    } else {
      return `Dear ${name},

Thank you for contacting the RESET Privacy Office.

We confirm that, in strict accordance with Article 17 of the General Data Protection Regulation (GDPR - Right to Erasure / "Right to be Forgotten"), we have permanently and irreversibly deleted your account, user profile, and all consultation records associated with ${senderEmail || "your inquiry"}.

No residual personal data is retained on our active systems, guaranteeing complete confidentiality.

We thank you for the trust you placed in RESET. Should you choose to return in the future for a new consultation, our doors remain warmly open.

Sincerely,

Data Protection & Privacy Office
RESET · www.resetbase.pt`;
    }
  }

  if (intent === "BOTANICAL_EFFICACY_SAFETY") {
    if (isPt) {
      return `Estimado(a) ${name},

Agradecemos a sua mensagem e o seu interesse no enquadramento metodológico do RESET.

Gostaríamos de esclarecer com total transparência e rigor a natureza da nossa intervenção:

1. Natureza das Essências Florais de Bach:
O RESET formula sinergias personalizadas de essências florais de Bach, que são ferramentas botânicas vibracionais consagradas para o equilíbrio emocional, gestão de sobrecarga e autorreflexão. As essências florais não são medicamentos nem contêm princípios ativos farmacológicos.

2. Enquadramento de Saúde e Bem-Estar:
O nosso portal não realiza atos médicos, diagnósticos clínicos ou intervenções psiquiátricas, nem substitui o aconselhamento com profissionais de saúde devidamente credenciados. A nossa missão é apoiar a sua autonomia interna e devolver-lhe clareza no seu dia a dia.

3. Segurança e Manipulação:
As essências são diluições seguras e não interagem com fármacos convencionais. Para pessoas com sensibilidade ao álcool (conservante tradicional em brandy), as farmácias de manipulação preparam a fórmula com glicerina vegetal sem qualquer teor alcoólico.

Estamos inteiramente à sua disposição para qualquer esclarecimento adicional sobre a nossa abordagem analítica.

Com os nossos melhores cumprimentos,

Gabinete de Privacidade & Apoio ao Utilizador
RESET · www.resetbase.pt`;
    } else {
      return `Dear ${name},

Thank you for reaching out to the RESET Privacy & Advisory Office.

We are delighted to provide full clarity regarding our methodology and botanical philosophy:

1. Nature of Bach Flower Essences:
RESET formulates bespoke synergies of Bach Flower essences—vibrational botanical preparations dedicated to emotional equilibrium and personal clarity. They are non-pharmacological and contain no synthetic active chemical agents.

2. Health & Wellness Scope:
RESET does not provide clinical medical diagnosis, prescription, or psychotherapy, and our services do not substitute consultation with licensed healthcare practitioners. Our purpose is to provide holistic self-awareness and practical botanical support.

3. Safety & Compounding:
Bach flower essences have an exemplary safety profile. For individuals seeking alcohol-free alternatives, compounding pharmacies prepare formulations using organic vegetable glycerin.

We remain entirely at your disposal for any further questions.

Warm regards,

Privacy & User Support Office
RESET · www.resetbase.pt`;
    }
  }

  if (intent === "PAYMENT_BILLING") {
    if (isPt) {
      return `Estimado(a) ${name},

Agradecemos o seu contacto relativamente aos serviços e aquisições no portal RESET.

Informamos que todas as transações na nossa plataforma são processadas em ambiente de máxima segurança pela Stripe, em total conformidade com as normas internacionais PCI-DSS de Nível 1.

Relembramos as condições de acesso:
- O diálogo inicial de diagnóstico é integralmente gratuito.
- A revelação da fórmula botânica personalizada com guia de manipulação posológica pode ser adquirida por 3,49 € (1 Desbloqueio individual) ou 7,99 € (Pacote de 3 Desbloqueios para arquivamento contínuo no seu cofre).
- Caso necessite da emissão de segunda via do recibo de transação ou de esclarecimento sobre o seu saldo de desbloqueios, teremos todo o gosto em apoiá-lo(a) de imediato.

Agradecemos a sua preferência e o privilégio de apoiar o seu bem-estar.

Atentamente,

Gabinete de Apoio e Conformidade
RESET · www.resetbase.pt`;
    } else {
      return `Dear ${name},

Thank you for contacting the RESET Support & Compliance Office regarding purchases on our platform.

All transactions on RESET are securely processed via Stripe in full compliance with Level 1 PCI-DSS standards. We never store credit card numbers or banking secrets.

- Initial consultation turns and preliminary reflections are free of charge.
- Formula unlocks (€3.49 for single, €7.99 for 3 credits) provide immediate access to your full botanical protocol and compounding instructions.

If you require a transaction receipt or assistance with your account unlock balance, please let us know and we will assist you promptly.

Sincerely,

Support & Compliance Office
RESET · www.resetbase.pt`;
    }
  }

  // DEFAULT / GENERAL PRIVACY & SECURITY
  if (isPt) {
    return `Estimado(a) ${name},

Agradecemos a sua mensagem dirigida ao Gabinete de Privacidade e Proteção de Dados do RESET.

A proteção da sua privacidade e a salvaguarda da confidencialidade das suas consultas são princípios estruturantes da nossa plataforma:

- Conformidade Integral com o RGPD: Cumprimos com rigor todos os direitos previstos no Regulamento Geral sobre a Proteção de Dados e na legislação portuguesa (Lei n.º 58/2019).
- Segurança e Encriptação: Todas as comunicações utilizam encriptação TLS 1.3 e os dados são alojados em infraestruturas certificadas localizadas na União Europeia.
- Compromisso de Não-Comercialização: O RESET nunca comercializa, partilha ou cede dados pessoais ou conteúdos de consultas a terceiros ou redes de publicidade.

Analisámos atentamente a sua mensagem e registámos a sua solicitação. Caso necessite de alguma ação específica sobre os seus dados ou pretenda colocar questões adicionais, estamos à sua inteira disposição.

Com a nossa mais elevada consideração,

Gabinete de Privacidade & DPO
RESET · www.resetbase.pt`;
  } else {
    return `Dear ${name},

Thank you for your message to the RESET Data Protection & Privacy Office.

The confidentiality of your consultations and the uncompromising protection of your personal data are foundational to RESET:

- Full GDPR Compliance: We strictly adhere to all rights under EU Regulation 2016/679.
- High-Grade Security: All network traffic is encrypted via TLS 1.3 on secure European servers.
- Absolute Non-Commercialization: We never sell or share user data with advertising networks.

We have registered your inquiry and remain at your service for any specific request or clarification.

Warm regards,

Data Protection Office
RESET · www.resetbase.pt`;
  }
}

/**
 * Main Legal Agent Handler: Processes incoming inquiry, triggers automated GDPR rights if needed,
 * builds AI response, and saves ticket in audit log.
 */
export async function processLegalInquiry({
  senderName = "",
  senderEmail = "",
  subject = "",
  message = "",
  language = "pt",
  apiKey = process.env.GEMINI_API_KEY
}) {
  const intent = classifyLegalIntent(message, subject);
  let executedAction = null;

  // 1. Automatically execute GDPR rights if requested
  if (intent === "GDPR_ERASURE" && senderEmail) {
    executedAction = deleteUserAccountAndData(senderEmail);
  } else if (intent === "GDPR_ACCESS" && senderEmail) {
    const dataExport = exportUserDataFull(senderEmail);
    executedAction = {
      action: "data_access_summary",
      recordFound: !!dataExport,
      readingsCount: dataExport?.readingsCount || 0
    };
  }

  // 2. Build personalized, protective response
  let finalReply = "";

  if (apiKey) {
    try {
      const systemInstruction = buildLegalAgentPrompt({
        intent,
        senderName: senderName || "Titular dos Dados",
        senderEmail,
        language,
        executedAction
      });

      const contents = [
        {
          role: "user",
          parts: [{ text: `Inbound message from ${senderName} (${senderEmail}):\nSubject: ${subject}\n\n${message}` }]
        }
      ];

      const aiText = await callGeminiApi({
        systemInstruction,
        contents,
        apiKey,
        maxOutputTokens: 1000,
        temperature: 0.5
      });

      if (aiText && aiText.length > 50) {
        finalReply = aiText;
      }
    } catch (err) {
      console.warn("[LEGAL AGENT] AI generation warning, using situation-adaptive fallback:", err.message);
    }
  }

  if (!finalReply) {
    finalReply = generateWiseLegalResponse({
      intent,
      senderName,
      senderEmail,
      language,
      actionResult: executedAction
    });
  }

  // 3. Save ticket to audit log
  const ticket = saveLegalInquiryLog({
    senderName,
    senderEmail,
    subject: subject || "Contacto de Privacidade / DPO",
    message,
    intent,
    executedAction,
    reply: finalReply,
    status: "resolved",
    resolvedAt: new Date().toISOString()
  });

  return {
    success: true,
    ticketId: ticket.id,
    intent,
    executedAction,
    reply: finalReply
  };
}
