import { render, screen, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import App from '@/App'
import React, { useEffect } from 'react'

function SetToken({ token }: { token: string }) {
  const { setToken } = useAuth();
  useEffect(() => { setToken(token); }, [token, setToken]);
  return null;
}

const createWrapper = (token: string | null = null) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {token && <SetToken token={token} />}
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders navigation links', () => {
    const Wrapper = createWrapper()
    render(<Wrapper><App /></Wrapper>)

    expect(screen.getByText('Posts')).toBeInTheDocument()
    expect(screen.getByText('New Post')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('shows logout button when authenticated', async () => {
    const Wrapper = createWrapper('mock-token')
    render(<Wrapper><App /></Wrapper>)

    expect(await screen.findByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })
})
