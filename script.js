const messagesDiv = document.getElementById("messages")
const userInput = document.getElementById("userInput")
const sendBtn = document.getElementById("sendBtn")
const newChatBtn = document.getElementById("newChatBtn")
const themeBtn = document.getElementById("themeBtn")
const exportBtn = document.getElementById("exportBtn")
const modelSelect = document.getElementById("modelSelect")
const messageCountEl = document.getElementById("messageCount")
const menuBtn = document.getElementById("menuBtn")
const closeBtn = document.getElementById("closeBtn")
const clearBtn = document.getElementById("clearBtn")

let count = 0
let isDark = true
const GROQ_KEY = ""

// Сохранённые сообщения для экспорта и localStorage
let savedMessages = []
let allChats = []
let currentChatId = Date.now()

const chatHistory = [
  {
    role: "system",
    content: "Ты полезный AI ассистент. Отвечай коротко и по делу. Общайся на том языке на котором пишет пользователь."
  }
]

// ===== MARKDOWN ПАРСЕР =====
function parseMarkdown(text) {
  // Блоки кода (```code```)
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
  // Инлайн код (`code`)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Жирный (**текст**)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Курсив (*текст*)
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
  // Списки (- пункт)
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>')
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
  // Переносы строк
  text = text.replace(/\n/g, '<br>')
  return text
}

// ===== ВРЕМЯ =====
function getTime() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, "0")
  const m = now.getMinutes().toString().padStart(2, "0")
  return h + ":" + m
}

// ===== ЗВУК =====
function playSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 600
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch(e) {}
}

// ===== СЧЁТЧИК =====
function updateCount() {
  count++
  messageCountEl.textContent = count
}

// ===== ДОБАВИТЬ СООБЩЕНИЕ =====
function addMessage(text, sender, time = getTime(), save = true) {
  const wrapper = document.createElement("div")
  wrapper.classList.add("message-wrapper", sender)

  const avatar = document.createElement("div")
  avatar.classList.add("avatar")
  avatar.textContent = sender === "user" ? "👤" : "🤖"

  const body = document.createElement("div")
  body.classList.add("message-body")

  const message = document.createElement("div")
  message.classList.add("message", sender)

  if (sender === "ai") {
    message.innerHTML = parseMarkdown(text)
  } else {
    message.textContent = text
  }

  const timeEl = document.createElement("span")
  timeEl.classList.add("message-time")
  timeEl.textContent = time

  body.appendChild(message)
  body.appendChild(timeEl)

  if (sender === "ai") {
    const copyBtn = document.createElement("button")
    copyBtn.classList.add("copy-btn")
    copyBtn.textContent = "📋 копировать"
    copyBtn.addEventListener("click", function() {
      navigator.clipboard.writeText(text)
      copyBtn.textContent = "✅ скопировано"
      setTimeout(() => copyBtn.textContent = "📋 копировать", 2000)
    })
    body.appendChild(copyBtn)
  }

  wrapper.appendChild(avatar)
  wrapper.appendChild(body)
  messagesDiv.appendChild(wrapper)
  messagesDiv.scrollTop = messagesDiv.scrollHeight

  if (save) {
    savedMessages.push({ text, sender, time })
    saveToStorage()
    updateCount()
  }

  return message
}

// ===== АНИМАЦИЯ ПЕЧАТАНИЯ =====
function typeWriter(element, fullText, onDone) {
  let i = 0
  element.textContent = ""
  const interval = setInterval(() => {
    i++
    element.textContent = fullText.substring(0, i)
    messagesDiv.scrollTop = messagesDiv.scrollHeight
    if (i >= fullText.length) {
      clearInterval(interval)
      element.innerHTML = parseMarkdown(fullText)
      messagesDiv.scrollTop = messagesDiv.scrollHeight
      if (onDone) onDone()
    }
  }, 12)
}

