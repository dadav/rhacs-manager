"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = exports.ButtonState = exports.ButtonSize = exports.ButtonType = exports.ButtonVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const button_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Button/button"));
const react_styles_1 = require("@patternfly/react-styles");
const Spinner_1 = require("../Spinner");
const ouia_1 = require("../../helpers/OUIA/ouia");
const Badge_1 = require("../Badge");
const star_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/star-icon'));
const outlined_star_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/outlined-star-icon'));
const cog_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/cog-icon'));
const hamburgerIcon_1 = require("./hamburgerIcon");
var ButtonVariant;
(function (ButtonVariant) {
    ButtonVariant["primary"] = "primary";
    ButtonVariant["secondary"] = "secondary";
    ButtonVariant["tertiary"] = "tertiary";
    ButtonVariant["danger"] = "danger";
    ButtonVariant["warning"] = "warning";
    ButtonVariant["link"] = "link";
    ButtonVariant["plain"] = "plain";
    ButtonVariant["control"] = "control";
    ButtonVariant["stateful"] = "stateful";
})(ButtonVariant || (exports.ButtonVariant = ButtonVariant = {}));
var ButtonType;
(function (ButtonType) {
    ButtonType["button"] = "button";
    ButtonType["submit"] = "submit";
    ButtonType["reset"] = "reset";
})(ButtonType || (exports.ButtonType = ButtonType = {}));
var ButtonSize;
(function (ButtonSize) {
    ButtonSize["default"] = "default";
    ButtonSize["sm"] = "sm";
    ButtonSize["lg"] = "lg";
})(ButtonSize || (exports.ButtonSize = ButtonSize = {}));
var ButtonState;
(function (ButtonState) {
    ButtonState["read"] = "read";
    ButtonState["unread"] = "unread";
    ButtonState["attention"] = "attention";
})(ButtonState || (exports.ButtonState = ButtonState = {}));
const ButtonBase = (_a) => {
    var { children = null, className = '', component = 'button', isClicked = false, isBlock = false, isDisabled = false, isAriaDisabled = false, isLoading = null, isDanger = false, isExpanded, isSettings, isHamburger, hamburgerVariant, spinnerAriaValueText, spinnerAriaLabelledBy, spinnerAriaLabel, size = ButtonSize.default, inoperableEvents = ['onClick', 'onKeyPress'], isInline = false, isFavorite = false, isFavorited = false, type = ButtonType.button, variant = ButtonVariant.primary, state = ButtonState.unread, hasNoPadding = false, iconPosition = 'start', 'aria-label': ariaLabel = null, icon = null, role, ouiaId, ouiaSafe = true, tabIndex = null, innerRef, countOptions } = _a, props = tslib_1.__rest(_a, ["children", "className", "component", "isClicked", "isBlock", "isDisabled", "isAriaDisabled", "isLoading", "isDanger", "isExpanded", "isSettings", "isHamburger", "hamburgerVariant", "spinnerAriaValueText", "spinnerAriaLabelledBy", "spinnerAriaLabel", "size", "inoperableEvents", "isInline", "isFavorite", "isFavorited", "type", "variant", "state", "hasNoPadding", "iconPosition", 'aria-label', "icon", "role", "ouiaId", "ouiaSafe", "tabIndex", "innerRef", "countOptions"]);
    if (isHamburger && ![true, false].includes(isExpanded)) {
        // eslint-disable-next-line no-console
        console.error('Button: when the isHamburger property is passed in, you must also pass in a boolean value to the isExpanded property. It is expected that a hamburger button controls the expansion of other content.');
    }
    // TODO: Remove isSettings || isHamburger || isFavorite conditional in breaking change to throw this warning for any button that does not have children or aria name
    if ((isSettings || isHamburger || isFavorite) && !ariaLabel && !children && !props['aria-labelledby']) {
        // eslint-disable-next-line no-console
        console.error('Button: you must provide either visible text content or an accessible name via the aria-label or aria-labelledby properties.');
    }
    const ouiaProps = (0, ouia_1.useOUIAProps)(exports.Button.displayName, ouiaId, ouiaSafe, variant);
    const Component = component;
    const isButtonElement = Component === 'button';
    const isInlineSpan = isInline && Component === 'span';
    const isIconAlignedAtEnd = iconPosition === 'end' || iconPosition === 'right';
    const shouldOverrideIcon = isSettings || isHamburger || isFavorite;
    const preventedEvents = inoperableEvents.reduce((handlers, eventToPrevent) => (Object.assign(Object.assign({}, handlers), { [eventToPrevent]: (event) => {
            event.preventDefault();
        } })), {});
    const getDefaultTabIdx = () => {
        if (isDisabled) {
            return isButtonElement ? null : -1;
        }
        else if (isAriaDisabled) {
            return null;
        }
        else if (isInlineSpan) {
            return 0;
        }
    };
    const renderIcon = () => {
        let iconContent;
        if (isFavorite) {
            iconContent = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)('pf-v6-c-button__icon-favorite'), children: (0, jsx_runtime_1.jsx)(outlined_star_icon_1.default, {}) }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)('pf-v6-c-button__icon-favorited'), children: (0, jsx_runtime_1.jsx)(star_icon_1.default, {}) })] }));
        }
        if (isSettings) {
            iconContent = (0, jsx_runtime_1.jsx)(cog_icon_1.default, {});
        }
        if (isHamburger) {
            iconContent = hamburgerIcon_1.hamburgerIcon;
        }
        if (icon && !shouldOverrideIcon) {
            iconContent = icon;
        }
        return (iconContent && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(button_1.default.buttonIcon, children && button_1.default.modifiers[isIconAlignedAtEnd ? 'end' : 'start']), children: iconContent })));
    };
    const _icon = renderIcon();
    const _children = children && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)('pf-v6-c-button__text'), children: children });
    // We only want to render the aria-disabled attribute when true, similar to the disabled attribute natively.
    const shouldRenderAriaDisabled = isAriaDisabled || (!isButtonElement && isDisabled);
    return ((0, jsx_runtime_1.jsxs)(Component, Object.assign({ "aria-expanded": isExpanded }, props, (isAriaDisabled ? preventedEvents : null), (shouldRenderAriaDisabled && { 'aria-disabled': true }), { "aria-label": ariaLabel, className: (0, react_styles_1.css)(button_1.default.button, button_1.default.modifiers[variant], isSettings && button_1.default.modifiers.settings, isHamburger && button_1.default.modifiers.hamburger, isHamburger && hamburgerVariant && button_1.default.modifiers[hamburgerVariant], isBlock && button_1.default.modifiers.block, isDisabled && !isButtonElement && button_1.default.modifiers.disabled, isAriaDisabled && button_1.default.modifiers.ariaDisabled, isClicked && button_1.default.modifiers.clicked, isInline && variant === ButtonVariant.link && button_1.default.modifiers.inline, isFavorite && button_1.default.modifiers.favorite, isFavorite && isFavorited && button_1.default.modifiers.favorited, isDanger && (variant === ButtonVariant.secondary || variant === ButtonVariant.link) && button_1.default.modifiers.danger, isLoading !== null && variant !== ButtonVariant.plain && button_1.default.modifiers.progress, isLoading && button_1.default.modifiers.inProgress, hasNoPadding && variant === ButtonVariant.plain && button_1.default.modifiers.noPadding, variant === ButtonVariant.stateful && button_1.default.modifiers[state], size === ButtonSize.sm && button_1.default.modifiers.small, size === ButtonSize.lg && button_1.default.modifiers.displayLg, className), disabled: isButtonElement ? isDisabled : null, tabIndex: tabIndex !== null ? tabIndex : getDefaultTabIdx(), type: isButtonElement || isInlineSpan ? type : null, role: isInlineSpan ? 'button' : role, ref: innerRef }, ouiaProps, { children: [isLoading && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(button_1.default.buttonProgress), children: (0, jsx_runtime_1.jsx)(Spinner_1.Spinner, { size: Spinner_1.spinnerSize.md, isInline: isInline, "aria-valuetext": spinnerAriaValueText, "aria-label": spinnerAriaLabel, "aria-labelledby": spinnerAriaLabelledBy }) })), isIconAlignedAtEnd ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [_children, _icon] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [_icon, _children] })), countOptions && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(button_1.default.buttonCount, countOptions.className), children: (0, jsx_runtime_1.jsx)(Badge_1.Badge, { isRead: countOptions.isRead, isDisabled: isDisabled, children: countOptions.count }) }))] })));
};
exports.Button = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(ButtonBase, Object.assign({ innerRef: ref }, props)));
exports.Button.displayName = 'Button';
//# sourceMappingURL=Button.js.map