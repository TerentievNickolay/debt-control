# payments/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path('', views.payment_search, name='payment_search'),
    path('api/report/', views.report_acquiring_payment, name='report_acquiring_payment'),
]