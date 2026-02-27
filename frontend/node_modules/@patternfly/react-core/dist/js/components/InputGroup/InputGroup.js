"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputGroup = exports.InputGroupBase = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/InputGroup/input-group"));
const react_styles_1 = require("@patternfly/react-styles");
const InputGroupBase = (_a) => {
    var { className, children, innerRef } = _a, props = tslib_1.__rest(_a, ["className", "children", "innerRef"]);
    const ref = (0, react_1.useRef)(null);
    const inputGroupRef = innerRef || ref;
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ ref: inputGroupRef, className: (0, react_styles_1.css)(input_group_1.default.inputGroup, className) }, props, { children: children })));
};
exports.InputGroupBase = InputGroupBase;
exports.InputGroupBase.displayName = 'InputGroupBase';
exports.InputGroup = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(exports.InputGroupBase, Object.assign({ innerRef: ref }, props))));
exports.InputGroup.displayName = 'InputGroup';
//# sourceMappingURL=InputGroup.js.map