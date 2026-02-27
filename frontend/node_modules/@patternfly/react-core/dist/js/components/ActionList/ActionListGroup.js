"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionListGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const action_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ActionList/action-list"));
const ActionListGroup = (_a) => {
    var { children, className, isIconGroup } = _a, props = tslib_1.__rest(_a, ["children", "className", "isIconGroup"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(action_list_1.default.actionListGroup, isIconGroup && action_list_1.default.modifiers.icons, className) }, props, { children: children })));
};
exports.ActionListGroup = ActionListGroup;
exports.ActionListGroup.displayName = 'ActionListGroup';
//# sourceMappingURL=ActionListGroup.js.map