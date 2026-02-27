"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHasAnimations = exports.useAnimationsConfig = exports.AnimationsProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
/** Context to provide animations configuration to child components */
const AnimationsContext = (0, react_1.createContext)({
    hasAnimations: false
});
/**
 * AnimationsProvider is an application-level provider that provides uniform
 * animation configuration for all PatternFly React components via the React context API.
 *
 * **Usage**: Place this provider at the root of your application to enable global
 * animation control without requiring manual prop drilling throughout your component tree.
 *
 * **Benefits**:
 * - Centralized animation control for the entire application
 * - Respects user accessibility preferences (reduced motion)
 * - Components can still override the global setting when needed
 * - Works with all PatternFly components that support animations
 *
 * @example
 * ```tsx
 * // App.tsx - Place at your application root
 * import { AnimationsProvider } from '@patternfly/react-core';
 *
 * const App = () => (
 *   <AnimationsProvider config={{ hasAnimations: true }}>
 *     <MyApplication />
 *   </AnimationsProvider>
 * );
 * ```
 */
const AnimationsProvider = ({ config, children }) => ((0, jsx_runtime_1.jsx)(AnimationsContext.Provider, { value: config, children: children }));
exports.AnimationsProvider = AnimationsProvider;
/**
 * Hook to access the animations configuration from the nearest AnimationsProvider.
 *
 * This hook allows components to check if animations are enabled and override
 * their local hasAnimations prop accordingly.
 *
 * @returns The animations configuration object
 *
 * @example
 * ```tsx
 * const MyComponent = ({ hasAnimations: hasAnimationsProp, ...props }) => {
 *   const { hasAnimations: contextHasAnimations } = useAnimationsConfig();
 *   const hasAnimations = hasAnimationsProp ?? contextHasAnimations;
 *
 *   return <div className={hasAnimations ? 'with-animations' : ''} {...props} />;
 * };
 * ```
 */
const useAnimationsConfig = () => {
    const context = (0, react_1.useContext)(AnimationsContext);
    if (context === undefined) {
        // Return default config if no provider is found
        return { hasAnimations: false };
    }
    return context;
};
exports.useAnimationsConfig = useAnimationsConfig;
/**
 * Utility hook that combines local hasAnimations prop with context configuration.
 * The local prop takes precedence when explicitly set, otherwise falls back to context.
 *
 * @param hasAnimationsProp - The hasAnimations prop passed directly to the component
 * @returns The resolved hasAnimations value
 *
 * @example
 * ```tsx
 * const MyComponent = ({ hasAnimations: hasAnimationsProp, ...props }) => {
 *   const hasAnimations = useHasAnimations(hasAnimationsProp);
 *
 *   return <div className={hasAnimations ? 'animated' : 'static'} {...props} />;
 * };
 * ```
 */
const useHasAnimations = (hasAnimationsProp) => {
    var _a;
    const { hasAnimations: contextHasAnimations } = (0, exports.useAnimationsConfig)();
    // Local prop takes precedence when explicitly set (including false)
    // If local prop is undefined, fall back to context
    return (_a = hasAnimationsProp !== null && hasAnimationsProp !== void 0 ? hasAnimationsProp : contextHasAnimations) !== null && _a !== void 0 ? _a : false;
};
exports.useHasAnimations = useHasAnimations;
exports.AnimationsProvider.displayName = 'AnimationsProvider';
//# sourceMappingURL=AnimationsProvider.js.map