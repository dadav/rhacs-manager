"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputGroupText = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/InputGroup/input-group"));
const react_styles_1 = require("@patternfly/react-styles");
const InputGroupItem_1 = require("./InputGroupItem");
const InputGroupText = (_a) => {
    var { className, component = 'span', children, isPlain, isDisabled } = _a, props = tslib_1.__rest(_a, ["className", "component", "children", "isPlain", "isDisabled"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(InputGroupItem_1.InputGroupItem, { isPlain: isPlain, isBox: true, isDisabled: isDisabled, children: (0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, react_styles_1.css)(input_group_1.default.inputGroupText, className) }, props, { children: children })) }));
};
exports.InputGroupText = InputGroupText;
exports.InputGroupText.displayName = 'InputGroupText';
//# sourceMappingURL=InputGroupText.js.map