// ===== АНИМАЦИЯ ЗАГРУЗКИ =====
function addTyping() {
  const wrapper = document.createElement("div")
  wrapper.classList.add("message-wrapper", "ai")

  const avatar = document.createElement("div")
  avatar.classList.add("avatar")
  avatar.textContent = "🤖"

  const typing = document.createElement("div")
  typing.classList.add("message", "ai", "typing")
  typing.innerHTML = "<span></span><span></span><span></span>"

  wrapper.appendChild(avatar)
  wrapper.appendChild(typing)
  messagesDiv.appendChild(wrapper)
  messagesDiv.scrollTop = messagesDiv.scrollHeight

  return wrapper
}

// ===== ОТПРАВКА =====
async function sendMessage() {
  const text = userInput.value.trim()
  if (!text) return

  playSound()
  addMessage(text, "user")
  userInput.value = ""

  sendBtn.disabled = true
  userInput.disabled = true

  chatHistory.push({ role: "user", content: text })

  const typingWrapper = addTyping()

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_KEY
    },
    body: JSON.stringify({
      model: modelSelect.value,
      messages: chatHistory
    })
  })

  const data = await response.json()
  const aiText = data.choices[0].message.content

  chatHistory.push({ role: "assistant", content: aiText })

  messagesDiv.removeChild(typingWrapper)

  // Создаём пузырь и запускаем эффект печатания
  const wrapper = document.createElement("div")
  wrapper.classList.add("message-wrapper", "ai")
  wrapper.style.animation = "fadeInUp 0.25s ease"

  const avatar = document.createElement("div")
  avatar.classList.add("avatar")
  avatar.textContent = "🤖"

  const body = document.createElement("div")
  body.classList.add("message-body")

  const message = document.createElement("div")
  message.classList.add("message", "ai")

  const timeEl = document.createElement("span")
  timeEl.classList.add("message-time")
  timeEl.textContent = getTime()

  const copyBtn = document.createElement("button")
  copyBtn.classList.add("copy-btn")
  copyBtn.textContent = "📋 копировать"
  copyBtn.addEventListener("click", function() {
    navigator.clipboard.writeText(aiText)
    copyBtn.textContent = "✅ скопировано"
    setTimeout(() => copyBtn.textContent = "📋 копировать", 2000)
  })

  body.appendChild(message)
  body.appendChild(timeEl)
  body.appendChild(copyBtn)
  wrapper.appendChild(avatar)
  wrapper.appendChild(body)
  messagesDiv.appendChild(wrapper)

  typeWriter(message, aiText, function() {
    savedMessages.push({ text: aiText, sender: "ai", time: timeEl.textContent })
    saveToStorage()
    updateCount()
    sendBtn.disabled = false
    userInput.disabled = false
    userInput.focus()
  })
}

// ===== LOCALSTORAGE =====
function saveToStorage() {
  localStorage.setItem("ai_chat_messages", JSON.stringify(savedMessages))
  localStorage.setItem("ai_chat_history", JSON.stringify(chatHistory))
  localStorage.setItem("ai_chat_count", count)
}

function saveCurrentChat() {
  if (savedMessages.length === 0) return

  const firstMessage = savedMessages.find(m => m.sender === "user")
  if (!firstMessage) return

  const title = firstMessage.text.substring(0, 30) + "..."

  const existing = allChats.findIndex(c => c.id === currentChatId)

  if (existing !== -1) {
    allChats[existing].messages = [...savedMessages]
    allChats[existing].history = [...chatHistory]
  } else {
    allChats.push({
      id:currentChatId,
      title:title,
      messages: [...savedMessages],
      history:[...chatHistory]
    })
  }

  localStorage.setItem("ai_all_chats", JSON.stringify(allChats))
  renderChatList()
}

function renderChatList() {
  const chatList = document.getElementById("chatList")
  chatList.innerHTML = ""

  allChats.slice().reverse().forEach(function(chat) {
    const item = document.createElement("div")
    item.classList.add("chat-item")

    const title = document.createElement("span")
    title.textContent = chat.title

    const deleteBtn = document.createElement("button")
    deleteBtn.classList.add("chat-delete-btn")
    deleteBtn.textContent = "✕"

    deleteBtn.addEventListener("click", function(e) {
      e.stopPropagation()
      allChats = allChats.filter(c => c.id !== chat.id)
      localStorage.setItem("ai_all_chats", JSON.stringify(allChats))
      renderChatList()
    })

    if (chat.id === currentChatId) {
      item.classList.add("active")
    }

    item.addEventListener("click", function() {
      saveCurrentChat()
      loadChat(chat.id)
    })

    item.appendChild(title)
    item.appendChild(deleteBtn)
    chatList.appendChild(item)
  })
}

