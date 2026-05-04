var server = "";
//var server = "http://10.180.10.46:8000";
//var server = window.location.origin;


window.onload = function () {
    document.getElementById("title").innerHTML = document.title;
    if (window.location.pathname.includes("/kvitancii"))
        $.ajax({
            type: "GET",
            url: server + "/kvitancii/get_folder_counts/",
            success: function (res) {
                if (res.process_running) {
                    document.getElementById("btnStartConcat").disabled = true;
                    document.getElementById("btnStartConcat").innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>' + ' Идет процесс склейки';
                    document.getElementById("btnStopConcat").disabled = false;
                    procent = (100 * res.processed_folders) / res.found_folders;
                    timer = setInterval(() => timerTick(), 4000);
                    document.getElementById("progressBar").innerHTML = '<div class="progress">' +
                        '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: ' + procent + '%"></div>' +
                        '</div>';
                    document.getElementById("lblStatus").innerHTML = "Процесс выполняется: " + Math.floor(procent) + "%";
                }
            }
        });
    else if (window.location.pathname.includes("volunteer"))
        document.addEventListener("DOMContentLoaded", function() {
            const saveButton = document.getElementById("btnSave");
            if (saveButton) {
                saveButton.addEventListener("click", saveVolunteer);
            } else {
                console.warn("Кнопка с id='btnSave' не найдена в DOM");
            }
        });
}

async function reportAcquiringPayment() {
    try {
        const dateFrom = document.getElementById('date_from').value;
        const dateTo = document.getElementById('date_to').value;

        if (!dateFrom || !dateTo) {
            throw new Error("Пожалуйста, выберите обе даты");
        }

        const response = await fetch('/api/report/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                date_from: dateFrom,
                date_to: dateTo
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка: ${response.statusText} - ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_acquiring_from_${dateFrom}_to_${dateTo}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        document.getElementById('date_from').value = '';
        document.getElementById('date_to').value = '';
    } catch (error) {
        console.error('Не удалось скачать файл:', error);
        alert('Произошла ошибка при скачивании файла: ' + error.message);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const changeButton = document.getElementById('change-password-btn');
    const errorDiv = document.getElementById('password-error');

    if (!changeButton || !errorDiv) {
        console.error('Не найдены элементы: changeButton или errorDiv');
        return;
    }

    changeButton.addEventListener('click', function() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        fetch('/custom_admin/change_password_ajax/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
            },
            body: new URLSearchParams(formData)
        })
        .then(response => response.json())
        .then(data => {
            errorDiv.classList.add('d-none');
            if (data.status === 'success') {
                alert('Пароль успешно изменён!');
                $('#changePasswordModal').modal('hide');
            } else {
                let errorMessage = data.message;
                if (typeof errorMessage === 'object') {
                    errorMessage = Object.values(errorMessage)
                        .map(err => err.map(e => e.message).join(', '))
                        .join('; ');
                }
                errorDiv.textContent = errorMessage;
                errorDiv.classList.remove('d-none');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            errorDiv.textContent = 'Ошибка сервера';
            errorDiv.classList.remove('d-none');
        });
    });
});


function onFocusDoor(door) {
    door.parentElement.innerHTML = `<svg onclick="logoutBtn()" onmouseout="outFocusDoor(this)" xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-door-open" viewBox="0 0 16 16">
                                        <path d="M8.5 10c-.276 0-.5-.448-.5-1s.224-1 .5-1 .5.448.5 1-.224 1-.5 1z"/>
                                        <path d="M10.828.122A.5.5 0 0 1 11 .5V1h.5A1.5 1.5 0 0 1 13 2.5V15h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V1.5a.5.5 0 0 1 .43-.495l7-1a.5.5 0 0 1 .398.117zM11.5 2H11v13h1V2.5a.5.5 0 0 0-.5-.5zM4 1.934V15h6V1.077l-6 .857z"/>
                                    </svg>`;
}

function outFocusDoor(door) {
    door.parentElement.innerHTML = `<svg onclick="logoutBtn()" onmouseover="onFocusDoor(this)" xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-door-closed" viewBox="0 0 16 16">
                                        <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V2zm1 13h8V2H4v13z"/>
                                        <path d="M9 9a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"/>
                                    </svg>`;
}

function logoutBtn() {
    window.location.href = "/logout/";
}


/* === AI CHAT FUNCTIONS === */

function openAiChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatBtn = document.getElementById('ai-chat-btn');
    const minimizedBtn = document.getElementById('ai-chat-minimized-btn');

    chatWindow.classList.remove('chat-hidden', 'chat-minimized');
    chatWindow.classList.add('chat-visible');
    chatBtn.classList.add('hidden');
    minimizedBtn.classList.add('hidden');

    setTimeout(() => document.getElementById('ai-chat-input').focus(), 300);
}

function closeAiChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatBtn = document.getElementById('ai-chat-btn');

    chatWindow.classList.remove('chat-visible', 'chat-minimized');
    chatWindow.classList.add('chat-hidden');
    chatBtn.classList.remove('hidden');
}

function minimizeAiChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const minimizedBtn = document.getElementById('ai-chat-minimized-btn');

    chatWindow.classList.remove('chat-visible');
    chatWindow.classList.add('chat-minimized');
    minimizedBtn.classList.remove('hidden');
}

function restoreAiChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const minimizedBtn = document.getElementById('ai-chat-minimized-btn');

    chatWindow.classList.remove('chat-minimized');
    chatWindow.classList.add('chat-visible');
    minimizedBtn.classList.add('hidden');

    setTimeout(() => document.getElementById('ai-chat-input').focus(), 300);
}

function toggleResizeAiChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.toggle('chat-expanded');
}

document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('ai-chat-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendAiMessage();
        });
    }
});

function addAiMessage(text, sender, fileUrl = null) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;

    if (fileUrl) {
        const chip = document.createElement('a');
        chip.href = fileUrl;
        chip.download = '';
        chip.className = 'file-chip';
        chip.textContent = '📎 Скачать файл';
        msgDiv.appendChild(chip);
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function useHint(text) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
        input.value = text;
        input.focus();
        sendAiMessage();
    }
}

async function sendAiMessage() {
    const input = document.getElementById('ai-chat-input');
    const messageText = input?.value.trim();
    const messagesContainer = document.getElementById('ai-chat-messages');
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (!messageText) return;

    addAiMessage(messageText, 'user');
    input.value = '';
    if (typingIndicator) typingIndicator.classList.remove('hidden');
    if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch('/ai_chat/ask/stream/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ message: messageText })
        });

        const data = await response.json();
        if (typingIndicator) typingIndicator.classList.add('hidden');

        const botReply = data.reply || data.error || 'Нет ответа';

        // Создаём сообщение и печатаем побуквенно
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', 'bot-message');
        msgDiv.textContent = '';
        messagesContainer.appendChild(msgDiv);

        // Эффект печатания
        let i = 0;
        const speed = 18; // мс на символ
        function typeChar() {
            if (i < botReply.length) {
                msgDiv.textContent += botReply[i];
                i++;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                setTimeout(typeChar, speed);
            } else if (data.file_url) {
                // После текста добавляем кнопку файла
                const chip = document.createElement('a');
                chip.href = data.file_url;
                chip.download = '';
                chip.className = 'file-chip';
                chip.textContent = '📎 Скачать файл';
                msgDiv.appendChild(chip);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        typeChar();

    } catch (error) {
        console.error('Chat error:', error);
        if (typingIndicator) typingIndicator.classList.add('hidden');
        addAiMessage('Ошибка соединения.', 'bot');
    }
}

function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}