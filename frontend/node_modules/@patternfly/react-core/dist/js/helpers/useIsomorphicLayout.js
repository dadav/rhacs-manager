"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsomorphicLayoutEffect = void 0;
const react_1 = require("react");
const util_1 = require("./util");
/**
 * Small wrapper around `useLayoutEffect` to get rid of the warning on SSR envs
 */
exports.useIsomorphicLayoutEffect = util_1.canUseDOM ? react_1.useLayoutEffect : react_1.useEffect;
//# sourceMappingURL=useIsomorphicLayout.js.map