function loadChat(id) {

  currentChatId = id
  const chat = allChats.find(c => c.id === id)
  if (!chat) return

  currentChatId = id
  savedMessages = [...chat.messages]
  chatHistory.length = 0
  chatHistory.push(...chat.history)
  count = savedMessages.length
  messageCountEl.textContent = count

  messagesDiv.innerHTML = ""
  savedMessages.forEach(m => addMessage(m.text, m.sender, m.time, false))

  renderChatList()
}

function loadFromStorage() {
  const msgs = localStorage.getItem("ai_chat_messages")
  const hist = localStorage.getItem("ai_chat_history")
  const cnt = localStorage.getItem("ai_chat_count")

  if (msgs) {
    const parsed = JSON.parse(msgs)
    parsed.forEach(m => addMessage(m.text, m.sender, m.time, false))
    savedMessages = parsed
  }

  if (hist) {
    const h = JSON.parse(hist)
    chatHistory.length = 0
    chatHistory.push(...h)
  }

  if (cnt) {
    count = parseInt(cnt)
    messageCountEl.textContent = count
  }
}

// ===== ЭКСПОРТ В TXT =====
exportBtn.addEventListener("click", function() {
  if (savedMessages.length === 0) return
  const lines = savedMessages.map(m =>
    "[" + m.time + "] " + (m.sender === "user" ? "Вы" : "AI") + ": " + m.text
  )
  const blob = new Blob([lines.join("\n\n")], { type: "text/plain" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "chat_" + new Date().toLocaleDateString() + ".txt"
  a.click()
})

// ===== ТЕМА =====
themeBtn.addEventListener("click", function() {
  isDark = !isDark
  document.body.classList.toggle("light")
  themeBtn.textContent = isDark ? "🌙 Тёмная тема" : "☀️ Светлая тема "
  localStorage.setItem("ai_chat_theme", isDark ? "dark" : "light")
})

// ===== ОЧИСТКА =====
newChatBtn.addEventListener("click", function() {
  saveCurrentChat()

  messagesDiv.innerHTML = ""
  chatHistory.length = 1
  savedMessages = []
  count = 0
  currentChatId = Date.now()
  messageCountEl.textContent = "0"
  
  addMessage("Привет! Я AI ассистент. Чем могу помочь? 😊", "ai")
  renderChatList()
})

menuBtn.addEventListener("click", function() {
  document.querySelector(".sidebar").classList.toggle("open")
})

closeBtn.addEventListener("click", function() {
  document.querySelector(".sidebar").classList.remove("open")
})

clearBtn.addEventListener("click", function() {
  messagesDiv.innerHTML = ""
  chatHistory.length = 1
  savedMessages = []
  count = 0
  messageCountEl.textContent = "0"
  localStorage.removeItem("ai_chat_messages")
  localStorage.removeItem("ai_chat_history")
  localStorage.removeItem("ai_chat_count")
  addMessage("Привет! Я AI ассистент. Чем могу помочь? 😊", "ai")
})
// ===== ENTER =====
sendBtn.addEventListener("click", sendMessage)
userInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") sendMessage()
})

// ===== ЗАГРУЗКА =====
const savedTheme = localStorage.getItem("ai_chat_theme")
if (savedTheme === "light") {
  isDark = false
  document.body.classList.add("light")
  themeBtn.textContent = "☀️ Светлая тема "
}

const hasHistory = localStorage.getItem("ai_chat_messages")
if (hasHistory) {
  loadFromStorage()
} else {
  addMessage("Привет! Я AI ассистент. Чем могу помочь? 😊", "ai")
}

const savedChats = localStorage.getItem("ai_all_chats")
if (savedChats) {
  allChats = JSON.parse(savedChats)
  renderChatList()
}
