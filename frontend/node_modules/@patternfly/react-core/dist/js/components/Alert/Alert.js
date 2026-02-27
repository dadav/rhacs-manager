"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = exports.AlertVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const alert_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Alert/alert"));
const alert_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Alert/alert-group"));
const AlertIcon_1 = require("./AlertIcon");
const helpers_1 = require("../../helpers");
const AlertContext_1 = require("./AlertContext");
const AlertGroupContext_1 = require("./AlertGroupContext");
const c_alert__title_max_lines_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_alert__title_max_lines'));
const Tooltip_1 = require("../Tooltip");
const AlertToggleExpandButton_1 = require("./AlertToggleExpandButton");
var AlertVariant;
(function (AlertVariant) {
    AlertVariant["success"] = "success";
    AlertVariant["danger"] = "danger";
    AlertVariant["warning"] = "warning";
    AlertVariant["info"] = "info";
    AlertVariant["custom"] = "custom";
})(AlertVariant || (exports.AlertVariant = AlertVariant = {}));
const Alert = (_a) => {
    var { variant = AlertVariant.custom, isInline = false, isPlain = false, isLiveRegion = false, variantLabel = `${(0, helpers_1.capitalize)(variant)} alert:`, actionClose, actionLinks, title, component = 'h4', children = '', className = '', ouiaId, ouiaSafe = true, timeout = false, timeoutAnimation = 3000, onTimeout = () => { }, truncateTitle = 0, tooltipPosition, customIcon, isExpandable = false, toggleAriaLabel = `${(0, helpers_1.capitalize)(variant)} alert details`, onMouseEnter = () => { }, onMouseLeave = () => { }, id } = _a, props = tslib_1.__rest(_a, ["variant", "isInline", "isPlain", "isLiveRegion", "variantLabel", "actionClose", "actionLinks", "title", "component", "children", "className", "ouiaId", "ouiaSafe", "timeout", "timeoutAnimation", "onTimeout", "truncateTitle", "tooltipPosition", "customIcon", "isExpandable", "toggleAriaLabel", "onMouseEnter", "onMouseLeave", "id"]);
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.Alert.displayName, ouiaId, ouiaSafe, variant);
    const getHeadingContent = ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: variantLabel }), title] }));
    const titleRef = (0, react_1.useRef)(null);
    const TitleComponent = component;
    const divRef = (0, react_1.useRef)(undefined);
    const [isTooltipVisible, setIsTooltipVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(c_alert__title_max_lines_1.default.name, truncateTitle.toString());
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const [timedOut, setTimedOut] = (0, react_1.useState)(false);
    const [timedOutAnimation, setTimedOutAnimation] = (0, react_1.useState)(true);
    const [isMouseOver, setIsMouseOver] = (0, react_1.useState)();
    const [containsFocus, setContainsFocus] = (0, react_1.useState)();
    const shouldDismiss = timedOut && timedOutAnimation && !isMouseOver && !containsFocus;
    const [isDismissed, setIsDismissed] = (0, react_1.useState)(false);
    const { hasAnimations, updateTransitionEnd } = (0, react_1.useContext)(AlertGroupContext_1.AlertGroupContext);
    const { offstageRight } = alert_group_1.default.modifiers;
    const getParentAlertGroupItem = () => { var _a; return (_a = divRef.current) === null || _a === void 0 ? void 0 : _a.closest(`.${alert_group_1.default.alertGroupItem}`); };
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        const calculatedTimeout = timeout === true ? 8000 : Number(timeout);
        if (calculatedTimeout > 0) {
            const timer = setTimeout(() => setTimedOut(true), calculatedTimeout);
            return () => clearTimeout(timer);
        }
    }, [timeout]);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (containsFocus === false || isMouseOver === false) {
            const timer = setTimeout(() => setTimedOutAnimation(true), timeoutAnimation);
            return () => clearTimeout(timer);
        }
    }, [containsFocus, isMouseOver, timeoutAnimation]);
    (0, react_1.useEffect)(() => {
        isDismissed && onTimeout();
    }, [isDismissed, onTimeout]);
    (0, react_1.useEffect)(() => {
        const alertGroupItem = getParentAlertGroupItem();
        setTimeout(() => alertGroupItem === null || alertGroupItem === void 0 ? void 0 : alertGroupItem.classList.remove(alert_group_1.default.modifiers.offstageTop), 0);
    }, []);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
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
    const Title = ((0, jsx_runtime_1.jsx)(TitleComponent, Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: (0, react_styles_1.css)(alert_1.default.alertTitle, truncateTitle && alert_1.default.modifiers.truncate), children: getHeadingContent })));
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ ref: divRef, className: (0, react_styles_1.css)(alert_1.default.alert, isInline && alert_1.default.modifiers.inline, isPlain && alert_1.default.modifiers.plain, isExpandable && alert_1.default.modifiers.expandable, isExpanded && alert_1.default.modifiers.expanded, alert_1.default.modifiers[variant], className) }, ouiaProps, (isLiveRegion && {
        'aria-live': 'polite',
        'aria-atomic': 'false'
    }), { onMouseEnter: myOnMouseEnter, onMouseLeave: myOnMouseLeave, id: id }, props, { children: [isExpandable && ((0, jsx_runtime_1.jsx)(AlertContext_1.AlertContext.Provider, { value: { title, variantLabel }, children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(alert_1.default.alertToggle), children: (0, jsx_runtime_1.jsx)(AlertToggleExpandButton_1.AlertToggleExpandButton, { isExpanded: isExpanded, onToggleExpand: onToggleExpand, "aria-label": toggleAriaLabel }) }) })), (0, jsx_runtime_1.jsx)(AlertIcon_1.AlertIcon, { variant: variant, customIcon: customIcon }), isTooltipVisible ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: getHeadingContent, position: tooltipPosition, children: Title })) : (Title), actionClose && ((0, jsx_runtime_1.jsx)(AlertContext_1.AlertContext.Provider, { value: { title, variantLabel }, children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(alert_1.default.alertAction), children: actionClose }) })), children && (!isExpandable || (isExpandable && isExpanded)) && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(alert_1.default.alertDescription), children: children })), actionLinks && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(alert_1.default.alertActionGroup), children: actionLinks })] })));
};
exports.Alert = Alert;
exports.Alert.displayName = 'Alert';
//# sourceMappingURL=Alert.js.map