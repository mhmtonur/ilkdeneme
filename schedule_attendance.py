#!/usr/bin/env python3
"""
Otomatik yoklama oturumu yönetim scripti
Bu script haftada 4 gün (Pazartesi-Perşembe) sabah 08:25'te oturum açar
ve 09:05'te kapatır.
"""

import os
import sys
import requests
import json
from datetime import datetime, date, time

# Flask uygulamasının API URL'i
API_BASE_URL = 'http://localhost:5000/api'

def create_attendance_session():
    """Yeni bir yoklama oturumu oluşturur ve aktif hale getirir"""
    today = date.today()
    
    # Oturum verilerini hazırla
    session_data = {
        'session_date': today.strftime('%Y-%m-%d'),
        'start_time': '08:25',
        'end_time': '09:05',
        'is_active': True
    }
    
    try:
        # Yeni oturum oluştur
        response = requests.post(f'{API_BASE_URL}/sessions', 
                               json=session_data,
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 201:
            session = response.json()
            print(f"Yoklama oturumu başarıyla oluşturuldu: {session['id']}")
            
            # Oturumu aktif hale getir
            activate_response = requests.post(f"{API_BASE_URL}/sessions/{session['id']}/activate")
            
            if activate_response.status_code == 200:
                print(f"Oturum aktif hale getirildi: {today} 08:25-09:05")
                return True
            else:
                print(f"Oturum aktif hale getirilemedi: {activate_response.status_code}")
                return False
        else:
            print(f"Oturum oluşturulamadı: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"API bağlantı hatası: {e}")
        return False

def deactivate_current_session():
    """Aktif oturumu kapatır"""
    try:
        # Aktif oturumu bul
        response = requests.get(f'{API_BASE_URL}/sessions/active')
        
        if response.status_code == 200:
            active_session = response.json()
            session_id = active_session['id']
            
            # Oturumu deaktif et
            deactivate_response = requests.post(f"{API_BASE_URL}/sessions/{session_id}/deactivate")
            
            if deactivate_response.status_code == 200:
                print(f"Aktif oturum kapatıldı: {session_id}")
                return True
            else:
                print(f"Oturum kapatılamadı: {deactivate_response.status_code}")
                return False
        elif response.status_code == 404:
            print("Kapatılacak aktif oturum bulunamadı")
            return True
        else:
            print(f"Aktif oturum sorgulanamadı: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"API bağlantı hatası: {e}")
        return False

def is_weekday():
    """Bugünün hafta içi (Pazartesi-Perşembe) olup olmadığını kontrol eder"""
    today = datetime.now().weekday()  # 0=Pazartesi, 6=Pazar
    return today < 4  # 0,1,2,3 = Pazartesi-Perşembe

def main():
    if len(sys.argv) != 2:
        print("Kullanım: python3 schedule_attendance.py [start|stop]")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if not is_weekday():
        print("Bugün hafta sonu, yoklama oturumu planlanmadı")
        sys.exit(0)
    
    if action == 'start':
        print("Yoklama oturumu başlatılıyor...")
        if create_attendance_session():
            print("Yoklama oturumu başarıyla başlatıldı")
        else:
            print("Yoklama oturumu başlatılamadı")
            sys.exit(1)
    
    elif action == 'stop':
        print("Yoklama oturumu kapatılıyor...")
        if deactivate_current_session():
            print("Yoklama oturumu başarıyla kapatıldı")
        else:
            print("Yoklama oturumu kapatılamadı")
            sys.exit(1)
    
    else:
        print("Geçersiz eylem. 'start' veya 'stop' kullanın.")
        sys.exit(1)

if __name__ == '__main__':
    main()

