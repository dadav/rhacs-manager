import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/BackToTop/back-to-top.mjs';
import { css } from '@patternfly/react-styles';
import AngleUpIcon from '@patternfly/react-icons/dist/esm/icons/angle-up-icon';
import { canUseDOM } from '../../helpers/util';
import { Button } from '../Button';
const BackToTopBase = (_a) => {
    var { className, title = 'Back to top', innerRef, scrollableSelector, isAlwaysVisible = false } = _a, props = __rest(_a, ["className", "title", "innerRef", "scrollableSelector", "isAlwaysVisible"]);
    const [visible, setVisible] = useState(isAlwaysVisible);
    useEffect(() => {
        setVisible(isAlwaysVisible);
    }, [isAlwaysVisible]);
    const [scrollElement, setScrollElement] = useState(null);
    const toggleVisible = () => {
        if (scrollElement) {
            const scrolled = scrollElement.scrollY ? scrollElement.scrollY : scrollElement.scrollTop;
            if (!isAlwaysVisible) {
                if (scrolled > 400) {
                    setVisible(true);
                }
                else {
                    setVisible(false);
                }
            }
        }
    };
    useEffect(() => {
        const hasScrollSpy = Boolean(scrollableSelector);
        if (hasScrollSpy) {
            const scrollEl = document.querySelector(scrollableSelector);
            if (!canUseDOM || !(scrollEl instanceof HTMLElement)) {
                return;
            }
            setScrollElement(scrollEl);
            scrollEl.addEventListener('scroll', toggleVisible);
            return () => {
                scrollEl.removeEventListener('scroll', toggleVisible);
            };
        }
        else {
            if (!canUseDOM) {
                return;
            }
            const scrollEl = window;
            setScrollElement(scrollEl);
            scrollEl.addEventListener('scroll', toggleVisible);
            return () => {
                scrollEl.removeEventListener('scroll', toggleVisible);
            };
        }
    }, [scrollableSelector, toggleVisible]);
    const handleClick = () => {
        scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return (_jsx("div", Object.assign({ className: css(styles.backToTop, !visible && styles.modifiers.hidden, className), ref: innerRef, onClick: handleClick }, props, { children: _jsx(Button, { variant: "primary", icon: _jsx(AngleUpIcon, {}), iconPosition: "end", children: title }) })));
};
export const BackToTop = forwardRef((props, ref) => (_jsx(BackToTopBase, Object.assign({ innerRef: ref }, props))));
BackToTop.displayName = 'BackToTop';
//# sourceMappingURL=BackToTop.js.map