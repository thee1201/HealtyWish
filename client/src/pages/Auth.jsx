const serverUrl = import.meta.env.VITE_SERVER_URL

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../assets/logo.svg'
import Modal from '../components/Modal'
import '../styles/Auth.css'

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    userid: '',
    password: ''
  })
  const [modalInfo, setModalInfo] = useState({
    isOpen: false,
    message: ''
  })
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin'
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userid: formData.userid,
          password: formData.password,
          username: formData.username
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setModalInfo({
          isOpen: true,
          message: data.message || '오류가 발생했습니다.'
        })
        return
      }

      // AuthContext를 통해 로그인 처리
      login(data.user, data.token)
      navigate('/main')
    } catch (err) {
      setModalInfo({
        isOpen: true,
        message: '서버 연결에 실패했습니다.'
      })
    }
  }

  const closeModal = () => {
    setModalInfo({
      isOpen: false,
      message: ''
    })
  }

  return (
    <div className="auth-page">
      <img src={Logo} alt="logo" className="auth-logo" />
      
      <div className="auth-form-container">
        <h1>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="input-group">
              <span className="material-symbols-outlined">person</span>
              <input
                type="text"
                name="username"
                placeholder="name"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}
          
          <div className="input-group">
            <span className="material-symbols-outlined">person</span>
            <input
              type="text"
              name="userid"
              placeholder="user name"
              value={formData.userid}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="input-group">
            <span className="material-symbols-outlined">lock</span>
            <input
              type="password"
              name="password"
              placeholder="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-submit">
            {isSignUp ? 'SIGN UP' : 'SIGN IN'}
          </button>
        </form>

        <button 
          className="auth-switch" 
          onClick={() => {
            setIsSignUp(!isSignUp)
            setFormData({ username: '', userid: '', password: '' })
            setModalInfo({ isOpen: false, message: '' })
          }}
        >
          {isSignUp ? 'Sign in' : "Sign up"}
        </button>
      </div>

      <Modal
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        onClose={closeModal}
      />
    </div>
  )
}

export default Auth

