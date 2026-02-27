"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hint = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const hint_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Hint/hint"));
const react_styles_1 = require("@patternfly/react-styles");
const Hint = (_a) => {
    var { children, className, actions, hasNoActionsOffset = false } = _a, props = tslib_1.__rest(_a, ["children", "className", "actions", "hasNoActionsOffset"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(hint_1.default.hint, className) }, props, { children: [actions && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(hint_1.default.hintActions, hasNoActionsOffset && hint_1.default.modifiers.noOffset), children: actions })), children] })));
};
exports.Hint = Hint;
exports.Hint.displayName = 'Hint';
//# sourceMappingURL=Hint.js.map