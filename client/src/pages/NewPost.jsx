const serverUrl = import.meta.env.VITE_SERVER_URL

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoLight from '../assets/logo-light.svg'
import '../styles/NewPost.css'
import Modal from '../components/Modal'

function NewPost() {
  const navigate = useNavigate()
  const { getAuthHeaders, user, logout, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    userid: '',
    uploaddate: new Date().toISOString()
  })
  const [modalInfo, setModalInfo] = useState({
    isOpen: false,
    message: ''
  })

  // 인증 상태 확인
  useEffect(() => {
    console.log('현재 user 정보:', user); // 디버깅용 로그

    if (!isAuthenticated) {
      navigate('/')
      return
    }

    if (user && user.userid) { // user.id 대신 user.userid 사용
      console.log('사용자 ID 설정:', user.userid); // 디버깅용 로그
      setFormData(prev => ({
        ...prev,
        userid: user.userid // user.id 대신 user.userid 사용
      }))
    } else {
      console.log('사용자 정보 없음:', user); // 디버깅용 로그
      setModalInfo({
        isOpen: true,
        message: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.'
      })
      navigate('/')
    }
  }, [user, isAuthenticated, navigate])

  const handleLogout = () => {
    logout()
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('입력 필드 변경:', name, value);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setModalInfo({
        isOpen: true,
        message: '로그인이 필요합니다.'
      })
      navigate('/')
      return
    }

    try {
      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        userid: formData.userid,
        uploaddate: new Date().toISOString()
      }

      console.log('전송할 데이터:', {
        ...postData,
        titleLength: postData.title.length,
        contentLength: postData.content.length
      })

      // 서버 요청 전 데이터 검증
      if (!postData.title) {
        setModalInfo({
          isOpen: true,
          message: '제목을 입력해주세요.'
        })
        return
      }

      if (!postData.content) {
        setModalInfo({
          isOpen: true,
          message: '내용을 입력해주세요.'
        })
        return
      }

      if (!postData.userid) {
        console.log('userid 누락:', { postData, user })
        setModalInfo({
          isOpen: true,
          message: '로그인이 필요합니다.'
        })
        navigate('/')
        return
      }

      const headers = getAuthHeaders();
      console.log('요청 헤더:', headers);

      const response = await fetch(`${serverUrl}/api/posts`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(postData)
      })

      console.log('서버 응답 상태:', response.status)
      
      let data
      try {
        data = await response.json()
        console.log('서버 응답 데이터:', data)
      } catch (parseError) {
        console.error('응답 파싱 에러:', parseError)
        throw new Error('서버 응답을 처리할 수 없습니다.')
      }

      if (!response.ok) {
        throw new Error(data.message || `서버 에러: ${response.status}`)
      }

      // 성공 시 프로필 페이지로 이동
      navigate('/profile')
    } catch (error) {
      console.error('에러 상세 정보:', {
        message: error.message,
        stack: error.stack,
        userId: user?.userid,
        isAuthenticated,
        currentUser: user,
        formData: formData  // 현재 폼 데이터 상태도 로깅
      })

      setModalInfo({
        isOpen: true,
        message: error.message || '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
    <div className="post-page">
      <header className="main-header">
        <img src={LogoLight} alt="logo" className="main-logo" />
        <nav className="main-nav">
          <button onClick={() => navigate('/Chat')}><span className="material-symbols-outlined">forum</span></button>
          <button onClick={() => navigate('/Profile')}><span className="material-symbols-outlined">account_circle</span></button>
          <button onClick={handleLogout}><span className="material-symbols-outlined">logout</span></button>
        </nav>
      </header>

      <main className="post-content">
        <div className="post-wrapper">
            <div className="post-container">
            <button className="back-button" onClick={() => navigate('/main')}>
                <span className="material-symbols-outlined">chevron_left</span>
                메인으로
            </button>
            <form onSubmit={handleSubmit}>
              <div className="post-title-section">
                  <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="post-title-input" 
                  placeholder="게시글을 작성하세요!"
                  required
                  />
              </div>
              
              <div className="post-body">
                  <textarea 
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  className="post-content-input" 
                  placeholder="내용을 입력하세요..."
                  required
                  />
              </div>

              <button type="submit" className="post-btn">post</button>
            </form>
            </div>
        </div>
      </main>

      <Modal
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        onClose={closeModal}
      />
    </div>
  )
}

export default NewPost
