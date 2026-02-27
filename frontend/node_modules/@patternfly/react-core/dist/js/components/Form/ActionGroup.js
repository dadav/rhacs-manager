"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const ActionGroup = (_a) => {
    var { children = null, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    const customClassName = (0, react_styles_1.css)(form_1.default.formGroup, form_1.default.modifiers.action, className);
    const formActionsComponent = (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formActions), children: children });
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: customClassName, children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formGroupControl), children: formActionsComponent }) })));
};
exports.ActionGroup = ActionGroup;
exports.ActionGroup.displayName = 'ActionGroup';
//# sourceMappingURL=ActionGroup.js.map