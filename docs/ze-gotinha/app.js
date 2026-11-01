(() => {
  'use strict';
  const CHAT_KEY = 'zap-ze-gotinha-chat-v1';
  const VISITOR_KEY = 'zap-ze-gotinha-visitor-v1';
  const VALID_MODES = ['curiosidade','quiz','fake-news','livre','fortalece'];
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  let currentMode = 'livre';
  const apiUrl = String(window.ZE_CONFIG?.API_URL || '').trim().replace(/\/+$/, '');
  const hasApi = /^https?:\/\//i.test(apiUrl);

  const els = {
    form: document.getElementById('chat-form'), input: document.getElementById('message-input'),
    send: document.getElementById('send-button'), messages: document.getElementById('chat-messages'),
    scroller: document.getElementById('chat-scroll'), typing: document.getElementById('typing'),
    status: document.getElementById('connection-status'), notice: document.getElementById('mode-notice'),
    chips: document.querySelectorAll('[data-question]'), voice: document.getElementById('voice-toggle'),
    reset: document.getElementById('reset-chat'), dialog: document.getElementById('clear-dialog'),
    cancel: document.getElementById('cancel-clear'), confirm: document.getElementById('confirm-clear')
  };
  const demoQuestions = [
    { text: 'Qual destas atitudes ajuda a prevenir doenças?\n\nA) Lavar as mãos com água e sabão\nB) Compartilhar objetos de higiene\nC) Não beber água', answer: 'a', detail: 'Lavar as mãos com água e sabão ajuda a prevenir a transmissão de muitos microrganismos.' },
    { text: 'O que significa SUS?\n\nA) Serviço Unificado de Socorro\nB) Sistema Único de Saúde\nC) Secretaria Universal de Saúde', answer: 'b', detail: 'O SUS é o Sistema Único de Saúde, uma conquista para todas as pessoas no Brasil!' },
    { text: 'O Programa Saúde na Escola (PSE) conecta quais áreas?\n\nA) Esporte e turismo\nB) Transporte e comércio\nC) Saúde e educação', answer: 'c', detail: 'Isso! O PSE aproxima saúde e educação para promover cuidado e prevenção no ambiente escolar.' }
  ];
  const safeLoad = () => { try { return JSON.parse(sessionStorage.getItem(CHAT_KEY) || '{}'); } catch { return {}; } };
  const initial = safeLoad();
  let messages = Array.isArray(initial.messages) ? initial.messages.filter(x => x && ['user','assistant'].includes(x.role) && typeof x.content === 'string').slice(-40) : [];
  let quiz = initial.quiz && Number.isInteger(initial.quiz.index) && initial.mode === 'quiz' ? initial.quiz : null;
  currentMode = VALID_MODES.includes(initial.mode) ? initial.mode : 'livre';
  modeButtons.forEach(b=>{const chosen=b.dataset.mode === currentMode;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
  let loading = false;
  let voiceOn = false;
  let controller = null;
  const visitorId = (() => { try { let id = sessionStorage.getItem(VISITOR_KEY); if (!id) { id = globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2); sessionStorage.setItem(VISITOR_KEY, id); } return id; } catch { return 'anonymous'; } })();

  function save() { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify({ messages: messages.slice(-40), quiz, mode: currentMode })); } catch {} }
  function getTime() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  document.getElementById('welcome-time').firstChild.textContent = getTime() + ' ';

  function renderMessage(msg) {
    const outer = document.createElement('div');
    outer.className = `message message-${msg.role === 'user' ? 'user' : 'bot'}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (msg.error) bubble.style.border = '1px solid #f3b69b';
    const content = document.createElement('div');
    content.className = 'bubble-content';
    content.textContent = msg.content;
    const time = document.createElement('span');
    time.className = 'bubble-meta';
    time.textContent = msg.time || getTime();
    if (msg.role === 'user') {
      const ticks = document.createElement('span');
      ticks.textContent = ' ✓✓';
      time.append(ticks);
    }
    bubble.append(content, time);
    outer.append(bubble);
    els.messages.append(outer);
    scrollDown();
  }
  function scrollDown() { requestAnimationFrame(() => { els.scroller.scrollTop = els.scroller.scrollHeight; }); }
  messages.forEach(renderMessage);
  scrollDown();
  function add(role, content, opts = {}) {
    const msg = { role, content, time: getTime(), ...opts };
    messages.push(msg);
    renderMessage(msg);
    save();
    if (role === 'assistant' && voiceOn && !opts.error) speak(content);
  }
  function setStatus(message, kind, bold) {
    els.status.textContent = message;
    els.notice.className = 'mode-notice' + (kind === 'connected' ? ' connected' : kind === 'error' ? ' error' : '');
    els.notice.querySelector('span:last-child').replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = bold;
    els.notice.querySelector('span:last-child').append(strong, document.createTextNode(message === 'Modo demonstração • respostas de exemplo'
      ? ' Respostas de exemplo para conhecer o site. Ative o servidor para respostas com IA.'
      : kind === 'connected' ? ' Suas perguntas são processadas por um serviço de IA para gerar respostas.'
      : ' Não foi possível confirmar a conexão. Verifique o servidor e tente novamente.'));
  }
  async function checkHealth() {
    if (!hasApi) { setStatus('Modo demonstração • respostas de exemplo', 'demo', 'Versão de teste.'); return; }
    setStatus('Verificando conexão com a IA…', 'demo', 'Conectando.');
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (res.ok && data.aiReady) setStatus('IA disponível para conversar', 'connected', 'IA ativa.');
      else setStatus('Configuração da IA pendente', 'error', 'Atenção.');
    } catch { setStatus('Não foi possível verificar a IA', 'error', 'Conexão indisponível.'); }
  }
  checkHealth();

  function normalize(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function demoReply(question) {
    const plain = normalize(question);
    if(currentMode === 'fake-news') {
      if(/autismo/.test(plain) && /vacina/.test(plain)) return 'Essa afirmação é falsa: pesquisas científicas não demonstram que vacinas causem autismo. 💉 Para dúvidas sobre segurança e calendário, consulte o Ministério da Saúde: gov.br/saude.';
      return 'No modo demonstração eu não consigo verificar essa afirmação com fontes em tempo real. Quando a IA for ativada, vou ajudar a separar fatos de boatos — sem fingir que consultei a internet. Consulte gov.br/saude para informações oficiais.';
    }
    if(currentMode === 'fortalece') return 'A 1ª Mostra Nacional Fortalece PSE acontece em Brasília nos dias 24 e 25 de novembro de 2026. O projeto fortalece a integração entre saúde e educação e valoriza a participação juvenil. Para programação, inscrições ou detalhes específicos, consulte a organização.';
    if(currentMode === 'curiosidade') return 'Olha só: o SUS não atua apenas em consultas e hospitais! Ele também participa da vacinação, da vigilância em saúde e de ações para prevenir doenças. 💙 Quer outra curiosidade?';
    if(currentMode === 'quiz' && !quiz) { quiz={index:0,score:0};save();return 'Bora pro desafio! 🎯 Responda com A, B ou C.\n\nPergunta 1 de '+demoQuestions.length+':\n'+demoQuestions[0].text; }
    const q = normalize(question.trim());
    if (quiz) {
      if (/^(sair|parar|cancelar)/.test(q)) { quiz = null; save(); return 'Combinado! Quiz encerrado. 💚 Quando quiser jogar de novo, é só me chamar!'; }
      const match = q.match(/^([abc])(?:\b|\W|$)/);
      if (!match) return 'Manda sua resposta com a letra A, B ou C! 😄 Se quiser parar, escreva “sair”.';
      const item = demoQuestions[quiz.index];
      const correct = match[1] === item.answer;
      quiz.score += correct ? 1 : 0;
      const intro = correct ? 'Acertou! 🎉 ' : `Quase! A resposta correta é ${item.answer.toUpperCase()}. 💚 `;
      const explanation = intro + item.detail;
      quiz.index++;
      if (quiz.index >= demoQuestions.length) {
        const result = quiz.score;
        quiz = null;
        save();
        return `${explanation}\n\n🏁 Fim do quiz! Você acertou ${result} de ${demoQuestions.length} perguntas! Quer jogar de novo?`;
      }
      const next = demoQuestions[quiz.index];
      save();
      return `${explanation}\n\nPergunta ${quiz.index + 1} de ${demoQuestions.length}:\n${next.text}`;
    }
    if (/(quiz|jogar|brincadeira|perguntas e respostas)/.test(q)) {
      quiz = { index: 0, score: 0 };
      save();
      return `Obaaa, vamos jogar! 🎲 Responda com A, B ou C.\n\nPergunta 1 de ${demoQuestions.length}:\n${demoQuestions[0].text}`;
    }
    if (/(vacina|vacinacao|imuniza|dose|gotinha)/.test(q)) return 'As vacinas ajudam o nosso corpo a se preparar para enfrentar determinadas doenças. 💉💚 Elas protegem quem se vacina e, quando muitas pessoas estão protegidas, também ajudam a cuidar da comunidade. Que tal conferir a sua caderneta de vacinação na unidade de saúde?';
    if (/(pse|programa saude na escola|saude na escola|fortalece)/.test(q)) return 'O Programa Saúde na Escola (PSE) é uma parceria entre saúde e educação! 🏫💚 Ele promove ações como vacinação, alimentação saudável, cuidado com a saúde mental e prevenção de doenças nas escolas. O Fortalece PSE valoriza a participação dos estudantes nessas ações.';
    if (/(sus|posto de saude|unidade de saude|ubs)/.test(q)) return 'Você sabia que o SUS é um dos maiores sistemas públicos de saúde do mundo? 💚 No Brasil, ele garante acesso universal à saúde e está presente na vacinação, no atendimento nas UBS, na vigilância em saúde e em muitos outros cuidados!';
    if (/(mao|maos|higiene|lavar)/.test(q)) return 'Lavar as mãos com água e sabão é uma atitude simples e poderosa! 🧼 Faça isso antes de comer, depois de usar o banheiro e ao chegar da rua. Se não houver sujeira visível, álcool em gel também pode ajudar em várias situações.';
    if (/(comida|aliment|nutri|agua)/.test(q)) return 'Cuidar da alimentação é um jeito de cuidar da vida! 🥗💚 Sempre que possível, vale priorizar alimentos variados e pouco processados, beber água e valorizar refeições feitas com calma. Pequenos hábitos fazem diferença!';
    if (/(ansie|triste|depress|mental|emoc|bullying)/.test(q)) return 'Saúde mental também é saúde. 💚 Conversar com alguém de confiança, buscar acolhimento na escola e procurar uma equipe de saúde quando necessário pode ajudar muito. Você merece ser ouvido(a)!';
    if (/(oi|ola|bom dia|boa tarde|boa noite|tudo bem)/.test(q)) return 'Ooooi! 👋💚 Por aqui tudo ótimo e cheio de curiosidade! Quer falar de vacinas, conhecer o PSE ou jogar um quiz comigo?';
    return 'Adorei a pergunta! 💚 Nesta demonstração eu consigo conversar sobre vacinação, SUS, higiene, alimentação, saúde na escola e brincar de quiz. Quando conectarmos a IA de verdade, vou poder responder de forma muito mais livre e personalizada!';
  }
  function selectMode(mode, announce = true) {
    if (!VALID_MODES.includes(mode) || loading) return;
    currentMode = mode;
    if(mode !== 'quiz') quiz = null;
    for(const btn of modeButtons) {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('selected', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }
    save();
    if(announce) {
      const prompts = {
        'curiosidade': 'Modo curiosidade ativado! ✨ Quer uma curiosidade sobre saúde? É só escrever "me conta".',
        'quiz': 'Modo quiz ativado! 🎯 Escreva "começar" para receber o primeiro desafio.',
        'fake-news': 'Modo desmentindo fake news! 🛡️ Envie uma afirmação sobre saúde e vamos analisar com cuidado.',
        'livre': 'Conversa livre ativada! 💬 A gente pode falar de escola, amigos, hobbies e o que mais você quiser.',
        'fortalece': 'Modo Fortalece PSE ativado! 📚 Posso falar sobre o projeto e a Mostra, usando informações confirmadas.'
      };
      add('assistant', prompts[mode]);
    }
  }
  modeButtons.forEach(btn => btn.addEventListener('click', () => selectMode(btn.dataset.mode)));
  function lock(state) {
    loading = state;
    els.input.disabled = state;
    els.send.disabled = state;
    els.chips.forEach(chip => chip.disabled = state);
    modeButtons.forEach(btn => btn.disabled = state);
    els.typing.hidden = !state;
    scrollDown();
  }
  async function askAI() {
    const history = messages.filter(msg => !msg.error).slice(-12).map(({ role, content }) => ({ role, content }));
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 25000);
    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
        body: JSON.stringify({ messages: history, mode: currentMode }), signal: controller.signal
      });
      let data = {};
      try { data = await response.json(); } catch {}
      if (!response.ok) throw new Error(data.error || `Falha na conexão (${response.status})`);
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Resposta vazia do servidor.');
      return data.reply.trim();
    } finally { clearTimeout(timeout); controller = null; }
  }
  async function send(question) {
    const text = String(question || '').trim().slice(0, 500);
    if (!text || loading) return;
    // Evitar que dados pessoais sejam enviados a serviços externos.
    if(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/i.test(text)) {
      add('assistant', 'Por segurança, não envie CPF, telefone nem e-mail por aqui, combinado? 💙 Pode reformular a pergunta sem informações pessoais.');
      els.input.value = ''; resizeTextArea(); return;
    }
    els.input.value = ''; resizeTextArea();
    add('user', text);
    lock(true);
    try {
      let reply;
      if (hasApi) reply = await askAI();
      else { await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 380)); reply = demoReply(text); }
      lock(false);
      add('assistant', reply);
    } catch (error) {
      lock(false);
      const userMessage = /limite|aguarde|429/i.test(error.message) ? 'Muita gente está conversando comigo! 💚 Tenta de novo em um minutinho.'
        : /abort|timeout/i.test(error.name + error.message) ? 'Demorei para responder desta vez. 💚 Tenta enviar de novo!'
        : 'Ops, minha conexão com a IA falhou. 💚 Tente novamente ou avise a equipe da Mostra.';
      add('assistant', userMessage, { error: true });
      console.warn('Falha de comunicação com a IA:', error.message);
    } finally { els.input.focus(); }
  }
  function resizeTextArea() { els.input.style.height = 'auto'; els.input.style.height = Math.min(115, els.input.scrollHeight) + 'px'; }
  els.input.addEventListener('input', resizeTextArea);
  els.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); els.form.requestSubmit(); } });
  els.form.addEventListener('submit', e => { e.preventDefault(); send(els.input.value); });
  els.chips.forEach(chip => chip.addEventListener('click', () => send(chip.dataset.question)));
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ''));
    utterance.lang = 'pt-BR'; utterance.rate = 1.04; utterance.pitch = 1.12;
    window.speechSynthesis.speak(utterance);
  }
  els.voice.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { alert('Este navegador não oferece leitura de texto por voz.'); return; }
    voiceOn = !voiceOn;
    els.voice.classList.toggle('active', voiceOn);
    els.voice.setAttribute('aria-label', voiceOn ? 'Desativar leitura de respostas' : 'Ativar leitura de respostas');
    els.voice.title = voiceOn ? 'Desativar leitura de respostas' : 'Ativar leitura de respostas';
    if (!voiceOn) window.speechSynthesis.cancel();
    else speak('Oi! Agora posso ler as respostas em voz alta!');
  });
  els.reset.addEventListener('click', () => {
    if (!messages.length) return;
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
    else if (confirm('Apagar esta conversa?')) reset();
  });
  function reset() {
    controller?.abort();
    messages = []; quiz = null; selectMode('livre', false);
    els.messages.replaceChildren(); save();
    if (els.dialog.open) els.dialog.close();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    els.input.value = ''; resizeTextArea(); scrollDown(); els.input.focus();
  }
  els.cancel.addEventListener('click', () => els.dialog.close());
  els.confirm.addEventListener('click', reset);
  els.dialog.addEventListener('click', e => { if (e.target === els.dialog) els.dialog.close(); });
})();
