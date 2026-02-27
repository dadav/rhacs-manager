import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { canUseDOM } from '../../helpers';
import { AlertGroupInline } from './AlertGroupInline';
import { useHasAnimations } from '../../helpers';
export const AlertGroup = (_a) => {
    var { className, children, hasAnimations: hasAnimationsProp, isToast, isLiveRegion, onOverflowClick, overflowMessage, 'aria-label': ariaLabel, appendTo } = _a, props = __rest(_a, ["className", "children", "hasAnimations", "isToast", "isLiveRegion", "onOverflowClick", "overflowMessage", 'aria-label', "appendTo"]);
    const containerRef = useRef(null);
    const [isContainerReady, setIsContainerReady] = useState(false);
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    const getTargetElement = () => {
        if (typeof appendTo === 'function') {
            return appendTo();
        }
        return appendTo || document.body;
    };
    useEffect(() => {
        if (isToast && canUseDOM) {
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
    const alertGroup = (_jsx(AlertGroupInline, Object.assign({ onOverflowClick: onOverflowClick, className: className, isToast: isToast, isLiveRegion: isLiveRegion, overflowMessage: overflowMessage, "aria-label": ariaLabel, hasAnimations: hasAnimations }, props, { children: children })));
    if (!isToast) {
        return alertGroup;
    }
    const container = containerRef.current;
    if (!canUseDOM || !container || !isContainerReady) {
        return null;
    }
    return ReactDOM.createPortal(alertGroup, container);
};
AlertGroup.displayName = 'AlertGroup';
//# sourceMappingURL=AlertGroup.js.map