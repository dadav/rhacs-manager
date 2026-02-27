import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect, useRef, useState, useContext } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Alert/alert.mjs';
import alertGroupStyles from '@patternfly/react-styles/css/components/Alert/alert-group.mjs';
import { AlertIcon } from './AlertIcon';
import { capitalize, useOUIAProps } from '../../helpers';
import { AlertContext } from './AlertContext';
import { AlertGroupContext } from './AlertGroupContext';
import maxLines from '@patternfly/react-tokens/dist/esm/c_alert__title_max_lines';
import { Tooltip } from '../Tooltip';
import { AlertToggleExpandButton } from './AlertToggleExpandButton';
export var AlertVariant;
(function (AlertVariant) {
    AlertVariant["success"] = "success";
    AlertVariant["danger"] = "danger";
    AlertVariant["warning"] = "warning";
    AlertVariant["info"] = "info";
    AlertVariant["custom"] = "custom";
})(AlertVariant || (AlertVariant = {}));
export const Alert = (_a) => {
    var { variant = AlertVariant.custom, isInline = false, isPlain = false, isLiveRegion = false, variantLabel = `${capitalize(variant)} alert:`, actionClose, actionLinks, title, component = 'h4', children = '', className = '', ouiaId, ouiaSafe = true, timeout = false, timeoutAnimation = 3000, onTimeout = () => { }, truncateTitle = 0, tooltipPosition, customIcon, isExpandable = false, toggleAriaLabel = `${capitalize(variant)} alert details`, onMouseEnter = () => { }, onMouseLeave = () => { }, id } = _a, props = __rest(_a, ["variant", "isInline", "isPlain", "isLiveRegion", "variantLabel", "actionClose", "actionLinks", "title", "component", "children", "className", "ouiaId", "ouiaSafe", "timeout", "timeoutAnimation", "onTimeout", "truncateTitle", "tooltipPosition", "customIcon", "isExpandable", "toggleAriaLabel", "onMouseEnter", "onMouseLeave", "id"]);
    const ouiaProps = useOUIAProps(Alert.displayName, ouiaId, ouiaSafe, variant);
    const getHeadingContent = (_jsxs(Fragment, { children: [_jsx("span", { className: "pf-v6-screen-reader", children: variantLabel }), title] }));
    const titleRef = useRef(null);
    const TitleComponent = component;
    const divRef = useRef(undefined);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    useEffect(() => {
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(maxLines.name, truncateTitle.toString());
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const [timedOut, setTimedOut] = useState(false);
    const [timedOutAnimation, setTimedOutAnimation] = useState(true);
    const [isMouseOver, setIsMouseOver] = useState();
    const [containsFocus, setContainsFocus] = useState();
    const shouldDismiss = timedOut && timedOutAnimation && !isMouseOver && !containsFocus;
    const [isDismissed, setIsDismissed] = useState(false);
    const { hasAnimations, updateTransitionEnd } = useContext(AlertGroupContext);
    const { offstageRight } = alertGroupStyles.modifiers;
    const getParentAlertGroupItem = () => { var _a; return (_a = divRef.current) === null || _a === void 0 ? void 0 : _a.closest(`.${alertGroupStyles.alertGroupItem}`); };
    useEffect(() => {
        const shouldSetDismissed = shouldDismiss && !isDismissed;
        if (!shouldSetDismissed) {
            return;
        }
        const alertGroupItem = getParentAlertGroupItem();
        alertGroupItem === null || alertGroupItem === void 0 ? void 0 : alertGroupItem.classList.add(offstageRight);
        if (hasAnimations) {
            updateTransitionEnd(() => {
                setIsDismissed(true);
            });
        }
        else {
            setIsDismissed(true);
        }
    }, [shouldDismiss, isDismissed]);
    useEffect(() => {
        const calculatedTimeout = timeout === true ? 8000 : Number(timeout);
        if (calculatedTimeout > 0) {
            const timer = setTimeout(() => setTimedOut(true), calculatedTimeout);
            return () => clearTimeout(timer);
        }
    }, [timeout]);
    useEffect(() => {
        const onDocumentFocus = () => {
            if (divRef.current) {
                if (divRef.current.contains(document.activeElement)) {
                    setContainsFocus(true);
                    setTimedOutAnimation(false);
                }
                else if (containsFocus) {
                    setContainsFocus(false);
                }
            }
        };
        document.addEventListener('focus', onDocumentFocus, true);
        return () => document.removeEventListener('focus', onDocumentFocus, true);
    }, [containsFocus]);
    useEffect(() => {
        if (containsFocus === false || isMouseOver === false) {
            const timer = setTimeout(() => setTimedOutAnimation(true), timeoutAnimation);
            return () => clearTimeout(timer);
        }
    }, [containsFocus, isMouseOver, timeoutAnimation]);
    useEffect(() => {
        isDismissed && onTimeout();
    }, [isDismissed, onTimeout]);
    useEffect(() => {
        const alertGroupItem = getParentAlertGroupItem();
        setTimeout(() => alertGroupItem === null || alertGroupItem === void 0 ? void 0 : alertGroupItem.classList.remove(alertGroupStyles.modifiers.offstageTop), 0);
    }, []);
    const [isExpanded, setIsExpanded] = useState(false);
    const onToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };
    const myOnMouseEnter = (ev) => {
        setIsMouseOver(true);
        setTimedOutAnimation(false);
        onMouseEnter(ev);
    };
    const myOnMouseLeave = (ev) => {
        setIsMouseOver(false);
        onMouseLeave(ev);
    };
    if (shouldDismiss && isDismissed) {
        return null;
    }
    const Title = (_jsx(TitleComponent, Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: css(styles.alertTitle, truncateTitle && styles.modifiers.truncate), children: getHeadingContent })));
    return (_jsxs("div", Object.assign({ ref: divRef, className: css(styles.alert, isInline && styles.modifiers.inline, isPlain && styles.modifiers.plain, isExpandable && styles.modifiers.expandable, isExpanded && styles.modifiers.expanded, styles.modifiers[variant], className) }, ouiaProps, (isLiveRegion && {
        'aria-live': 'polite',
        'aria-atomic': 'false'
    }), { onMouseEnter: myOnMouseEnter, onMouseLeave: myOnMouseLeave, id: id }, props, { children: [isExpandable && (_jsx(AlertContext.Provider, { value: { title, variantLabel }, children: _jsx("div", { className: css(styles.alertToggle), children: _jsx(AlertToggleExpandButton, { isExpanded: isExpanded, onToggleExpand: onToggleExpand, "aria-label": toggleAriaLabel }) }) })), _jsx(AlertIcon, { variant: variant, customIcon: customIcon }), isTooltipVisible ? (_jsx(Tooltip, { content: getHeadingContent, position: tooltipPosition, children: Title })) : (Title), actionClose && (_jsx(AlertContext.Provider, { value: { title, variantLabel }, children: _jsx("div", { className: css(styles.alertAction), children: actionClose }) })), children && (!isExpandable || (isExpandable && isExpanded)) && (_jsx("div", { className: css(styles.alertDescription), children: children })), actionLinks && _jsx("div", { className: css(styles.alertActionGroup), children: actionLinks })] })));
};
Alert.displayName = 'Alert';
//# sourceMappingURL=Alert.js.map