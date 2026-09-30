import { api } from './api'

let cachedClientId = null

export async function getGoogleClientId() {
  if (cachedClientId !== null) return cachedClientId

  const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
  if (envId && envId !== 'your_google_client_id') {
    cachedClientId = envId
    return cachedClientId
  }

  try {
    const res = await api.get('/auth/google/config')
    if (res?.configured && res?.client_id) {
      cachedClientId = res.client_id
      return cachedClientId
    }
  } catch {
    // ignore
  }

  cachedClientId = ''
  return ''
}

/**
 * Triggers Google's official account selection screen via Google Identity Services.
 *
 * @param {Object} options
 * @param {(token: string) => void} options.onSuccess - Called with the verified Google credential (access token or id token)
 * @param {(error: Error) => void} options.onError - Called on failure
 * @param {() => void} [options.onCancel] - Called if the user closed the popup without authenticating
 * @param {() => void} [options.onNeedConfig] - Called if Google Client ID is not yet configured in .env
 */
export async function launchGoogleAccountSelector({ onSuccess, onError, onCancel, onNeedConfig }) {
  const clientId = await getGoogleClientId()

  if (!clientId) {
    if (onNeedConfig) {
      onNeedConfig()
    } else {
      onError?.(new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.'))
    }
    return
  }

  // Ensure Google Identity Services script is available
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    // Wait briefly if script is still loading
    let retries = 0
    while ((!window.google?.accounts?.oauth2) && retries < 15) {
      await new Promise(r => setTimeout(r, 100))
      retries++
    }
    if (!window.google?.accounts?.oauth2) {
      onError?.(new Error('Google Identity Services SDK could not be loaded. Check your internet connection.'))
      return
    }
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (tokenResponse) => {
        if (tokenResponse?.error) {
          if (tokenResponse.error === 'access_denied') {
            onCancel?.()
          } else {
            onError?.(new Error(tokenResponse.error_description || tokenResponse.error || 'Google authentication failed.'))
          }
          return
        }

        if (tokenResponse?.access_token) {
          onSuccess(tokenResponse.access_token)
        } else {
          onError?.(new Error('No authentication credential received from Google.'))
        }
      },
      error_callback: (err) => {
        if (err?.type === 'popup_closed' || err?.type === 'user_cancel') {
          onCancel?.()
        } else {
          onError?.(new Error(err?.message || 'Google account selection was closed.'))
        }
      }
    })

    // Request token with official Google account chooser screen
    tokenClient.requestAccessToken({ prompt: 'select_account' })
  } catch (err) {
    onError?.(err)
  }
}
