"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInputGroupIcon = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const text_input_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TextInputGroup/text-input-group"));
const react_styles_1 = require("@patternfly/react-styles");
const TextInputGroupIcon = (_a) => {
    var { children, className, isStatus } = _a, props = tslib_1.__rest(_a, ["children", "className", "isStatus"]);
    return ((0, jsx_runtime_1.jsx)("span", Object.assign({ className: (0, react_styles_1.css)(text_input_group_1.default.textInputGroupIcon, isStatus && text_input_group_1.default.modifiers.status, className) }, props, { children: children })));
};
exports.TextInputGroupIcon = TextInputGroupIcon;
exports.TextInputGroupIcon.displayName = 'TextInputGroupIcon';
//# sourceMappingURL=TextInputGroupIcon.js.map