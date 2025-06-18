import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Clock, Users, CheckCircle, AlertCircle, User, Calendar, Shield, Eye, EyeOff } from 'lucide-react'
import iuTipLogo from './assets/iu_tip_logo.png'
import './App.css'

const API_BASE_URL = 'https://g8h3ilc71mej.manus.space/api'

function App() {
  const [activeSession, setActiveSession] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [dailyList, setDailyList] = useState([])
  const [stats, setStats] = useState({})

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch active session on component mount
  useEffect(() => {
    fetchActiveSession()
  }, [])

  const fetchActiveSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/active`)
      if (response.ok) {
        const session = await response.json()
        setActiveSession(session)
      } else {
        setActiveSession(null)
      }
    } catch (error) {
      console.error('Error fetching active session:', error)
      setActiveSession(null)
    }
  }

  const handleAttendance = async (e) => {
    e.preventDefault()
    
    if (!studentName.trim()) {
      setMessage('Lütfen adınızı ve soyadınızı girin')
      setMessageType('error')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Yoklama başarıyla kaydedildi!')
        setMessageType('success')
        setStudentName('')
      } else {
        setMessage(data.error || 'Bir hata oluştu')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Bağlantı hatası oluştu')
      setMessageType('error')
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3000)
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminCredentials),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAdminLoggedIn(true)
        setMessage('Yönetici girişi başarılı')
        setMessageType('success')
        fetchDailyList()
        fetchStats()
      } else {
        setMessage(data.error || 'Giriş başarısız')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Bağlantı hatası oluştu')
      setMessageType('error')
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3000)
  }

  const fetchDailyList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/daily-list`)
      if (response.ok) {
        const data = await response.json()
        setDailyList(data.attendances || [])
      }
    } catch (error) {
      console.error('Error fetching daily list:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/overall`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = () => {
    setIsAdminLoggedIn(false)
    setAdminCredentials({ username: '', password: '' })
    setDailyList([])
    setStats({})
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Logo and DateTime */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={iuTipLogo} 
              alt="İstanbul Üniversitesi İstanbul Tıp Fakültesi" 
              className="w-24 h-24 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Yoklama Sistemi
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              İstanbul Üniversitesi İstanbul Tıp Fakültesi
            </p>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="text-lg font-semibold text-gray-800">
                {formatDate(currentDateTime)}
              </div>
              <div className="text-xl font-mono text-blue-600">
                {formatTime(currentDateTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Attendance Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <User className="w-6 h-6" />
              Yoklama
            </CardTitle>
            {activeSession ? (
              <Badge variant="default" className="bg-green-500 text-white">
                Aktif Oturum: {activeSession.session_date}
              </Badge>
            ) : (
              <Badge variant="destructive">
                Aktif oturum bulunmuyor
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAttendance} className="space-y-4">
              <div>
                <Label htmlFor="studentName" className="text-base font-medium">
                  Ad Soyad
                </Label>
                <Input
                  id="studentName"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Adınızı ve soyadınızı girin"
                  className="mt-1 text-lg h-12"
                  disabled={!activeSession}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold"
                disabled={!activeSession || !studentName.trim()}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Yoklama Ver
              </Button>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
                messageType === 'success' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {messageType === 'success' ? (
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                )}
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Panel */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Yönetim Paneli
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAdminLoggedIn ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">
                    Kullanıcı Adı
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={adminCredentials.username}
                    onChange={(e) => setAdminCredentials({
                      ...adminCredentials,
                      username: e.target.value
                    })}
                    placeholder="Kullanıcı adı"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={adminCredentials.password}
                      onChange={(e) => setAdminCredentials({
                        ...adminCredentials,
                        password: e.target.value
                      })}
                      placeholder="Şifre"
                      className="mt-1 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Giriş Yap
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-600">
                    Yönetici olarak giriş yapıldı
                  </span>
                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    size="sm"
                  >
                    Çıkış
                  </Button>
                </div>

                {/* Daily Attendance List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Günlük Yoklama Listesi
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {dailyList.length > 0 ? (
                      <div className="space-y-1">
                        {dailyList.map((attendance, index) => (
                          <div key={index} className="text-sm bg-white p-2 rounded border">
                            <div className="font-medium">{attendance.student?.name}</div>
                            <div className="text-gray-500 text-xs">
                              {new Date(attendance.timestamp).toLocaleTimeString('tr-TR')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        Bugün henüz yoklama kaydı yok
                      </p>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    İstatistikler
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <div className="font-semibold text-blue-600">{stats.total_students || 0}</div>
                      <div className="text-gray-600">Toplam Öğrenci</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="font-semibold text-green-600">{stats.total_sessions || 0}</div>
                      <div className="text-gray-600">Toplam Oturum</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

