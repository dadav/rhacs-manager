"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ReactDOM = tslib_1.__importStar(require("react-dom"));
const helpers_1 = require("../../helpers");
const AlertGroupInline_1 = require("./AlertGroupInline");
const helpers_2 = require("../../helpers");
const AlertGroup = (_a) => {
    var { className, children, hasAnimations: hasAnimationsProp, isToast, isLiveRegion, onOverflowClick, overflowMessage, 'aria-label': ariaLabel, appendTo } = _a, props = tslib_1.__rest(_a, ["className", "children", "hasAnimations", "isToast", "isLiveRegion", "onOverflowClick", "overflowMessage", 'aria-label', "appendTo"]);
    const containerRef = (0, react_1.useRef)(null);
    const [isContainerReady, setIsContainerReady] = (0, react_1.useState)(false);
    const hasAnimations = (0, helpers_2.useHasAnimations)(hasAnimationsProp);
    const getTargetElement = () => {
        if (typeof appendTo === 'function') {
            return appendTo();
        }
        return appendTo || document.body;
    };
    (0, react_1.useEffect)(() => {
        if (isToast && helpers_1.canUseDOM) {
            const container = document.createElement('div');
            const target = getTargetElement();
            containerRef.current = container;
            target.appendChild(container);
            setIsContainerReady(true);
            return () => {
                if (containerRef.current) {
                    target.removeChild(containerRef.current);
                    containerRef.current = null;
                }
                setIsContainerReady(false);
            };
        }
    }, [isToast, appendTo]);
    const alertGroup = ((0, jsx_runtime_1.jsx)(AlertGroupInline_1.AlertGroupInline, Object.assign({ onOverflowClick: onOverflowClick, className: className, isToast: isToast, isLiveRegion: isLiveRegion, overflowMessage: overflowMessage, "aria-label": ariaLabel, hasAnimations: hasAnimations }, props, { children: children })));
    if (!isToast) {
        return alertGroup;
    }
    const container = containerRef.current;
    if (!helpers_1.canUseDOM || !container || !isContainerReady) {
        return null;
    }
    return ReactDOM.createPortal(alertGroup, container);
};
exports.AlertGroup = AlertGroup;
exports.AlertGroup.displayName = 'AlertGroup';
//# sourceMappingURL=AlertGroup.js.map