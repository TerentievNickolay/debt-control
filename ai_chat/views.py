import requests
import json
import os
from django.http import JsonResponse, FileResponse, StreamingHttpResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

ANYTHING_LLM_URL = "http://localhost:3001/api/v1"
ANYTHING_LLM_API_KEY = "69M3RMR-AYDME0H-H11Q2JP-M9AEWQY"
WORKSPACE_SLUG = "ai-chat"

TEMPLATES_DIR = os.path.join(settings.BASE_DIR, 'ai_chat', 'templates_storage')
FILE_KEYWORDS = ['шаблон', 'скинь', 'отправь', 'скачать', 'бланк']


def is_file_request(message):
    return any(k in message.lower() for k in FILE_KEYWORDS)


def ask_llm_for_filename(user_message):
    available_files = os.listdir(TEMPLATES_DIR) if os.path.exists(TEMPLATES_DIR) else []
    files_list = "\n".join(available_files)
    prompt = f"""У тебя есть список файлов:
{files_list}

Пользователь просит: "{user_message}"

Ответь ТОЛЬКО названием файла из списка который подходит под запрос.
Если подходящего файла нет — ответь: Такой информации у меня нет
Никаких других слов, только название файла или Такой информации у меня нет."""

    response = requests.post(
        f"{ANYTHING_LLM_URL}/workspace/{WORKSPACE_SLUG}/chat",
        headers={
            "Authorization": f"Bearer {ANYTHING_LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"message": prompt, "mode": "chat"},
        timeout=60
    )
    result = response.json().get("textResponse", "НЕТ").strip()
    return None if result == "НЕТ" else result


@csrf_exempt
@require_POST
def chat_ask(request):
    try:
        body = json.loads(request.body)
        user_message = body.get("message", "").strip()

        if not user_message:
            return JsonResponse({"error": "Пустое сообщение"}, status=400)

        # Проверяем запрос на файл
        if is_file_request(user_message):
            filename = ask_llm_for_filename(user_message)
            if filename:
                filepath = os.path.join(TEMPLATES_DIR, filename)
                if os.path.exists(filepath):
                    return JsonResponse({
                        "reply": "Нашёл нужный файл, можете скачать 👇",
                        "file_url": f"/ai_chat/download/{filename}"
                    })

        # Обычный RAG запрос
        response = requests.post(
            f"{ANYTHING_LLM_URL}/workspace/{WORKSPACE_SLUG}/chat",
            headers={
                "Authorization": f"Bearer {ANYTHING_LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"message": user_message, "mode": "query"},
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        return JsonResponse({
            "reply": data.get("textResponse", "Нет ответа"),
            "file_url": None
        })

    except requests.exceptions.Timeout:
        return JsonResponse({"error": "Модель думает, попробуйте снова"}, status=504)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def chat_ask_stream(request):
    try:
        body = json.loads(request.body)
        user_message = body.get("message", "").strip()

        if not user_message:
            return JsonResponse({"error": "Пустое сообщение"}, status=400)

        if is_file_request(user_message):
            filename = ask_llm_for_filename(user_message)
            if filename:
                filepath = os.path.join(TEMPLATES_DIR, filename)
                if os.path.exists(filepath):
                    return JsonResponse({
                        "reply": "Нашёл нужный файл, можете скачать 👇",
                        "file_url": f"/ai_chat/download/{filename}"
                    })

        response = requests.post(
            f"{ANYTHING_LLM_URL}/workspace/{WORKSPACE_SLUG}/chat",
            headers={
                "Authorization": f"Bearer {ANYTHING_LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"message": user_message, "mode": "query"},
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        return JsonResponse({
            "reply": data.get("textResponse", "Нет ответа"),
            "file_url": None
        })

    except requests.exceptions.Timeout:
        return JsonResponse({"error": "Модель думает, попробуйте снова"}, status=504)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_GET
def download_file(request, filename):
    filepath = os.path.join(TEMPLATES_DIR, filename)
    if not os.path.exists(filepath):
        return JsonResponse({"error": "Файл не найден"}, status=404)
    return FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)