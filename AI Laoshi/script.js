// PASTE YOUR APPS SCRIPT WEB APP EXEC URL HERE
// (Deploy > Manage deployments > Web app > copy the URL ending in /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4SzrTTGnnXMlwyuq-Tpq4arEd6fvLxo6H7V5s6Y9EkWai2bPQTfFlDUTqcG0CkGli/exec";

// --- DOM Elements ---
const chatWindow = document.getElementById('chat-window');
const chatOpenBtn = document.getElementById('chat-open-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');
const sendButton = document.getElementById('send-button');

// --- State ---
let chatHistory = []; // To maintain conversation context

// --- Event Listeners ---
chatOpenBtn.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
    chatWindow.classList.add('animate-slide-up-fade-in');
    chatOpenBtn.classList.add('hidden');
    messageInput.focus();
});

chatCloseBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    chatOpenBtn.classList.remove('hidden');
});

chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    // Add user's message to UI and history
    addMessage(messageText, 'user');
    chatHistory.push({ role: "user", parts: [{ text: messageText }] });
    messageInput.value = '';

    // Show typing indicator and disable input
    showTypingIndicator();
    setFormDisabled(true);

    // Call the Apps Script backend via fetch instead of google.script.run
    callBackend(messageText, chatHistory)
        .then(onBotResponseSuccess)
        .catch(onBotResponseFailure);
});

// --- Backend call ---

async function callBackend(message, history) {
    // Using text/plain avoids a CORS preflight request, which Apps Script
    // web apps do not handle. The payload itself is still JSON.
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ message: message, history: history })
    });

    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }

    return response.json();
}

// --- Functions ---

function onBotResponseSuccess(response) {
    hideTypingIndicator();

    if (response.error) {
        addMessage(`Error: ${response.error}`, 'bot');
        setFormDisabled(false);
        messageInput.focus();
        return;
    }

    const botMessage = response.text;
    addMessage(botMessage, 'bot');
    chatHistory.push({ role: "model", parts: [{ text: botMessage }] });

    // Handle the action from the bot
    if (response.action === 'INITIATE_HANDOFF') {
        // Handoff is complete, disable the form permanently for this session.
        setFormDisabled(true);
    } else {
        // For 'RESPOND' or 'ASK_FOR_CONTACT', re-enable the form for the user to reply.
        setFormDisabled(false);
        messageInput.focus();
    }
}

function onBotResponseFailure(error) {
    hideTypingIndicator();
    setFormDisabled(false);
    addMessage(`Error communicating with the bot: ${error.message}`, 'bot');
    messageInput.focus();
}

function setFormDisabled(disabled) {
    messageInput.disabled = disabled;
    sendButton.disabled = disabled;
    if (disabled) {
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    const avatarSrc = sender === 'bot' ? 'https://i.ibb.co.com/nvyk1Gp/logo-ong.png' : 'https://placehold.co/100x100/E2E8F0/4A5568?text=U';
    const avatarAlt = sender === 'bot' ? 'Bot Avatar' : 'User Avatar';
    const messageBg = sender === 'bot' ? 'bg-blue-100' : 'bg-gray-200';
    const messageAlignment = sender === 'user' ? 'flex-row-reverse' : 'flex-row';

    messageElement.classList.add('flex', 'items-start', 'gap-3', 'mb-4', messageAlignment);

    messageElement.innerHTML = `
        <img class="w-10 h-10 rounded-full" src="${avatarSrc}" alt="${avatarAlt}">
        <div class="p-3 rounded-lg max-w-xs ${messageBg}">
            <p class="text-sm text-gray-800">${text}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}
