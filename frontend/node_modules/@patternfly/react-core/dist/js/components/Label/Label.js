"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Label = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const label_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Label/label"));
const label_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Label/label-group"));
const Button_1 = require("../Button");
const Tooltip_1 = require("../Tooltip");
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../helpers");
const c_label__text_MaxWidth_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_label__text_MaxWidth'));
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const bell_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/bell-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
const exclamation_triangle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon'));
const info_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/info-circle-icon'));
const colorStyles = {
    blue: label_1.default.modifiers.blue,
    teal: label_1.default.modifiers.teal,
    green: label_1.default.modifiers.green,
    orange: label_1.default.modifiers.orange,
    purple: label_1.default.modifiers.purple,
    red: label_1.default.modifiers.red,
    orangered: label_1.default.modifiers.orangered,
    yellow: label_1.default.modifiers.yellow,
    grey: ''
};
const statusIcons = {
    success: (0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {}),
    warning: (0, jsx_runtime_1.jsx)(exclamation_triangle_icon_1.default, {}),
    danger: (0, jsx_runtime_1.jsx)(exclamation_circle_icon_1.default, {}),
    info: (0, jsx_runtime_1.jsx)(info_circle_icon_1.default, {}),
    custom: (0, jsx_runtime_1.jsx)(bell_icon_1.default, {})
};
const Label = (_a) => {
    var { children, className = '', color = 'grey', variant = 'filled', status, isCompact = false, isDisabled = false, isEditable = false, isClickable: isClickableProp = false, editableProps, textMaxWidth, tooltipPosition, icon, onClose, onClick: onLabelClick, onEditCancel, onEditComplete, closeBtn, closeBtnAriaLabel, closeBtnProps, href, render } = _a, props = tslib_1.__rest(_a, ["children", "className", "color", "variant", "status", "isCompact", "isDisabled", "isEditable", "isClickable", "editableProps", "textMaxWidth", "tooltipPosition", "icon", "onClose", "onClick", "onEditCancel", "onEditComplete", "closeBtn", "closeBtnAriaLabel", "closeBtnProps", "href", "render"]);
    const [isEditableActive, setIsEditableActive] = (0, react_1.useState)(false);
    const [currValue, setCurrValue] = (0, react_1.useState)(children);
    const editableButtonRef = (0, react_1.useRef)(undefined);
    const editableInputRef = (0, react_1.useRef)(undefined);
    const isOverflowLabel = variant === 'overflow';
    const isAddLabel = variant === 'add';
    const isClickable = isClickableProp || (onLabelClick && !isOverflowLabel && !isAddLabel) || href;
    let _icon;
    if (status) {
        _icon = statusIcons[status];
    }
    if (icon) {
        _icon = icon;
    }
    (0, react_1.useEffect)(() => {
        const onDocMouseDown = (event) => {
            if (isEditableActive &&
                editableInputRef &&
                editableInputRef.current &&
                !editableInputRef.current.contains(event.target)) {
                if (editableInputRef.current.value) {
                    onEditComplete && onEditComplete(event, editableInputRef.current.value);
                }
                setIsEditableActive(false);
            }
        };
        const onKeyDown = (event) => {
            var _a, _b;
            const key = event.key;
            if ((!isEditableActive &&
                (!editableButtonRef ||
                    !editableButtonRef.current ||
                    !editableButtonRef.current.contains(event.target))) ||
                (isEditableActive &&
                    (!editableInputRef || !editableInputRef.current || !editableInputRef.current.contains(event.target)))) {
                return;
            }
            if (isEditableActive && (key === 'Enter' || key === 'Tab')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (editableInputRef.current.value) {
                    onEditComplete && onEditComplete(event, editableInputRef.current.value);
                }
                setIsEditableActive(false);
                (_a = editableButtonRef === null || editableButtonRef === void 0 ? void 0 : editableButtonRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            }
            if (isEditableActive && key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                // Reset div text to initial children prop - pre-edit
                if (editableInputRef.current.value) {
                    editableInputRef.current.value = children;
                    onEditCancel && onEditCancel(event, children);
                }
                setIsEditableActive(false);
                (_b = editableButtonRef === null || editableButtonRef === void 0 ? void 0 : editableButtonRef.current) === null || _b === void 0 ? void 0 : _b.focus();
            }
            if (!isEditableActive && key === 'Enter') {
                event.preventDefault();
                event.stopImmediatePropagation();
                setIsEditableActive(true);
                // Set cursor position to end of text
                const el = event.target;
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isEditableActive, editableInputRef, editableButtonRef, onEditComplete, onEditCancel, children]);
    (0, react_1.useEffect)(() => {
        if (onLabelClick && href) {
            // eslint-disable-next-line no-console
            console.warn('Link labels cannot have onClick passed, this results in invalid HTML. Please remove either the href or onClick prop.');
        }
        else if (onLabelClick && isEditable) {
            // eslint-disable-next-line no-console
            console.warn('Editable labels cannot have onClick passed, clicking starts the label edit process. Please remove either the isEditable or onClick prop.');
        }
    }, [onLabelClick, href, isEditable]);
    const isClickableDisabled = (href || onLabelClick) && isDisabled;
    const defaultCloseButton = ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ type: "button", variant: "plain", hasNoPadding: true, onClick: onClose, "aria-label": closeBtnAriaLabel || `Close ${children}` }, (isClickableDisabled && { isDisabled: true }), closeBtnProps, { icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) })));
    const closeButton = (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(label_1.default.labelActions), children: closeBtn || defaultCloseButton });
    const textRef = (0, react_1.createRef)();
    // ref to apply tooltip when rendered is used
    const componentRef = (0, react_1.useRef)(undefined);
    const [isTooltipVisible, setIsTooltipVisible] = (0, react_1.useState)(false);
    (0, helpers_1.useIsomorphicLayoutEffect)(() => {
        const currTextRef = isEditable ? editableButtonRef : textRef;
        if (!isEditableActive) {
            setIsTooltipVisible(currTextRef.current && currTextRef.current.offsetWidth < currTextRef.current.scrollWidth);
        }
    }, [isEditableActive]);
    const content = ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [_icon && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(label_1.default.labelIcon), children: _icon }), (0, jsx_runtime_1.jsx)("span", Object.assign({ ref: textRef, className: (0, react_styles_1.css)(label_1.default.labelText) }, (textMaxWidth && {
                style: {
                    [c_label__text_MaxWidth_1.default.name]: textMaxWidth
                }
            }), { children: children }))] }));
    (0, react_1.useEffect)(() => {
        if (isEditableActive && editableInputRef) {
            editableInputRef.current && editableInputRef.current.focus();
        }
    }, [editableInputRef, isEditableActive]);
    const updateVal = () => {
        setCurrValue(editableInputRef.current.value);
    };
    let LabelComponentChildElement = 'span';
    if (href) {
        LabelComponentChildElement = 'a';
    }
    else if (isEditable || (onLabelClick && !isOverflowLabel && !isAddLabel)) {
        LabelComponentChildElement = 'button';
    }
    const clickableLabelProps = {
        type: 'button',
        onClick: onLabelClick
    };
    const isButton = LabelComponentChildElement === 'button';
    const labelComponentChildProps = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ className: (0, react_styles_1.css)(label_1.default.labelContent, isClickable && label_1.default.modifiers.clickable) }, (isTooltipVisible && { tabIndex: 0 })), (href && { href })), (href && isDisabled && { onClick: (event) => event.preventDefault() })), (isButton && clickableLabelProps)), (isEditable && Object.assign({ ref: editableButtonRef, onClick: (e) => {
            setIsEditableActive(true);
            e.stopPropagation();
        } }, editableProps))), (isClickableDisabled && isButton && { disabled: true })), (isClickableDisabled && href && { tabIndex: -1, 'aria-disabled': true }));
    let labelComponentChild = ((0, jsx_runtime_1.jsx)(LabelComponentChildElement, Object.assign({}, labelComponentChildProps, { children: content })));
    if (render) {
        labelComponentChild = ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [isTooltipVisible && (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { triggerRef: componentRef, content: children, position: tooltipPosition }), render({
                    className: label_1.default.labelContent,
                    content,
                    componentRef
                })] }));
    }
    else if (isTooltipVisible) {
        labelComponentChild = ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: children, position: tooltipPosition, children: labelComponentChild }));
    }
    const LabelComponent = (isOverflowLabel ? 'button' : 'span');
    return ((0, jsx_runtime_1.jsxs)(LabelComponent, Object.assign({}, props, { className: (0, react_styles_1.css)(label_1.default.label, isClickableDisabled && label_1.default.modifiers.disabled, colorStyles[color], variant === 'filled' && label_1.default.modifiers.filled, variant === 'outline' && label_1.default.modifiers.outline, status && label_1.default.modifiers[status], isOverflowLabel && label_1.default.modifiers.overflow, isCompact && label_1.default.modifiers.compact, isEditable && label_group_1.default.modifiers.editable, isEditableActive && label_1.default.modifiers.editableActive, isClickable && label_1.default.modifiers.clickable, isAddLabel && label_1.default.modifiers.add, className), onClick: isOverflowLabel || isAddLabel ? onLabelClick : undefined }, (LabelComponent === 'button' && { type: 'button' }), { children: [!isEditableActive && labelComponentChild, !isEditableActive && onClose && closeButton, isEditableActive && ((0, jsx_runtime_1.jsx)("input", Object.assign({ className: (0, react_styles_1.css)(label_1.default.labelContent), type: "text", id: "editable-input", ref: editableInputRef, value: currValue, onChange: updateVal }, editableProps)))] })));
};
exports.Label = Label;
exports.Label.displayName = 'Label';
//# sourceMappingURL=Label.js.map