import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, PageSection, Button } from '@patternfly/react-core'
import i18n from '../i18n'

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
            title={i18n.t('error.unexpected')}
            actionLinks={
              <Button variant="link" onClick={() => this.setState({ error: null })}>
                {i18n.t('error.retry')}
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
