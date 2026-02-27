"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const action_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ActionList/action-list"));
const ActionList = (_a) => {
    var { children, isIconList, className } = _a, props = tslib_1.__rest(_a, ["children", "isIconList", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(action_list_1.default.actionList, isIconList && action_list_1.default.modifiers.icons, className) }, props, { children: children })));
};
exports.ActionList = ActionList;
exports.ActionList.displayName = 'ActionList';
//# sourceMappingURL=ActionList.js.map