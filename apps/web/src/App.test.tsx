import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import App from '@/App'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders navigation links', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <App />
      </Wrapper>
    )

    expect(screen.getByText('Posts')).toBeInTheDocument()
    expect(screen.getByText('New Post')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('shows logout button when authenticated', () => {
    // Mock authenticated state
    localStorage.setItem('token', 'mock-token')

    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <App />
      </Wrapper>
    )

    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()

    localStorage.removeItem('token')
  })
})