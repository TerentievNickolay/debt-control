# payments/forms.py
from django import forms

class PaymentSearchForm(forms.Form):
    date_from = forms.DateField(label='Дата с', widget=forms.DateInput(attrs={'type': 'date', 'id': 'date_from', 'class': 'form-control mx-2'}))
    date_to = forms.DateField(label='Дата по', widget=forms.DateInput(attrs={'type': 'date', 'id': 'date_to', 'class': 'form-control mx-2'}))