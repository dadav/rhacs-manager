import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, PageSection, Button } from '@patternfly/react-core'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <PageSection>
          <Alert
            variant="danger"
            title="Ein unerwarteter Fehler ist aufgetreten"
            actionLinks={
              <Button variant="link" onClick={() => this.setState({ error: null })}>
                Erneut versuchen
              </Button>
            }
          >
            <p>{this.state.error.message}</p>
          </Alert>
        </PageSection>
      )
    }
    return this.props.children
  }
}
