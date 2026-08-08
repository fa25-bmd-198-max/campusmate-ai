import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children:  ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error:    Error | null
}

/**
 * Catches render errors in the component tree and shows a fallback UI.
 * Wrap at the app root and around individual feature areas.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/30">
            ⚠️
          </div>
          <div className="max-w-md space-y-2">
            <h1 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="text-body text-gray-500 dark:text-gray-400">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
