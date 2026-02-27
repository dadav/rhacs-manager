"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const sidebar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Sidebar/sidebar"));
const SidebarContent = (_a) => {
    var { className, children, hasNoBackground, hasPadding, backgroundVariant = 'default' } = _a, props = tslib_1.__rest(_a, ["className", "children", "hasNoBackground", "hasPadding", "backgroundVariant"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(sidebar_1.default.sidebarContent, hasNoBackground && sidebar_1.default.modifiers.noBackground, hasPadding && sidebar_1.default.modifiers.padding, backgroundVariant !== 'default' && sidebar_1.default.modifiers[backgroundVariant], className) }, props, { children: children })));
};
exports.SidebarContent = SidebarContent;
exports.SidebarContent.displayName = 'SidebarContent';
//# sourceMappingURL=SidebarContent.js.map