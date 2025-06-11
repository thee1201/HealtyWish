const serverUrl = import.meta.env.VITE_SERVER_URL
const socketUrl = import.meta.env.VITE_SOCKET_URL

import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Chat.css'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import React from 'react'

function DateDivider({ date }) {
  return (
    <div className="date-divider">
      <span>{date}</span>
    </div>
  );
}

function Chat() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState('select')
  const [chatType, setChatType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [newChatName, setNewChatName] = useState('')
  const [selectedChatRoom, setSelectedChatRoom] = useState(null)
  const [chatRooms, setChatRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const socketRef = useRef(null);
  const [inputMessage, setInputMessage] = useState("");
  const { user } = useAuth();
  const myUserId = String(user?.userid || localStorage.getItem('userid'));
  
  // 임시 사용자 데이터
  const users = [
    { id: 'user1', nickname: '김건강', userId: 'health_kim' },
    { id: 'user2', nickname: '이운동', userId: 'exercise_lee' },
    { id: 'user3', nickname: '박영양', userId: 'nutrition_park' },
    { id: 'user4', nickname: '최다이어트', userId: 'diet_choi' }
  ]

  const filteredUsers = users.filter(user => 
    user.nickname.includes(searchQuery) || user.userId.includes(searchQuery)
  )

  const handleOptionClick = (type) => {
    setChatType(type)
    setModalStep('search')
  }

  const handleBack = () => {
    if (modalStep === 'search') {
      setModalStep('select')
      setChatType('')
      setSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
    } else {
      setShowModal(false)
      resetChatCreation()
    }
  }

  // 사용자의 채팅방 목록을 가져오는 함수
  const fetchChatRooms = async (page = 1) => {
    try {
      setIsLoading(true) // 로딩 상태 설정
      const token = localStorage.getItem('token') // 토큰 가져오기
      if (!token) { // 토큰이 없으면 에러 발생
        throw new Error('로그인이 필요합니다.')
      }

      console.log('토큰:', token)

      const response = await fetch(`/api/chat_rooms?page=${page}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('응답 상태:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '채팅방 목록을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      console.log('받아온 채팅방 목록:', data)
      setChatRooms(data.chatRooms)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (err) {
      console.error('에러 발생:', err)
      setError(err.message)
      if (err.message === '로그인이 필요합니다.') {
        navigate('/')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChatRooms(currentPage)
  }, [currentPage])

  // 마지막 메시지 시간 포맷팅 함수
  const formatLastMessageTime = (lastMessage) => {
    if (!lastMessage || !lastMessage.sendtime) return ''
    const date = new Date(lastMessage.sendtime)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  // 사용자 검색
  const searchUsers = async (query) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('검색 시작 - 검색어:', query);
      const token = localStorage.getItem('token');
      console.log('토큰:', token);

      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('응답 상태:', response.status);

      if (!response.ok) {
        throw new Error('사용자 검색에 실패했습니다.');
      }

      const data = await response.json();
      console.log('검색 결과:', data);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('사용자 검색 에러:', error);
      setSearchResults([]);
    }
  };

  // 채팅방 생성
  const createChatRoom = async () => {
    try {
      if (!newChatName.trim()) {
        alert('채팅방 이름을 입력해주세요.');
        return;
      }

      if (selectedUsers.length === 0) {
        alert('채팅 상대를 선택해주세요.');
        return;
      }

      console.log('채팅방 생성 시도:', {
        name: newChatName,
        type: chatType,
        members: selectedUsers
      });

      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat_rooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupname: newChatName,
          isgroup: chatType === 'group',
          members: selectedUsers.map(user => user.userid)
        })
      });

      console.log('채팅방 생성 응답 상태:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '채팅방 생성에 실패했습니다.');
      }

      const data = await response.json();
      console.log('생성된 채팅방:', data);
      setChatRooms(prev => [data.chatRoom, ...prev]);
      setShowModal(false);
      resetChatCreation();
    } catch (error) {
      console.error('채팅방 생성 에러:', error);
      alert(error.message);
    }
  };

  // 채팅방 생성 관련 상태 초기화
  const resetChatCreation = () => {
    setModalStep('select');
    setChatType('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setNewChatName('');
  };

  // 사용자 선택/해제
  const toggleUserSelection = (user) => {
    console.log('사용자 선택/해제:', user);
    if (chatType === 'personal' && selectedUsers.length === 1) {
      setSelectedUsers([user]);
    } else {
      const isSelected = selectedUsers.some(u => u.userid === user.userid);
      if (isSelected) {
        setSelectedUsers(prev => prev.filter(u => u.userid !== user.userid));
      } else {
        setSelectedUsers(prev => [...prev, user]);
      }
    }
    console.log('선택된 사용자들:', selectedUsers);
  };

  // 검색어 변경 시 사용자 검색
  useEffect(() => {
    console.log('검색어 변경:', searchQuery);
    const delayDebounce = setTimeout(() => {
      if (modalStep === 'search') {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, modalStep]);

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // 페이지네이션 컴포넌트
  const Pagination = () => {
    const pageNumbers = []
    const maxVisiblePages = 4

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <div className="pagination">
        {currentPage > 1 && (
          <span 
            className="material-symbols-outlined"
            onClick={() => handlePageChange(currentPage - 1)}
          >
            chevron_left
          </span>
        )}
        <span className={`current-page ${totalPages <= 1 ? 'single' : ''}`}>
          {currentPage}
        </span>
        {totalPages > 1 && pageNumbers.map(number => (
          number !== currentPage && (
            <span
              key={number}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </span>
          )
        ))}
        {currentPage < totalPages && (
          <span 
            className="material-symbols-outlined"
            onClick={() => handlePageChange(currentPage + 1)}
          >
            chevron_right
          </span>
        )}
      </div>
    )
  }

  // 채팅방 선택 시 메시지 불러오기
  useEffect(() => {
    if (selectedChatRoom) {
      setMessagesLoading(true);
      fetch(`/api/chat_rooms/${selectedChatRoom.roomid}/messages`)
        .then(res => res.json())
        .then(data => {
          console.log('메시지 불러오기 응답:', data);
          setMessages(data.messages || []);
        })
        .catch((err) => {
          console.error('메시지 불러오기 실패:', err);
          setMessages([]);
        })
        .finally(() => setMessagesLoading(false));
    } else {
      setMessages([]);
    }
  }, [selectedChatRoom]);

  useEffect(() => {
    console.log('messages:', messages);
  }, [messages]);

  // 채팅방 선택 시 소켓 연결 및 join
  useEffect(() => {
    if (selectedChatRoom) { // 채팅방 선택 시
      if (!socketRef.current) { // 소켓 연결 시
        socketRef.current = io(socketUrl);
        socketRef.current.emit('authenticate', localStorage.getItem('token')); // 토큰 전송 후 소켓 연결
      }
      socketRef.current.emit('join', selectedChatRoom.roomid); // 채팅방 입장

      // 메시지 수신
      const handleMessage = (msg) => {
        if (msg.roomId === selectedChatRoom.roomid) {
          setMessages((prev) => [...prev, msg]);
        }
      };
      socketRef.current.on('message', handleMessage);

      // 정리(cleanup)
      return () => {
        socketRef.current.off('message', handleMessage);
      };
    }
  }, [selectedChatRoom]);

  // 메시지 전송 함수
  const sendMessage = () => {
    const myUserId = user?.userid || localStorage.getItem('userid');
    const myUsername = user?.username || localStorage.getItem('username');
    if (!inputMessage.trim() || !selectedChatRoom || !myUserId) {
      alert('로그인 정보가 없거나 메시지가 비어 있습니다.');
      return;
    }
    const msg = {
      roomId: selectedChatRoom.roomid,
      userId: myUserId,
      username: myUsername,
      text: inputMessage,
      sendtime: new Date().toISOString(),
    };
    console.log('메시지 전송:', msg); // 콘솔로 확인
    socketRef.current.emit('message', msg);
    setInputMessage("");
  };

  // 엔터로 메시지 전송
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      <header className="main-header">
        <img src={LogoLight} alt="logo" className="main-logo" />
        <nav className="main-nav">
          <button onClick={() => navigate('/Chat')}><span className="material-symbols-outlined" style={{ color: '#FFDF76' }}>forum</span></button>
          <button onClick={() => navigate('/Profile')}><span className="material-symbols-outlined">account_circle</span></button>
          <button onClick={() => navigate('/')}><span className="material-symbols-outlined">logout</span></button>
        </nav>
      </header>

      <main className="chat-content">
        <div className="chat-list">
          <button className="back-button" onClick={() => navigate('/main')}>
            <span className="material-symbols-outlined">chevron_left</span>
            메인으로
          </button>
          <button className="new-chat-btn" onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined">add</span>
            <span className="btn-text">새로운 채팅</span>
          </button>
          <div className="chat-rooms">
            {isLoading ? (
              <div className="loading-message">
                <p>채팅방 목록을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={() => fetchChatRooms(currentPage)}>다시 시도</button>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="no-chat-rooms">
                <p>참여한 채팅방이 없습니다.</p>
                <p>새로운 채팅을 시작해보세요!</p>
              </div>
            ) : (
              chatRooms.map((room) => (
                <div 
                  key={room.roomid} 
                  className={`chat-room-item ${selectedChatRoom?.roomid === room.roomid ? 'selected' : ''}`}
                  onClick={() => setSelectedChatRoom(room)}
                >
                  <div className="chat-room-info">
                    <span className="chat-room-name">{room.groupname}</span>
                  </div>
                  <div className="chat-room-type-container">
                    <span className={`chat-room-type ${room.isgroup ? "group" : "personal"}`}>
                      {room.isgroup ? "그룹" : "개인"}
                    </span>
                    <span className="chat-room-time">
                      {formatLastMessageTime(room.last_message)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {!isLoading && !error && <Pagination />}
        </div>

        <div className="chat-container">
          {selectedChatRoom ? (
            <>
              <div className="chat-header">
                <h2>{selectedChatRoom.groupname}</h2>
                <span className={`chat-room-type ${selectedChatRoom.isgroup ? "group" : "personal"}`}>
                  {selectedChatRoom.isgroup ? "그룹" : "개인"}
                </span>
              </div>

              <div className="chat-messages-container">
                <div className="chat-messages">
                  {messagesLoading ? (
                    <div className="loading-message">메시지 불러오는 중...</div>
                  ) : messages.length > 0 ? (
                    (() => {
                      let lastDate = null;
                      return messages.map((msg, idx) => {
                        const msgSenderId = String(msg.userId || msg.userid);
                        const msgDate = new Date(msg.sendtime).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                        });
                        const showDateDivider = lastDate !== msgDate;
                        lastDate = msgDate;
                        return (
                          <React.Fragment key={msg.messageid || idx}>
                            {showDateDivider && <DateDivider date={msgDate} />}
                            <div
                              className={`${msgSenderId === myUserId ? 'my' : 'other'} message`}
                            >
                              <div className="sender">{msgSenderId === myUserId ? '나' : (msg.username || msg.userId || msg.userid)}</div>
                              <div className="bubble-container">
                                <div className="bubble">{msg.text}</div>
                                <div className="time">{formatLastMessageTime(msg)}</div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()
                  ) : (
                    <div className="no-messages">
                      <p>아직 메시지가 없습니다.</p>
                      <p>첫 메시지를 보내보세요!</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="chat-input-container">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="메시지를 입력하세요..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
                <button className="send-button" onClick={sendMessage}>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>채팅방을 선택해주세요</p>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={handleBack}>
            <div className="chat-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                {modalStep === 'search' && (
                  <button className="back-button" onClick={handleBack}>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                )}
                <h2>
                  {modalStep === 'select' 
                    ? '새로운 채팅' 
                    : `${chatType === 'group' ? '그룹' : '개인'} 채팅 만들기`}
                </h2>
              </div>

              {modalStep === 'select' ? (
                <div className="modal-options">
                  <button className="modal-option" onClick={() => handleOptionClick('group')}>
                    <span className="material-symbols-outlined">group</span>
                    <span>그룹 채팅 만들기</span>
                  </button>
                  <button className="modal-option" onClick={() => handleOptionClick('personal')}>
                    <span className="material-symbols-outlined">person</span>
                    <span>개인 채팅 시작하기</span>
                  </button>
                </div>
              ) : (
                <div className="chat-creation-container">
                  <input
                    type="text"
                    placeholder={`${chatType === 'group' ? '그룹' : '개인'} 채팅방 이름`}
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="chat-name-input"
                  />
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <span className="material-symbols-outlined">search</span>
                      <input
                        type="text"
                        placeholder="사용자 검색 (2글자 이상)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    {selectedUsers.length > 0 && (
                      <div className="selected-users">
                        {selectedUsers.map(user => (
                          <div key={user.userid} className="selected-user-tag">
                            <span>{user.username}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserSelection(user);
                              }}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="search-results">
                      {searchQuery.trim().length < 2 ? (
                        <div className="search-placeholder">
                          <p>2글자 이상 입력하여 사용자를 검색하세요</p>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="search-placeholder">
                          <p>검색 결과가 없습니다</p>
                        </div>
                      ) : (
                        searchResults.map(user => (
                          <button
                            key={user.userid}
                            className={`user-item ${
                              selectedUsers.some(u => u.userid === user.userid) ? 'selected' : ''
                            }`}
                            onClick={() => toggleUserSelection(user)}
                          >
                            <div className="user-info">
                              <span className="user-nickname">{user.username}</span>
                              <span className="user-id">@{user.userid}</span>
                            </div>
                            <span className="material-symbols-outlined">
                              {selectedUsers.some(u => u.userid === user.userid) ? 'check' : 'add'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <button 
                    className="create-chat-button"
                    onClick={createChatRoom}
                    disabled={selectedUsers.length === 0 || !newChatName.trim()}
                  >
                    채팅방 만들기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Chat
