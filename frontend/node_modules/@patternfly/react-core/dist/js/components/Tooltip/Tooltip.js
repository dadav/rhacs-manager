"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = exports.TooltipPosition = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tooltip_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tooltip/tooltip"));
const react_styles_1 = require("@patternfly/react-styles");
const TooltipContent_1 = require("./TooltipContent");
const TooltipArrow_1 = require("./TooltipArrow");
const constants_1 = require("../../helpers/constants");
const c_tooltip_MaxWidth_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_tooltip_MaxWidth'));
const Popper_1 = require("../../helpers/Popper/Popper");
var TooltipPosition;
(function (TooltipPosition) {
    TooltipPosition["auto"] = "auto";
    TooltipPosition["top"] = "top";
    TooltipPosition["bottom"] = "bottom";
    TooltipPosition["left"] = "left";
    TooltipPosition["right"] = "right";
    TooltipPosition["topStart"] = "top-start";
    TooltipPosition["topEnd"] = "top-end";
    TooltipPosition["bottomStart"] = "bottom-start";
    TooltipPosition["bottomEnd"] = "bottom-end";
    TooltipPosition["leftStart"] = "left-start";
    TooltipPosition["leftEnd"] = "left-end";
    TooltipPosition["rightStart"] = "right-start";
    TooltipPosition["rightEnd"] = "right-end";
})(TooltipPosition || (exports.TooltipPosition = TooltipPosition = {}));
// id for associating trigger with the content aria-describedby or aria-labelledby
let pfTooltipIdCounter = 1;
const Tooltip = (_a) => {
    var { content: bodyContent, position = 'top', trigger = 'mouseenter focus', isVisible = false, isContentLeftAligned = false, enableFlip = true, className = '', entryDelay = 300, exitDelay = 300, appendTo = () => document.body, zIndex = 9999, minWidth, maxWidth = c_tooltip_MaxWidth_1.default.value, distance = 15, aria = 'describedby', 
    // For every initial starting position, there are 3 escape positions
    flipBehavior = ['top', 'right', 'bottom', 'left', 'top', 'right', 'bottom'], id = `pf-tooltip-${pfTooltipIdCounter++}`, children, animationDuration = 300, triggerRef, 'aria-live': ariaLive = triggerRef ? 'polite' : 'off', onTooltipHidden = () => { } } = _a, rest = tslib_1.__rest(_a, ["content", "position", "trigger", "isVisible", "isContentLeftAligned", "enableFlip", "className", "entryDelay", "exitDelay", "appendTo", "zIndex", "minWidth", "maxWidth", "distance", "aria", "flipBehavior", "id", "children", "animationDuration", "triggerRef", 'aria-live', "onTooltipHidden"]);
    // could make this a prop in the future (true | false | 'toggle')
    const hideOnClick = true;
    const triggerOnMouseenter = trigger.includes('mouseenter');
    const triggerOnFocus = trigger.includes('focus');
    const triggerOnClick = trigger.includes('click');
    const triggerManually = trigger === 'manual';
    const [visible, setVisible] = (0, react_1.useState)(false);
    const popperRef = (0, react_1.createRef)();
    const getTriggerRefElement = () => {
        if (typeof triggerRef === 'function') {
            return triggerRef();
        }
        else if (triggerRef && typeof triggerRef === 'object' && 'current' in triggerRef) {
            return triggerRef.current;
        }
        else if (triggerRef instanceof HTMLElement) {
            return triggerRef;
        }
        return null;
    };
    const getAriaAttributeName = () => (aria !== 'none' ? `aria-${aria}` : null);
    const addAriaToRefElement = (element) => {
        const attributeName = getAriaAttributeName();
        if (!element || !attributeName) {
            return;
        }
        const existingAria = element.getAttribute(attributeName);
        if (!existingAria || !existingAria.includes(id)) {
            const newAria = existingAria ? `${existingAria} ${id}` : id;
            element.setAttribute(attributeName, newAria);
        }
    };
    const removeAriaFromRefElement = (element) => {
        const attributeName = getAriaAttributeName();
        if (!element || !attributeName) {
            return;
        }
        const existingAria = element.getAttribute(attributeName);
        if (!existingAria) {
            return;
        }
        const newAria = existingAria.replace(new RegExp(`\\b${id}\\b`, 'g'), '').trim();
        if (newAria) {
            element.setAttribute(attributeName, newAria);
        }
        else {
            element.removeAttribute(attributeName);
        }
    };
    const updateTriggerElementAria = (shouldAddAria) => {
        if (aria === 'none' || !triggerRef || children) {
            return;
        }
        const triggerElement = getTriggerRefElement();
        if (!triggerElement) {
            return;
        }
        if (shouldAddAria) {
            addAriaToRefElement(triggerElement);
        }
        else {
            removeAriaFromRefElement(triggerElement);
        }
    };
    (0, react_1.useEffect)(() => {
        updateTriggerElementAria(visible);
        return () => {
            updateTriggerElementAria(false);
        };
    }, [visible, aria, triggerRef, children, id]);
    const onDocumentKeyDown = (event) => {
        if (!triggerManually) {
            if (event.key === constants_1.KeyTypes.Escape && visible) {
                hide();
            }
        }
    };
    const onTriggerEnter = (event) => {
        if (event.key === constants_1.KeyTypes.Enter) {
            if (!visible) {
                show();
            }
            else {
                hide();
            }
        }
    };
    (0, react_1.useEffect)(() => {
        if (isVisible) {
            show();
        }
        else {
            hide();
        }
    }, [isVisible]);
    const show = () => {
        setVisible(true);
    };
    const hide = () => {
        setVisible(false);
    };
    const positionModifiers = {
        top: tooltip_1.default.modifiers.top,
        bottom: tooltip_1.default.modifiers.bottom,
        left: tooltip_1.default.modifiers.left,
        right: tooltip_1.default.modifiers.right,
        'top-start': tooltip_1.default.modifiers.topLeft,
        'top-end': tooltip_1.default.modifiers.topRight,
        'bottom-start': tooltip_1.default.modifiers.bottomLeft,
        'bottom-end': tooltip_1.default.modifiers.bottomRight,
        'left-start': tooltip_1.default.modifiers.leftTop,
        'left-end': tooltip_1.default.modifiers.leftBottom,
        'right-start': tooltip_1.default.modifiers.rightTop,
        'right-end': tooltip_1.default.modifiers.rightBottom
    };
    const hasCustomMaxWidth = maxWidth !== c_tooltip_MaxWidth_1.default.value;
    const content = ((0, jsx_runtime_1.jsxs)("div", Object.assign({ "aria-live": ariaLive, className: (0, react_styles_1.css)(tooltip_1.default.tooltip, className), role: "tooltip", id: id, style: {
            maxWidth: hasCustomMaxWidth ? maxWidth : null
        }, ref: popperRef }, rest, { children: [(0, jsx_runtime_1.jsx)(TooltipArrow_1.TooltipArrow, {}), (0, jsx_runtime_1.jsx)(TooltipContent_1.TooltipContent, { isLeftAligned: isContentLeftAligned, children: bodyContent })] })));
    const onDocumentClick = (event, triggerElement) => {
        // event.currentTarget = document
        // event.target could be triggerElement or something else
        if (hideOnClick === true) {
            // hide on inside the toggle as well as on outside clicks
            if (visible) {
                hide();
            }
            else if (event.target === triggerElement) {
                show();
            }
        }
        else if (hideOnClick === 'toggle' && event.target === triggerElement) {
            // prevent outside clicks from hiding but allow it to still be toggled on toggle click
            if (visible) {
                hide();
            }
            else {
                show();
            }
        }
        else if (hideOnClick === false && !visible && event.target === triggerElement) {
            show();
        }
    };
    const addAriaToChildren = () => {
        if (!children) {
            return;
        }
        if (aria === 'describedby' && children.props && !children.props['aria-describedby']) {
            return (0, react_1.cloneElement)(children, { 'aria-describedby': id });
        }
        else if (aria === 'labelledby' && children.props && !children.props['aria-labelledby']) {
            return (0, react_1.cloneElement)(children, { 'aria-labelledby': id });
        }
        return children;
    };
    return ((0, jsx_runtime_1.jsx)(Popper_1.Popper, { trigger: aria !== 'none' && visible ? addAriaToChildren() : children, triggerRef: triggerRef, popper: content, popperRef: popperRef, minWidth: minWidth !== undefined ? minWidth : 'revert', appendTo: appendTo, isVisible: visible, positionModifiers: positionModifiers, distance: distance, placement: position, onMouseEnter: triggerOnMouseenter && show, onMouseLeave: triggerOnMouseenter && hide, onPopperMouseEnter: triggerOnMouseenter && show, onPopperMouseLeave: triggerOnMouseenter && hide, onFocus: triggerOnFocus && show, onBlur: triggerOnFocus && hide, onDocumentClick: triggerOnClick && onDocumentClick, onDocumentKeyDown: triggerManually ? null : onDocumentKeyDown, onTriggerEnter: triggerManually ? null : onTriggerEnter, enableFlip: enableFlip, zIndex: zIndex, flipBehavior: flipBehavior, animationDuration: animationDuration, entryDelay: entryDelay, exitDelay: exitDelay, onHidden: onTooltipHidden }));
};
exports.Tooltip = Tooltip;
exports.Tooltip.displayName = 'Tooltip';
//# sourceMappingURL=Tooltip.js.map