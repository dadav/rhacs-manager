"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInputGroup = exports.TextInputGroupContext = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const text_input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TextInputGroup/text-input-group"));
const react_styles_1 = require("@patternfly/react-styles");
exports.TextInputGroupContext = (0, react_1.createContext)({
    isDisabled: false
});
const TextInputGroup = (_a) => {
    var { children, className, isDisabled, isPlain, validated, innerRef } = _a, props = tslib_1.__rest(_a, ["children", "className", "isDisabled", "isPlain", "validated", "innerRef"]);
    const ref = (0, react_1.useRef)(null);
    const textInputGroupRef = innerRef || ref;
    return ((0, jsx_runtime_1.jsx)(exports.TextInputGroupContext.Provider, { value: { isDisabled, validated }, children: (0, jsx_runtime_1.jsx)("div", Object.assign({ ref: textInputGroupRef, className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroup, isDisabled && text_input_group_1.default.modifiers.disabled, isPlain && text_input_group_1.default.modifiers.plain, validated && text_input_group_1.default.modifiers[validated], className) }, props, { children: children })) }));
};
exports.TextInputGroup = TextInputGroup;
exports.TextInputGroup.displayName = 'TextInputGroup';
//# sourceMappingURL=TextInputGroup.js.map