"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInterval = void 0;
/** This is a custom React hook in a format suggest by Dan Abramov in a blog post here:
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/. It allows setInterval to be used
 * declaratively in functional React components.
 */
const react_1 = require("react");
function useInterval(callback, delay) {
    const savedCallback = (0, react_1.useRef)(() => { });
    (0, react_1.useEffect)(() => {
        savedCallback.current = callback;
    }, [callback]);
    (0, react_1.useEffect)(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}
exports.useInterval = useInterval;
//# sourceMappingURL=useInterval.js.map