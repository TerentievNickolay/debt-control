from django.shortcuts import render
from django.http import HttpResponse
from .forms import PaymentSearchForm
import pyodbc
import configparser
import os
from openpyxl import Workbook
import json
from datetime import datetime
from django.contrib.auth.decorators import permission_required
from openpyxl.styles import PatternFill, Alignment


def payment_search(request):
    form = PaymentSearchForm()
    return render(request, 'payments.html', {'form': form})


def report_acquiring_payment(request):
    if request.method == 'POST':
        try:
            # Читаем JSON из тела запроса
            data = json.loads(request.body)
            date_from = datetime.strptime(data['date_from'], '%Y-%m-%d').date()
            date_to = datetime.strptime(data['date_to'], '%Y-%m-%d').date()

            # Чтение config.ini
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            config = configparser.ConfigParser()
            config.read(os.path.join(BASE_DIR, 'confiiig.ini'))

            # Подключение к базе данных
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={config['DatabaseMSSQL']['server']},{config['DatabaseMSSQL']['port']};"
                f"DATABASE={config['DatabaseMSSQL']['database']};"
                f"UID={config['DatabaseMSSQL']['username']};"
                f"PWD={config['DatabaseMSSQL']['password']}"
            )

            query = """
            DECLARE @Date_S datetime = ?;
            DECLARE @Date_E datetime = ?;
            SELECT 
                so.ROW_ID,
                ls.Номер, 
                so.Дата, 
                so.Сумма, 
                org.Название
            FROM 
                stack.[Лицевые счета] ls
                JOIN stack.[Список оплаты] so ON so.[Счет-Оплата] = ls.ROW_ID
                JOIN stack.Документ doc ON so.[Платеж-Список] = doc.ROW_ID
                JOIN stack.Организации org ON org.row_id = doc.[Источник-Платежи] 
                    AND org.ROW_ID IN (319, 312, 313, 318, 323, 324)
            WHERE 
                doc.Дата BETWEEN @Date_S AND @Date_E
            GROUP BY 
                ls.Номер, so.Дата, so.Сумма, org.Название, so.ROW_ID 
            ORDER BY 
                so.Дата, org.Название
            """

            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute(query, (date_from, date_to))
            results = cursor.fetchall()
            conn.close()

            # Создаем Excel-файл
            wb = Workbook()
            ws = wb.active
            ws.title = "Отчет по платежам"

            # Заголовки (без ID)
            headers = ['Лицевой счет', 'Дата', 'Сумма', 'Организация']
            ws.append(headers)

            # Данные (пропускаем row[0], который содержит ROW_ID)
            for row in results:
                # Преобразуем "Лицевой счет" в строку
                account_number = str(row[1])  # Явно делаем строку
                ws.append([account_number, row[2].strftime('%d/%m/%Y'), row[3], row[4]])

            # Автоматическая подгонка ширины столбцов под содержимое
            for col in ws.columns:
                max_length = 0
                column = col[0].column_letter  # Например, 'A', 'B', 'C', 'D'
                for cell in col:
                    try:
                        if cell.value:  # Проверяем, что ячейка не пустая
                            length = len(str(cell.value))
                            if length > max_length:
                                max_length = length
                    except:
                        pass
                adjusted_width = max_length + 2  # Добавляем запас
                ws.column_dimensions[column].width = adjusted_width

            # Применяем текстовый формат для столбца "Лицевой счет" (A)
            for cell in ws['A']:
                cell.number_format = '@'  # '@' — это текстовый формат в Excel

            # Сохраняем файл в память
            from io import BytesIO
            excel_file = BytesIO()
            wb.save(excel_file)
            excel_file.seek(0)

            # Формируем ответ для скачивания
            response = HttpResponse(
                excel_file.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="report_acquiring_from_{date_from}_to_{date_to}.xlsx"'
            return response

        except json.JSONDecodeError:
            return HttpResponse("Неверный формат JSON", status=400)
        except Exception as e:
            return HttpResponse(f"Ошибка: {str(e)}", status=500)
    return HttpResponse("Неверный метод запроса", status=405)