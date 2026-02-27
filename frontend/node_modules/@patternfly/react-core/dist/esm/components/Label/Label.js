import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRef, Fragment, useEffect, useRef, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/Label/label.mjs';
import labelGrpStyles from '@patternfly/react-styles/css/components/Label/label-group.mjs';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';
import { css } from '@patternfly/react-styles';
import { useIsomorphicLayoutEffect } from '../../helpers';
import cssTextMaxWidth from '@patternfly/react-tokens/dist/esm/c_label__text_MaxWidth';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import BellIcon from '@patternfly/react-icons/dist/esm/icons/bell-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
const colorStyles = {
    blue: styles.modifiers.blue,
    teal: styles.modifiers.teal,
    green: styles.modifiers.green,
    orange: styles.modifiers.orange,
    purple: styles.modifiers.purple,
    red: styles.modifiers.red,
    orangered: styles.modifiers.orangered,
    yellow: styles.modifiers.yellow,
    grey: ''
};
const statusIcons = {
    success: _jsx(CheckCircleIcon, {}),
    warning: _jsx(ExclamationTriangleIcon, {}),
    danger: _jsx(ExclamationCircleIcon, {}),
    info: _jsx(InfoCircleIcon, {}),
    custom: _jsx(BellIcon, {})
};
export const Label = (_a) => {
    var { children, className = '', color = 'grey', variant = 'filled', status, isCompact = false, isDisabled = false, isEditable = false, isClickable: isClickableProp = false, editableProps, textMaxWidth, tooltipPosition, icon, onClose, onClick: onLabelClick, onEditCancel, onEditComplete, closeBtn, closeBtnAriaLabel, closeBtnProps, href, render } = _a, props = __rest(_a, ["children", "className", "color", "variant", "status", "isCompact", "isDisabled", "isEditable", "isClickable", "editableProps", "textMaxWidth", "tooltipPosition", "icon", "onClose", "onClick", "onEditCancel", "onEditComplete", "closeBtn", "closeBtnAriaLabel", "closeBtnProps", "href", "render"]);
    const [isEditableActive, setIsEditableActive] = useState(false);
    const [currValue, setCurrValue] = useState(children);
    const editableButtonRef = useRef(undefined);
    const editableInputRef = useRef(undefined);
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
    useEffect(() => {
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
    useEffect(() => {
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
    const defaultCloseButton = (_jsx(Button, Object.assign({ type: "button", variant: "plain", hasNoPadding: true, onClick: onClose, "aria-label": closeBtnAriaLabel || `Close ${children}` }, (isClickableDisabled && { isDisabled: true }), closeBtnProps, { icon: _jsx(TimesIcon, {}) })));
    const closeButton = _jsx("span", { className: css(styles.labelActions), children: closeBtn || defaultCloseButton });
    const textRef = createRef();
    // ref to apply tooltip when rendered is used
    const componentRef = useRef(undefined);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    useIsomorphicLayoutEffect(() => {
        const currTextRef = isEditable ? editableButtonRef : textRef;
        if (!isEditableActive) {
            setIsTooltipVisible(currTextRef.current && currTextRef.current.offsetWidth < currTextRef.current.scrollWidth);
        }
    }, [isEditableActive]);
    const content = (_jsxs(Fragment, { children: [_icon && _jsx("span", { className: css(styles.labelIcon), children: _icon }), _jsx("span", Object.assign({ ref: textRef, className: css(styles.labelText) }, (textMaxWidth && {
                style: {
                    [cssTextMaxWidth.name]: textMaxWidth
                }
            }), { children: children }))] }));
    useEffect(() => {
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
    const labelComponentChildProps = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ className: css(styles.labelContent, isClickable && styles.modifiers.clickable) }, (isTooltipVisible && { tabIndex: 0 })), (href && { href })), (href && isDisabled && { onClick: (event) => event.preventDefault() })), (isButton && clickableLabelProps)), (isEditable && Object.assign({ ref: editableButtonRef, onClick: (e) => {
            setIsEditableActive(true);
            e.stopPropagation();
        } }, editableProps))), (isClickableDisabled && isButton && { disabled: true })), (isClickableDisabled && href && { tabIndex: -1, 'aria-disabled': true }));
    let labelComponentChild = (_jsx(LabelComponentChildElement, Object.assign({}, labelComponentChildProps, { children: content })));
    if (render) {
        labelComponentChild = (_jsxs(Fragment, { children: [isTooltipVisible && _jsx(Tooltip, { triggerRef: componentRef, content: children, position: tooltipPosition }), render({
                    className: styles.labelContent,
                    content,
                    componentRef
                })] }));
    }
    else if (isTooltipVisible) {
        labelComponentChild = (_jsx(Tooltip, { content: children, position: tooltipPosition, children: labelComponentChild }));
    }
    const LabelComponent = (isOverflowLabel ? 'button' : 'span');
    return (_jsxs(LabelComponent, Object.assign({}, props, { className: css(styles.label, isClickableDisabled && styles.modifiers.disabled, colorStyles[color], variant === 'filled' && styles.modifiers.filled, variant === 'outline' && styles.modifiers.outline, status && styles.modifiers[status], isOverflowLabel && styles.modifiers.overflow, isCompact && styles.modifiers.compact, isEditable && labelGrpStyles.modifiers.editable, isEditableActive && styles.modifiers.editableActive, isClickable && styles.modifiers.clickable, isAddLabel && styles.modifiers.add, className), onClick: isOverflowLabel || isAddLabel ? onLabelClick : undefined }, (LabelComponent === 'button' && { type: 'button' }), { children: [!isEditableActive && labelComponentChild, !isEditableActive && onClose && closeButton, isEditableActive && (_jsx("input", Object.assign({ className: css(styles.labelContent), type: "text", id: "editable-input", ref: editableInputRef, value: currValue, onChange: updateVal }, editableProps)))] })));
};
Label.displayName = 'Label';
//# sourceMappingURL=Label.js.map