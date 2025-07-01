import { connect } from 'react-redux'
import { bindActionCreators } from '@reduxjs/toolkit'
import type { RootState } from '../index'

/**
 * Auto-dispatch connector utility that automatically binds action creators to dispatch
 * 
 * @param mapStateToProps - Function to map state to component props
 * @param actions - Object containing action creators to bind to dispatch
 * @returns Connected component with auto-dispatched actions
 * 
 * @example
 * ```tsx
 * export default connectAutoDispatch(
 *   (state: RootState) => ({
 *     user: state.auth.user,
 *     isLoading: state.auth.isLoading,
 *   }),
 *   {
 *     setUser,
 *     clearUser,
 *     showNotification,
 *   },
 * )(MyComponent)
 * ```
 */
export function connectAutoDispatch<TStateProps = Record<string, unknown>>(
  mapStateToProps: ((state: RootState) => TStateProps) | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: Record<string, any>
) {
  return connect(
    mapStateToProps,
    (dispatch) => bindActionCreators(actions, dispatch)
  )
} 