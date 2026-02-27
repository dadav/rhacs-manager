"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInputGroupMain = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const text_input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TextInputGroup/text-input-group"));
const react_styles_1 = require("@patternfly/react-styles");
const TextInputGroup_1 = require("./TextInputGroup");
const TextInputGroupIcon_1 = require("./TextInputGroupIcon");
const helpers_1 = require("../../helpers");
const TextInputGroupMainBase = (_a) => {
    var { children, className, icon, type = 'text', hint, onChange = () => undefined, onFocus, onBlur, 'aria-label': ariaLabel = 'Type to filter', value: inputValue, placeholder: inputPlaceHolder, innerRef, name, 'aria-activedescendant': ariaActivedescendant, role, isExpanded, 'aria-controls': ariaControls, inputId, inputProps } = _a, props = tslib_1.__rest(_a, ["children", "className", "icon", "type", "hint", "onChange", "onFocus", "onBlur", 'aria-label', "value", "placeholder", "innerRef", "name", 'aria-activedescendant', "role", "isExpanded", 'aria-controls', "inputId", "inputProps"]);
    const { isDisabled, validated } = (0, react_1.useContext)(TextInputGroup_1.TextInputGroupContext);
    const ref = (0, react_1.useRef)(null);
    const textInputGroupInputInputRef = innerRef || ref;
    const StatusIcon = helpers_1.statusIcons[validated === helpers_1.ValidatedOptions.error ? 'danger' : validated];
    const handleChange = (event) => {
        onChange(event, event.currentTarget.value);
    };
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroupMain, icon && text_input_group_1.default.modifiers.icon, className) }, props, { children: [children, (0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroupText), children: [hint && ((0, jsx_runtime_1.jsx)("input", { className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroupTextInput, text_input_group_1.default.modifiers.hint), type: "text", disabled: true, "aria-hidden": "true", value: hint, id: inputId })), icon && (0, jsx_runtime_1.jsx)(TextInputGroupIcon_1.TextInputGroupIcon, { children: icon }), (0, jsx_runtime_1.jsx)("input", Object.assign({ ref: textInputGroupInputInputRef, type: type, className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroupTextInput), "aria-label": ariaLabel, disabled: isDisabled, onChange: handleChange, onFocus: onFocus, onBlur: onBlur, value: inputValue || '', placeholder: inputPlaceHolder, name: name, "aria-activedescendant": ariaActivedescendant, id: inputId }, (role && { role }), (isExpanded !== undefined && { 'aria-expanded': isExpanded }), (ariaControls && { 'aria-controls': ariaControls }), inputProps)), validated && (0, jsx_runtime_1.jsx)(TextInputGroupIcon_1.TextInputGroupIcon, { isStatus: true, children: (0, jsx_runtime_1.jsx)(StatusIcon, {}) })] })] })));
};
exports.TextInputGroupMain = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(TextInputGroupMainBase, Object.assign({ innerRef: ref }, props))));
exports.TextInputGroupMain.displayName = 'TextInputGroupMain';
//# sourceMappingURL=TextInputGroupMain.js.map