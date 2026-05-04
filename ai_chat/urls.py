from django.urls import path
from . import views

urlpatterns = [
    path('ask/', views.chat_ask, name='chat_ask'),
    path('ask/stream/', views.chat_ask_stream, name='chat_ask_stream'),
    path('download/<str:filename>', views.download_file, name='download_file'),
]