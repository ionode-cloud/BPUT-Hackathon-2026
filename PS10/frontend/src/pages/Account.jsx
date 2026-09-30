import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Toast } from '../components/ui'

function GoogleSmallIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" style={{ flexShrink: 0, verticalAlign: 'middle', marginRight: 5 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function Account() {
  const { user, refresh, updateProfile } = useAuth()
  const fileInputRef = useRef(null)

  // Profile fields
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')

  // Password fields
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(true)
  const [showNewPw, setShowNewPw] = useState(false)

  // UI state
  const [toast, setToast] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [busyProfile, setBusyProfile] = useState(false)
  const [busyPw, setBusyPw] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setAvatar(user.avatar || '')

    }
  }, [user])

  // Process and optimize uploaded image (resize to 256x256 max)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileErr('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileErr('Image file is too large (maximum size is 5MB).')
      return
    }

    setProfileErr('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 256
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUri = canvas.toDataURL('image/jpeg', 0.88)
        setAvatar(compressedDataUri)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Save Profile Details
  const handleSaveProfile = async (e) => {
    e?.preventDefault()
    setProfileErr('')
    setProfileMsg('')

    if (!name.trim() || name.trim().length < 2) {
      setProfileErr('Full name must be at least 2 characters long.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setProfileErr('Please provide a valid email address.')
      return
    }

    setBusyProfile(true)
    try {
      if (updateProfile) {
        await updateProfile({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          avatar: avatar.trim(),
        })
      } else {
        await api.put('/auth/profile', {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          avatar: avatar.trim(),
        })
        await refresh()
      }
      setProfileMsg('Profile updated successfully!')
      setToast('Profile details saved.')
    } catch (err) {
      setProfileErr(err.message || 'Failed to update profile.')
    } finally {
      setBusyProfile(false)
    }
  }

  // Change Password
  const handleChangePassword = async (e) => {
    e?.preventDefault()
    setPwErr('')
    setPwMsg('')

    const isGoogleAccount = user?.auth_provider === 'google'

    if (!isGoogleAccount && !currentPw) {
      setPwErr('Please enter your current password.')
      return
    }

    if (newPw.length < 8) {
      setPwErr('New password must be at least 8 characters long.')
      return
    }

    if (!/[A-Z]/.test(newPw)) {
      setPwErr('New password must contain at least one uppercase letter (A-Z).')
      return
    }

    if (!/[0-9]/.test(newPw)) {
      setPwErr('New password must contain at least one digit (0-9).')
      return
    }

    if (newPw !== confirmPw) {
      setPwErr('New password and confirmation do not match.')
      return
    }

    setBusyPw(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
      setPwMsg('Password changed successfully.')
      setToast('Security password updated.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      await refresh()
    } catch (err) {
      setPwErr(err.message || 'Failed to change password.')
    } finally {
      setBusyPw(false)
    }
  }

  const isGoogle = user?.auth_provider === 'google'

  return (
    <div className="account-container" style={{ maxWidth: 960, margin: '0 auto', padding: '16px 0 40px' }}>

      {/* ── Top Header ── */}
      <div className="topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Account & Profile</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>
            Manage your personal profile, contact information, profile picture, and account security.
          </p>
        </div>
      </div>

      {/* ── Profile Summary Card ── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', border: '1.5px solid #e2e8f0', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar display */}
          <div style={{ position: 'relative' }}>
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb', boxShadow: '0 4px 14px rgba(37,99,235,0.2)' }}
              />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 800, border: '3px solid #e2e8f0' }}>
                {name ? name[0].toUpperCase() : 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Picture"
              style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: '#fff', border: '2px solid #fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 13 }}
            >
              📷
            </button>
          </div>

          {/* User metadata */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{user?.name}</h2>
              <span className={`badge role-${user?.role}`}>{user?.role}</span>
              {isGoogle && (
                <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center' }}>
                  <GoogleSmallIcon /> Google Connected
                </span>
              )}
            </div>
            <div style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
              ✉ {user?.email} {user?.phone && `· 📞 ${user?.phone}`}
            </div>
            {user?.created_at && (
              <div className="small muted" style={{ marginTop: 4 }}>
                Member since: {user.created_at.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Settings Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>

        {/* ── CARD 1: Edit Profile Details ── */}
        <div className="card" style={{ borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👤</span> Personal Information
          </h2>

          <form onSubmit={handleSaveProfile}>
            {/* Profile Picture Management */}
            <div style={{ marginBottom: 18, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>
                Profile Picture
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn small"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#fff', border: '1.5px solid #cbd5e1' }}
                >
                  📁 Upload New Photo
                </button>
                {avatar && (
                  <button
                    type="button"
                    className="linkbtn small"
                    style={{ color: '#dc2626' }}
                    onClick={() => setAvatar('')}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <div className="small muted" style={{ marginTop: 6, fontSize: 11 }}>
                Supports PNG, JPG, or WEBP. Automatically resized for best quality.
              </div>
            </div>

            {/* Full Name */}
            <div style={{ marginBottom: 14 }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Email / Gmail */}
            <div style={{ marginBottom: 14 }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>
                Email / Gmail Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@college.edu or you@gmail.com"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              {isGoogle && (
                <div className="small" style={{ color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center' }}>
                  <GoogleSmallIcon /> Verified Google Identity Email
                </div>
              )}
            </div>

            {/* Mobile Number */}
            <div style={{ marginBottom: 18 }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>
                Mobile / Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <div className="small muted" style={{ marginTop: 4, fontSize: 11 }}>
                Used for placement notifications, drive updates, and interview SMS/WhatsApp alerts.
              </div>
            </div>

            {profileErr && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                ⚠ {profileErr}
              </div>
            )}

            {profileMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                ✓ {profileMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              disabled={busyProfile}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busyProfile ? 'Saving profile…' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* ── CARD 2: Security & Password ── */}
        <div className="card" style={{ borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔒</span> Password & Security
          </h2>

          {user?.must_change_password && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              <strong>Notice:</strong> You are currently signed in with a temporary password. Please set your own secure password.
            </div>
          )}

          {isGoogle && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>
                <GoogleSmallIcon /> Google Sign-in Enabled
              </div>
              You can log in directly with your Google account. You can also set a password below to allow email & password login.
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            {/* Current Password */}
            {!isGoogle && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="small" style={{ fontWeight: 700, margin: 0 }}>
                    Current Password <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    className="linkbtn small"
                    onClick={() => setShowCurrentPw(s => !s)}
                    style={{ fontSize: 11, color: '#2563eb', padding: 0 }}
                  >
                    {showCurrentPw ? '👁️ Text Visible' : '🙈 Text Hidden'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter existing password"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(s => !s)}
                    title={showCurrentPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}
                  >
                    {showCurrentPw ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
            )}

            {/* New Password */}
            <div style={{ marginBottom: 14 }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>
                New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 8 characters, 1 uppercase & 1 digit"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(s => !s)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                  {showNewPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: 14 }}>
              <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 5 }}>
                Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Password checklist */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              <div style={{ color: newPw.length >= 8 ? '#16a34a' : '#64748b' }}>
                {newPw.length >= 8 ? '✓' : '○'} At least 8 characters long
              </div>
              <div style={{ color: /[A-Z]/.test(newPw) ? '#16a34a' : '#64748b' }}>
                {/[A-Z]/.test(newPw) ? '✓' : '○'} At least 1 uppercase letter (A-Z)
              </div>
              <div style={{ color: /[0-9]/.test(newPw) ? '#16a34a' : '#64748b' }}>
                {/[0-9]/.test(newPw) ? '✓' : '○'} At least 1 digit (0-9)
              </div>
              <div style={{ color: (newPw && newPw === confirmPw) ? '#16a34a' : '#64748b' }}>
                {(newPw && newPw === confirmPw) ? '✓' : '○'} Passwords match
              </div>
            </div>

            {pwErr && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                ⚠ {pwErr}
              </div>
            )}

            {pwMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                ✓ {pwMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn"
              disabled={busyPw || !newPw || !confirmPw}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busyPw ? 'Updating password…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  )
}
