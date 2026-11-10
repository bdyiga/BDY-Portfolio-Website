import { Component, lazy, Suspense, type ReactNode } from 'react'
import { StylisedPlayer } from './StylisedPlayer'

// the rigged athlete (and its glTF loader) arrive after the stadium is up
const Athlete = lazy(() => import('./Athlete'))

/** If the model cannot load, the code-only #13 stays on the pitch for good. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('#13: the rigged athlete failed to load, keeping the stylised figure.', error)
  }
  render() {
    return this.state.failed ? <StylisedPlayer /> : this.props.children
  }
}

/** #13: the stylised figure until the rigged athlete has loaded. */
export function Player() {
  return (
    <Fallback>
      <Suspense fallback={<StylisedPlayer />}>
        <Athlete />
      </Suspense>
    </Fallback>
  )
}
